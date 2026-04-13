import { constants } from 'node:fs'
import { access, readdir } from 'node:fs/promises'
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
