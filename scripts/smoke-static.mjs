import { constants } from 'node:fs'
import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const cwd = process.cwd()
const outSample = path.resolve(cwd, 'out', 'sample-trip.gpx')
const port = Number(process.env.STATIC_SMOKE_PORT ?? '4183')

if (!Number.isInteger(port) || port <= 0) {
  console.error(`[smoke-static] Invalid port: ${port}`)
  process.exit(1)
}

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

  if (!csp.includes("connect-src 'self' https://nominatim.openstreetmap.org")) {
    throw new Error('Static CSP did not retain the optional geocoding endpoint')
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

let failed = false

try {
  await waitForReady(`http://127.0.0.1:${port}/travelback/`)
  await assertStatus(`http://127.0.0.1:${port}/travelback/sample-trip.gpx`, 200)
  const chunkUrl = await findChunkAssetUrl()
  await assertStatus(chunkUrl, 200)
  await assertStatus(`http://127.0.0.1:${port}/travelback/_not-found.html`, 200)
  await assertStatus(`http://127.0.0.1:${port}/sample-trip.gpx`, 404)
  await assertCacheControl(`http://127.0.0.1:${port}/travelback/sample-trip.gpx`, 'immutable', { invert: true })
  await assertCacheControl(chunkUrl, 'immutable')
  await assertStaticCspWasHardened()
  await assertMapStylesPinnedLocally()
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
