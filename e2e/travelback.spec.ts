import { test, expect, Page } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const GPX_FIXTURE = path.resolve(__dirname, 'fixtures/sample.gpx')
const KML_FIXTURE = path.resolve(__dirname, 'fixtures/korea-japan.kml')
const JSON_FLAT_FIXTURE = path.resolve(__dirname, 'fixtures/korea-japan.json')
const JSON_RECORDS_FIXTURE = path.resolve(__dirname, 'fixtures/google-records.json')
const JSON_SEMANTIC_LOC_FIXTURE = path.resolve(__dirname, 'fixtures/google-semantic-location.json')
const JSON_TIMELINE_EDITS_FIXTURE = path.resolve(__dirname, 'fixtures/google-timeline-edits.json')
const JSON_SEMANTIC_SEG_FIXTURE = path.resolve(__dirname, 'fixtures/google-semantic-segments.json')

/** Helper: wait for the app to be ready (map container rendered, with or without WebGL) */
async function waitForApp(page: Page) {
  // Wait for the heading to be visible (confirms React rendered)
  await expect(page.getByRole('heading', { name: 'Travelback' })).toBeVisible({ timeout: 30_000 })
  // Give the app a moment to settle
  await page.waitForTimeout(500)
}

/** Helper: check if the map canvas loaded (WebGL worked) */
async function hasMapCanvas(page: Page): Promise<boolean> {
  return await page.locator('canvas').count() > 0
}

/** Helper: upload a GPX file and wait for the track to load */
async function uploadGpx(page: Page) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(GPX_FIXTURE)
  await expect(page.getByText('Test Route Seoul')).toBeVisible({ timeout: 15_000 })
}

/** Helper: upload a KML file and wait for the track to load */
async function uploadKml(page: Page) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(KML_FIXTURE)
  // KML parser reads Document > name first → "Korea to Japan via Ferry"
  await expect(page.getByText('Korea to Japan via Ferry')).toBeVisible({ timeout: 15_000 })
}

/** Helper: upload a JSON file and wait for the track to load */
async function uploadJson(page: Page, fixture: string) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(fixture)
  await expect(page.getByText('Google Location History')).toBeVisible({ timeout: 15_000 })
}

test.describe('Travelback App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForApp(page)
  })

  test('loads homepage with map container', async ({ page }) => {
    // Map container should be attached (it uses absolute positioning so Playwright may not consider it "visible")
    const container = page.locator('[data-testid="map-container"]')
    await expect(container).toBeAttached()
    // Heading should be visible
    await expect(page.getByRole('heading', { name: 'Travelback' })).toBeVisible()
  })

  test('shows file upload area on initial load', async ({ page }) => {
    // The file upload drop zone should be visible
    await expect(page.getByText('Drop your travel file here')).toBeVisible({ timeout: 10_000 })
  })

  test('imports GPX file and displays track', async ({ page }) => {
    await uploadGpx(page)

    // Track info should be visible
    await expect(page.getByText('Test Route Seoul')).toBeVisible()
    // Use exact text to avoid strict mode violation (multiple elements contain point counts)
    await expect(page.getByText('20 / 20 points', { exact: true })).toBeVisible()

    // Controls should appear (any button with SVG icons)
    await expect(page.locator('button svg').first()).toBeVisible({ timeout: 10_000 })
  })

  test('playback controls work after importing track', async ({ page }) => {
    await uploadGpx(page)

    // Find play button by its aria-label/title
    const playBtn = page.getByRole('button', { name: 'Play' })
    await expect(playBtn).toBeVisible({ timeout: 10_000 })

    // Click play - use force:true to bypass Next.js dev overlay intercepting pointer events
    await playBtn.click({ force: true })
    await page.waitForTimeout(1500)

    // The Track button should be visible (renamed from Follow)
    await expect(page.getByText('Track')).toBeVisible()
  })

  test('scene editor opens and allows adding scenes', async ({ page }) => {
    await uploadGpx(page)

    // Click Camera button (renamed from Scenes)
    const scenesBtn = page.getByText('Camera', { exact: true })
    await expect(scenesBtn).toBeVisible({ timeout: 10_000 })
    await scenesBtn.click({ force: true })

    // Scene editor should appear
    await expect(page.getByText('No scenes yet')).toBeVisible({ timeout: 5_000 })

    // Click add scene - use getByRole to avoid matching the instruction text
    const addBtn = page.getByRole('button', { name: '+ Add' })
    await addBtn.click({ force: true })

    // Should have a scene now - scene name is in a textbox input (value, not text content)
    const sceneNameInput = page.getByRole('textbox')
    await expect(sceneNameInput).toHaveValue('Scene 1', { timeout: 5_000 })

    // Camera mode selector should be visible with Flyover selected
    // The scene editor panel uses .space-y-2 for scene items
    const modeCombobox = page.locator('.space-y-2 select').first()
    await expect(modeCombobox).toBeVisible()
    await expect(modeCombobox).toHaveValue('flyover')
  })

  test('scene editor can change camera mode', async ({ page }) => {
    await uploadGpx(page)

    // Open scene editor (Camera button, renamed from Scenes)
    await page.getByText('Camera', { exact: true }).click({ force: true })
    await page.getByRole('button', { name: '+ Add' }).click({ force: true })

    // Change camera mode to Orbit
    const modeSelect = page.locator('.space-y-2 select').first()
    await modeSelect.selectOption('orbit')
    await expect(modeSelect).toHaveValue('orbit')
  })

  test('map style cycling works', async ({ page }) => {
    await uploadGpx(page)

    // Click style cycle button (shows "Map: Voyager" initially)
    const styleBtn = page.getByText('Map: Voyager')
    await expect(styleBtn).toBeVisible({ timeout: 10_000 })
    await styleBtn.click({ force: true })

    // Should cycle to "Map: Light"
    await expect(page.getByText('Map: Light')).toBeVisible({ timeout: 5_000 })
  })

  test('export panel opens with resolution and codec options', async ({ page }) => {
    await uploadGpx(page)

    // Click Export button
    const exportBtn = page.getByText('Export', { exact: true })
    await expect(exportBtn).toBeVisible({ timeout: 10_000 })
    await exportBtn.click({ force: true })

    // Export panel should be visible with resolution presets and quality
    await expect(page.getByText('Export Video')).toBeVisible()
    await expect(page.getByText('Resolution')).toBeVisible()
    await expect(page.getByText('Quality')).toBeVisible()

    // Should have resolution select (options inside <select> are "hidden" per Playwright)
    const resolutionSelect = page.getByRole('combobox').first()
    await expect(resolutionSelect).toBeVisible()

    // Codec is now behind the Advanced toggle — click to expand
    await page.getByText('Advanced').click({ force: true })
    await expect(page.getByText('Codec')).toBeVisible()

    // Should have Start Export button
    await expect(page.getByText('Start Export')).toBeVisible()
  })

  test('export panel can select TikTok resolution', async ({ page }) => {
    await uploadGpx(page)
    await page.getByText('Export', { exact: true }).click({ force: true })
    await expect(page.getByText('Export Video')).toBeVisible()

    // Find the resolution combobox inside the export panel (it contains "YouTube" as selected text)
    const exportPanel = page.locator('.z-30')
    const resSelect = exportPanel.getByRole('combobox').first()
    await resSelect.selectOption({ index: 1 }) // TikTok is second option

    // Output description should update - the × is a Unicode multiply sign
    await expect(exportPanel.locator('p').filter({ hasText: '1080' })).toBeVisible()
  })

  test('export panel close button works', async ({ page }) => {
    await uploadGpx(page)
    await page.getByText('Export', { exact: true }).click({ force: true })
    await expect(page.getByText('Export Video')).toBeVisible()

    // Close it
    await page.locator('.z-30 button svg').first().click({ force: true })
    await expect(page.getByText('Export Video')).not.toBeVisible()
  })

  // --- Multi-format import tests ---

  test('imports KML file and displays track', async ({ page }) => {
    await uploadKml(page)
    await expect(page.getByText('Korea to Japan via Ferry')).toBeVisible()
    // Track header shows point count (matches first element)
    await expect(page.locator('text=/\\d+ \\/ \\d+ points/').first()).toBeVisible()
    await expect(page.locator('button svg').first()).toBeVisible({ timeout: 10_000 })
  })

  test('imports Google JSON flat array and displays track', async ({ page }) => {
    await uploadJson(page, JSON_FLAT_FIXTURE)
    await expect(page.getByText('Google Location History')).toBeVisible()
    await expect(page.locator('text=/\\d+ \\/ \\d+ points/').first()).toBeVisible()
    await expect(page.locator('button svg').first()).toBeVisible({ timeout: 10_000 })
  })

  test('imports Google Records.json and displays track', async ({ page }) => {
    await uploadJson(page, JSON_RECORDS_FIXTURE)
    await expect(page.getByText('Google Location History')).toBeVisible()
    await expect(page.locator('text=/\\d+ \\/ \\d+ points/').first()).toBeVisible()
  })

  test('imports Google Semantic Location History and displays track', async ({ page }) => {
    await uploadJson(page, JSON_SEMANTIC_LOC_FIXTURE)
    await expect(page.getByText('Google Location History')).toBeVisible()
    await expect(page.locator('text=/\\d+ \\/ \\d+ points/').first()).toBeVisible()
  })

  test('imports Google Timeline Edits and displays track', async ({ page }) => {
    await uploadJson(page, JSON_TIMELINE_EDITS_FIXTURE)
    await expect(page.getByText('Google Location History')).toBeVisible()
    await expect(page.locator('text=/\\d+ \\/ \\d+ points/').first()).toBeVisible()
  })

  test('imports Google Semantic Segments and displays track', async ({ page }) => {
    await uploadJson(page, JSON_SEMANTIC_SEG_FIXTURE)
    await expect(page.getByText('Google Location History')).toBeVisible()
    await expect(page.locator('text=/\\d+ \\/ \\d+ points/').first()).toBeVisible()
  })

  // --- Error resilience ---

  test('shows error for unsupported file format', async ({ page }) => {
    // Create a temporary .txt file to upload
    const tmpFile = path.resolve(__dirname, 'fixtures/unsupported.txt')
    fs.writeFileSync(tmpFile, 'This is not a travel file')
    try {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tmpFile)
      // Should show an error message (error text in the upload area)
      await expect(page.locator('text=/Unsupported file format|parse|error/i')).toBeVisible({ timeout: 10_000 })
      // App should not crash — heading should still be visible
      await expect(page.getByRole('heading', { name: 'Travelback' })).toBeVisible()
    } finally {
      fs.unlinkSync(tmpFile)
    }
  })

  // --- KML full journey test ---

  test('uploads KML file and completes full journey', async ({ page }) => {
    await uploadKml(page)

    // Verify playback works
    const playBtn = page.getByRole('button', { name: 'Play' })
    await expect(playBtn).toBeVisible({ timeout: 10_000 })
    await playBtn.click({ force: true })
    await page.waitForTimeout(1000)
    await expect(page.getByText('Track')).toBeVisible()

    // Pause if still playing (short tracks may auto-complete)
    const pauseBtn = page.getByRole('button', { name: 'Pause' })
    if (await pauseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pauseBtn.click({ force: true })
    }

    await page.getByText('Camera', { exact: true }).click({ force: true })
    await page.getByRole('button', { name: '+ Add' }).click({ force: true })
    const sceneInput = page.getByRole('textbox')
    await expect(sceneInput).toHaveValue('Scene 1', { timeout: 5_000 })

    // Open export panel — close scene editor first via Escape
    await page.keyboard.press('Escape')
    await page.getByText('Export', { exact: true }).click({ force: true })
    await expect(page.getByText('Export Video')).toBeVisible()
    await expect(page.getByText('Resolution')).toBeVisible()
    await expect(page.getByText('Quality')).toBeVisible()
    await expect(page.getByText('Start Export')).toBeVisible()
  })

  // --- Google Records.json full journey test ---

  test('uploads Google Records.json and completes full journey', async ({ page }) => {
    await uploadJson(page, JSON_RECORDS_FIXTURE)

    // Verify playback
    const playBtn = page.getByRole('button', { name: 'Play' })
    await expect(playBtn).toBeVisible({ timeout: 10_000 })
    await playBtn.click({ force: true })
    await page.waitForTimeout(1000)

    // Pause if still playing
    const pauseBtn = page.getByRole('button', { name: 'Pause' })
    if (await pauseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pauseBtn.click({ force: true })
    }

    await page.getByText('Export', { exact: true }).click({ force: true })
    await expect(page.getByText('Export Video')).toBeVisible()
    await expect(page.getByText('Start Export')).toBeVisible()
  })
})

