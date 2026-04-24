import { spawn } from 'node:child_process'
import path from 'node:path'
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

const preferredPort = parsePort(process.env.PLAYWRIGHT_DEV_PORT ?? '3099', 'PLAYWRIGHT_DEV_PORT')
const port = await reserveAvailablePort(preferredPort, !process.env.PLAYWRIGHT_DEV_PORT)
const playwrightBin = path.resolve(process.cwd(), 'node_modules/.bin/playwright')
const env = {
  ...process.env,
  PLAYWRIGHT_DEV_PORT: String(port),
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
