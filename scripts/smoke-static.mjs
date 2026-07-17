import { constants } from 'node:fs'
import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { createServer as createTcpServer } from 'node:net'
import { normalizeBasePath } from '../src/lib/base-path.mjs'

const cwd = process.cwd()
const outSample = path.resolve(cwd, 'out', 'sample-trip.gpx')
const FORBIDDEN_HIDDEN_DIRS = new Set(['.omc', '.omx', '.claude', '.codex', '.git'])

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

await access(outSample, constants.R_OK)

const serverProcess = spawn(
  process.execPath,
  ['scripts/serve-static.mjs', '--port', String(port), '--base-path', basePath || '/'],
  {
    cwd,
    stdio: 'inherit',
  },
)

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function stopServerProcess() {
  if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) return
  const exited = new Promise(resolve => {
    serverProcess.once('exit', resolve)
  })
  serverProcess.kill('SIGTERM')
  await Promise.race([exited, delay(2000)])
  if (serverProcess.exitCode === null && serverProcess.signalCode === null) {
    serverProcess.kill('SIGKILL')
    await Promise.race([exited, delay(1000)])
  }
}

async function waitForReady(url) {
  const deadline = Date.now() + 20_000

  while (Date.now() < deadline) {
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

let failed = false

try {
  await waitForReady(`${origin}${appPath}`)
  await assertStatus(appUrl('/sample-trip.gpx'), 200)
  await assertHeadStatus(appUrl('/sample-trip.gpx'), 200)
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
  await stopServerProcess()
}

if (failed) {
  process.exit(1)
}
