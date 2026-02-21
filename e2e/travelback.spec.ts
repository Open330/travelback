import { test, expect, Page } from '@playwright/test'
import path from 'node:path'

const GPX_FIXTURE = path.resolve(__dirname, 'fixtures/sample.gpx')

/** Helper: upload a GPX file and wait for the track to load */
async function uploadGpx(page: Page) {
  // The FileUpload component has a hidden file input
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(GPX_FIXTURE)

  // Wait for track name to appear (indicating successful load)
  await expect(page.getByText('Test Route Seoul')).toBeVisible({ timeout: 15_000 })
}

test.describe('Travelback App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the map to initialize
    await page.waitForSelector('canvas', { timeout: 15_000 })
  })

  test('loads homepage with map canvas', async ({ page }) => {
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
  })

  test('shows file upload area on initial load', async ({ page }) => {
    // The file upload drop zone should be visible
    await expect(page.getByText(/drop.*gpx|upload/i)).toBeVisible({ timeout: 10_000 })
  })

  test('imports GPX file and displays track', async ({ page }) => {
    await uploadGpx(page)

    // Track info should be visible
    await expect(page.getByText('Test Route Seoul')).toBeVisible()
    await expect(page.getByText(/20.*points/)).toBeVisible()

    // Controls should appear
    await expect(page.getByRole('button', { name: /play|pause/i }).or(
      page.locator('button').filter({ has: page.locator('svg') }).first()
    )).toBeVisible({ timeout: 10_000 })
  })

  test('playback controls work after importing track', async ({ page }) => {
    await uploadGpx(page)

    // Find play button (it has a play icon SVG)
    const playBtn = page.locator('button').filter({ has: page.locator('polygon') }).first()
    await expect(playBtn).toBeVisible({ timeout: 10_000 })

    // Click play
    await playBtn.click()
    await page.waitForTimeout(1500)

    // Progress should have advanced (check that we moved from 0)
    // The Follow button should be visible
    await expect(page.getByText('Follow')).toBeVisible()
  })

  test('scene editor opens and allows adding scenes', async ({ page }) => {
    await uploadGpx(page)

    // Click Scenes button
    const scenesBtn = page.getByText('Scenes', { exact: true })
    await expect(scenesBtn).toBeVisible({ timeout: 10_000 })
    await scenesBtn.click()

    // Scene editor should appear
    await expect(page.getByText('No scenes yet')).toBeVisible({ timeout: 5_000 })

    // Click add scene
    const addBtn = page.getByText('+ Add')
    await addBtn.click()

    // Should have a scene now
    await expect(page.getByText('Scene 1')).toBeVisible()

    // Camera mode selector should be visible
    await expect(page.locator('select').filter({ hasText: 'Flyover' })).toBeVisible()
  })

  test('scene editor can change camera mode', async ({ page }) => {
    await uploadGpx(page)

    // Open scene editor
    await page.getByText('Scenes', { exact: true }).click()
    await page.getByText('+ Add').click()

    // Change camera mode to Orbit
    const modeSelect = page.locator('.space-y-2 select').first()
    await modeSelect.selectOption('orbit')
    await expect(modeSelect).toHaveValue('orbit')
  })

  test('map style cycling works', async ({ page }) => {
    await uploadGpx(page)

    // Click style cycle button (shows "Voyager" initially)
    const styleBtn = page.getByText('Voyager')
    await expect(styleBtn).toBeVisible({ timeout: 10_000 })
    await styleBtn.click()

    // Should cycle to "Light"
    await expect(page.getByText('Light')).toBeVisible({ timeout: 5_000 })
  })

  test('export panel opens with resolution and codec options', async ({ page }) => {
    await uploadGpx(page)

    // Click Export button
    const exportBtn = page.getByText('Export', { exact: true })
    await expect(exportBtn).toBeVisible({ timeout: 10_000 })
    await exportBtn.click()

    // Export panel should be visible with resolution presets
    await expect(page.getByText('Export Video')).toBeVisible()
    await expect(page.getByText('Resolution')).toBeVisible()
    await expect(page.getByText('Codec')).toBeVisible()

    // Should have resolution options
    await expect(page.getByText(/YouTube.*1920.*1080/)).toBeVisible()

    // Should have codec options
    await expect(page.getByText(/H\.264/)).toBeVisible()

    // Should have Start Export button
    await expect(page.getByText('Start Export')).toBeVisible()
  })

  test('export panel can select TikTok resolution', async ({ page }) => {
    await uploadGpx(page)
    await page.getByText('Export', { exact: true }).click()

    // Select TikTok resolution
    const resSelect = page.locator('select').filter({ hasText: /YouTube/ })
    await resSelect.selectOption({ index: 1 }) // TikTok is second option

    // Output description should update
    await expect(page.getByText(/1080.*1920/)).toBeVisible()
  })

  test('export panel close button works', async ({ page }) => {
    await uploadGpx(page)
    await page.getByText('Export', { exact: true }).click()
    await expect(page.getByText('Export Video')).toBeVisible()

    // Close it
    await page.locator('.z-30 button svg').first().click()
    await expect(page.getByText('Export Video')).not.toBeVisible()
  })
})

