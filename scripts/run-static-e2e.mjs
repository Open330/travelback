import path from 'node:path'
import {
  exitLikeSupervisedProcess,
  parsePort,
  reserveAvailablePort,
  runSupervisedProcess,
} from './e2e-process-supervisor.mjs'

const preferredPort = parsePort(process.env.PLAYWRIGHT_STATIC_PORT ?? '4173', 'PLAYWRIGHT_STATIC_PORT')
const port = await reserveAvailablePort(preferredPort, !process.env.PLAYWRIGHT_STATIC_PORT)
const playwrightBin = path.resolve(process.cwd(), 'node_modules/.bin/playwright')
const env = {
  ...process.env,
  PLAYWRIGHT_STATIC_PORT: String(port),
  TRAVELBACK_E2E_TARGET: 'static',
}
delete env.NO_COLOR

try {
  const outcome = await runSupervisedProcess(
    playwrightBin,
    ['test', '-c', 'playwright.static.config.ts', ...process.argv.slice(2)],
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
