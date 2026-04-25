import { spawn } from 'node:child_process'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { createServer as createTcpServer } from 'node:net'

function parsePort(value, name) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}: ${value}`)
  }
  return parsed
}

async function reserveAvailablePort(preferredPort, allowFallback) {
  const tryListen = (portToTry) => new Promise((resolve, reject) => {
    const server = createTcpServer()
    server.once('error', reject)
    server.listen(portToTry, () => {
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

async function readActiveNextDevLock() {
  try {
    const lockPath = path.resolve(process.cwd(), '.next/dev/lock')
    const lock = JSON.parse(await readFile(lockPath, 'utf8'))
    const pid = Number(lock.pid)
    const port = parsePort(lock.port, '.next/dev/lock port')
    if (!Number.isInteger(pid) || pid <= 0) return null
    process.kill(pid, 0)
    return { port }
  } catch {
    return null
  }
}

const activeDevLock = process.env.PLAYWRIGHT_DEV_PORT ? null : await readActiveNextDevLock()
const preferredPort = parsePort(process.env.PLAYWRIGHT_DEV_PORT ?? '3099', 'PLAYWRIGHT_DEV_PORT')
const port = activeDevLock?.port ?? await reserveAvailablePort(preferredPort, !process.env.PLAYWRIGHT_DEV_PORT)
const playwrightBin = path.resolve(process.cwd(), 'node_modules/.bin/playwright')
const env = {
  ...process.env,
  PLAYWRIGHT_DEV_PORT: String(port),
  PLAYWRIGHT_REUSE_EXISTING_SERVER: activeDevLock ? '1' : '0',
}
delete env.NO_COLOR

const child = spawn(
  playwrightBin,
  ['test', '-c', 'playwright.config.ts'],
  {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  },
)

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
