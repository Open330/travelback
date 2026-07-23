import { constants } from 'node:fs'
import { access, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { createServer as createTcpServer } from 'node:net'
import { normalizeBasePath } from '../src/lib/base-path.mjs'
import { computeScriptHashes } from './harden-static-export.mjs'

const cwd = process.cwd()
const outSample = path.resolve(cwd, 'out', 'sample-trip.gpx')
const FORBIDDEN_HIDDEN_DIRS = new Set(['.omc', '.omx', '.claude', '.codex', '.git'])
const SOCIAL_PREVIEW_FILENAME = 'social-preview.png'
const SOCIAL_PREVIEW_TYPE = 'image/png'
const SOCIAL_PREVIEW_WIDTH = 1200
const SOCIAL_PREVIEW_HEIGHT = 630
const SOCIAL_PREVIEW_ALT = 'Travelback animated journey route on a dark map with playback controls'

const basePath = normalizeBasePath(process.env.TRAVELBACK_BASE_PATH ?? process.env.STATIC_BASE_PATH ?? '/travelback')

const requestedPort = Number(process.env.STATIC_SMOKE_PORT ?? '4183')
if (!Number.isInteger(requestedPort) || requestedPort <= 0) {
  console.error(`[smoke-static] Invalid port: ${requestedPort}`)
  process.exit(1)
}

async function reserveAvailablePort(preferredPort, allowFallback) {
  const tryListen = (portToTry) => new Promise((resolve, reject) => {
    const server = createTcpServer()
    server.once('error', reject)
    server.listen(portToTry, '127.0.0.1', () => {
      const address = server.address()
      const resolvedPort = typeof address === 'object' && address ? address.port : portToTry
      server.close(() => resolve(resolvedPort))
    })
  })

  try {
    return await tryListen(preferredPort)
  } catch (error) {
    if (allowFallback && error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') {
      return await tryListen(0)
    }
    throw error
  }
}

const port = await reserveAvailablePort(requestedPort, !process.env.STATIC_SMOKE_PORT)
const origin = `http://127.0.0.1:${port}`
const appPath = basePath ? `${basePath}/` : '/'
const appUrl = (pathname = '/') => `${origin}${basePath}${pathname}`

let serverProcess
let serverExit
let serverSpawnError

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function stopServerProcess() {
  if (!serverProcess || !serverExit) return
  if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) return

  serverProcess.kill('SIGTERM')
  const terminated = await Promise.race([
    serverExit.then(() => true),
    delay(2000).then(() => false),
  ])
  if (!terminated && serverProcess.exitCode === null && serverProcess.signalCode === null) {
    serverProcess.kill('SIGKILL')
    const killed = await Promise.race([
      serverExit.then(() => true),
      delay(2000).then(() => false),
    ])
    if (!killed) {
      throw new Error(`Static server process ${serverProcess.pid ?? '(unknown PID)'} did not exit after SIGKILL`)
    }
  }
}

async function waitForReady(url) {
  const deadline = Date.now() + 20_000

  while (Date.now() < deadline) {
    if (serverSpawnError) {
      throw serverSpawnError
    }
    if (serverProcess && (serverProcess.exitCode !== null || serverProcess.signalCode !== null)) {
      throw new Error(`Static server exited before it became ready: code=${serverProcess.exitCode} signal=${serverProcess.signalCode}`)
    }

    try {
      const res = await fetch(url, { redirect: 'manual' })
      if (res.status === 200 || res.status === 302) return
    } catch {
    }
    await delay(250)
  }

  throw new Error(`Server did not start in time: ${url}`)
}

async function assertStatus(url, expected) {
  const res = await fetch(url, { redirect: 'manual' })
  if (res.status !== expected) {
    throw new Error(`${url} returned ${res.status}, expected ${expected}`)
  }
  return res
}

async function assertHeadStatus(url, expected) {
  const res = await fetch(url, { method: 'HEAD', redirect: 'manual' })
  if (res.status !== expected) {
    throw new Error(`HEAD ${url} returned ${res.status}, expected ${expected}`)
  }
  if (!res.headers.has('content-length')) {
    throw new Error(`HEAD ${url} did not include content-length`)
  }
  return res
}

async function assertCacheControl(url, expectedSubstring, { invert = false } = {}) {
  const res = await fetch(url, { redirect: 'manual' })
  const cacheControl = res.headers.get('cache-control') ?? ''
  const matches = cacheControl.includes(expectedSubstring)
  if ((!invert && !matches) || (invert && matches)) {
    throw new Error(`${url} cache-control was "${cacheControl}", expected ${invert ? 'not ' : ''}to contain "${expectedSubstring}"`)
  }
}

async function findChunkAssetUrl() {
  const chunksDir = path.resolve(cwd, 'out', '_next', 'static', 'chunks')
  const chunkFiles = (await readdir(chunksDir))
    .filter(name => name.endsWith('.js'))
    .sort()

  if (chunkFiles.length === 0) {
    throw new Error(`No JS chunks found in ${chunksDir}`)
  }

  return appUrl(`/_next/static/chunks/${chunkFiles[0]}`)
}

async function findHtmlFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await findHtmlFiles(absolutePath))
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(absolutePath)
    }
  }
  return files
}

function decodeHtmlAttribute(value) {
  const namedEntities = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    quot: '"',
  }

  return value.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (entity, decimal, hex, named) => {
    if (decimal || hex) {
      const codePoint = Number.parseInt(decimal ?? hex, decimal ? 10 : 16)
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10FFFF
        ? String.fromCodePoint(codePoint)
        : entity
    }
    return named ? namedEntities[named.toLowerCase()] ?? entity : entity
  })
}

function parseHtmlAttributes(tag) {
  const attributes = new Map()
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  for (const match of tag.matchAll(attributePattern)) {
    const name = match[1].toLowerCase()
    if (name === 'meta') continue
    const rawValue = match[2] ?? match[3] ?? match[4]
    if (rawValue !== undefined) {
      attributes.set(name, decodeHtmlAttribute(rawValue))
    }
  }
  return attributes
}

function requireSingleMetaContent(head, attributeName, metadataName, htmlFile) {
  const matches = []
  for (const tagMatch of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseHtmlAttributes(tagMatch[0])
    if (attributes.get(attributeName) === metadataName && attributes.has('content')) {
      matches.push(attributes.get('content'))
    }
  }

  if (matches.length !== 1) {
    throw new Error(
      `Expected one ${attributeName}="${metadataName}" meta tag in ${path.relative(cwd, htmlFile)}, found ${matches.length}`,
    )
  }
  return matches[0]
}

async function assertSocialPreviewMetadata() {
  const htmlFile = path.resolve(cwd, 'out', 'index.html')
  const html = await readFile(htmlFile, 'utf8')
  const headMatch = html.match(/<head(?:\s[^>]*)?>([\s\S]*?)<\/head>/i)
  if (!headMatch) {
    throw new Error(`Missing complete head element in ${path.relative(cwd, htmlFile)}`)
  }
  const head = headMatch[1]

  const twitterCard = requireSingleMetaContent(head, 'name', 'twitter:card', htmlFile)
  if (twitterCard !== 'summary_large_image') {
    throw new Error(`twitter:card was "${twitterCard}", expected "summary_large_image"`)
  }

  const openGraphUrl = requireSingleMetaContent(head, 'property', 'og:url', htmlFile)
  const openGraphImage = requireSingleMetaContent(head, 'property', 'og:image', htmlFile)
  const twitterImage = requireSingleMetaContent(head, 'name', 'twitter:image', htmlFile)
  if (openGraphImage !== twitterImage) {
    throw new Error(`og:image and twitter:image differ: "${openGraphImage}" vs "${twitterImage}"`)
  }

  let pageUrl
  let imageUrl
  try {
    pageUrl = new URL(openGraphUrl)
    imageUrl = new URL(openGraphImage)
  } catch {
    throw new Error('Social metadata URLs must be absolute URLs')
  }
  if (!['http:', 'https:'].includes(pageUrl.protocol) || !['http:', 'https:'].includes(imageUrl.protocol)) {
    throw new Error('Social metadata URLs must use HTTP or HTTPS')
  }

  const expectedMountPath = basePath ? `${basePath}/` : '/'
  if (pageUrl.pathname !== expectedMountPath) {
    throw new Error(`og:url path was "${pageUrl.pathname}", expected configured mount "${expectedMountPath}"`)
  }
  const expectedImageUrl = new URL(SOCIAL_PREVIEW_FILENAME, pageUrl).toString()
  if (openGraphImage !== expectedImageUrl) {
    throw new Error(`Social image URL was "${openGraphImage}", expected app-relative URL "${expectedImageUrl}"`)
  }

  const expectedImagePath = `${basePath}/${SOCIAL_PREVIEW_FILENAME}`
  if (imageUrl.pathname !== expectedImagePath || imageUrl.search || imageUrl.hash) {
    throw new Error(`Social image must resolve exactly under the configured mount at "${expectedImagePath}"`)
  }

  const openGraphType = requireSingleMetaContent(head, 'property', 'og:image:type', htmlFile)
  const openGraphWidth = requireSingleMetaContent(head, 'property', 'og:image:width', htmlFile)
  const openGraphHeight = requireSingleMetaContent(head, 'property', 'og:image:height', htmlFile)
  const openGraphAlt = requireSingleMetaContent(head, 'property', 'og:image:alt', htmlFile)
  const twitterType = requireSingleMetaContent(head, 'name', 'twitter:image:type', htmlFile)
  const twitterWidth = requireSingleMetaContent(head, 'name', 'twitter:image:width', htmlFile)
  const twitterHeight = requireSingleMetaContent(head, 'name', 'twitter:image:height', htmlFile)
  const twitterAlt = requireSingleMetaContent(head, 'name', 'twitter:image:alt', htmlFile)

  if (openGraphType !== SOCIAL_PREVIEW_TYPE || twitterType !== SOCIAL_PREVIEW_TYPE) {
    throw new Error(`Social image metadata must declare ${SOCIAL_PREVIEW_TYPE}`)
  }
  if (openGraphWidth !== String(SOCIAL_PREVIEW_WIDTH)
    || twitterWidth !== String(SOCIAL_PREVIEW_WIDTH)
    || openGraphHeight !== String(SOCIAL_PREVIEW_HEIGHT)
    || twitterHeight !== String(SOCIAL_PREVIEW_HEIGHT)) {
    throw new Error(`Social image metadata must declare ${SOCIAL_PREVIEW_WIDTH}x${SOCIAL_PREVIEW_HEIGHT}`)
  }
  if (openGraphAlt !== SOCIAL_PREVIEW_ALT || twitterAlt !== SOCIAL_PREVIEW_ALT) {
    throw new Error('Open Graph and Twitter social images must keep the meaningful Travelback alt text')
  }
}

function assertPngHeader(bytes) {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  if (bytes.length < 24 || !bytes.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error('Social preview response is not a valid PNG')
  }
  if (bytes.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('Social preview PNG is missing its IHDR chunk')
  }

  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  if (width !== SOCIAL_PREVIEW_WIDTH || height !== SOCIAL_PREVIEW_HEIGHT) {
    throw new Error(`Social preview PNG is ${width}x${height}, expected ${SOCIAL_PREVIEW_WIDTH}x${SOCIAL_PREVIEW_HEIGHT}`)
  }
}

async function assertSocialPreviewAsset() {
  const url = appUrl(`/${SOCIAL_PREVIEW_FILENAME}`)
  const res = await assertStatus(url, 200)
  const contentType = (res.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase()
  if (contentType !== SOCIAL_PREVIEW_TYPE) {
    throw new Error(`${url} content-type was "${contentType}", expected "${SOCIAL_PREVIEW_TYPE}"`)
  }
  assertPngHeader(Buffer.from(await res.arrayBuffer()))
}

function assertStaticCspWasHardenedInHtml(html, htmlFile) {
  const relativeFile = path.relative(cwd, htmlFile)
  const cspTags = html.match(/<meta\s+[^>]*http-equiv=(?:"Content-Security-Policy"|'Content-Security-Policy')[^>]*>/gi) ?? []
  if (cspTags.length !== 1) {
    throw new Error(`Expected one Content-Security-Policy meta tag in ${relativeFile}, found ${cspTags.length}`)
  }

  const cspMatch = html.match(/<meta\s+http-equiv="Content-Security-Policy"[^>]*content="([^"]+)"/i)
  if (!cspMatch) {
    throw new Error(`Missing hardened Content-Security-Policy meta tag in ${relativeFile}`)
  }

  const csp = cspMatch[1]
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')

  const directiveSources = (directiveName) => {
    const directive = csp
      .split(';')
      .map(value => value.trim())
      .find(value => value === directiveName || value.startsWith(`${directiveName} `))
    return new Set(directive?.split(/\s+/).slice(1) ?? [])
  }

  if (csp.includes("script-src 'self' 'unsafe-inline'")) {
    throw new Error('Static CSP still allows unsafe-inline scripts')
  }

  if (!/script-src 'self' [^;]*'sha256-/.test(csp)) {
    throw new Error('Static CSP does not include script hashes')
  }

  if (!csp.includes("connect-src 'self'")) {
    throw new Error('Static CSP is missing connect-src self')
  }

  if (!csp.includes("style-src 'self'")) {
    throw new Error("Static CSP must keep stylesheet loading restricted to self")
  }

  if (!csp.includes("style-src-elem 'self'")) {
    throw new Error("Static CSP must keep style elements restricted to self-hosted stylesheets")
  }

  const styleSources = directiveSources('style-src')
  const styleElementSources = directiveSources('style-src-elem')
  const scriptSources = directiveSources('script-src')
  if (styleSources.has("'unsafe-inline'") || styleElementSources.has("'unsafe-inline'")) {
    throw new Error('Static CSP still allows unsafe-inline style elements')
  }

  if (!csp.includes("style-src-attr 'unsafe-inline'")) {
    throw new Error("Static CSP must isolate legacy inline style attributes in style-src-attr")
  }

  if (csp.includes('nominatim.openstreetmap.org')) {
    throw new Error('Static CSP still allows Nominatim requests')
  }

  // `frame-ancestors` is header-only per the CSP spec; meta delivery is ignored
  // by browsers and causes a console error. Anti-framing is enforced via the
  // JS frame-buster and host-level headers; the meta CSP must not advertise it.
  if (csp.includes('frame-ancestors')) {
    throw new Error("Static CSP meta must not declare frame-ancestors (header-only directive)")
  }

  // Assert invariants pinned in scripts/harden-static-export.mjs STYLE_POLICY.
  // If either directive regresses the hardened CSP loses meaningful protection
  // against plugin-based content injection and <base> takeover respectively.
  if (!csp.includes("object-src 'none'")) {
    throw new Error("Static CSP must declare object-src 'none'")
  }
  if (!csp.includes("base-uri 'none'")) {
    throw new Error("Static CSP must declare base-uri 'none'")
  }

  const inlineStylePattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi
  for (const match of html.matchAll(inlineStylePattern)) {
    const styleContent = match[1]
    if (!styleContent || styleContent.trim() === '') continue
    const hash = crypto.createHash('sha256').update(styleContent, 'utf8').digest('base64')
    const source = `'sha256-${hash}'`
    if (!styleSources.has(source) || !styleElementSources.has(source)) {
      throw new Error(`Static CSP does not authorize an inline style in ${relativeFile}`)
    }
  }

  const inlineScriptPattern = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi
  for (const match of html.matchAll(inlineScriptPattern)) {
    const scriptContent = match[1]
    if (!scriptContent || scriptContent.trim() === '') continue
    const hash = crypto.createHash('sha256').update(scriptContent, 'utf8').digest('base64')
    const source = `'sha256-${hash}'`
    if (!scriptSources.has(source)) {
      throw new Error(`Static CSP does not authorize the literal body of an inline script in ${relativeFile}`)
    }
  }

  const head = html.match(/<head(?:\s[^>]*)?>([\s\S]*?)<\/head>/i)
  if (!head) {
    throw new Error(`Missing complete head element in ${relativeFile}`)
  }
  const cspIndex = head[1].indexOf(cspTags[0])
  const activeContentIndex = head[1].search(/<(?:script|style)\b|<link\b[^>]*\brel\s*=\s*(?:"[^"]*\b(?:stylesheet|modulepreload|preload)\b[^"]*"|'[^']*\b(?:stylesheet|modulepreload|preload)\b[^']*')/i)
  if (cspIndex < 0 || (activeContentIndex >= 0 && cspIndex > activeContentIndex)) {
    throw new Error(`Static CSP must precede active head content in ${relativeFile}`)
  }
}

async function assertStaticCspWasHardened() {
  const htmlFiles = await findHtmlFiles(path.resolve(cwd, 'out'))
  if (htmlFiles.length === 0) {
    throw new Error('No generated HTML files found for CSP validation')
  }

  for (const htmlFile of htmlFiles) {
    assertStaticCspWasHardenedInHtml(await readFile(htmlFile, 'utf8'), htmlFile)
  }
}

async function assertMapStylesPinnedLocally() {
  const stylesDir = path.resolve(cwd, 'out', 'map-styles')
  const styleFiles = (await readdir(stylesDir)).filter((name) => name.endsWith('.json'))

  if (styleFiles.length === 0) {
    throw new Error(`No map styles found in ${stylesDir}`)
  }

  for (const file of styleFiles) {
    const content = JSON.parse(await readFile(path.join(stylesDir, file), 'utf8'))
    if ('sprite' in content || 'glyphs' in content) {
      throw new Error(`${file} still depends on remote sprite/glyph assets`)
    }

    const sourceKeys = Object.keys(content.sources ?? {})
    if (sourceKeys.length !== 0) {
      throw new Error(`${file} still declares external basemap sources: ${sourceKeys.join(', ')}`)
    }

    const hasSymbols = Array.isArray(content.layers) && content.layers.some((layer) => layer.type === 'symbol')
    if (hasSymbols) {
      throw new Error(`${file} still includes symbol layers that require glyph or sprite assets`)
    }
  }
}

async function assertWorkerParserOwnership() {
  const parseUtilsSource = await readFile(path.resolve(cwd, 'src/lib/parse-utils.ts'), 'utf8')
  const googleParserSource = await readFile(path.resolve(cwd, 'src/lib/googleJsonParser.ts'), 'utf8')
  const workerEntrySource = await readFile(path.resolve(cwd, 'src/workers/trackParser.worker.ts'), 'utf8')
  const workerSource = await readFile(path.resolve(cwd, 'public/workers/trackParser.worker.js'), 'utf8')

  const trackLimit = parseUtilsSource.match(/export const MAX_TRACK_POINTS = ([\d_]+)/)
  const jsonPolicy = parseUtilsSource.match(/json:\s*\{\s*maxBytes:\s*(\d+)\s*\*\s*MEBIBYTE,\s*warningBytes:\s*(\d+)\s*\*\s*MEBIBYTE/)
  const xmlPolicy = parseUtilsSource.match(/xml:\s*\{\s*maxBytes:\s*(\d+)\s*\*\s*MEBIBYTE,\s*warningBytes:\s*(\d+)\s*\*\s*MEBIBYTE/)
  if (!trackLimit || trackLimit[1].replace(/_/g, '') !== '250000') {
    throw new Error('MAX_TRACK_POINTS must be owned by src/lib/parse-utils.ts and remain 250,000')
  }
  if (!jsonPolicy || jsonPolicy[1] !== '100' || Number(jsonPolicy[2]) <= 0 || Number(jsonPolicy[2]) >= Number(jsonPolicy[1])) {
    throw new Error('JSON import policy must remain at 100MB with a below-limit warning threshold')
  }
  if (!xmlPolicy || xmlPolicy[1] !== '4' || Number(xmlPolicy[2]) <= 0 || Number(xmlPolicy[2]) >= Number(xmlPolicy[1])) {
    throw new Error('XML import policy must remain at 4MB with a below-limit warning threshold')
  }
  if (!parseUtilsSource.includes('JSON_MAX_FILE_SIZE = IMPORT_SIZE_POLICY.json.maxBytes')
    || !parseUtilsSource.includes('XML_MAX_FILE_SIZE = IMPORT_SIZE_POLICY.xml.maxBytes')) {
    throw new Error('Legacy file-size exports must derive from IMPORT_SIZE_POLICY')
  }
  if (!workerEntrySource.includes("from '@/lib/googleJsonParser'") || !workerEntrySource.includes("from '@/lib/parse-utils'")) {
    throw new Error('Worker entry must import the shared parser and parsing constants')
  }
  if (googleParserSource.includes('duplicated (in plain JS)')) {
    throw new Error('Google parser still documents a manually duplicated worker implementation')
  }
  if (!workerSource.startsWith('// Generated by scripts/build-worker.mjs')) {
    throw new Error('Worker asset is not marked as deterministic generated output')
  }

  await new Promise((resolve, reject) => {
    const check = spawn(process.execPath, ['scripts/build-worker.mjs', '--check'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    check.stderr.on('data', chunk => { stderr += chunk })
    check.once('error', reject)
    check.once('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `Worker generation check exited ${code}`))
    })
  })
}

async function assertNoToolResidue(rootDir) {
  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        if (FORBIDDEN_HIDDEN_DIRS.has(entry.name)) {
          throw new Error(`Forbidden tool-state directory found in static assets: ${path.relative(cwd, entryPath)}`)
        }
        await walk(entryPath)
      }
    }
  }

  await walk(rootDir)
}

async function assertRuntimePublicAssetCachePolicy() {
  const runtimeAssetUrls = [
    appUrl('/workers/trackParser.worker.js'),
    appUrl('/map-styles/voyager.json'),
  ]
  for (const url of runtimeAssetUrls) {
    const res = await fetch(url, { redirect: 'manual' })
    if (res.status !== 200) {
      throw new Error(`${url} returned ${res.status}, expected 200`)
    }
    const cacheControl = res.headers.get('cache-control') ?? ''
    if (!cacheControl.includes('no-cache') && !cacheControl.includes('must-revalidate')) {
      throw new Error(`${url} cache-control was "${cacheControl}", expected no-cache or must-revalidate`)
    }
  }
}

function assertLiteralInlineScriptHashing() {
  const scriptContent = 'globalThis.__travelbackEntityFixture = "&amp;&#39;&#x27;&lt;&gt;"'
  const fixtureHtml = `<script data-fixture="entity-shaped-raw-text">${scriptContent}</script>`
  const expectedHash = crypto.createHash('sha256').update(scriptContent, 'utf8').digest('base64')
  const expectedSource = `'sha256-${expectedHash}'`
  const hashes = computeScriptHashes(fixtureHtml)

  if (hashes.length !== 1 || hashes[0] !== expectedSource) {
    throw new Error('Inline script CSP hashing changed entity-shaped raw text before hashing')
  }
}

async function createSymlinkEscapeFixture() {
  const fixtureDirectory = await mkdtemp(path.join(os.tmpdir(), 'travelback-static-smoke-'))
  const sentinel = `TRAVELBACK_STATIC_ESCAPE_SENTINEL_${process.pid}`
  const targetPath = path.join(fixtureDirectory, 'outside-root.txt')
  const linkName = `.travelback-symlink-escape-${path.basename(fixtureDirectory)}.txt`
  const linkPath = path.resolve(cwd, 'out', linkName)

  try {
    await writeFile(targetPath, sentinel)
    await symlink(targetPath, linkPath)
    return {
      fixtureDirectory,
      linkName,
      linkPath,
      sentinel,
    }
  } catch (error) {
    await rm(linkPath, { force: true }).catch(() => {})
    await rm(fixtureDirectory, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}

async function removeSymlinkEscapeFixture(fixture) {
  if (!fixture) return
  await rm(fixture.linkPath, { force: true })
  await rm(fixture.fixtureDirectory, { recursive: true, force: true })
}

async function assertSymlinkEscapeDenied(fixture) {
  const url = appUrl(`/${fixture.linkName}`)
  const res = await fetch(url, { redirect: 'manual' })
  const body = await res.text()
  if (res.status !== 403) {
    throw new Error(`${url} returned ${res.status}, expected 403 for an out-of-tree symlink`)
  }
  if (body.includes(fixture.sentinel)) {
    throw new Error('Static server disclosed the out-of-tree symlink target')
  }
}

let failed = false
let symlinkFixture

try {
  await access(outSample, constants.R_OK)
  assertLiteralInlineScriptHashing()
  symlinkFixture = await createSymlinkEscapeFixture()

  serverProcess = spawn(
    process.execPath,
    ['scripts/serve-static.mjs', '--port', String(port), '--base-path', basePath || '/'],
    {
      cwd,
      stdio: 'inherit',
    },
  )
  serverExit = new Promise(resolve => {
    serverProcess.once('exit', resolve)
  })
  serverProcess.once('error', (error) => {
    serverSpawnError = error
  })

  await waitForReady(`${origin}${appPath}`)
  await assertSymlinkEscapeDenied(symlinkFixture)
  await assertStatus(appUrl('/sample-trip.gpx'), 200)
  await assertHeadStatus(appUrl('/sample-trip.gpx'), 200)
  await assertSocialPreviewMetadata()
  await assertSocialPreviewAsset()
  const chunkUrl = await findChunkAssetUrl()
  await assertStatus(chunkUrl, 200)
  await assertStatus(appUrl('/_not-found.html'), 200)
  if (basePath) {
    await assertStatus(`${origin}/sample-trip.gpx`, 404)
  }
  await assertCacheControl(appUrl('/sample-trip.gpx'), 'immutable', { invert: true })
  await assertCacheControl(chunkUrl, 'immutable')
  await assertStaticCspWasHardened()
  await assertNoToolResidue(path.resolve(cwd, 'public'))
  await assertNoToolResidue(path.resolve(cwd, 'out'))
  await assertMapStylesPinnedLocally()
  await assertWorkerParserOwnership()
  await assertRuntimePublicAssetCachePolicy()
  console.log('[smoke-static] OK')
} catch (err) {
  failed = true
  console.error('[smoke-static] FAILED:', err instanceof Error ? err.message : String(err))
} finally {
  try {
    await stopServerProcess()
  } catch (err) {
    failed = true
    console.error('[smoke-static] FAILED to stop server:', err instanceof Error ? err.message : String(err))
  }
  try {
    await removeSymlinkEscapeFixture(symlinkFixture)
  } catch (err) {
    failed = true
    console.error('[smoke-static] FAILED to clean fixture:', err instanceof Error ? err.message : String(err))
  }
}

if (failed) {
  process.exit(1)
}
