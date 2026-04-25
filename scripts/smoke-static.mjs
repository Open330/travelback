import { constants } from 'node:fs'
import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createServer as createTcpServer } from 'node:net'

const cwd = process.cwd()
const outSample = path.resolve(cwd, 'out', 'sample-trip.gpx')
const FORBIDDEN_HIDDEN_DIRS = new Set(['.omc', '.omx', '.claude', '.codex', '.git'])

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

await access(outSample, constants.R_OK)

const serverProcess = spawn(
  process.execPath,
  ['scripts/serve-static.mjs', '--port', String(port), '--base-path', '/travelback'],
  {
    cwd,
    stdio: 'inherit',
  },
)

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
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

  return `http://127.0.0.1:${port}/travelback/_next/static/chunks/${chunkFiles[0]}`
}

async function assertStaticCspWasHardened() {
  const html = await readFile(path.resolve(cwd, 'out', 'index.html'), 'utf8')
  const cspMatch = html.match(/<meta\s+http-equiv="Content-Security-Policy"[^>]*content="([^"]+)"/i)
  if (!cspMatch) {
    throw new Error('Missing Content-Security-Policy meta tag in out/index.html')
  }

  const csp = cspMatch[1]
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')

  if (csp.includes("script-src 'self' 'unsafe-inline'")) {
    throw new Error('Static CSP still allows unsafe-inline scripts')
  }

  if (!/script-src 'self' [^;]*'sha256-/.test(csp)) {
    throw new Error('Static CSP does not include script hashes')
  }

  if (!csp.includes("connect-src 'self'")) {
    throw new Error('Static CSP is missing connect-src self')
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

async function assertWorkerParserConstantsMatch() {
  const parserSource = await readFile(path.resolve(cwd, 'src/lib/parser.ts'), 'utf8')
  const workerSource = await readFile(path.resolve(cwd, 'public/workers/trackParser.worker.js'), 'utf8')

  const parserJsonLimit = parserSource.match(/export const JSON_MAX_FILE_SIZE = (\d+) \* 1024 \* 1024/)
  const workerMessageLimit = workerSource.match(/const MAX_MESSAGE_SIZE = (\d+) \* 1024 \* 1024/)
  if (!parserJsonLimit || !workerMessageLimit || parserJsonLimit[1] !== workerMessageLimit[1]) {
    throw new Error('Worker MAX_MESSAGE_SIZE must match JSON_MAX_FILE_SIZE in src/lib/parser.ts')
  }

  const parserTrackLimit = parserSource.match(/const MAX_TRACK_POINTS = ([\d_]+)/)
  const workerTrackLimit = workerSource.match(/const MAX_TRACK_POINTS = ([\d_]+)/)
  if (!parserTrackLimit || !workerTrackLimit || parserTrackLimit[1].replace(/_/g, '') !== workerTrackLimit[1].replace(/_/g, '')) {
    throw new Error('Worker MAX_TRACK_POINTS must match MAX_TRACK_POINTS in src/lib/parser.ts')
  }

  const parserXmlLimit = parserSource.match(/export const XML_MAX_FILE_SIZE = (\d+) \* 1024 \* 1024/)
  if (!parserXmlLimit || Number(parserXmlLimit[1]) > 4) {
    throw new Error('XML_MAX_FILE_SIZE must stay at or below 4MB for main-thread XML parsing')
  }

  const parserCodes = [...parserSource.matchAll(/'([A-Z_]+)'/g)]
    .map(match => match[1])
    .filter(code => code.endsWith('FORMAT') || code.endsWith('JSON') || code.endsWith('POINTS') || code.endsWith('LARGE') || code.endsWith('FAILED') || code.endsWith('EXCEEDED') || code.endsWith('ERROR'))
  const workerCodes = [...workerSource.matchAll(/'([A-Z_]+)'/g)].map(match => match[1])
  for (const code of workerCodes.filter(code => code !== 'message')) {
    if (code.includes('_') && !parserCodes.includes(code) && code !== 'UNSUPPORTED_GOOGLE_FORMAT') {
      throw new Error(`Worker error code ${code} is not mirrored in src/lib/parser.ts`)
    }
  }
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
    `http://127.0.0.1:${port}/travelback/workers/trackParser.worker.js`,
    `http://127.0.0.1:${port}/travelback/map-styles/voyager.json`,
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
  await waitForReady(`http://127.0.0.1:${port}/travelback/`)
  await assertStatus(`http://127.0.0.1:${port}/travelback/sample-trip.gpx`, 200)
  await assertHeadStatus(`http://127.0.0.1:${port}/travelback/sample-trip.gpx`, 200)
  const chunkUrl = await findChunkAssetUrl()
  await assertStatus(chunkUrl, 200)
  await assertStatus(`http://127.0.0.1:${port}/travelback/_not-found.html`, 200)
  await assertStatus(`http://127.0.0.1:${port}/sample-trip.gpx`, 404)
  await assertCacheControl(`http://127.0.0.1:${port}/travelback/sample-trip.gpx`, 'immutable', { invert: true })
  await assertCacheControl(chunkUrl, 'immutable')
  await assertStaticCspWasHardened()
  await assertNoToolResidue(path.resolve(cwd, 'public'))
  await assertNoToolResidue(path.resolve(cwd, 'out'))
  await assertMapStylesPinnedLocally()
  await assertWorkerParserConstantsMatch()
  await assertRuntimePublicAssetCachePolicy()
  console.log('[smoke-static] OK')
} catch (err) {
  failed = true
  console.error('[smoke-static] FAILED:', err instanceof Error ? err.message : String(err))
} finally {
  if (!serverProcess.killed) {
    serverProcess.kill('SIGTERM')
  }
}

if (failed) {
  process.exit(1)
}
