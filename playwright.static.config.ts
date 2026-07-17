import { defineConfig, devices } from '@playwright/test'
import { normalizeBasePath } from './src/lib/base-path.mjs'

const PORT = Number(process.env.PLAYWRIGHT_STATIC_PORT ?? '4173')
const RAW_BASE_PATH = process.env.TRAVELBACK_BASE_PATH ?? process.env.STATIC_BASE_PATH ?? '/travelback'

const BASE_PATH = normalizeBasePath(RAW_BASE_PATH)
const BASE_URL_PATH = BASE_PATH ? `${BASE_PATH}/` : '/'
const SERVER_BASE_PATH_ARG = BASE_PATH || '/'

if (!Number.isInteger(PORT) || PORT <= 0) {
  throw new Error(`Invalid PLAYWRIGHT_STATIC_PORT: ${process.env.PLAYWRIGHT_STATIC_PORT ?? '4173'}`)
}

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${PORT}${BASE_URL_PATH}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    locale: 'en-US',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-features=SharedArrayBuffer',
            '--enable-experimental-web-platform-features',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-webgl',
            '--ignore-gpu-blocklist',
            '--disable-gpu-sandbox',
          ],
        },
      },
    },
  ],
  webServer: {
    command: `node scripts/serve-static.mjs --port ${PORT} --base-path ${SERVER_BASE_PATH_ARG}`,
    url: `http://localhost:${PORT}${BASE_URL_PATH}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
