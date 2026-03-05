import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${PORT}/travelback`,
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
    command: `node scripts/serve-static.mjs --port ${PORT} --base-path /travelback`,
    url: `http://localhost:${PORT}/travelback`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
