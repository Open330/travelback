import { test, expect, type Locator, type Page } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const GPX_FIXTURE = path.resolve(__dirname, 'fixtures/sample.gpx')
const KML_FIXTURE = path.resolve(__dirname, 'fixtures/korea-japan.kml')
const JSON_FLAT_FIXTURE = path.resolve(__dirname, 'fixtures/korea-japan.json')
const JSON_RECORDS_FIXTURE = path.resolve(__dirname, 'fixtures/google-records.json')
const JSON_SEMANTIC_LOC_FIXTURE = path.resolve(__dirname, 'fixtures/google-semantic-location.json')
const JSON_TIMELINE_EDITS_FIXTURE = path.resolve(__dirname, 'fixtures/google-timeline-edits.json')
const JSON_SEMANTIC_SEG_FIXTURE = path.resolve(__dirname, 'fixtures/google-semantic-segments.json')
const JSON_REVISIT_SEGMENTS_FIXTURE = path.resolve(__dirname, 'fixtures/google-revisit-segments.json')
const JSON_MIXED_DUPLICATE_BRANCHES_FIXTURE = path.resolve(__dirname, 'fixtures/google-mixed-duplicate-branches.json')
const SEGMENTED_GPX_FIXTURE = path.resolve(__dirname, 'fixtures/segmented-city-hop.gpx')
const TINY_TRIM_GPX_FIXTURE = path.resolve(__dirname, 'fixtures/tiny-trim.gpx')
const UNEVEN_TRIM_GPX_FIXTURE = path.resolve(__dirname, 'fixtures/uneven-trim.gpx')
const SINGLE_QUOTE_GPX_FIXTURE = path.resolve(__dirname, 'fixtures/single-quote-attrs.gpx')
const POINT_PLACEMARKS_KML_FIXTURE = path.resolve(__dirname, 'fixtures/point-placemarks.kml')
const INVALID_ELEVATION_GPX_FIXTURE = path.resolve(__dirname, 'fixtures/invalid-elevation.gpx')
const ANTIMERIDIAN_GPX_FIXTURE = path.resolve(__dirname, 'fixtures/antimeridian.gpx')
const MULTILINE_ENTITY_GPX_FIXTURE = path.resolve(__dirname, 'fixtures/multiline-entity.gpx')
const IS_STATIC_E2E = process.env.TRAVELBACK_E2E_TARGET === 'static'

type DebugCameraState = {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
}

type DebugMapSnapshot = {
  camera: DebugCameraState
  htmlMarkerPosition: [number, number]
  geoJsonMarkerPosition: [number, number]
  trailHeadPosition: [number, number]
  completedTrailChunkIndex: number
  requestedStyleRevision: number
  readyStyleRevision: number
  hasRouteSource: boolean
  hasTrailSource: boolean
  hasRouteLayer: boolean
  hasTrailLayer: boolean
  hasMarker: boolean
  hasExportMarkerLayer: boolean
} | null

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

function haversineDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(((b.lng - a.lng + 540) % 360) - 180)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * R * Math.asin(Math.sqrt(h))
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
    const shortestDelta = (from: number, to: number) => Math.abs(((to - from + 540) % 360) - 180)
    const distanceBetweenCenters = (a: [number, number], b: [number, number]) => {
      const avgLatRad = ((a[1] + b[1]) / 2) * (Math.PI / 180)
      const dLngMeters = (((b[0] - a[0] + 540) % 360) - 180) * 111320 * Math.cos(avgLatRad)
      const dLatMeters = (b[1] - a[1]) * 110540
      return Math.hypot(dLngMeters, dLatMeters)
    }

    let baseline: CameraSample | null = null
    for (let i = 0; i < 25; i++) {
      const camera = debugWindow.__travelbackDebug?.getCamera()
      if (camera) {
        if (!baseline) {
          baseline = { center: [...camera.center] as [number, number], bearing: camera.bearing }
        } else if (
          distanceBetweenCenters(baseline.center, camera.center) > 2
          || shortestDelta(baseline.bearing, camera.bearing) > 2
        ) {
          break
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    for (let i = 0; i < 24; i++) {
      const camera = debugWindow.__travelbackDebug?.getCamera()
      if (camera) {
        points.push({ center: [...camera.center] as [number, number], bearing: camera.bearing })
      }
      await new Promise(resolve => setTimeout(resolve, 150))
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
  const totalLngMeters = (((lastSample.center[0] - firstSample.center[0] + 540) % 360) - 180) * 111320 * Math.cos(avgLatRad)
  const totalLatMeters = (lastSample.center[1] - firstSample.center[1]) * 110540
  const totalDisplacementMeters = Math.hypot(totalLngMeters, totalLatMeters)
  const totalBearingChange = bearingJumps.reduce((sum, value) => sum + value, 0)

  // Some camera modes mainly rotate in place while others translate;
  // accept either meaningful center travel or meaningful bearing travel.
  expect(totalDisplacementMeters > 4 || totalBearingChange > 20).toBeTruthy()
  expect(centerP95).toBeLessThan(Math.max(600, centerMedian * 8))
  expect(bearingP95).toBeLessThan(Math.max(150, bearingMedian * 8))
}

/** Helper: wait for the app to be ready (map container rendered, with or without WebGL) */
async function waitForApp(page: Page) {
  await expect(page.locator('main#app[data-travelback-app-root="true"]')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('map-container')).toBeAttached({ timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Travelback' })).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('input[type="file"]')).toBeAttached({ timeout: 30_000 })
}

async function expectProductionDebugApiAbsent(page: Page) {
  expect(await page.evaluate(() => '__travelbackDebug' in window)).toBe(false)
}

async function expectPublicMapReady(page: Page) {
  await expect(page.getByTestId('map-container').locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('map-error')).toHaveCount(0)
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
  await fileInput.setInputFiles(GPX_FIXTURE, { timeout: 30_000 })
  await expect(page.getByTestId('load-new-file-button')).toBeVisible({ timeout: 15_000 })
}

/** Helper: upload a KML file and wait for the track to load */
async function uploadKml(page: Page) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(KML_FIXTURE, { timeout: 30_000 })
  await expect(page.getByTestId('load-new-file-button')).toBeVisible({ timeout: 15_000 })
}

/** Helper: upload a JSON file and wait for the track to load */
async function uploadJson(page: Page, fixture: string) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(fixture, { timeout: 30_000 })
  await expect(visibleTrackTitle(page, 'Google Location History')).toBeVisible({ timeout: 20_000 })
}

async function uploadCustomFile(page: Page, fixture: string) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(fixture, { timeout: 30_000 })
  await expect(page.getByTestId('load-new-file-button')).toBeVisible({ timeout: 15_000 })
}

async function setPlaybackProgress(page: Page, value: number) {
  const progress = page.getByLabel('Playback progress')
  await progress.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    valueSetter?.call(input, String(nextValue))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
  await expect(progress).toHaveValue(String(value))
}

async function readDebugMapSnapshot(page: Page): Promise<DebugMapSnapshot> {
  return page.evaluate(() => {
    type CameraState = {
      center: [number, number]
      zoom: number
      pitch: number
      bearing: number
    }
    type PoseState = {
      htmlMarkerPosition: [number, number] | null
      geoJsonMarkerPosition: [number, number] | null
      trailHeadPosition: [number, number] | null
      completedTrailChunkIndex: number
      requestedStyleRevision: number
      readyStyleRevision: number
    }
    type MapState = {
      hasRouteSource: boolean
      hasTrailSource: boolean
      hasRouteLayer: boolean
      hasTrailLayer: boolean
      hasMarker: boolean
      hasExportMarkerLayer: boolean
    }
    type DebugWindow = Window & {
      __travelbackDebug?: {
        getCamera: () => CameraState | null
        getPoseState: () => PoseState | null
        getMapState: () => MapState | null
      }
    }

    const api = (window as DebugWindow).__travelbackDebug
    const camera = api?.getCamera()
    const pose = api?.getPoseState()
    const mapState = api?.getMapState()
    if (!camera || !pose?.htmlMarkerPosition || !pose.geoJsonMarkerPosition || !pose.trailHeadPosition || !mapState) {
      return null
    }

    return {
      camera,
      htmlMarkerPosition: pose.htmlMarkerPosition,
      geoJsonMarkerPosition: pose.geoJsonMarkerPosition,
      trailHeadPosition: pose.trailHeadPosition,
      completedTrailChunkIndex: pose.completedTrailChunkIndex,
      requestedStyleRevision: pose.requestedStyleRevision,
      readyStyleRevision: pose.readyStyleRevision,
      ...mapState,
    }
  })
}

function coordinateDistanceMeters(a: [number, number], b: [number, number]) {
  return haversineDistanceMeters(
    { lng: a[0], lat: a[1] },
    { lng: b[0], lat: b[1] },
  )
}

function expectPoseToMatch(actual: NonNullable<DebugMapSnapshot>, expected: NonNullable<DebugMapSnapshot>) {
  expect(coordinateDistanceMeters(actual.htmlMarkerPosition, expected.htmlMarkerPosition)).toBeLessThan(1)
  expect(coordinateDistanceMeters(actual.geoJsonMarkerPosition, expected.geoJsonMarkerPosition)).toBeLessThan(1)
  expect(coordinateDistanceMeters(actual.trailHeadPosition, expected.trailHeadPosition)).toBeLessThan(1)
  expect(coordinateDistanceMeters(actual.htmlMarkerPosition, actual.geoJsonMarkerPosition)).toBeLessThan(0.1)
  expect(coordinateDistanceMeters(actual.htmlMarkerPosition, actual.trailHeadPosition)).toBeLessThan(0.1)
  expect(actual.completedTrailChunkIndex).toBe(expected.completedTrailChunkIndex)
  expect(coordinateDistanceMeters(actual.camera.center, expected.camera.center)).toBeLessThan(2)
  expect(Math.abs(actual.camera.zoom - expected.camera.zoom)).toBeLessThan(0.02)
  expect(Math.abs(actual.camera.pitch - expected.camera.pitch)).toBeLessThan(0.1)
  expect(shortestAngleDelta(actual.camera.bearing, expected.camera.bearing)).toBeLessThan(0.2)
}

async function waitForDebugPose(page: Page, minimumRevision = 0) {
  try {
    await expect.poll(async () => {
      const snapshot = await readDebugMapSnapshot(page)
      return Boolean(
        snapshot
        && snapshot.readyStyleRevision === snapshot.requestedStyleRevision
        && snapshot.readyStyleRevision > minimumRevision
        && snapshot.hasRouteSource
        && snapshot.hasTrailSource
        && snapshot.hasRouteLayer
        && snapshot.hasTrailLayer
        && snapshot.hasMarker
        && snapshot.hasExportMarkerLayer
        && coordinateDistanceMeters(snapshot.htmlMarkerPosition, snapshot.geoJsonMarkerPosition) < 0.1
        && coordinateDistanceMeters(snapshot.htmlMarkerPosition, snapshot.trailHeadPosition) < 0.1,
      )
    }, { timeout: 20_000, intervals: [100, 200, 400] }).toBe(true)
  } catch (error) {
    const snapshot = await readDebugMapSnapshot(page)
    const rawDebugState = await page.evaluate(() => {
      const api = (window as Window & {
        __travelbackDebug?: {
          getCamera: () => unknown
          getPoseState: () => unknown
          getMapState: () => unknown
        }
      }).__travelbackDebug
      return api ? {
        camera: api.getCamera(),
        pose: api.getPoseState(),
        map: api.getMapState(),
      } : null
    })
    throw new Error(`Map pose did not become ready after revision ${minimumRevision}: ${JSON.stringify(snapshot ?? rawDebugState)}`, {
      cause: error,
    })
  }

  const snapshot = await readDebugMapSnapshot(page)
  if (!snapshot) throw new Error('Missing ready MapView debug pose')
  return snapshot
}

async function startPlayback(page: Page) {
  const playBtn = page.getByRole('button', { name: 'Play' })
  await expect(playBtn).toBeVisible({ timeout: 10_000 })
  await playBtn.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 5_000 })
  await expect.poll(async () => {
    return Number(await page.getByLabel('Playback progress').inputValue())
  }, { timeout: 10_000, intervals: [100, 150, 250, 500] }).toBeGreaterThan(0)
}

async function loadedTrackPointCounts(page: Page) {
  const title = page
    .locator('[data-testid="track-title"]:visible, [data-testid="track-title-mobile"]:visible')
    .first()
  const text = await title.textContent()
  const match = text?.match(/—\s*([\d,]+)\s*\/\s*([\d,]+)\s+locations/)
  if (!match) throw new Error(`Unable to parse track point counts from "${text}"`)
  return {
    visible: Number(match[1].replace(/,/g, '')),
    full: Number(match[2].replace(/,/g, '')),
  }
}

async function touchDrag(page: Page, target: Locator, deltaX: number, deltaY = 0) {
  const box = await target.boundingBox()
  if (!box) throw new Error('Missing touch target geometry')
  const session = await page.context().newCDPSession(page)
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, radiusX: 1, radiusY: 1, force: 1, id: 1 }],
    })
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + deltaX, y: y + deltaY, radiusX: 1, radiusY: 1, force: 1, id: 1 }],
    })
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await session.detach()
  }
}

async function activeElementState(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null
    if (!active) return null
    return {
      tag: active.tagName.toLowerCase(),
      aria: active.getAttribute('aria-label') || '',
      text: (active.textContent || '').replace(/\s+/g, ' ').trim(),
      insideDialog: Boolean(active.closest('[role="dialog"]')),
    }
  })
}

test.describe('Travelback App', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('travelback-debug', '1')
      window.localStorage.setItem('travelback-timeline-hint-dismissed', '1')
    })
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

  test('exposes a main landmark at the app root', async ({ page }) => {
    // Cycle r4 promoted the app root <div> to <main id="app"> for WCAG 1.3.1
    // landmark navigation; cycle r5 codifies that as a regression guard.
    const main = page.locator('main#app[data-travelback-app-root="true"]')
    await expect(main).toBeAttached()
  })

  test('shows file upload area on initial load', async ({ page }) => {
    // The file upload drop zone should be visible
    await expect(page.getByText('Drop a .json Google Timeline export, .gpx, or .kml file here')).toBeVisible({ timeout: 10_000 })
  })
  test('landing keyboard flow prioritizes upload actions over the decorative map', async ({ page }) => {
    await page.keyboard.press('Tab')
    const active = await activeElementState(page)
    expect(active?.tag).toBe('button')
    expect(active?.aria || active?.text).not.toMatch(/Map|Toggle attribution|MapLibre/)
  })

  test('guide modal uses dialog semantics and keeps focus inside the panel', async ({ page }) => {
    await page.getByRole('button', { name: /need help finding your file/i }).click({ force: true })

    const dialog = page.getByRole('dialog', { name: 'How to Get Your Travel Data' })
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await expect(dialog).toHaveAttribute('aria-modal', 'true')

    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
    }

    const active = await activeElementState(page)
    expect(active?.insideDialog).toBe(true)
  })

  test('Google phone guidance links preserve locale and platform context', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Language' }).selectOption('ko')
    await page.getByRole('button', { name: '파일을 찾는 데 도움이 필요하세요?' }).click()

    const dialog = page.getByRole('dialog', { name: '여행 데이터 가져오기' })
    const iosLink = dialog.getByRole('link', { name: /Google 안내 열기: iPhone/ })
    const androidLink = dialog.getByRole('link', { name: /Google 안내 열기: Android/ })
    await expect(iosLink).toHaveAttribute('href', /GENIE\.Platform%3DiOS&hl=ko$/)
    await expect(androidLink).toHaveAttribute('href', /GENIE\.Platform%3DAndroid&hl=ko$/)

    const panel = dialog.getByRole('tabpanel')
    await expect(panel.locator('svg')).toContainText('내 타임라인')
    await expect(panel.locator('img')).toHaveCount(0)
    await expect(dialog).toContainText('JSON 파일은 최대 100MB, GPX/KML 파일은 최대 4MB')

    await dialog.getByRole('tab', { name: 'Google Takeout' }).click()
    await expect(panel.locator('svg')).toContainText('업로드')
    await expect(panel.locator('img')).toHaveCount(0)
  })


  test('language picker can switch the landing UI away from English', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Language' }).selectOption('ko')
    await expect(page.getByRole('button', { name: '파일 선택' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: '샘플 여행으로 체험하기', exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('ko')
  })

  test('language picker applies Japanese labels in the loaded track toolbar', async ({ page }) => {
    await uploadGpx(page)
    await page.getByRole('combobox', { name: 'Language' }).selectOption('ja')
    await expect(page.getByText('エクスポート', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('カメラ', { exact: true })).toBeVisible()
  })

  test('loaded track status follows the current locale without losing the track name', async ({ page }) => {
    await page.getByRole('button', { name: 'Try with a sample trip' }).click()
    await expect(visibleTrackTitle(page, 'Namsan Tower Walk')).toBeVisible({ timeout: 15_000 })

    const workspaceStatus = page.getByRole('status')
    await expect(workspaceStatus).toHaveText('Track loaded: Namsan Tower Walk')

    await page.getByTestId('global-toolbar').getByRole('combobox').selectOption('ko')
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('ko')
    await expect(page.getByText('카메라', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(workspaceStatus).toHaveText('트랙이 로드되었습니다: Namsan Tower Walk')
  })


  test('language picker applies Chinese landing copy across primary actions', async ({ page }) => {
    await page.getByTestId('global-toolbar').locator('select').selectOption('zh')
    await expect(page.getByRole('button', { name: '选择要上传的文件' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('选择文件', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '在地图上绘制路线' })).toBeVisible()
    await expect(page.getByRole('button', { name: '找不到文件？' })).toBeVisible()
  })

  test('language picker applies Spanish labels throughout the export flow', async ({ page }) => {
    await uploadGpx(page)
    await page.getByTestId('global-toolbar').locator('select').selectOption('es')

    const trackToolbar = page.getByTestId('track-toolbar')
    const exportButton = trackToolbar.locator('button').filter({ hasText: 'Exportar' }).first()
    const cameraButton = trackToolbar.locator('button').filter({ hasText: 'Cámara' }).first()
    await expect(exportButton).toBeVisible({ timeout: 10_000 })
    await expect(cameraButton).toBeVisible()

    await exportButton.click({ force: true })
    await expect(page.getByRole('heading', { name: 'Exportar video' })).toBeVisible({ timeout: 10_000 })
  })

  test('dark system theme is applied on first render without needing a manual toggle', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await waitForApp(page)

    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-mode'))).toBe('dark')
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-mapstyle'))).toBe('dark')
    await expect.poll(async () => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(10, 13, 20)')
  })

  test('theme toggle persists across page reload', async ({ page }) => {
    // Start in light mode (default)
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-mode'))).toBe('light')

    // Toggle to dark mode
    const themeToggle = page.getByRole('button', { name: /switch to dark mode/i })
    await expect(themeToggle).toBeVisible({ timeout: 10_000 })
    await themeToggle.click({ force: true })

    // Verify dark mode is applied
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-mode'))).toBe('dark')

    // Verify it's saved to localStorage
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('travelback-theme'))).toBe('dark')

    // Reload the page — the bootstrap script should restore dark mode
    await page.reload()
    await waitForApp(page)

    // After reload, dark mode should persist without any toggle click
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-mode'))).toBe('dark')

    // Toggle back to light mode
    const lightToggle = page.getByRole('button', { name: /switch to light mode/i })
    await expect(lightToggle).toBeVisible({ timeout: 10_000 })
    await lightToggle.click({ force: true })

    // Verify light mode and reload persistence
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-mode'))).toBe('light')
    await page.reload()
    await waitForApp(page)
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-mode'))).toBe('light')
  })

  test('segmented unit controls keep their keyboard focus treatment inside clipped groups', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/')
    await waitForApp(page)

    const expectInternalFocus = async (button: Locator) => {
      await button.focus()
      await expect(button).toBeFocused()
      const focusState = await button.evaluate((element) => ({
        boxShadow: getComputedStyle(element).boxShadow,
        parentOverflow: getComputedStyle(element.parentElement!).overflow,
      }))
      expect(focusState.boxShadow).toContain('inset')
      expect(focusState.parentOverflow).toBe('hidden')
    }

    const desktopMetric = page.getByRole('button', { name: 'Metric units' })
    const desktopImperial = page.getByRole('button', { name: 'Imperial units' })
    for (const button of [desktopMetric, desktopImperial]) await expectInternalFocus(button)

    await page.getByRole('button', { name: /switch to (dark|light) mode/i }).click()
    for (const button of [desktopMetric, desktopImperial]) await expectInternalFocus(button)

    await uploadGpx(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'More controls' }).click()
    const mobileMenu = page.getByTestId('track-toolbar-mobile-menu')
    for (const button of [
      mobileMenu.getByRole('button', { name: 'Metric units' }),
      mobileMenu.getByRole('button', { name: 'Imperial units' }),
    ]) {
      await expectInternalFocus(button)
    }
  })

  test('map error UI appears when map style fails to load', async ({ page }) => {
    // Block the map style JSON to simulate a failed map load
    await page.route('**/map-styles/voyager.json', route => route.abort('failed'))
    await page.goto('/')
    await waitForApp(page)

    // The map error UI should appear
    await expect(page.getByTestId('map-error')).toBeVisible({ timeout: 15_000 })
    // Verify recovery actions are accessible inside the error UI
    await expect(page.getByTestId('map-error').getByRole('button', { name: /reload page/i })).toBeVisible()
    await expect(page.getByTestId('map-error').getByRole('button', { name: /retry map/i })).toBeVisible()
  })

  test('map error reload button restores the map after unblocking the style', async ({ page }) => {
    // Block the map style JSON to trigger the error UI
    await page.route('**/map-styles/voyager.json', route => route.abort('failed'))
    await page.goto('/')
    await waitForApp(page)

    // The map error UI should appear with a reload button
    await expect(page.getByTestId('map-error')).toBeVisible({ timeout: 15_000 })
    const reloadBtn = page.getByRole('button', { name: /reload page/i })
    await expect(reloadBtn).toBeVisible()

    // Unblock the map style by removing the route intercept before reloading
    await page.unroute('**/map-styles/voyager.json')

    // Reload the page using Playwright (more reliable than clicking the app's
    // reload button, which calls window.location.reload() and can race with
    // Playwright's route interception after page navigation).
    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForApp(page)

    // After reload, the error UI should be gone and the map should load
    await expect(page.getByTestId('map-error')).toHaveCount(0, { timeout: 15_000 })
  })

  test('ready style replacements and Retry preserve a paused nonzero map pose', async ({ page }) => {
    await uploadGpx(page)
    await expect(page.locator('.maplibregl-marker')).toHaveCount(1, { timeout: 15_000 })

    let startPose: NonNullable<DebugMapSnapshot> | null = null
    if (!IS_STATIC_E2E) {
      startPose = await waitForDebugPose(page)
    }

    await setPlaybackProgress(page, 0.6)
    let baselinePose: NonNullable<DebugMapSnapshot> | null = null
    if (!IS_STATIC_E2E) {
      await expect.poll(async () => {
        const snapshot = await readDebugMapSnapshot(page)
        return snapshot && startPose
          ? coordinateDistanceMeters(snapshot.htmlMarkerPosition, startPose.htmlMarkerPosition)
          : 0
      }, { timeout: 10_000, intervals: [100, 200, 300] }).toBeGreaterThan(100)
      baselinePose = await waitForDebugPose(page)
    }

    const styleButton = page.getByTestId('map-style-button')
    const lightStyleResponse = page.waitForResponse(response => (
      response.url().endsWith('/map-styles/positron.json') && response.ok()
    ))
    await styleButton.click()
    await lightStyleResponse
    await expect(styleButton).toHaveText(/Map:\s*Light/, { timeout: 10_000 })
    await expect(page.getByTestId('map-error')).toHaveCount(0, { timeout: 15_000 })
    await expect(page.getByTestId('map-container').locator('canvas.maplibregl-canvas')).toHaveCount(1)
    await expect(page.locator('.maplibregl-marker')).toHaveCount(1)

    let lightPose: NonNullable<DebugMapSnapshot> | null = null
    if (!IS_STATIC_E2E && baselinePose) {
      lightPose = await waitForDebugPose(page, baselinePose.readyStyleRevision)
      expectPoseToMatch(lightPose, baselinePose)
    }

    let releaseDarkRequest = () => {}
    let finishDarkHandler = () => {}
    const darkRequestHeld = new Promise<void>(resolve => { releaseDarkRequest = resolve })
    const darkHandlerFinished = new Promise<void>(resolve => { finishDarkHandler = resolve })
    let interceptedDarkRequest = false
    await page.route('**/map-styles/dark.json', async route => {
      interceptedDarkRequest = true
      await darkRequestHeld
      await route.continue().catch(() => {})
      finishDarkHandler()
    })

    await styleButton.click()
    await expect.poll(() => interceptedDarkRequest).toBe(true)
    await expect(styleButton).toHaveText(/Map:\s*Dark/)

    const libertyStyleResponse = page.waitForResponse(response => (
      response.url().endsWith('/map-styles/liberty.json') && response.ok()
    ))
    await styleButton.click()
    await libertyStyleResponse
    await expect(styleButton).toHaveText(/Map:\s*Liberty/)

    let libertyPose: NonNullable<DebugMapSnapshot> | null = null
    if (!IS_STATIC_E2E && lightPose) {
      libertyPose = await waitForDebugPose(page, lightPose.readyStyleRevision)
      expectPoseToMatch(libertyPose, lightPose)
    }

    releaseDarkRequest()
    await darkHandlerFinished
    await page.unroute('**/map-styles/dark.json')
    await expect(page.getByTestId('map-error')).toHaveCount(0)
    await expect(page.getByTestId('map-container').locator('canvas.maplibregl-canvas')).toHaveCount(1)
    if (!IS_STATIC_E2E && libertyPose) {
      const afterSupersededStyle = await waitForDebugPose(page, libertyPose.readyStyleRevision - 1)
      expect(afterSupersededStyle.readyStyleRevision).toBe(libertyPose.readyStyleRevision)
      expectPoseToMatch(afterSupersededStyle, libertyPose)
    }

    await page.getByRole('button', { name: 'Disable camera tracking' }).click()
    await expect(page.getByRole('button', { name: 'Enable camera tracking' })).toBeVisible()

    let manualPose = libertyPose
    if (!IS_STATIC_E2E) {
      manualPose = await readDebugMapSnapshot(page)
      if (!manualPose) throw new Error('Missing manual camera pose before Retry Map')
    }

    await page.route('**/map-styles/bright.json', route => route.abort('failed'))
    await styleButton.click()
    await expect(page.getByTestId('map-error')).toBeVisible({ timeout: 15_000 })
    await page.unroute('**/map-styles/bright.json')

    let poseBeforeRetry = manualPose
    if (!IS_STATIC_E2E && manualPose) {
      await setPlaybackProgress(page, 0.72)
      await expect.poll(async () => {
        const snapshot = await readDebugMapSnapshot(page)
        return snapshot
          ? coordinateDistanceMeters(snapshot.htmlMarkerPosition, manualPose.htmlMarkerPosition)
          : 0
      }, { timeout: 10_000, intervals: [100, 200, 300] }).toBeGreaterThan(100)
      poseBeforeRetry = await readDebugMapSnapshot(page)
      if (!poseBeforeRetry) throw new Error('Outgoing style lost its pose after a failed replacement')
      expect(coordinateDistanceMeters(poseBeforeRetry.htmlMarkerPosition, poseBeforeRetry.geoJsonMarkerPosition)).toBeLessThan(0.1)
      expect(coordinateDistanceMeters(poseBeforeRetry.htmlMarkerPosition, poseBeforeRetry.trailHeadPosition)).toBeLessThan(0.1)
    }

    const retryStyleResponse = page.waitForResponse(response => (
      response.url().endsWith('/map-styles/bright.json') && response.ok()
    ))
    await page.getByTestId('map-error').getByRole('button', { name: /retry map/i }).click()
    await retryStyleResponse
    await expect(page.getByTestId('map-error')).toHaveCount(0, { timeout: 15_000 })
    await expect(page.getByTestId('map-container').locator('canvas.maplibregl-canvas')).toHaveCount(1)
    await expect(page.locator('.maplibregl-marker')).toHaveCount(1, { timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Enable camera tracking' })).toBeVisible()

    if (!IS_STATIC_E2E && poseBeforeRetry && manualPose) {
      const retryPose = await waitForDebugPose(page, manualPose.readyStyleRevision)
      expectPoseToMatch(retryPose, poseBeforeRetry)
    }
  })

  test('in-app map retry rebinds an active journey creator', async ({ page }) => {
    const runtimeErrors: string[] = []
    page.on('pageerror', error => runtimeErrors.push(error.stack ?? error.message))
    page.on('console', message => {
      if (message.type() === 'error') runtimeErrors.push(message.text())
    })

    await page.getByRole('button', { name: 'Draw a route on the map' }).click()
    const undoButton = page.getByRole('button', { name: 'Undo' })
    const creatorPanel = page.getByTestId('journey-creator-panel')
    await expect(undoButton).toBeDisabled()
    await expect(creatorPanel).toHaveAttribute('data-map-interaction-ready', 'true', { timeout: 15_000 })
    await expect(creatorPanel).toHaveAttribute('aria-busy', 'false')
    const initialMapGeneration = Number(await creatorPanel.getAttribute('data-map-generation'))

    let canvas = page.getByTestId('map-container').locator('canvas.maplibregl-canvas')
    await expect(canvas).not.toHaveAttribute('aria-busy', 'true')
    let canvasBox = await canvas.boundingBox()
    if (!canvasBox) throw new Error('Missing initial map canvas geometry')
    await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2)
    await expect(page.getByText('1 location', { exact: true })).toBeVisible({ timeout: 10_000 })

    await page.route('**/map-styles/dark.json', route => route.abort('failed'))
    await page.getByRole('button', { name: /switch to dark mode/i }).click()
    await expect(page.getByTestId('map-error')).toBeVisible({ timeout: 15_000 })
    // The rejected style never replaces the still-interactive outgoing style.
    await expect(creatorPanel).toHaveAttribute('data-map-interaction-ready', 'true')
    await expect(creatorPanel).toHaveAttribute('aria-busy', 'false')
    await page.unroute('**/map-styles/dark.json')
    runtimeErrors.length = 0

    await creatorPanel.evaluate((panel) => {
      const debugWindow = window as Window & {
        __journeyReadinessTransitions?: Array<{ generation: number; ready: string | null; busy: string | null }>
      }
      const record = () => {
        debugWindow.__journeyReadinessTransitions ??= []
        debugWindow.__journeyReadinessTransitions.push({
          generation: Number(panel.getAttribute('data-map-generation')),
          ready: panel.getAttribute('data-map-interaction-ready'),
          busy: panel.getAttribute('aria-busy'),
        })
      }
      record()
      new MutationObserver(record).observe(panel, {
        attributes: true,
        attributeFilter: ['data-map-generation', 'data-map-interaction-ready', 'aria-busy'],
      })
    })

    const styleResponse = page.waitForResponse(response => (
      response.url().endsWith('/map-styles/dark.json') && response.ok()
    ))
    await page.getByTestId('map-error').getByRole('button', { name: /retry map/i }).click()
    await styleResponse
    await expect(page.getByTestId('map-error')).toHaveCount(0, { timeout: 15_000 })
    await expect.poll(async () => Number(await creatorPanel.getAttribute('data-map-generation')), {
      timeout: 15_000,
      intervals: [100, 200, 400],
    }).toBeGreaterThan(initialMapGeneration)
    await expect(creatorPanel).toHaveAttribute('data-map-interaction-ready', 'true', { timeout: 15_000 })
    await expect(creatorPanel).toHaveAttribute('aria-busy', 'false')
    const readinessTransitions = await page.evaluate(() => (
      (window as Window & {
        __journeyReadinessTransitions?: Array<{ generation: number; ready: string | null; busy: string | null }>
      }).__journeyReadinessTransitions ?? []
    ))
    expect(readinessTransitions.some(transition => (
      transition.generation > initialMapGeneration
      && transition.ready === 'false'
      && transition.busy === 'true'
    ))).toBe(true)
    if (await page.getByRole('heading', { name: 'Something went wrong' }).isVisible()) {
      throw new Error(`Map retry caused an application error:\n${runtimeErrors.join('\n')}`)
    }
    await expect(page.getByText('1 location', { exact: true })).toBeVisible()

    canvas = page.getByTestId('map-container').locator('canvas.maplibregl-canvas')
    await expect(canvas).not.toHaveAttribute('aria-busy', 'true')
    canvasBox = await canvas.boundingBox()
    if (!canvasBox) throw new Error('Missing recovered map canvas geometry')
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.65, canvasBox.y + canvasBox.height / 2)

    await expect(page.getByText(/2 locations/)).toBeVisible({ timeout: 10_000 })
    await expect(creatorPanel).toHaveAttribute('data-map-interaction-ready', 'true')
    await expect(canvas).not.toHaveAttribute('aria-busy', 'true')
    expect(runtimeErrors).toEqual([])
  })

  test('loads sample trip from landing CTA', async ({ page }) => {
    const sampleBtn = page.getByRole('button', { name: 'Try with a sample trip' })
    await expect(sampleBtn).toBeVisible({ timeout: 10_000 })
    await sampleBtn.click({ force: true })

    await expect(visibleTrackTitle(page, 'Namsan Tower Walk')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('text=/\\d+ \\/ \\d+ locations/').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible({ timeout: 10_000 })
  })

  test('a delayed sample cannot replace a newer manual journey session', async ({ page }) => {
    let releaseSample!: () => void
    const sampleReleased = new Promise<void>((resolve) => { releaseSample = resolve })
    let markSampleRequested!: () => void
    const sampleRequested = new Promise<void>((resolve) => { markSampleRequested = resolve })

    await page.route('**/sample-trip.gpx', async (route) => {
      markSampleRequested()
      await sampleReleased
      await route.fulfill({ path: GPX_FIXTURE, contentType: 'application/gpx+xml' }).catch(() => undefined)
    })

    await page.getByRole('button', { name: 'Try with a sample trip' }).click({ force: true })
    await sampleRequested
    await page.getByRole('button', { name: /draw a route/i }).click({ force: true })
    await expect(page.getByRole('region', { name: 'Create Journey' })).toBeVisible({ timeout: 10_000 })

    releaseSample()
    await expect(page.getByRole('region', { name: 'Create Journey' })).toBeVisible()
    await expect(visibleTrackTitle(page, 'Test Route Seoul')).toHaveCount(0)
  })

  test('moves focus to a visible workspace control after a track loads', async ({ page }) => {
    await page.getByRole('button', { name: 'Try with a sample trip' }).click({ force: true })
    await expect(visibleTrackTitle(page, 'Namsan Tower Walk')).toBeVisible({ timeout: 15_000 })

    await expect.poll(async () => activeElementState(page), { timeout: 10_000, intervals: [100, 200, 300] })
      .toMatchObject({ tag: 'button', aria: 'Play' })
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

  test('imports GPX files that use single-quoted XML attributes', async ({ page }) => {
    await uploadCustomFile(page, SINGLE_QUOTE_GPX_FIXTURE)
    await expect(visibleTrackTitle(page, 'Single Quote GPX')).toBeVisible({ timeout: 15_000 })
  })

  test('rejects GPX files with entity declarations before XML parsing', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(MULTILINE_ENTITY_GPX_FIXTURE)
    await expect(page.locator('p[role="alert"]')).toContainText('Failed to parse file', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Travelback' })).toBeVisible()
  })

  test('imports valid XML files above the soft 1MB regression threshold', async ({ page }) => {
    const tmpFile = path.resolve(__dirname, `fixtures/valid-large-${process.pid}.gpx`)
    fs.writeFileSync(tmpFile, `<gpx><trk><name>Large Valid GPX</name><trkseg><trkpt lat="37.5665" lon="126.9780"><time>2024-01-01T00:00:00Z</time></trkpt><trkpt lat="37.5666" lon="126.9790"><time>2024-01-01T00:01:00Z</time></trkpt></trkseg></trk>${' '.repeat(1024 * 1024 + 1)}</gpx>`, 'utf8')
    try {
      await uploadCustomFile(page, tmpFile)
      await expect(visibleTrackTitle(page, 'Large Valid GPX')).toContainText('2 / 2 locations', { timeout: 15_000 })
    } finally {
      fs.unlinkSync(tmpFile)
    }
  })

  test('rejects oversized XML files before main-thread parsing', async ({ page }) => {
    const tmpFile = path.resolve(__dirname, `fixtures/oversized-${process.pid}.gpx`)
    fs.writeFileSync(tmpFile, `<gpx>${' '.repeat(4 * 1024 * 1024 + 1)}</gpx>`, 'utf8')
    try {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tmpFile)
      await expect(page.locator('p[role="alert"]')).toContainText('Maximum size is 4MB', { timeout: 10_000 })
      await expect(page.getByRole('heading', { name: 'Travelback' })).toBeVisible()
    } finally {
      fs.unlinkSync(tmpFile)
    }
  })

  test('imports KML files composed from point placemarks', async ({ page }) => {
    await uploadCustomFile(page, POINT_PLACEMARKS_KML_FIXTURE)
    await expect(visibleTrackTitle(page, 'Point Placemark KML')).toBeVisible({ timeout: 15_000 })
  })

  test('elevation profile ignores malformed elevation values instead of rendering NaN geometry', async ({ page }) => {
    await uploadCustomFile(page, INVALID_ELEVATION_GPX_FIXTURE)
    await expect(visibleTrackTitle(page, 'Invalid Elevation Track')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('slider', { name: 'Elevation profile' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('slider', { name: 'Elevation profile' })).toHaveAttribute('aria-valuemin', '0')
    await expect(page.getByRole('slider', { name: 'Elevation profile' })).toHaveAttribute('aria-valuemax', '100')
    await expect
      .poll(async () => page.locator('svg[aria-label="Elevation profile"]').innerHTML())
      .not.toContain('NaN')
  })

  test('journey creator exposes 44px toggle icons at supported mobile widths', async ({ page }) => {
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/')
      await waitForApp(page)
      const drawRouteBtn = page.getByRole('button', { name: /draw a route/i })
      await expect(drawRouteBtn).toBeVisible({ timeout: 10_000 })
      await drawRouteBtn.click({ force: true })

      await expect(page.getByRole('region', { name: 'Create Journey' })).toBeVisible({ timeout: 10_000 })
      await expect(page.getByTestId('journey-icon-walk')).toHaveAttribute('aria-pressed', 'true')

      for (const id of ['walk', 'car', 'plane', 'bus', 'train', 'bike']) {
        const icon = page.getByTestId(`journey-icon-${id}`)
        await expect(icon).toBeVisible()
        const box = await icon.boundingBox()
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
      }

      await page.getByTestId('journey-icon-car').click()
      await expect(page.getByTestId('journey-icon-car')).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByTestId('journey-icon-walk')).toHaveAttribute('aria-pressed', 'false')
    }
  })

  test('journey creator uses an editable route name', async ({ page }) => {
    await page.getByRole('button', { name: /draw a route/i }).click({ force: true })
    const panel = page.getByTestId('journey-creator-panel')
    await page.getByTestId('journey-icon-car').click()
    await page.getByTestId('journey-enable-search').click({ force: true })
    const searchInput = panel.getByRole('combobox')

    for (const coordinates of ['37.5665, 126.9780', '37.5765, 126.9880']) {
      await searchInput.fill(coordinates)
      await searchInput.press('Enter')
      await searchInput.press('ArrowDown')
      await searchInput.press('Enter')
    }

    await panel.getByRole('button', { name: 'Done' }).click()
    const nameInput = panel.getByRole('textbox', { name: 'Route name' })
    await expect(nameInput).toHaveValue('Custom Journey')
    await nameInput.fill('Bali 2026')
    await panel.getByRole('button', { name: 'Create Route' }).click()
    await expect(visibleTrackTitle(page, '🚗 Bali 2026')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('track-toolbar').getByRole('button', { name: 'New Route', exact: true }).click()
    await page.getByTestId('journey-enable-search').click({ force: true })
    for (const coordinates of ['37.5665, 126.9780', '37.5765, 126.9880']) {
      await searchInput.fill(coordinates)
      await searchInput.press('Enter')
      await searchInput.press('ArrowDown')
      await searchInput.press('Enter')
    }
    await panel.getByRole('button', { name: 'Done' }).click()
    await panel.getByRole('textbox', { name: 'Route name' }).fill('   ')
    await panel.getByRole('button', { name: 'Create Route' }).click()
    await expect(visibleTrackTitle(page, '🚶 Custom Journey')).toBeVisible({ timeout: 15_000 })
  })

  test('journey creator coordinate jump stays local and accepts pasted coordinates', async ({ page }) => {
    await page.getByRole('button', { name: /draw a route/i }).click({ force: true })
    await expect(page.getByTestId('journey-enable-search')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('journey-creator-panel').getByRole('combobox')).toHaveCount(0)

    await page.getByTestId('journey-enable-search').click({ force: true })
    const searchInput = page.getByTestId('journey-creator-panel').getByRole('combobox')
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill('37.5665, 126.9780')
    await page.getByTestId('journey-search-submit').click({ force: true })

    const option = page.getByRole('option', { name: /37\.56650, 126\.97800/ })
    await expect(option).toBeVisible({ timeout: 10_000 })
    await expect.poll(async () => option.evaluate((element) => element.tagName.toLowerCase())).toBe('div')
    await expect(page.getByText('37.56650, 126.97800')).toBeVisible({ timeout: 10_000 })
  })

  test('journey coordinate search supports keyboard selection and antimeridian duplicate suppression', async ({ page }) => {
    await page.getByRole('button', { name: /draw a route/i }).click({ force: true })
    const panel = page.getByTestId('journey-creator-panel')
    await page.getByTestId('journey-enable-search').click({ force: true })
    const searchInput = panel.getByRole('combobox')
    await expect(searchInput).toBeVisible({ timeout: 10_000 })

    await searchInput.fill('0, 179.99999')
    await searchInput.press('Enter')
    await searchInput.press('ArrowDown')
    await expect(searchInput).toHaveAttribute('aria-activedescendant', 'journey-search-option-0')
    await searchInput.press('Enter')
    await expect(panel.getByText('1 location')).toBeVisible({ timeout: 10_000 })

    await searchInput.fill('0, -179.99999')
    await searchInput.press('Enter')
    await searchInput.press('ArrowDown')
    await searchInput.press('Enter')
    await expect(panel.getByText('1 location')).toBeVisible({ timeout: 10_000 })
    await expect(panel.getByText(/2 locations/)).toHaveCount(0)
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

    // Wait for layout to fully stabilize after track load
    await page.waitForTimeout(1000)

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
    }, { timeout: 15_000, intervals: [200, 400, 600, 1000] }).toBeFalsy()
  })

  test('loaded desktop global toolbar sits below the primary top action row', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await waitForApp(page)
    await page.getByRole('button', { name: 'Try with a sample trip' }).click({ force: true })
    await page.getByTestId('load-new-file-button').waitFor({ state: 'visible', timeout: 15_000 })

    const globalToolbar = page.getByTestId('global-toolbar')
    const trackToolbar = page.getByTestId('track-toolbar')

    await expect(globalToolbar).toBeVisible({ timeout: 10_000 })
    await expect(trackToolbar).toBeVisible({ timeout: 10_000 })

    await expect.poll(async () => {
      const [globalBox, trackBox] = await Promise.all([
        globalToolbar.boundingBox(),
        trackToolbar.boundingBox(),
      ])

      if (!globalBox || !trackBox) return false
      return globalBox.y >= trackBox.y + trackBox.height + 8
    }, { timeout: 5_000, intervals: [120, 200, 300] }).toBe(true)
  })

  test('loaded settings toolbar does not overlap track titles at responsive breakpoints', async ({ page }) => {
    for (const width of [640, 768]) {
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/')
      await waitForApp(page)
      await page.getByRole('button', { name: 'Try with a sample trip' }).click({ force: true })

      const globalToolbar = page.getByTestId('global-toolbar')
      const title = width < 768
        ? page.getByTestId('track-title-mobile')
        : page.getByTestId('track-title')
      await expect(globalToolbar).toBeVisible({ timeout: 15_000 })
      await expect(title).toBeVisible({ timeout: 15_000 })

      const [toolbarBox, titleBox] = await Promise.all([
        globalToolbar.boundingBox(),
        title.boundingBox(),
      ])
      if (!toolbarBox || !titleBox) throw new Error(`Missing responsive layout geometry at ${width}px`)
      expect(boxesOverlap(toolbarBox, titleBox)).toBe(false)
    }
  })

  test('mobile header layout keeps the action bar compact after a track loads', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await waitForApp(page)

    const sampleBtn = page.getByRole('button', { name: 'Try with a sample trip' })
    await expect(sampleBtn).toBeVisible({ timeout: 10_000 })
    await sampleBtn.click({ force: true })

    await expect(page.getByTestId('load-new-file-button')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('global-toolbar')).toBeHidden()
    await expect(page.getByTestId('track-toolbar')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('track-title')).toBeHidden()
    await expect(page.getByRole('button', { name: 'More controls' })).toHaveAttribute('aria-haspopup', 'dialog')

    await expect.poll(async () => {
      const [loadNewFileBox, trackToolbarBox] = await Promise.all([
        page.getByTestId('load-new-file-button').boundingBox(),
        page.getByTestId('track-toolbar').boundingBox(),
      ])

      if (!loadNewFileBox || !trackToolbarBox) {
        return true
      }

      return boxesOverlap(loadNewFileBox, trackToolbarBox)
    }, { timeout: 5_000, intervals: [120, 200, 300] }).toBeFalsy()

    await expect.poll(async () => {
      const loadNewFileBox = await page.getByTestId('load-new-file-button').boundingBox()
      return loadNewFileBox?.width ?? 999
    }, { timeout: 5_000, intervals: [120, 200, 300] }).toBeLessThanOrEqual(60)
    await expect(page.getByTestId('load-new-file-button')).toContainText('New')
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

  test('loaded map attribution remains unobscured, hittable, and keyboard operable', async ({ page }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 1000 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await waitForApp(page)
      await uploadGpx(page)

      const attribution = page.locator('.map-has-track-controls .maplibregl-ctrl-attrib')
      const timeline = page.getByTestId('timeline-selector')
      const elevation = page.getByRole('slider', { name: 'Elevation profile' })
      const playbackStats = page.getByTestId('playback-stats')
      const controlsPanel = page.getByTestId('controls-primary-row')
        .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " gc ")][1]')

      await expect(attribution).toBeVisible({ timeout: 15_000 })
      await expect(timeline).toBeVisible()
      await expect(elevation).toBeVisible()
      await expect(playbackStats).toBeVisible()
      await expect(controlsPanel).toBeVisible()

      await expect.poll(async () => {
        const [attributionBox, ...protectedBoxes] = await Promise.all([
          attribution.boundingBox(),
          timeline.boundingBox(),
          elevation.boundingBox(),
          playbackStats.boundingBox(),
          controlsPanel.boundingBox(),
        ])
        if (!attributionBox || protectedBoxes.some(box => !box)) return true
        return protectedBoxes.some(box => boxesOverlap(attributionBox, box!))
      }, { timeout: 10_000, intervals: [100, 200, 400] }).toBe(false)

      const attributionBox = await attribution.boundingBox()
      if (!attributionBox) throw new Error(`Missing attribution geometry at ${viewport.width}px`)
      const attributionOwnsCenterHit = await page.evaluate(({ x, y }) => {
        return Boolean(document.elementFromPoint(x, y)?.closest('.maplibregl-ctrl-attrib'))
      }, {
        x: attributionBox.x + attributionBox.width / 2,
        y: attributionBox.y + attributionBox.height / 2,
      })
      expect(attributionOwnsCenterHit).toBe(true)

      const toggle = attribution.locator('summary.maplibregl-ctrl-attrib-button')
      const attributionContent = attribution.locator('.maplibregl-ctrl-attrib-inner')
      const isCompact = await attribution.evaluate(element => element.classList.contains('maplibregl-compact'))
      if (isCompact) {
        await expect(toggle).toBeVisible()
        await toggle.focus()
        await expect(toggle).toBeFocused()
        const focusOutline = await toggle.evaluate(element => {
          const style = getComputedStyle(element)
          return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) }
        })
        expect(focusOutline.style).not.toBe('none')
        expect(focusOutline.width).toBeGreaterThanOrEqual(2)

        // MapLibre initially expands compact attribution. Normalize it using
        // the keyboard, then prove keyboard-only expansion and collapse.
        if (await attributionContent.isVisible()) {
          await toggle.press('Space')
          await expect(attributionContent).toBeHidden()
        }

        const toggleBox = await toggle.boundingBox()
        if (!toggleBox) throw new Error(`Missing compact attribution toggle geometry at ${viewport.width}px`)
        expect(toggleBox.width).toBeGreaterThanOrEqual(44)
        expect(toggleBox.height).toBeGreaterThanOrEqual(44)
        const toggleOwnsCenterHit = await page.evaluate(({ x, y }) => {
          return Boolean(document.elementFromPoint(x, y)?.closest('summary.maplibregl-ctrl-attrib-button'))
        }, {
          x: toggleBox.x + toggleBox.width / 2,
          y: toggleBox.y + toggleBox.height / 2,
        })
        expect(toggleOwnsCenterHit).toBe(true)

        await toggle.dispatchEvent('keydown', { key: ' ', code: 'Space', repeat: true, bubbles: true })
        await expect(attributionContent).toBeHidden()
        await toggle.press('Enter')
        await expect(attributionContent).toBeVisible()

        const attributionLink = attributionContent.getByRole('link').first()
        const linkBox = await attributionLink.boundingBox()
        if (!linkBox) throw new Error(`Missing expanded attribution link geometry at ${viewport.width}px`)
        const linkOwnsCenterHit = await page.evaluate(({ x, y }) => {
          return document.elementFromPoint(x, y)?.closest('a') !== null
        }, {
          x: linkBox.x + linkBox.width / 2,
          y: linkBox.y + linkBox.height / 2,
        })
        expect(linkOwnsCenterHit).toBe(true)

        await toggle.press('Space')
        await expect(attributionContent).toBeHidden()
      } else {
        await expect(attributionContent).toBeVisible()
        const attributionLink = attributionContent.getByRole('link').first()
        await attributionLink.focus()
        await expect(attributionLink).toBeFocused()
      }
    }
  })

  test('desktop and mobile Help actions open shortcuts outside the bottom controls', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/')
    await waitForApp(page)
    await uploadGpx(page)

    const help = page.getByTestId('desktop-keyboard-help')
    const bottomStack = page.getByTestId('track-bottom-stack')
    const progress = page.getByLabel('Playback progress')
    await expect(help).toBeVisible()
    await expect(bottomStack).toBeVisible()

    const [helpBox, stackBox] = await Promise.all([help.boundingBox(), bottomStack.boundingBox()])
    if (!helpBox || !stackBox) throw new Error('Missing Help or bottom-stack geometry')
    expect(boxesOverlap(helpBox, stackBox)).toBe(false)

    const helpOwnsCenterHit = await page.evaluate(({ x, y }) => {
      return document.elementFromPoint(x, y)?.closest('[data-testid="desktop-keyboard-help"]') != null
    }, {
      x: helpBox.x + helpBox.width / 2,
      y: helpBox.y + helpBox.height / 2,
    })
    expect(helpOwnsCenterHit).toBe(true)

    const progressBeforeHelp = await progress.inputValue()
    await page.mouse.click(helpBox.x + helpBox.width / 2, helpBox.y + helpBox.height / 2)
    await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeVisible()
    await expect(progress).toHaveValue(progressBeforeHelp)
    await page.keyboard.press('Escape')
    await expect(help).toBeFocused()

    await page.setViewportSize({ width: 390, height: 844 })
    const moreControls = page.getByRole('button', { name: 'More controls' })
    await moreControls.click()
    const mobileMenu = page.getByTestId('track-toolbar-mobile-menu')
    await mobileMenu.getByRole('button', { name: 'Help', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeVisible()
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

  test('timeline trimming never collapses to a one-point track', async ({ page }) => {
    await page.locator('input[type=\"file\"]').setInputFiles(TINY_TRIM_GPX_FIXTURE)
    await expect(visibleTrackTitle(page, 'Tiny Trim Track')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('text=/3 \\/ 3 locations/').first()).toBeVisible()

    const endHandle = page.getByTestId('timeline-end-handle')
    const timeline = page.getByTestId('timeline-selector')
    const [handleBox, timelineBox] = await Promise.all([endHandle.boundingBox(), timeline.boundingBox()])
    if (!handleBox || !timelineBox) throw new Error('Missing timeline geometry for trim test')

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(timelineBox.x + timelineBox.width * 0.42, handleBox.y + handleBox.height / 2, { steps: 12 })
    await page.mouse.up()

    await expect(page.locator('text=/2 \\/ 3 locations/').first()).toBeVisible({ timeout: 10_000 })
  })

  test('timeline Reset remains above elevation and restores the full route', async ({ page }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 1000 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await waitForApp(page)
      await uploadGpx(page)

      const fullCounts = await loadedTrackPointCounts(page)
      expect(fullCounts.visible).toBe(fullCounts.full)

      const endHandle = page.getByTestId('timeline-end-handle')
      await endHandle.focus()
      await page.keyboard.press('Home')
      await expect.poll(async () => (await loadedTrackPointCounts(page)).visible, {
        timeout: 10_000,
        intervals: [100, 200, 300],
      }).toBeLessThan(fullCounts.full)

      const reset = page.getByRole('button', { name: 'Reset timeline range' })
      const timeline = page.getByTestId('timeline-selector')
      const elevation = page.getByRole('slider', { name: 'Elevation profile' })
      await expect(reset).toBeVisible()
      await expect(elevation).toBeVisible()

      const [resetBox, timelineBox, elevationBox] = await Promise.all([
        reset.boundingBox(),
        timeline.boundingBox(),
        elevation.boundingBox(),
      ])
      if (!resetBox || !timelineBox || !elevationBox) {
        throw new Error(`Missing bottom-stack geometry at ${viewport.width}x${viewport.height}`)
      }
      expect(resetBox.width).toBeGreaterThanOrEqual(44)
      expect(resetBox.height).toBeGreaterThanOrEqual(44)
      expect(boxesOverlap(timelineBox, elevationBox)).toBe(false)
      expect(await reset.evaluate((button) => {
        const box = button.getBoundingClientRect()
        const owner = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
        return owner instanceof Element && owner.closest('button') === button
      })).toBe(true)

      const playbackProgress = page.getByLabel('Playback progress')
      const progressBeforeReset = await playbackProgress.inputValue()
      await reset.click()
      await expect(reset).toHaveCount(0)
      await expect.poll(async () => loadedTrackPointCounts(page), {
        timeout: 10_000,
        intervals: [100, 200, 300],
      }).toEqual({ visible: fullCounts.full, full: fullCounts.full })
      await expect(playbackProgress).toHaveValue(progressBeforeReset)
    }
  })

  test('timeline can select the first adjacent pair on an uneven-distance track', async ({ page }) => {
    await uploadCustomFile(page, UNEVEN_TRIM_GPX_FIXTURE)
    await expect(visibleTrackTitle(page, 'Uneven Trim Track')).toBeVisible({ timeout: 15_000 })

    const endHandle = page.getByTestId('timeline-end-handle')
    await endHandle.focus()
    await page.keyboard.press('Home')

    await expect(page.locator('text=/2 \/ 3 locations/').first()).toBeVisible({ timeout: 10_000 })
  })

  test('timeline trimming keeps full-track distance scale after a trim', async ({ page }) => {
    await uploadGpx(page)
    await expect(visibleTrackTitle(page, 'Test Route Seoul')).toBeVisible({ timeout: 15_000 })

    const endHandle = page.getByTestId('timeline-end-handle')
    const timeline = page.getByTestId('timeline-selector')
    const [initialHandleBox, timelineBox] = await Promise.all([endHandle.boundingBox(), timeline.boundingBox()])
    if (!initialHandleBox || !timelineBox) throw new Error('Missing timeline geometry for full-scale trim test')

    await page.mouse.move(initialHandleBox.x + initialHandleBox.width / 2, initialHandleBox.y + initialHandleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(timelineBox.x + timelineBox.width * 0.5, initialHandleBox.y + initialHandleBox.height / 2, { steps: 12 })
    await page.mouse.up()

    await expect.poll(async () => {
      const counts = await loadedTrackPointCounts(page)
      return counts.visible
    }, { timeout: 10_000, intervals: [120, 200, 300] }).toBeLessThan(20)
    const trimmedCount = (await loadedTrackPointCounts(page)).visible

    const nextHandleBox = await endHandle.boundingBox()
    if (!nextHandleBox) throw new Error('Missing end handle after first trim')
    await page.mouse.move(nextHandleBox.x + nextHandleBox.width / 2, nextHandleBox.y + nextHandleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(timelineBox.x + timelineBox.width * 0.9, nextHandleBox.y + nextHandleBox.height / 2, { steps: 12 })
    await page.mouse.up()

    await expect.poll(async () => {
      const counts = await loadedTrackPointCounts(page)
      return counts.visible
    }, { timeout: 10_000, intervals: [120, 200, 300] }).toBeGreaterThan(trimmedCount)
  })

  test('first-use timeline hint remains visible and dismissible', async ({ page }) => {
    await page.evaluate(() => window.localStorage.removeItem('travelback-timeline-hint-dismissed'))
    await uploadGpx(page)

    const hint = page.getByRole('button', { name: 'Drag the handles to select a date range' })
    await expect(hint).toBeVisible()
    await hint.click()
    await expect(hint).toBeHidden()
    await expect.poll(() => page.evaluate(() => (
      window.localStorage.getItem('travelback-timeline-hint-dismissed')
    ))).toBe('1')
  })

  test('clicking a trimmed timeline seeks within the active range', async ({ page }) => {
    await uploadGpx(page)
    const timeline = page.getByTestId('timeline-selector')
    const timelineBox = await timeline.boundingBox()
    const startHandle = page.getByTestId('timeline-start-handle')
    const endHandle = page.getByTestId('timeline-end-handle')
    if (!timelineBox) throw new Error('Missing timeline geometry for local seek test')

    const endBox = await endHandle.boundingBox()
    if (!endBox) throw new Error('Missing end handle for local seek test')
    await page.mouse.move(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(timelineBox.x + timelineBox.width * 0.75, endBox.y + endBox.height / 2, { steps: 8 })
    await page.mouse.up()

    const startBox = await startHandle.boundingBox()
    if (!startBox) throw new Error('Missing start handle for local seek test')
    await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(timelineBox.x + timelineBox.width * 0.25, startBox.y + startBox.height / 2, { steps: 8 })
    await page.mouse.up()

    const selectedBox = await page.getByTestId('timeline-selected-region').boundingBox()
    if (!selectedBox) throw new Error('Missing selected timeline region')
    await page.mouse.click(selectedBox.x + selectedBox.width / 2, selectedBox.y + selectedBox.height / 2)

    await expect.poll(async () => Number(await page.getByLabel('Playback progress').inputValue()), {
      timeout: 5_000,
      intervals: [120, 200, 300],
    }).toBeCloseTo(0.5, 1)
  })

  test('timeline keyboard trimming updates the track without scrubbing playback', async ({ page }) => {
    await uploadGpx(page)
    await expect(visibleTrackTitle(page, 'Test Route Seoul')).toBeVisible({ timeout: 15_000 })

    const playbackProgress = page.getByLabel('Playback progress')
    await playbackProgress.evaluate((element) => {
      const input = element as HTMLInputElement
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(input, '0.5')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await expect(playbackProgress).toHaveValue('0.5')

    await page.evaluate(() => {
      const testWindow = window as Window & { __timelineBubbledKeys?: string[] }
      testWindow.__timelineBubbledKeys = []
      window.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') testWindow.__timelineBubbledKeys?.push(event.key)
      })
    })

    const endHandle = page.getByTestId('timeline-end-handle')
    await expect(page.getByTestId('timeline-start-handle')).toHaveAttribute('aria-valuetext', /Start of range/)
    await expect(endHandle).toHaveAttribute('aria-valuetext', /End of range/)
    const initialEndDate = (await page.getByTestId('timeline-end-date').textContent())?.trim()
    if (!initialEndDate) throw new Error('Missing initial timeline end date')
    await expect(endHandle).toHaveAttribute('aria-valuetext', new RegExp(initialEndDate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    await endHandle.focus()
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('ArrowLeft')
    }

    await expect.poll(async () => {
      const counts = await loadedTrackPointCounts(page)
      return counts.visible
    }, { timeout: 10_000, intervals: [120, 200, 300] }).toBeLessThan(20)
    const updatedEndDate = (await page.getByTestId('timeline-end-date').textContent())?.trim()
    if (!updatedEndDate) throw new Error('Missing updated timeline end date')
    expect(updatedEndDate).not.toBe(initialEndDate)
    await expect(endHandle).toHaveAttribute('aria-valuetext', new RegExp(updatedEndDate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    await expect(playbackProgress).toHaveValue('0')
    expect(await page.evaluate(() => {
      const testWindow = window as Window & { __timelineBubbledKeys?: string[] }
      return testWindow.__timelineBubbledKeys?.length ?? 0
    })).toBe(0)

    await playbackProgress.focus()
    await page.keyboard.press('ArrowRight')
    await expect(playbackProgress).toHaveValue('0.001')
  })

  test('map arrow keys do not scrub playback while the map canvas is focused', async ({ page }) => {
    await uploadGpx(page)

    const playbackProgress = page.getByLabel('Playback progress')
    const mapCanvas = page.getByTestId('map-container').locator('canvas.maplibregl-canvas')
    await expect(playbackProgress).toHaveValue('0')
    await mapCanvas.focus()
    await page.keyboard.press('ArrowRight')

    await expect(mapCanvas).toBeFocused()
    await expect(playbackProgress).toHaveValue('0')

    await page.locator('main#app').evaluate((element) => {
      element.setAttribute('tabindex', '-1')
      ;(element as HTMLElement).focus()
    })
    await page.keyboard.press('ArrowRight')
    await expect(playbackProgress).toHaveValue('0.02')
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

  test('mobile scene controls do not trigger swipe dismissal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await waitForApp(page)
    await uploadGpx(page)
    await page.getByText('Camera', { exact: true }).click({ force: true })
    const panel = page.getByTestId('scene-editor-panel')
    const addButton = page.getByRole('button', { name: '+ Add' })
    await addButton.click({ force: true })
    await addButton.click({ force: true })
    await panel.getByRole('button', { name: 'Customize' }).first().click()

    const controls = [
      page.getByRole('slider', { name: 'Scene transition blend duration' }),
      panel.getByRole('slider', { name: /Scene 1.*end/i }),
      page.getByRole('slider', { name: 'Zoom for Scene 1' }),
      page.getByRole('slider', { name: 'Tilt for Scene 1' }),
      page.getByRole('slider', { name: 'Direction for Scene 1' }),
      page.getByRole('slider', { name: 'Orbit speed for Scene 1' }),
    ]
    for (const control of controls) {
      await touchDrag(page, control, -45)
      await expect(panel).toBeVisible()
    }

    await touchDrag(page, page.getByTestId('scene-editor-swipe-handle'), -100)
    await expect(panel).toBeHidden({ timeout: 10_000 })
  })

  test('loaded route map is operational after track load', async ({ page }) => {
    await uploadGpx(page)
    await page.waitForTimeout(750)

    if (IS_STATIC_E2E) {
      await expectProductionDebugApiAbsent(page)
      await expectPublicMapReady(page)
      await startPlayback(page)
      return
    }

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

  test('starting a new route clears prior trip map artifacts', async ({ page }) => {
    await uploadGpx(page)
    await page.waitForTimeout(750)

    if (IS_STATIC_E2E) {
      await expectProductionDebugApiAbsent(page)
      await expectPublicMapReady(page)
    } else {
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
      }), { timeout: 10_000, intervals: [150, 300, 500] }).toMatchObject({
        hasRouteSource: true,
        hasTrailSource: true,
        hasRouteLayer: true,
        hasTrailLayer: true,
        hasMarker: true,
      })
    }

    const newRouteBtn = page.getByText('New Route', { exact: true })
    await expect(newRouteBtn).toBeVisible({ timeout: 10_000 })
    await newRouteBtn.click({ force: true })
    await expect(page.getByTestId('journey-creator-panel')).toBeVisible({ timeout: 10_000 })

    if (IS_STATIC_E2E) {
      await expectProductionDebugApiAbsent(page)
      await expect(visibleTrackTitle(page, 'Test Route Seoul')).toBeHidden()
      await expect(page.getByTestId('map-error')).toHaveCount(0)
      return
    }

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
    }), { timeout: 10_000, intervals: [150, 300, 500] }).toMatchObject({
      hasRouteSource: false,
      hasTrailSource: false,
      hasRouteLayer: false,
      hasTrailLayer: false,
      hasMarker: false,
    })
  })

  test('segmented tracks do not count the gap in playback stats', async ({ page }) => {
    await page.getByRole('button', { name: /metric units/i }).click({ force: true })
    await page.locator('input[type="file"]').setInputFiles(SEGMENTED_GPX_FIXTURE)
    await expect(visibleTrackTitle(page, 'Segmented City Hop')).toBeVisible({ timeout: 15_000 })

    const expectedMeters = Math.round(
      haversineDistanceMeters({ lat: 37.5665, lng: 126.9780 }, { lat: 37.5669, lng: 126.9784 })
      + haversineDistanceMeters({ lat: 35.6895, lng: 139.6917 }, { lat: 35.6899, lng: 139.6921 })
    )

    await expect(page.getByTestId('playback-stats')).toContainText(`/ ${expectedMeters} m`)
  })

  test('imperial unit toggle updates playback stats', async ({ page }) => {
    await uploadGpx(page)
    await page.getByRole('button', { name: /imperial units/i }).click({ force: true })
    await expect(page.getByTestId('playback-stats')).toContainText(/ft|mi/)
  })

  test('map camera movement stays stable during playback', async ({ page }) => {
    await uploadGpx(page)

    // Wait for map layers to fully initialize before starting playback
    await page.waitForTimeout(3000)

    await startPlayback(page)
    if (IS_STATIC_E2E) {
      await expectProductionDebugApiAbsent(page)
      await expectPublicMapReady(page)
      await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
      return
    }

    const samples = await collectCameraSamples(page)

    expectStableCameraMotion(samples)
  })

  test('scene-based camera movement stays stable during playback', async ({ page }) => {
    await uploadGpx(page)

    // Wait for map layers to fully initialize before configuring scenes
    await page.waitForTimeout(2000)

    const scenesBtn = page.getByText('Camera', { exact: true })
    await expect(scenesBtn).toBeVisible({ timeout: 10_000 })
    await scenesBtn.click({ force: true })
    await expect(page.getByTestId('scene-editor-panel')).toBeVisible({ timeout: 10_000 })
    const addSceneBtn = page.getByRole('button', { name: '+ Add' })
    await expect(addSceneBtn).toBeVisible({ timeout: 5_000 })
    await addSceneBtn.click({ force: true })

    await startPlayback(page)
    if (IS_STATIC_E2E) {
      await expectProductionDebugApiAbsent(page)
      await expectPublicMapReady(page)
      await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
      return
    }

    const samples = await collectCameraSamples(page)

    expectStableCameraMotion(samples)
  })

  test('scene overview camera frames antimeridian tracks without zooming to the world', async ({ page }) => {
    await uploadCustomFile(page, ANTIMERIDIAN_GPX_FIXTURE)
    await expect(visibleTrackTitle(page, 'Antimeridian Hop')).toBeVisible({ timeout: 15_000 })

    if (IS_STATIC_E2E) {
      await expectProductionDebugApiAbsent(page)
      await expectPublicMapReady(page)
    } else {
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

        return (window as DebugWindow).__travelbackDebug?.getMapState() ?? null
      }), { timeout: 20_000, intervals: [150, 250, 400, 600] }).toMatchObject({
        hasRouteSource: true,
        hasTrailSource: true,
        hasRouteLayer: true,
        hasTrailLayer: true,
        hasMarker: true,
      })
    }

    await page.getByText('Camera', { exact: true }).click({ force: true })
    await expect(page.getByTestId('scene-editor-panel')).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Cinematic' }).click({ force: true })

    await startPlayback(page)

    if (IS_STATIC_E2E) {
      await expectProductionDebugApiAbsent(page)
      await expect(page.getByTestId('map-error')).toHaveCount(0)
      await expect(visibleTrackTitle(page, 'Antimeridian Hop')).toBeVisible()
      return
    }

    await expect.poll(async () => page.evaluate(() => {
      type DebugWindow = Window & {
        __travelbackDebug?: {
          getCamera: () => { center: [number, number]; zoom: number } | null
        }
      }

      const camera = (window as DebugWindow).__travelbackDebug?.getCamera() ?? null
      return Boolean(camera && camera.zoom > 3 && Math.abs(Math.abs(camera.center[0]) - 180) < 5)
    }), { timeout: 10_000, intervals: [200, 400, 600] }).toBe(true)
  })

  test('scene editor opens and allows adding scenes', async ({ page }) => {
    await uploadGpx(page)

    // Click Camera button (renamed from Scenes)
    const scenesBtn = page.getByText('Camera', { exact: true })
    await expect(scenesBtn).toBeVisible({ timeout: 10_000 })
    await scenesBtn.click({ force: true })

    // Scene editor should appear
    await expect(page.getByText('No scenes yet')).toBeVisible({ timeout: 5_000 })

    // Cycle r5 promoted the scene editor panel to role="region" with
    // aria-labelledby; cycle r6 codifies that as a regression guard.
    await expect(page.getByRole('region', { name: 'Camera' })).toBeVisible({ timeout: 5_000 })

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

    await page.getByRole('button', { name: 'Delete scene Scene 1' }).click({ force: true })
    await expect(page.getByTestId('scene-editor-status')).toContainText('Deleted Scene 1')
  })

  test('scene delete undo preserves edits made after deletion', async ({ page }) => {
    await uploadGpx(page)
    await page.getByText('Camera', { exact: true }).click({ force: true })
    const addButton = page.getByRole('button', { name: '+ Add' })
    await addButton.click({ force: true })
    await addButton.click({ force: true })
    await addButton.click({ force: true })

    await page.getByRole('button', { name: 'Delete scene Scene 2' }).click({ force: true })
    const remainingName = page.getByRole('textbox').nth(1)
    await remainingName.fill('Edited after deletion')
    await page.getByRole('button', { name: 'Customize' }).nth(1).click()
    const editedStart = page.getByRole('spinbutton').first()
    await editedStart.fill('25')
    await page.locator('.space-y-2 select').nth(1).selectOption('orbit')
    await page.getByRole('button', { name: 'Undo' }).click()

    await expect(page.getByRole('textbox')).toHaveCount(3)
    await expect(page.getByRole('textbox').nth(0)).toHaveValue('Scene 1')
    await expect(page.getByRole('textbox').nth(1)).toHaveValue('Scene 2')
    await expect(page.getByRole('textbox').nth(2)).toHaveValue('Edited after deletion')

    await page.getByRole('button', { name: 'Customize' }).nth(1).click()
    await expect(page.getByRole('spinbutton').nth(1)).toHaveValue('25')
    await page.getByRole('button', { name: 'Customize' }).nth(2).click()
    await expect(page.getByRole('spinbutton').first()).toHaveValue('25')
    await expect(page.locator('.space-y-2 select').nth(2)).toHaveValue('orbit')
  })

  test('keyboard scene range edits use committed normalization', async ({ page }) => {
    await uploadGpx(page)
    await page.getByText('Camera', { exact: true }).click({ force: true })
    const addButton = page.getByRole('button', { name: '+ Add' })
    await addButton.click({ force: true })
    await addButton.click({ force: true })

    await page.getByTestId('scene-editor-panel').getByRole('button', { name: 'Customize' }).nth(1).click()
    const secondStart = page.getByRole('slider', { name: /Scene 2.*start/i })
    await expect(secondStart).toHaveAttribute('aria-valuenow', '15')
    await secondStart.focus()
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft')
    await expect(secondStart).toHaveAttribute('aria-valuenow', '15')
  })

  test('scene parameter preview clear restores the live route camera', async ({ page }) => {
    await uploadGpx(page)
    const playbackProgress = page.getByLabel('Playback progress')
    await playbackProgress.evaluate((element) => {
      const input = element as HTMLInputElement
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(input, '0.8')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await expect(playbackProgress).toHaveValue('0.8')
    await page.waitForTimeout(1500)

    let baselineZoom = 0
    if (IS_STATIC_E2E) {
      await expectProductionDebugApiAbsent(page)
      await expectPublicMapReady(page)
    } else {
      const currentZoom = await page.evaluate(() => {
        type DebugWindow = Window & {
          __travelbackDebug?: {
            getCamera: () => { zoom: number } | null
          }
        }
        return (window as DebugWindow).__travelbackDebug?.getCamera()?.zoom ?? null
      })
      if (currentZoom == null) throw new Error('Missing baseline camera')
      baselineZoom = currentZoom
    }

    await page.getByText('Camera', { exact: true }).click({ force: true })
    await expect(page.getByTestId('scene-editor-panel')).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: '+ Add' }).click({ force: true })
    await page.getByRole('button', { name: 'Customize' }).click({ force: true })

    const zoomSlider = page.getByLabel('Zoom for Scene 1')
    await zoomSlider.evaluate((element) => {
      const input = element as HTMLInputElement
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(input, '20')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    if (IS_STATIC_E2E) {
      await expect(zoomSlider).toHaveValue('20')
      await zoomSlider.press('ArrowUp')
      await expect(playbackProgress).toHaveValue('0.8')
      await expect(page.getByTestId('map-error')).toHaveCount(0)
      await expectProductionDebugApiAbsent(page)
      return
    }

    await expect.poll(async () => page.evaluate(() => {
      type DebugWindow = Window & {
        __travelbackDebug?: {
          getCamera: () => { zoom: number } | null
        }
      }
      return (window as DebugWindow).__travelbackDebug?.getCamera()?.zoom ?? null
    }), { timeout: 10_000, intervals: [120, 200, 300] }).toBeGreaterThan(18)

    await zoomSlider.press('ArrowUp')

    await expect.poll(async () => page.evaluate(() => {
      type DebugWindow = Window & {
        __travelbackDebug?: {
          getCamera: () => { zoom: number } | null
        }
      }
      return (window as DebugWindow).__travelbackDebug?.getCamera()?.zoom ?? null
    }), { timeout: 10_000, intervals: [120, 200, 300] }).toBeLessThan(Math.max(18, baselineZoom + 3))
  })

  test('cancelling a scene-invalidating trim restores the accepted range', async ({ page }) => {
    await uploadGpx(page)
    await page.getByText('Camera', { exact: true }).click({ force: true })
    await page.getByRole('button', { name: '+ Add' }).click({ force: true })

    const timeline = page.getByTestId('timeline-selector')
    const endHandle = page.getByTestId('timeline-end-handle')
    const [timelineBox, endHandleBox] = await Promise.all([timeline.boundingBox(), endHandle.boundingBox()])
    if (!timelineBox || !endHandleBox) throw new Error('Missing timeline geometry')

    await page.mouse.move(endHandleBox.x + endHandleBox.width / 2, endHandleBox.y + endHandleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(timelineBox.x + timelineBox.width * 0.8, endHandleBox.y + endHandleBox.height / 2, { steps: 8 })
    await page.mouse.up()

    const confirmDialog = page.getByRole('dialog', { name: /Trimming the timeline/ })
    await expect(confirmDialog).toBeVisible({ timeout: 10_000 })
    await expect(endHandle).not.toHaveAttribute('aria-valuenow', '100')
    await confirmDialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(confirmDialog).toBeHidden()
    await expect(endHandle).toHaveAttribute('aria-valuenow', '100')
    await expect.poll(async () => (await loadedTrackPointCounts(page)).visible).toBe(20)
  })

  test('a clamped timeline key does not discard scenes from an accepted trim', async ({ page }) => {
    await uploadGpx(page)

    const endHandle = page.getByTestId('timeline-end-handle')
    await endHandle.focus()
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft')
    await expect.poll(async () => (await loadedTrackPointCounts(page)).visible, {
      timeout: 10_000,
      intervals: [120, 200, 300],
    }).toBeLessThan(20)
    const acceptedPointCount = (await loadedTrackPointCounts(page)).visible

    await page.getByText('Camera', { exact: true }).click({ force: true })
    await page.getByRole('button', { name: '+ Add' }).click({ force: true })
    await expect(page.getByRole('textbox').first()).toHaveValue('Scene 1')

    const startHandle = page.getByTestId('timeline-start-handle')
    await expect(startHandle).toHaveAttribute('aria-valuenow', '0')
    await startHandle.focus()
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(250)

    await expect(page.getByRole('dialog', { name: /Trimming the timeline/ })).toHaveCount(0)
    await expect(page.getByRole('textbox').first()).toHaveValue('Scene 1')
    await expect.poll(async () => (await loadedTrackPointCounts(page)).visible).toBe(acceptedPointCount)
  })

  test('timeline trimming clears scenes authored against the previous full track after confirmation', async ({ page }) => {
    await uploadGpx(page)

    await page.getByText('Camera', { exact: true }).click({ force: true })
    await expect(page.getByTestId('scene-editor-panel')).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: '+ Add' }).click({ force: true })
    await expect(page.getByRole('textbox').first()).toHaveValue('Scene 1', { timeout: 5_000 })

    const timeline = page.getByTestId('timeline-selector')
    const timelineBox = await timeline.boundingBox()
    const endHandle = page.getByTestId('timeline-end-handle')
    const endHandleBox = await endHandle.boundingBox()
    if (!timelineBox || !endHandleBox) throw new Error('Missing timeline geometry')

    await page.mouse.move(endHandleBox.x + endHandleBox.width / 2, endHandleBox.y + endHandleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(timelineBox.x + timelineBox.width * 0.8, endHandleBox.y + endHandleBox.height / 2, { steps: 8 })
    await page.mouse.up()

    const confirmDialog = page.getByRole('dialog', { name: /Trimming the timeline/ })
    await expect(confirmDialog).toBeVisible({ timeout: 10_000 })
    await confirmDialog.getByRole('button', { name: 'Discard' }).click()
    await expect(page.getByTestId('scene-editor-panel')).toBeHidden({ timeout: 10_000 })
    await page.getByText('Camera', { exact: true }).click({ force: true })
    await expect(page.getByText('No scenes yet')).toBeVisible({ timeout: 10_000 })
  })

  test('scene presets use localized default names', async ({ page }) => {
    await page.getByTestId('global-toolbar').getByRole('combobox').selectOption('ko')
    await uploadGpx(page)

    await page.getByText('카메라', { exact: true }).click({ force: true })
    await expect(page.getByTestId('scene-editor-panel')).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: '시네마틱' }).click({ force: true })

    const firstSceneName = page.getByTestId('scene-editor-panel').getByRole('textbox').first()
    await expect(firstSceneName).toHaveValue(/전체 보기/)
    await expect(firstSceneName).not.toHaveValue('Opening Overview')
  })

  test('scene editor can change camera mode', async ({ page }) => {
    await uploadGpx(page)

    // Open scene editor (Camera button, renamed from Scenes)
    const scenesBtn = page.getByText('Camera', { exact: true })
    await expect(scenesBtn).toBeVisible({ timeout: 10_000 })
    await scenesBtn.click({ force: true })

    // Wait for scene editor panel to appear, then add a scene
    await expect(page.getByTestId('scene-editor-panel')).toBeVisible({ timeout: 10_000 })
    const addBtn = page.getByRole('button', { name: '+ Add' })
    await expect(addBtn).toBeVisible({ timeout: 5_000 })
    await addBtn.click({ force: true })

    // Change camera mode to Orbit
    const modeSelect = page.locator('.space-y-2 select').first()
    await modeSelect.selectOption('orbit')
    await expect(modeSelect).toHaveValue('orbit')
  })

  test('map style cycling works across all bundled themes without breaking the map', async ({ page }) => {
    await uploadGpx(page)

    const styleBtn = page.getByTestId('map-style-button')
    await expect(styleBtn).toBeVisible({ timeout: 10_000 })

    if (IS_STATIC_E2E) {
      await expectProductionDebugApiAbsent(page)
      await expectPublicMapReady(page)
    }

    for (const label of ['Light', 'Dark', 'Liberty', 'Bright', 'Voyager']) {
      await styleBtn.click({ force: true })
      await expect(styleBtn).toHaveText(new RegExp(`Map:\\s*${label}`), { timeout: 10_000 })
      await expect(page.getByTestId('map-error')).toHaveCount(0)
      if (IS_STATIC_E2E) continue

      await expect.poll(async () => {
        return page.evaluate(() => {
          type DebugWindow = Window & {
            __travelbackDebug?: {
              getMapState: () => { hasRouteLayer: boolean; hasTrailLayer: boolean; hasReferenceGridLayer: boolean } | null
            }
          }

          const state = (window as DebugWindow).__travelbackDebug?.getMapState()
          return Boolean(state?.hasRouteLayer && state?.hasTrailLayer && state?.hasReferenceGridLayer)
        })
      }, { timeout: 10_000, intervals: [200, 400, 800] }).toBe(true)
    }
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

  test('system theme changes update theme-derived map style without an explicit override', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await waitForApp(page)
    await uploadGpx(page)

    const styleBtn = page.getByTestId('map-style-button')
    await expect(styleBtn).toHaveText(/Map:\s*Voyager/, { timeout: 10_000 })

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-mode'))).toBe('dark')
    await expect(styleBtn).toHaveText(/Map:\s*Dark/, { timeout: 10_000 })
  })

  test('system theme changes wait for export cleanup before changing map style', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.evaluate(() => {
      window.localStorage.removeItem('travelback-theme')
      window.localStorage.removeItem('travelback-theme-explicit')
      window.localStorage.removeItem('travelback-mapstyle')
      window.localStorage.removeItem('travelback-mapstyle-explicit')
      window.localStorage.setItem('travelback-export-test-stub', '1')
    })
    await page.reload()
    await waitForApp(page)
    await uploadGpx(page)

    let darkStyleRequests = 0
    await page.route('**/map-styles/dark.json', async (route) => {
      darkStyleRequests += 1
      await route.continue()
    })

    await page.getByText('Export', { exact: true }).click({ force: true })
    const exportPanel = page.getByRole('dialog', { name: 'Export Video' })
    await page.evaluate(() => {
      type ExportFrameWindow = Window & {
        __releaseTravelbackExportFrames?: () => void
      }
      const exportWindow = window as ExportFrameWindow
      const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window)
      const nativeCancelAnimationFrame = window.cancelAnimationFrame.bind(window)
      const heldFrames = new Map<number, FrameRequestCallback>()
      let nextFrameId = 1_000_000

      window.requestAnimationFrame = (callback: FrameRequestCallback) => {
        if (document.querySelector('[data-travelback-exporting="true"]')) {
          const frameId = nextFrameId++
          heldFrames.set(frameId, callback)
          return frameId
        }
        return nativeRequestAnimationFrame(callback)
      }
      window.cancelAnimationFrame = (frameId: number) => {
        if (!heldFrames.delete(frameId)) nativeCancelAnimationFrame(frameId)
      }
      exportWindow.__releaseTravelbackExportFrames = () => {
        window.requestAnimationFrame = nativeRequestAnimationFrame
        window.cancelAnimationFrame = nativeCancelAnimationFrame
        for (const callback of heldFrames.values()) nativeRequestAnimationFrame(callback)
        heldFrames.clear()
      }
    })

    await exportPanel.getByRole('button', { name: 'Start Export' }).click({ force: true })
    await expect(page.locator('main#app')).toHaveAttribute('data-travelback-exporting', 'true')
    await page.waitForTimeout(100)

    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForTimeout(300)
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-mode'))).toBe('light')
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-mapstyle'))).toBe('voyager')
    expect(darkStyleRequests).toBe(0)

    await page.evaluate(() => {
      const exportWindow = window as Window & { __releaseTravelbackExportFrames?: () => void }
      exportWindow.__releaseTravelbackExportFrames?.()
    })
    await expect(exportPanel.getByRole('heading', { name: /Video (ready|saved)!?/ })).toBeVisible({ timeout: 15_000 })
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-mode'))).toBe('dark')
    await expect.poll(async () => page.evaluate(() => document.documentElement.getAttribute('data-mapstyle'))).toBe('dark')
    await expect.poll(() => darkStyleRequests).toBeGreaterThan(0)
    await expect(page.getByTestId('map-error')).toHaveCount(0)
  })

  test('explicit map style choices survive later system theme changes', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await waitForApp(page)
    await uploadGpx(page)

    const styleBtn = page.getByTestId('map-style-button')
    await styleBtn.click({ force: true })
    await styleBtn.click({ force: true })
    await styleBtn.click({ force: true })
    await expect(styleBtn).toHaveText(/Map:\s*Liberty/, { timeout: 10_000 })

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(styleBtn).toHaveText(/Map:\s*Liberty/, { timeout: 10_000 })

    await page.reload()
    await waitForApp(page)
    await uploadGpx(page)
    const restoredStyleBtn = page.getByTestId('map-style-button')
    await expect(restoredStyleBtn).toHaveText(/Map:\s*Liberty/, { timeout: 10_000 })

    await page.getByRole('button', { name: /switch to dark mode/i }).click({ force: true })
    await expect(restoredStyleBtn).toHaveText(/Map:\s*Liberty/, { timeout: 10_000 })
  })

  test('export panel uses dialog semantics and traps keyboard focus', async ({ page }) => {
    await uploadGpx(page)
    await page.getByText('Export', { exact: true }).click({ force: true })

    const dialog = page.getByRole('dialog', { name: 'Export Video' })
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await expect(dialog).toHaveAttribute('aria-modal', 'true')

    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
    }

    const active = await activeElementState(page)
    expect(active?.insideDialog).toBe(true)
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
    const exportPanel = page.getByRole('dialog', { name: 'Export Video' })
    const resolutionSelect = exportPanel.getByRole('combobox', { name: 'Resolution' })
    await expect(resolutionSelect).toBeVisible()
    await expect(exportPanel.getByRole('spinbutton', { name: 'Duration' })).toBeVisible()
    await expect(exportPanel.getByRole('combobox', { name: 'Quality' })).toBeVisible()

    // Codec is now behind the Advanced toggle — click to expand
    await page.getByText('Advanced').click({ force: true })
    await expect(exportPanel.getByRole('combobox', { name: 'Codec' })).toBeVisible()
    await expect(exportPanel.getByRole('combobox', { name: 'FPS' })).toBeVisible()
    await expect(exportPanel.getByRole('spinbutton', { name: 'Mbps' })).toBeVisible()

    await expect(page.getByRole('dialog', { name: 'Export Video' }).getByText('This browser cannot export')).toHaveCount(0)

    // Should have Start Export button
    await expect(page.getByText('Start Export')).toBeVisible()
  })

  test('export panel defaults to vertical short-form output', async ({ page }) => {
    await uploadGpx(page)
    await page.getByText('Export', { exact: true }).click({ force: true })

    const exportPanel = page.getByRole('dialog', { name: 'Export Video' })
    await expect(exportPanel.getByRole('combobox', { name: 'Resolution' })).toHaveValue('1')
    await expect(exportPanel.locator('p').filter({ hasText: '1080×1920' })).toBeVisible()
  })

  test('export panel can select TikTok resolution', async ({ page }) => {
    await uploadGpx(page)
    await page.getByText('Export', { exact: true }).click({ force: true })
    await expect(page.getByText('Export Video')).toBeVisible()

    // Find the resolution combobox inside the export panel (it contains "YouTube" as selected text)
    const exportPanel = page.getByRole('dialog', { name: 'Export Video' })
    const resSelect = exportPanel.getByRole('combobox', { name: 'Resolution' })
    await resSelect.selectOption({ index: 1 }) // TikTok is second option

    // Output description should update - the × is a Unicode multiply sign
    await expect(exportPanel.locator('p').filter({ hasText: '1080' })).toBeVisible()
  })

  test('export panel can complete the local export path', async ({ page }) => {
    await page.evaluate(() => window.localStorage.setItem('travelback-export-test-stub', '1'))
    await uploadGpx(page)
    await page.getByText('Export', { exact: true }).click({ force: true })

    const exportPanel = page.getByRole('dialog', { name: 'Export Video' })
    await expect(exportPanel).toBeVisible()
    await exportPanel.getByRole('button', { name: 'Start Export' }).click({ force: true })
    const successHeading = exportPanel.getByRole('heading', { name: /Video (ready|saved)!?/ })
    await expect(successHeading).toBeVisible({ timeout: 15_000 })
    await expect(successHeading).toBeFocused()
    await expect(exportPanel.getByRole('link', { name: /Download MP4/i })).toHaveAttribute('download', /Travelback.*\.mp4/)
  })

  test('picker cancellation explains that the ready video is not saved yet', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('travelback-export-test-stub', '1')
      Object.defineProperty(window, 'showSaveFilePicker', {
        configurable: true,
        value: async () => {
          throw new DOMException('Save cancelled', 'AbortError')
        },
      })
    })
    await page.reload()
    await waitForApp(page)
    await uploadGpx(page)
    await page.getByText('Export', { exact: true }).click({ force: true })

    const exportPanel = page.getByRole('dialog', { name: 'Export Video' })
    await exportPanel.getByRole('button', { name: 'Start Export' }).click({ force: true })

    await expect(exportPanel.getByRole('heading', { name: 'Video ready' })).toBeVisible({ timeout: 15_000 })
    await expect(exportPanel.getByText(/has not been saved yet/i)).toBeVisible()
    await expect(exportPanel.getByRole('link', { name: /Download MP4/i })).toBeVisible()
    await expect(exportPanel.getByText(/find the MP4 in (Downloads|Files)/i)).toHaveCount(0)
  })

  test('share reports when the actual exported MP4 is unsupported', async ({ page }) => {
    await page.addInitScript(() => {
      const shareWindow = window as Window & { __travelbackShareCalls?: number }
      shareWindow.__travelbackShareCalls = 0
      Object.defineProperties(navigator, {
        canShare: {
          configurable: true,
          value: ({ files }: ShareData) => files?.[0]?.size === 1,
        },
        share: {
          configurable: true,
          value: async () => { shareWindow.__travelbackShareCalls = (shareWindow.__travelbackShareCalls ?? 0) + 1 },
        },
      })
      window.localStorage.setItem('travelback-export-test-stub', '1')
    })
    await page.reload()
    await waitForApp(page)
    await uploadGpx(page)
    await page.getByText('Export', { exact: true }).click({ force: true })

    const exportPanel = page.getByRole('dialog', { name: 'Export Video' })
    await exportPanel.getByRole('button', { name: 'Start Export' }).click({ force: true })
    await expect(exportPanel.getByRole('button', { name: 'Share' })).toBeVisible({ timeout: 15_000 })
    await exportPanel.getByRole('button', { name: 'Share' }).click()

    await expect(exportPanel.getByRole('alert')).toContainText('Sharing failed')
    expect(await page.evaluate(() => (window as Window & { __travelbackShareCalls?: number }).__travelbackShareCalls)).toBe(0)
  })

  // Real export smoke test — exercises the actual WebCodecs/mediabunny pipeline
  // instead of the 26-byte stub. Gate behind TRAVELBACK_REAL_EXPORT=1 so it
  // only runs when explicitly requested (the real path is slow and codec-dependent).
  test('real export produces a valid MP4 via WebCodecs', async ({ page }) => {
    test.skip(process.env.TRAVELBACK_REAL_EXPORT !== '1', 'Set TRAVELBACK_REAL_EXPORT=1 on a WebCodecs-capable runner')
    test.setTimeout(360_000)

    // Native save pickers cannot be automated and can block a headless run
    // after encoding has completed. Reject that optional path so the export
    // uses its normal anchor-download fallback; the video pipeline remains real.
    await page.evaluate(() => {
      const debugWindow = window as Window & { __travelbackSavePickerCalls?: number }
      debugWindow.__travelbackSavePickerCalls = 0
      Object.defineProperty(window, 'showSaveFilePicker', {
        configurable: true,
        value: async () => {
          debugWindow.__travelbackSavePickerCalls = (debugWindow.__travelbackSavePickerCalls ?? 0) + 1
          throw new DOMException('Use the automated download fallback', 'NotAllowedError')
        },
      })
    })

    await uploadGpx(page)
    await page.getByText('Export', { exact: true }).click({ force: true })

    const exportPanel = page.getByRole('dialog', { name: 'Export Video' })
    await expect(exportPanel).toBeVisible()

    // Select the minimum supported duration and lowest resolution for speed.
    await exportPanel.getByRole('spinbutton', { name: 'Duration' }).fill('5')
    const resSelect = exportPanel.getByRole('combobox', { name: 'Resolution' })
    await resSelect.selectOption({ index: 4 }) // HD (lowest)
    await exportPanel.getByText('Advanced').click({ force: true })
    await exportPanel.getByRole('combobox', { name: 'FPS' }).selectOption('24')
    await exportPanel.getByRole('combobox', { name: 'Quality' }).selectOption('low')

    const startExportButton = exportPanel.getByRole('button', { name: 'Start Export' })
    await expect(startExportButton).toBeEnabled({ timeout: 30_000 })
    await startExportButton.click()
    const completedHeading = exportPanel.getByRole('heading', { name: /Video (ready|saved)!?/ })
    await expect.poll(async () => {
      if (await completedHeading.isVisible()) return 'done'
      const progress = await exportPanel.getByRole('progressbar').getAttribute('aria-valuenow').catch(() => null)
      const savePickerCalls = await page.evaluate(() => {
        return (window as Window & { __travelbackSavePickerCalls?: number }).__travelbackSavePickerCalls ?? 0
      })
      return `progress=${progress}; savePickerCalls=${savePickerCalls}`
    }, { timeout: 330_000, intervals: [1_000] }).toBe('done')
    await expect(completedHeading).toBeVisible()
    expect(await page.evaluate(() => {
      return (window as Window & { __travelbackSavePickerCalls?: number }).__travelbackSavePickerCalls ?? 0
    })).toBe(1)
    const downloadLink = exportPanel.getByRole('link', { name: /Download MP4/i })
    await expect(downloadLink).toHaveAttribute('download', /Travelback.*\.mp4/)
    const downloadPromise = page.waitForEvent('download')
    await downloadLink.click()
    const download = await downloadPromise
    const downloadedPath = await download.path()
    if (!downloadedPath) throw new Error('Export download did not produce a local file')
    const mp4 = fs.readFileSync(downloadedPath)
    expect(mp4.byteLength).toBeGreaterThan(1024)
    expect(mp4.subarray(4, 8).toString('ascii')).toBe('ftyp')
  })

  test('export panel clamps playback duration to the supported export limit', async ({ page }) => {
    await uploadGpx(page)
    await page.getByLabel('Animation duration').selectOption('300')
    await page.getByText('Export', { exact: true }).click({ force: true })

    const exportPanel = page.getByRole('dialog', { name: 'Export Video' })
    await expect(exportPanel.getByRole('spinbutton', { name: 'Duration' })).toHaveValue('180')
  })

  test('track edits clear completed export results before the next export', async ({ page }) => {
    await page.evaluate(() => window.localStorage.setItem('travelback-export-test-stub', '1'))
    await uploadGpx(page)
    await page.getByText('Export', { exact: true }).click({ force: true })

    const exportPanel = page.getByRole('dialog', { name: 'Export Video' })
    await exportPanel.getByRole('button', { name: 'Start Export' }).click({ force: true })
    await expect(exportPanel.getByRole('heading', { name: /Video (ready|saved)!?/ })).toBeVisible({ timeout: 15_000 })
    await expect(exportPanel.getByRole('link', { name: /Download MP4/i })).toBeVisible()
    await page.getByRole('button', { name: 'Close panel' }).click({ force: true })

    const endHandle = page.getByTestId('timeline-end-handle')
    const timeline = page.getByTestId('timeline-selector')
    const [handleBox, timelineBox] = await Promise.all([endHandle.boundingBox(), timeline.boundingBox()])
    if (!handleBox || !timelineBox) throw new Error('Missing timeline geometry for export reset test')

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(timelineBox.x + timelineBox.width * 0.75, handleBox.y + handleBox.height / 2, { steps: 10 })
    await page.mouse.up()

    await page.getByText('Export', { exact: true }).click({ force: true })
    const reopenedPanel = page.getByRole('dialog', { name: 'Export Video' })
    await expect(reopenedPanel.getByRole('heading', { name: 'Export Video' })).toBeVisible({ timeout: 10_000 })
    await expect(reopenedPanel.getByRole('button', { name: 'Start Export' })).toBeVisible()
    await expect(reopenedPanel.getByRole('link', { name: /Download MP4/i })).toHaveCount(0)
  })

  test('timeline no-op clicks preserve completed export results', async ({ page }) => {
    await page.evaluate(() => window.localStorage.setItem('travelback-export-test-stub', '1'))
    await uploadGpx(page)
    await page.getByText('Export', { exact: true }).click({ force: true })

    const exportPanel = page.getByRole('dialog', { name: 'Export Video' })
    await exportPanel.getByRole('button', { name: 'Start Export' }).click({ force: true })
    await expect(exportPanel.getByRole('link', { name: /Download MP4/i })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Close panel' }).click({ force: true })

    const endHandle = page.getByTestId('timeline-end-handle')
    const handleBox = await endHandle.boundingBox()
    if (!handleBox) throw new Error('Missing end handle geometry for no-op export preservation test')

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.up()

    await page.getByText('Export', { exact: true }).click({ force: true })
    const reopenedPanel = page.getByRole('dialog', { name: 'Export Video' })
    await expect(reopenedPanel.getByRole('link', { name: /Download MP4/i })).toBeVisible({ timeout: 10_000 })
  })

  test('export panel close button works', async ({ page }) => {
    await uploadGpx(page)
    await page.getByText('Export', { exact: true }).click({ force: true })
    await expect(page.getByText('Export Video')).toBeVisible()

    // Close it
    await page.getByRole('button', { name: 'Close panel' }).click({ force: true })
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

  test('imports Google JSON flat arrays when records start after metadata entries', async ({ page }) => {
    const tmpFile = path.resolve(__dirname, `fixtures/google-offset-records-${process.pid}.json`)
    const leadingNoise = Array.from({ length: 100 }, (_, index) => ({ note: `metadata-${index}` }))
    const records = [
      { latitudeE7: 375665000, longitudeE7: 1269780000, timestamp: '2024-01-01T00:00:00Z' },
      { latitudeE7: 375666000, longitudeE7: 1269790000, timestamp: '2024-01-01T00:02:00Z' },
    ]

    fs.writeFileSync(tmpFile, JSON.stringify([...leadingNoise, ...records]), 'utf8')
    try {
      await uploadJson(page, tmpFile)
      await expect(visibleTrackTitle(page, 'Google Location History')).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('text=/2 \\/ 2 locations/').first()).toBeVisible()
    } finally {
      fs.unlinkSync(tmpFile)
    }
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

  test('preserves repeated untimed Google visits across semantic segments', async ({ page }) => {
    await uploadJson(page, JSON_REVISIT_SEGMENTS_FIXTURE)
    await expect(visibleTrackTitle(page, 'Google Location History')).toContainText('3 / 3 locations', { timeout: 20_000 })
  })

  test('deduplicates timed Google observations repeated across matching export branches', async ({ page }) => {
    await uploadJson(page, JSON_MIXED_DUPLICATE_BRANCHES_FIXTURE)
    await expect(visibleTrackTitle(page, 'Google Location History')).toContainText('2 / 2 locations', { timeout: 20_000 })
  })

  // --- Error resilience ---

  test('shows error for unsupported file format', async ({ page }) => {
    // Create a temporary .txt file to upload
    const tmpFile = path.resolve(__dirname, `fixtures/unsupported-${process.pid}.txt`)
    fs.writeFileSync(tmpFile, 'This is not a travel file')
    try {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(tmpFile)
      // Should show an error message (error text in the upload area)
      await expect(page.locator('p[role="alert"]')).toContainText('That file is not a travel route file', { timeout: 10_000 })
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

    const scenesBtn = page.getByText('Camera', { exact: true })
    await expect(scenesBtn).toBeVisible({ timeout: 10_000 })
    await scenesBtn.click({ force: true })
    await expect(page.getByTestId('scene-editor-panel')).toBeVisible({ timeout: 10_000 })
    const addSceneBtn = page.getByRole('button', { name: '+ Add' })
    await expect(addSceneBtn).toBeVisible({ timeout: 5_000 })
    await addSceneBtn.click({ force: true })
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
