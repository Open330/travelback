import path from 'node:path'
import {
  exitLikeSupervisedProcess,
  parsePort,
  readReusableNextDevLock,
  reserveAvailablePort,
  runSupervisedProcess,
} from './e2e-process-supervisor.mjs'

const activeDevLock = process.env.PLAYWRIGHT_DEV_PORT ? null : await readReusableNextDevLock()
const preferredPort = parsePort(process.env.PLAYWRIGHT_DEV_PORT ?? '3099', 'PLAYWRIGHT_DEV_PORT')
const port = activeDevLock?.port ?? await reserveAvailablePort(preferredPort, !process.env.PLAYWRIGHT_DEV_PORT)
const playwrightBin = path.resolve(process.cwd(), 'node_modules/.bin/playwright')
const env = {
  ...process.env,
  PLAYWRIGHT_DEV_PORT: String(port),
  PLAYWRIGHT_REUSE_EXISTING_SERVER: activeDevLock ? '1' : '0',
}
delete env.NO_COLOR

try {
  const outcome = await runSupervisedProcess(
    playwrightBin,
    ['test', '-c', 'playwright.config.ts', ...process.argv.slice(2)],
    {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
    },
  )
  exitLikeSupervisedProcess(outcome)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Unable to stop the Playwright process tree: ${message}`)
  process.exitCode = 1
}
