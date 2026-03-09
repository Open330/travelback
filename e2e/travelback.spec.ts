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

function boxesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  )
}

function shortestAngleDelta(from: number, to: number) {
  return Math.abs(((to - from + 540) % 360) - 180)
}

async function collectCameraSamples(page: Page) {
  return page.evaluate(async () => {
    type CameraSample = { center: [number, number]; bearing: number }
    type DebugWindow = Window & {
      __travelbackDebug?: {
        getCamera: () => CameraSample | null
      }
    }

    const debugWindow = window as DebugWindow
    const points: CameraSample[] = []

    for (let i = 0; i < 16; i++) {
      const camera = debugWindow.__travelbackDebug?.getCamera()
      if (camera) {
        points.push({ center: [...camera.center] as [number, number], bearing: camera.bearing })
      }
      await new Promise(resolve => setTimeout(resolve, 120))
    }

    return points
  })
}

function expectStableCameraMotion(samples: { center: [number, number]; bearing: number }[]) {
  expect(samples.length).toBeGreaterThanOrEqual(8)

  const centerJumpsMeters: number[] = []
  const bearingJumps: number[] = []

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]
    const next = samples[i]
    const avgLatRad = ((prev.center[1] + next.center[1]) / 2) * (Math.PI / 180)
    const dLngMeters = (next.center[0] - prev.center[0]) * 111320 * Math.cos(avgLatRad)
    const dLatMeters = (next.center[1] - prev.center[1]) * 110540
    centerJumpsMeters.push(Math.hypot(dLngMeters, dLatMeters))
    bearingJumps.push(shortestAngleDelta(prev.bearing, next.bearing))
  }

  const steadyCenterJumps = centerJumpsMeters.slice(4)
  const steadyBearingJumps = bearingJumps.slice(4)

  expect(steadyCenterJumps.length).toBeGreaterThanOrEqual(4)
  expect(steadyBearingJumps.length).toBeGreaterThanOrEqual(4)

  const sortedCenterJumps = [...steadyCenterJumps].sort((a, b) => a - b)
  const sortedBearingJumps = [...steadyBearingJumps].sort((a, b) => a - b)
  const centerMedian = sortedCenterJumps[Math.floor(sortedCenterJumps.length / 2)]
  const bearingMedian = sortedBearingJumps[Math.floor(sortedBearingJumps.length / 2)]
  const centerP95 = sortedCenterJumps[Math.floor((sortedCenterJumps.length - 1) * 0.95)]
  const bearingP95 = sortedBearingJumps[Math.floor((sortedBearingJumps.length - 1) * 0.95)]

  const firstSample = samples[0]
  const lastSample = samples[samples.length - 1]
  const avgLatRad = ((firstSample.center[1] + lastSample.center[1]) / 2) * (Math.PI / 180)
  const totalLngMeters = (lastSample.center[0] - firstSample.center[0]) * 111320 * Math.cos(avgLatRad)
  const totalLatMeters = (lastSample.center[1] - firstSample.center[1]) * 110540
  const totalDisplacementMeters = Math.hypot(totalLngMeters, totalLatMeters)

  expect(totalDisplacementMeters).toBeGreaterThan(25)
  expect(centerP95).toBeLessThan(Math.max(600, centerMedian * 8))
  expect(bearingP95).toBeLessThan(Math.max(150, bearingMedian * 8))
}

/** Helper: wait for the app to be ready (map container rendered, with or without WebGL) */
async function waitForApp(page: Page) {
  // Wait for the heading to be visible (confirms React rendered)
  await expect(page.getByRole('heading', { name: 'Travelback' })).toBeVisible({ timeout: 30_000 })
  // Give the app a moment to settle
  await page.waitForTimeout(500)
}

/** Helper: upload a GPX file and wait for the track to load */
function visibleTrackTitle(page: Page, name: string) {
  return page
    .locator('[data-testid="track-title"]:visible, [data-testid="track-title-mobile"]:visible')
    .filter({ hasText: name })
    .first()
}

async function uploadGpx(page: Page) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(GPX_FIXTURE)
  await expect(visibleTrackTitle(page, 'Test Route Seoul')).toBeVisible({ timeout: 15_000 })
}

/** Helper: upload a KML file and wait for the track to load */
async function uploadKml(page: Page) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(KML_FIXTURE)
  // KML parser reads Document > name first → "Korea to Japan via Ferry"
  await expect(visibleTrackTitle(page, 'Korea to Japan via Ferry')).toBeVisible({ timeout: 15_000 })
}

/** Helper: upload a JSON file and wait for the track to load */
async function uploadJson(page: Page, fixture: string) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(fixture)
  await expect(visibleTrackTitle(page, 'Google Location History')).toBeVisible({ timeout: 15_000 })
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

  test('loads sample trip from landing CTA', async ({ page }) => {
    const sampleBtn = page.getByRole('button', { name: 'Try with a sample trip' })
    await expect(sampleBtn).toBeVisible({ timeout: 10_000 })
    await sampleBtn.click({ force: true })

    await expect(visibleTrackTitle(page, 'Namsan Tower Walk')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('text=/\\d+ \\/ \\d+ locations/').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible({ timeout: 10_000 })
  })

  test('imports GPX file and displays track', async ({ page }) => {
    await uploadGpx(page)

    // Track info should be visible
    await expect(visibleTrackTitle(page, 'Test Route Seoul')).toBeVisible()
    // Use regex to match point count in the track info header
    await expect(page.locator('text=/20 \\/ 20 locations/').first()).toBeVisible()

    // Controls should appear (any button with SVG icons)
    await expect(page.locator('button svg').first()).toBeVisible({ timeout: 10_000 })
  })

  test('journey creator shows multiple travel icon options', async ({ page }) => {
    const drawRouteBtn = page.getByRole('button', { name: /draw a route/i })
    await expect(drawRouteBtn).toBeVisible({ timeout: 10_000 })
    await drawRouteBtn.click({ force: true })

    await expect(page.getByTestId('journey-icon-walk')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('journey-icon-car')).toBeVisible()
    await expect(page.getByTestId('journey-icon-plane')).toBeVisible()
    await expect(page.getByTestId('journey-icon-bus')).toBeVisible()
    await expect(page.getByTestId('journey-icon-train')).toBeVisible()
  })

  test('playback controls work after importing track', async ({ page }) => {
    await uploadGpx(page)

    // Find play button by its aria-label/title
    const playBtn = page.getByRole('button', { name: 'Play' })
    await expect(playBtn).toBeVisible({ timeout: 10_000 })

    // Click play - use force:true to bypass Next.js dev overlay intercepting pointer events
    await playBtn.click({ force: true })
    await page.waitForTimeout(1500)

    // The camera tracking button should be visible
    await expect(page.getByRole('button', { name: /camera tracking/i })).toBeVisible()
  })

  test('map zoom controls do not overlap top toolbars', async ({ page }) => {
    await uploadGpx(page)

    const zoomControls = page.locator('.maplibregl-ctrl-top-left .maplibregl-ctrl-group').first()
    await expect(zoomControls).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('global-toolbar')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('track-toolbar')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('load-new-file-button')).toBeVisible({ timeout: 10_000 })

    await expect.poll(async () => {
      const [zoomBox, globalToolbarBox, trackToolbarBox, loadNewFileBox] = await Promise.all([
        zoomControls.boundingBox(),
        page.getByTestId('global-toolbar').boundingBox(),
        page.getByTestId('track-toolbar').boundingBox(),
        page.getByTestId('load-new-file-button').boundingBox(),
      ])

      if (!zoomBox || !globalToolbarBox || !trackToolbarBox || !loadNewFileBox) {
        return true
      }

      return boxesOverlap(zoomBox, globalToolbarBox)
        || boxesOverlap(zoomBox, trackToolbarBox)
        || boxesOverlap(zoomBox, loadNewFileBox)
    }, { timeout: 5_000, intervals: [120, 200, 300] }).toBeFalsy()
  })

  test('mobile header layout keeps top toolbars separated and moves track summary below', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await waitForApp(page)

    const sampleBtn = page.getByRole('button', { name: 'Try with a sample trip' })
    await expect(sampleBtn).toBeVisible({ timeout: 10_000 })
    await sampleBtn.click({ force: true })

    await expect(page.getByTestId('load-new-file-button')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('global-toolbar')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('track-toolbar')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('track-title-mobile')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('track-title')).toBeHidden()

    await expect.poll(async () => {
      const [loadNewFileBox, globalToolbarBox, trackToolbarBox] = await Promise.all([
        page.getByTestId('load-new-file-button').boundingBox(),
        page.getByTestId('global-toolbar').boundingBox(),
        page.getByTestId('track-toolbar').boundingBox(),
      ])

      if (!loadNewFileBox || !globalToolbarBox || !trackToolbarBox) {
        return true
      }

      return boxesOverlap(loadNewFileBox, globalToolbarBox)
        || boxesOverlap(loadNewFileBox, trackToolbarBox)
        || boxesOverlap(globalToolbarBox, trackToolbarBox)
    }, { timeout: 5_000, intervals: [120, 200, 300] }).toBeFalsy()
  })

  test('mobile playback controls keep stats on a separate row', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await waitForApp(page)

    const sampleBtn = page.getByRole('button', { name: 'Try with a sample trip' })
    await expect(sampleBtn).toBeVisible({ timeout: 10_000 })
    await sampleBtn.click({ force: true })

    const primaryRow = page.getByTestId('controls-primary-row')
    const stats = page.getByTestId('playback-stats')

    await expect(primaryRow).toBeVisible({ timeout: 15_000 })
    await expect(stats).toBeVisible({ timeout: 15_000 })

    await expect.poll(async () => {
      const [primaryRowBox, statsBox] = await Promise.all([
        primaryRow.boundingBox(),
        stats.boundingBox(),
      ])

      if (!primaryRowBox || !statsBox) {
        return true
      }

      return boxesOverlap(primaryRowBox, statsBox)
        || statsBox.y <= primaryRowBox.y + primaryRowBox.height - 4
    }, { timeout: 5_000, intervals: [120, 200, 300] }).toBeFalsy()
  })

  test('mobile journey creator panel stays below the top toolbar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await waitForApp(page)

    await page.getByRole('button', { name: /draw a route/i }).click({ force: true })

    const globalToolbar = page.getByTestId('global-toolbar')
    const creatorPanel = page.getByTestId('journey-creator-panel')

    await expect(globalToolbar).toBeVisible({ timeout: 10_000 })
    await expect(creatorPanel).toBeVisible({ timeout: 10_000 })

    await expect.poll(async () => {
      const [toolbarBox, panelBox] = await Promise.all([
        globalToolbar.boundingBox(),
        creatorPanel.boundingBox(),
      ])

      if (!toolbarBox || !panelBox) {
        return true
      }

      return boxesOverlap(toolbarBox, panelBox) || panelBox.y < toolbarBox.y + toolbarBox.height + 8
    }, { timeout: 5_000, intervals: [120, 200, 300] }).toBeFalsy()
  })

  test('mobile timeline date labels stay readable inside the range card', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await waitForApp(page)
    await uploadGpx(page)

    const timeline = page.getByTestId('timeline-selector')
    const dateRow = page.getByTestId('timeline-date-row')
    const startDate = page.getByTestId('timeline-start-date')
    const endDate = page.getByTestId('timeline-end-date')

    await expect(timeline).toBeVisible({ timeout: 15_000 })
    await expect(dateRow).toBeVisible({ timeout: 15_000 })
    await expect(startDate).toBeVisible({ timeout: 15_000 })
    await expect(endDate).toBeVisible({ timeout: 15_000 })

    await expect.poll(async () => {
      const [timelineBox, dateRowBox, startDateBox, endDateBox] = await Promise.all([
        timeline.boundingBox(),
        dateRow.boundingBox(),
        startDate.boundingBox(),
        endDate.boundingBox(),
      ])

      if (!timelineBox || !dateRowBox || !startDateBox || !endDateBox) {
        return true
      }

      const dateRowWithinTimeline = dateRowBox.x >= timelineBox.x - 1
        && dateRowBox.x + dateRowBox.width <= timelineBox.x + timelineBox.width + 1
      const datesWithinRow = startDateBox.x >= dateRowBox.x - 1
        && endDateBox.x + endDateBox.width <= dateRowBox.x + dateRowBox.width + 1

      return !dateRowWithinTimeline || !datesWithinRow || boxesOverlap(startDateBox, endDateBox)
    }, { timeout: 5_000, intervals: [120, 200, 300] }).toBeFalsy()
  })

  test('mobile scene editor panel stays below the stacked header controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await waitForApp(page)
    await uploadGpx(page)

    await page.getByText('Camera', { exact: true }).click({ force: true })

    const trackToolbar = page.getByTestId('track-toolbar')
    const sceneEditorPanel = page.getByTestId('scene-editor-panel')

    await expect(trackToolbar).toBeVisible({ timeout: 10_000 })
    await expect(sceneEditorPanel).toBeVisible({ timeout: 10_000 })

    await expect.poll(async () => {
      const [toolbarBox, panelBox] = await Promise.all([
        trackToolbar.boundingBox(),
        sceneEditorPanel.boundingBox(),
      ])

      if (!toolbarBox || !panelBox) {
        return true
      }

      return boxesOverlap(toolbarBox, panelBox) || panelBox.y < toolbarBox.y + toolbarBox.height + 8
    }, { timeout: 5_000, intervals: [120, 200, 300] }).toBeFalsy()
  })

  test('route and trail layers are attached after track load', async ({ page }) => {
    await uploadGpx(page)
    await page.waitForTimeout(750)

    await expect.poll(async () => page.evaluate(() => {
      type DebugWindow = Window & {
        __travelbackDebug?: {
          getMapState: () => {
            hasRouteSource: boolean
            hasTrailSource: boolean
            hasRouteLayer: boolean
            hasTrailLayer: boolean
            hasMarker: boolean
          } | null
        }
        }

        const debugWindow = window as DebugWindow
        return debugWindow.__travelbackDebug?.getMapState() ?? null
    }), { timeout: 20_000, intervals: [150, 250, 400, 600] }).toMatchObject({
      hasRouteSource: true,
      hasTrailSource: true,
      hasRouteLayer: true,
      hasTrailLayer: true,
      hasMarker: true,
    })
  })

  test('map camera movement stays stable during playback', async ({ page }) => {
    await uploadGpx(page)

    const playBtn = page.getByRole('button', { name: 'Play' })
    await expect(playBtn).toBeVisible({ timeout: 10_000 })
    await playBtn.click({ force: true })

    const samples = await collectCameraSamples(page)

    expectStableCameraMotion(samples)
  })

  test('scene-based camera movement stays stable during playback', async ({ page }) => {
    await uploadGpx(page)

    await page.getByText('Camera', { exact: true }).click({ force: true })
    await page.getByRole('button', { name: '+ Add' }).click({ force: true })

    const playBtn = page.getByRole('button', { name: 'Play' })
    await expect(playBtn).toBeVisible({ timeout: 10_000 })
    await playBtn.click({ force: true })

    const samples = await collectCameraSamples(page)

    expectStableCameraMotion(samples)
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

    const styleBtn = page.getByTestId('map-style-button')
    await expect(styleBtn).toBeVisible({ timeout: 10_000 })
    const before = (await styleBtn.textContent())?.trim()
    await styleBtn.click({ force: true })
    await expect(styleBtn).not.toHaveText(before ?? '', { timeout: 5_000 })
  })

  test('map style defaults to dark when app theme starts dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await waitForApp(page)
    await uploadGpx(page)

    const styleBtn = page.getByTestId('map-style-button')
    await expect(styleBtn).toHaveText(/Map:\s*Dark/, { timeout: 10_000 })
  })

  test('theme toggle keeps map style in sync', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await waitForApp(page)
    await uploadGpx(page)

    const themeToggle = page.getByRole('button', { name: /switch to light mode/i })
    await expect(themeToggle).toBeVisible({ timeout: 10_000 })
    await themeToggle.click({ force: true })

    await expect(page.getByTestId('map-style-button')).toHaveText(/Map:\s*Voyager/, { timeout: 10_000 })
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
    await expect(visibleTrackTitle(page, 'Korea to Japan via Ferry')).toBeVisible()
    // Track header shows point count (matches first element)
    await expect(page.locator('text=/\\d+ \\/ \\d+ locations/').first()).toBeVisible()
    await expect(page.locator('button svg').first()).toBeVisible({ timeout: 10_000 })
  })

  test('imports Google JSON flat array and displays track', async ({ page }) => {
    await uploadJson(page, JSON_FLAT_FIXTURE)
    await expect(visibleTrackTitle(page, 'Google Location History')).toBeVisible()
    await expect(page.locator('text=/\\d+ \\/ \\d+ locations/').first()).toBeVisible()
    await expect(page.locator('button svg').first()).toBeVisible({ timeout: 10_000 })
  })

  test('imports Google Records.json and displays track', async ({ page }) => {
    await uploadJson(page, JSON_RECORDS_FIXTURE)
    await expect(visibleTrackTitle(page, 'Google Location History')).toBeVisible()
    await expect(page.locator('text=/\\d+ \\/ \\d+ locations/').first()).toBeVisible()
  })

  test('imports Google Semantic Location History and displays track', async ({ page }) => {
    await uploadJson(page, JSON_SEMANTIC_LOC_FIXTURE)
    await expect(visibleTrackTitle(page, 'Google Location History')).toBeVisible()
    await expect(page.locator('text=/\\d+ \\/ \\d+ locations/').first()).toBeVisible()
  })

  test('imports Google Timeline Edits and displays track', async ({ page }) => {
    await uploadJson(page, JSON_TIMELINE_EDITS_FIXTURE)
    await expect(visibleTrackTitle(page, 'Google Location History')).toBeVisible()
    await expect(page.locator('text=/\\d+ \\/ \\d+ locations/').first()).toBeVisible()
  })

  test('imports Google Semantic Segments and displays track', async ({ page }) => {
    await uploadJson(page, JSON_SEMANTIC_SEG_FIXTURE)
    await expect(visibleTrackTitle(page, 'Google Location History')).toBeVisible()
    await expect(page.locator('text=/\\d+ \\/ \\d+ locations/').first()).toBeVisible()
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
    await expect(page.getByRole('button', { name: /camera tracking/i })).toBeVisible()

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
