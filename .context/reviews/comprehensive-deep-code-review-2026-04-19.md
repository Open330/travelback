# Comprehensive Deep Code Review — 2026-04-19

**Reviewer:** Claude (full codebase audit)
**Scope:** All 30+ source files, 1 web worker, 3 scripts, e2e tests
**Date:** 2026-04-19

---

## Summary

| Severity | Count |
|----------|-------|
| HIGH     | 5     |
| MEDIUM   | 9     |
| LOW      | 7     |

Previous reviews (waves 1-5) identified and fixed many issues. This review re-audits the current codebase from scratch, confirming prior fixes and finding new issues.

---

## Previously Fixed (re-confirmed)

The following issues from earlier waves are confirmed **fixed** in the current code:

- Worker dedup key now uses `.toFixed(7)` (worker:158 matches parser.ts:370)
- Worker `parseRecords` now uses `parseOptionalNumber` for lat/lng (worker:42-43)
- Antimeridian handling in `computeBoundingBox`/`trackCenterFromBox` (camera.ts:53-83)
- Toast timer uses ref pattern (Toast.tsx:23)
- Binary search in `interpolateAlongTrack` (interpolate.ts:85-89)
- ModalDialog onClose ref (ModalDialog.tsx:84-85)
- ThemeToggle controlledMode guard (ThemeToggle.tsx:40)
- Zero-length scene filtering (camera.ts:43)
- serve-static path traversal + HEAD support
- FileUpload isTouchDevice hydration-safe
- Blob URL revoke on unmount and reset (useExportController.ts:49-53, 57-63)
- Floating-point dedup key `.toFixed(7)` (parser.ts:370)
- GPX child-element selection (parser.ts:105-107)
- BoundingBox cached with shifted longitude (camera.ts:53-75)
- GoogleGuide tab reset on open (GoogleGuide.tsx:141)
- Script hash entity decoding (harden-static-export.mjs:41-51)
- Worker JSON depth check (worker:182-201)
- Worker message size check (worker:218)
- Worker min-2-points check via main-thread (parser.ts:501)

---

## NEW Issues Found

### N-1: Worker does not remap segment start indices after dedup+sort

**Severity:** HIGH
**Confidence:** High
**File:** `public/workers/trackParser.worker.js:155-177` vs `src/lib/parser.ts:387-399`

**Problem:** The main-thread `parseGoogleLocationHistory` performs a sophisticated remapping of `segStarts` after deduplication and sort (parser.ts:387-399). The worker version returns `segStarts` directly without remapping. After dedup removes points and sort reorders them, the original indices in `segStarts` point to wrong positions.

**Current worker code (lines 155-177):**
```js
const seen = new Set()
const unique = []
for (const [order, point] of points.entries()) {
  const key = `${point.lat.toFixed(7)},${point.lng.toFixed(7)},${point.time ? point.time.getTime() : ''}`
  if (seen.has(key)) continue
  seen.add(key)
  unique.push({ point, order })
}

unique.sort((a, b) => { ... })

return {
  name: 'Google Location History',
  points: unique.map(({ point }) => point),
  ...(segStarts.length > 0 ? { segmentStartIndices: segStarts } : {}),
}
```

The main thread does:
```ts
const orderToNewIndex = new Map<number, number>()
unique.forEach((entry, newIndex) => orderToNewIndex.set(entry.order, newIndex))
const adjustedSegStarts = segStarts
  .map(originalIdx => {
    for (let i = originalIdx; i < points.length; i++) {
      const newIdx = orderToNewIndex.get(i)
      if (newIdx !== undefined) return newIdx
    }
    return -1
  })
  .filter(idx => idx > 0)
```

**Failure scenario:** A Google Location History file with timelineObjects produces segments. After dedup+sort, segment boundaries shift. The worker returns stale indices causing the map to draw incorrect segment gaps and the playback stats to compute wrong distances.

**Fix:** Add the same `orderToNewIndex` remapping logic to the worker before the return statement.

---

### N-2: `computeCameraForProgress` double-counts gap interpolation for globalProgress < first scene

**Severity:** HIGH
**Confidence:** Medium
**File:** `src/lib/camera.ts:382-388`

**Problem:** When `globalProgress` falls before the first scene (e.g., scenes start at 0.05 and progress is 0.02), the code interpolates from an overview camera to the first scene. However, `computeOverviewCamera` is called with `elapsedSec` which produces a rotating bearing. Meanwhile, the next scene at `localProgress=0.0` also includes its own bearing. The lerp between these two creates a bearing that can jump erratically if the overview rotation is fast.

**Code (lines 382-388):**
```ts
} else if (prevIdx === -1 && nextIdx >= 0) {
  const nextScene = normalizedScenes[nextIdx]
  const gapT = nextScene.startPercent > 0 ? globalProgress / nextScene.startPercent : 1
  const overviewCamera = computeOverviewCamera(track, cumulDist, elapsedSec)
  const nextCamera = computeCameraForScene(track, cumulDist, nextScene, 0.0, elapsedSec)
  return lerpCamera(overviewCamera, nextCamera, Math.max(0, Math.min(1, gapT)))
}
```

**Failure scenario:** User creates scenes starting at 5%. During playback at 1%, the overview camera rotates at 5 deg/s. The first scene starts with bearing=0. The lerp produces a bearing that oscillates as `elapsedSec` changes, causing visible jitter.

**Fix:** Either freeze `elapsedSec` for the overview camera during pre-scene gaps, or use a fixed bearing for the gap interpolation instead of the rotating overview.

---

### N-3: `parseGoogleLocationHistory` dispatcher uses `if` not `else if` for format detection, allowing mixed formats to double-parse

**Severity:** HIGH
**Confidence:** High
**File:** `src/lib/parser.ts:337-360`

**Problem:** The main-thread dispatcher uses a chain of independent `if` blocks (lines 337, 347, 352, 357). This means a JSON file containing both `timelineObjects` and `semanticSegments` (or any combination) will have ALL recognized formats parsed, and their points merged into the same `points` array. The worker has the same pattern (lines 131-151).

While this may be intentional for "enrichment", it causes:
1. Duplicate points when multiple sections describe the same locations
2. The dedup step then has to remove them, wasting CPU
3. Segment indices become unreliable because points from different formats are interleaved

**Code:**
```ts
// Records.json / Location History.json: { locations: [...] }
else if (!Array.isArray(data) && Array.isArray(data.locations)) {
  recognizedFormat = true
  parseRecords(data.locations, points)
}
// Semantic Location History (monthly): { timelineObjects: [...] }
if (!Array.isArray(data) && Array.isArray(data.timelineObjects)) {  // <-- NOT else if
  recognizedFormat = true
  parseTimelineObjects(data.timelineObjects, points, segStarts)
}
```

**Fix:** Either use `else if` to parse only the first recognized format, or add a comment explaining why multiple formats are intentionally merged and validate that dedup handles it correctly.

---

### N-4: `lerpCamera` longitude interpolation can wrap incorrectly for near-antimeridian points

**Severity:** HIGH
**Confidence:** Medium
**File:** `src/lib/camera.ts:115-117`

**Problem:** The longitude lerp in `lerpCamera` uses shortest-path wrapping `(((b.center[0] - a.center[0] + 540) % 360) - 180)`, but this is applied per-frame during smooth camera transitions. If the track crosses the antimeridian (e.g., Japan to Alaska), and two consecutive camera states straddle the 180/-180 boundary, the modulo math can produce a small residual error that accumulates over many frames, causing the camera center to drift slightly off the track.

**Code (line 115-117):**
```ts
center: [
  a.center[0] + (((b.center[0] - a.center[0] + 540) % 360) - 180) * s,
  a.center[1] + (b.center[1] - a.center[1]) * s,
],
```

**Failure scenario:** A route from Tokyo (lng=139.7) to Anchorage (lng=-149.9). The interpolated center should be around lng=165 (going east across the Pacific). But the shortest-path math could produce a center near lng=-5 (going west through Europe/Africa) depending on which direction the modulo resolves.

**Fix:** Use the same shifted-longitude approach used in `computeBoundingBox`/`trackCenterFromBox`. When the span exceeds 180, shift into the [0,360) domain before lerping, then shift back.

---

### N-5: `TimelineSelector` endDrag callback has stale closure over `onRangeChange`

**Severity:** HIGH
**Confidence:** Medium
**File:** `src/components/TimelineSelector.tsx:166-172` and `175-192`

**Problem:** The `endDrag` function captures `resolveRangeIndexes` and `onRangeChange` from the render scope where `startDrag` was called. But `startDrag` is called inline in JSX event handlers, and `endDrag` is used in a `useEffect` that only depends on `applyDrag`. If `onRangeChange` changes between when the drag started and when it ended (which can happen if the parent re-renders with a new callback), `endDrag` will call the stale `onRangeChange`.

More critically, the global mouse/touch listeners registered in the `useEffect` at line 175 use `applyDrag` which is declared with `useCallback([], ...)` (empty deps). This means `applyDrag` itself has stale closures. The `applyDrag` function calls `setStartRatio`/`setEndRatio` via the RAF callback, which is fine because those are state setters. But `endDrag` calls `onRangeChange` which could be stale.

**Current code:**
```ts
const endDrag = () => {
  dragState.current.dragging = null
  if (points.length > 0) {
    const { startIdx, endIdx } = resolveRangeIndexes()
    onRangeChange(startIdx, endIdx)
  }
}

useEffect(() => {
  const onMouseMove = (e: MouseEvent) => applyDrag(e.clientX)
  // ...
  const onUp = () => endDrag()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onUp)
  // ...
}, [applyDrag])
```

**Fix:** Use a ref for `onRangeChange` to avoid stale closures, similar to how `onCloseRef` is used in ModalDialog.

---

### N-6: `ElevationProfile` SVG gradient IDs can collide when multiple instances render

**Severity:** MEDIUM
**Confidence:** Medium
**File:** `src/components/ElevationProfile.tsx:17-18`

**Problem:** The component uses `useId()` for `gradientId` and `clipId`, which is correct for React 18+. However, if the same SVG is rendered twice on the page (unlikely but possible in testing or error recovery), the IDs are unique per component instance so this is actually fine. Downgrading this from initial concern after re-analysis.

**Revised assessment:** Not a bug with `useId()`. However, there is a subtle issue: the SVG `viewBox="0 0 100 100"` with `preserveAspectRatio="none"` and CSS class `h-10 w-full` means the coordinate space is 100x100 but the SVG stretches to full width and 40px height. The `vectorEffect="non-scaling-stroke"` on the path ensures stroke width is preserved, but the `strokeWidth: 1.5` in the style attribute combined with `vectorEffect="non-scaling-stroke"` means the stroke is 1.5 CSS pixels regardless of zoom -- this is actually correct behavior.

**Revised severity:** LOW (no actual bug, just noting the design choice)

---

### N-7: `JourneyCreator` does not validate coordinates from search against geographic bounds

**Severity:** MEDIUM
**Confidence:** High
**File:** `src/components/JourneyCreator.tsx:467-476`

**Problem:** `handleSelectPlace` calls `parseFloat` on lat/lng from search results but does not validate they fall within geographic bounds (-90..90, -180..180). While `parseCoordinateQuery` does validate bounds for coordinate parsing, the `handleSelectPlace` function is the final gate and does not re-validate.

**Code (lines 467-476):**
```ts
const handleSelectPlace = useCallback((lat: string, lon: string) => {
  const lng = parseFloat(lon)
  const latNum = parseFloat(lat)
  const map = mapRef.current?.getMap()
  if (map) map.flyTo({ center: [lng, latNum], zoom: 14 })
  waypointsRef.current = [...waypointsRef.current, { lng, lat: latNum }]
  // ...
}, [mapRef, updateMapData, syncUI])
```

`parseFloat` can return `NaN` for non-numeric strings. If `NaN` gets into waypoints, it will propagate into the Track and cause `interpolateAlongTrack` to produce NaN coordinates, breaking the entire map.

**Fix:** Add bounds and NaN validation:
```ts
if (!Number.isFinite(lng) || !Number.isFinite(latNum)) return
if (Math.abs(latNum) > 90 || Math.abs(lng) > 180) return
```

---

### N-8: `usePlaybackController` animation loop can miss the final frame

**Severity:** MEDIUM
**Confidence:** Medium
**File:** `src/lib/usePlaybackController.ts:91-97`

**Problem:** When `nextProgress >= 1`, the code sets progress to exactly 1.0 and stops. But the animation frame that detects this already computed an increment based on `rawDt`, and the intermediate progress between the previous frame and 1.0 is never rendered. For very high speed multipliers (16x), the progress can jump from e.g. 0.85 to 1.02, skipping 15% of the animation.

**Code:**
```ts
if (nextProgress >= 1) {
  setPlaybackProgress(1)
  setIsPlaying(false)
  return
}
```

**Failure scenario:** At 16x speed with a 10-second duration, each frame advances ~2.67%. If the last frame goes from 0.97 to 1.0, that's fine. But if it goes from 0.94 to 1.01, the 0.94->1.0 visual transition is abrupt.

**Fix:** This is a minor cosmetic issue. Could be improved by clamping to exactly 1.0 rather than jumping, but the current behavior is acceptable for most use cases.

---

### N-9: `FileUpload` error mapping depends on English error messages from parser

**Severity:** MEDIUM
**Confidence:** High
**File:** `src/components/FileUpload.tsx:50-56`

**Problem:** The error handling in `handleFile` matches English error message substrings to find i18n keys:
```ts
const parserErrorMap: Record<string, string> = {
  'Unsupported file format': 'fileUpload.unsupportedFormat',
  'Track must contain at least 2 points': 'fileUpload.tooFewPoints',
  'Track contains too many points': 'fileUpload.tooManyPoints',
  'Failed to read file': 'fileUpload.readFailed',
}
const matchedKey = Object.keys(parserErrorMap).find(m => message.includes(m))
```

If any parser error message text changes (e.g., rewording "Unsupported file format" to "Unsupported format"), the mapping silently breaks and falls through to the generic `t('fileUpload.parseFailed')`.

**Fix:** Use error codes or error classes instead of string matching. Define a custom error class with a `code` field in the parser, then match on the code.

---

### N-10: `SceneEditor` `commitScenes` calls `normalizeScenes` which silently modifies user input

**Severity:** MEDIUM
**Confidence:** High
**File:** `src/components/SceneEditor.tsx:199-216`

**Problem:** `commitScenes` calls `normalizeScenes(nextScenes)` which clamps, sorts, adjusts overlapping scenes, and filters zero-length ones. This is semantically correct but creates a disconnect between what the user entered and what is stored. If a user sets startPercent=0.5 and endPercent=0.3 (inverted), `normalizeScenes` silently fixes it. The `normalizationWarnings` feature partially addresses this, but the warnings are computed on the pre-normalized data while the actual scenes are post-normalized.

**Fix:** Consider showing the normalization result to the user (what the scene actually became after normalization) rather than the raw input, so the user sees the effective values.

---

### N-11: `MapView` map style change effect has a stale `track` closure

**Severity:** MEDIUM
**Confidence:** Medium
**File:** `src/components/MapView.tsx:563-584`

**Problem:** The map style change `useEffect` captures `track` in its closure. When the style changes, it re-adds layers for the current track. But if `track` is `null` at the time the effect fires (race condition during track loading), the layers won't be re-added. The `styleHandler` closure captures the `track` value from the render when the effect ran.

**Code:**
```ts
useEffect(() => {
  const map = mapRef.current
  if (!map || styleKeyRef.current === mapStyleKey) return
  styleKeyRef.current = mapStyleKey
  map.setStyle(MAP_STYLES[mapStyleKey].url)

  let styleHandler: (() => void) | null = null
  styleHandler = () => {
    addReferenceGridLayers(map, mapStyleKey, track)
    if (track) {
      addTrackLayers(map, track)
    }
  }
  map.once('style.load', styleHandler)
  // ...
}, [mapStyleKey, track])
```

**Fix:** Use `trackRef.current` instead of `track` in the styleHandler, similar to how the initial map setup uses refs.

---

### N-12: `ExportPanel` FPS is limited to 24/30/60 but `EXPORT_LIMITS.fps.max` is 120

**Severity:** MEDIUM
**Confidence:** High
**File:** `src/components/ExportPanel.tsx:288-292` vs `src/types.ts:82`

**Problem:** The FPS select dropdown only offers 24, 30, and 60 as options. But `EXPORT_LIMITS` defines `fps.max` as 120. There is no way for users to access higher frame rates even though the system supports them. This is not a bug per se, but a UX inconsistency.

**Fix:** Either add more FPS options (e.g., 90, 120) or reduce `EXPORT_LIMITS.fps.max` to 60.

---

### N-13: `downloadVideo` synchronous DOM manipulation can be blocked by browser pop-up blockers

**Severity:** MEDIUM
**Confidence:** Medium
**File:** `src/lib/videoEncoder.ts:154-161`

**Problem:** `downloadVideo` creates an `<a>` element, sets `download` attribute, and clicks it programmatically. Many browsers block programmatic downloads that are not initiated by a direct user gesture. Since `downloadVideo` is called from the async export flow (not directly from a click handler), the download may be silently blocked.

**Code:**
```ts
export function downloadVideo(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
```

**Fix:** Consider using the `File System Access API` (`showSaveFilePicker`) as a primary path, with the `<a>` download as fallback. Or at minimum, warn the user if the download may have been blocked.

---

### N-14: `checkJsonDepth` only scans first 1MB of potentially 200MB files

**Severity:** MEDIUM
**Confidence:** High
**File:** `src/lib/parser.ts:308` and `public/workers/trackParser.worker.js:187`

**Problem:** The `checkJsonDepth` function limits its scan to `Math.min(text.length, 1024 * 1024)`. For a 200MB file, this means it only validates the first 0.5% of the file. A maliciously crafted file could have excessive nesting after the first 1MB and pass the depth check.

**Fix:** Either scan the entire file (slower but correct), or sample at regular intervals, or note that `JSON.parse` itself will throw for truly malformed JSON, making this a defense-in-depth check that doesn't need to be perfect.

---

### N-15: `Controls` component re-creates `SPEEDS` and `DURATIONS` arrays on every render

**Severity:** LOW
**Confidence:** High
**File:** `src/components/Controls.tsx:24-25`

**Problem:** The `SPEEDS` and `DURATIONS` arrays are defined inside the module scope, so they are only created once. This is actually fine. Initially I thought they were inside the component, but they are at module level. No issue.

**Revised:** Not a bug.

---

### N-16: `useExportController` cleanup `await setTimeout` in finally block is not awaited properly

**Severity:** LOW
**Confidence:** High
**File:** `src/lib/useExportController.ts:158-164`

**Problem:** In the `finally` block of `exportTrack`:
```ts
} finally {
  exportAbortRef.current = null
  mapViewRef.current?.resetSize()
  await new Promise((resolve) => setTimeout(resolve, 200))
  if (mountedRef.current) {
    setIsExporting(false)
    setExportProgress(0)
  }
}
```

The `await setTimeout(200)` is used to wait for the map to resize. But this is a fragile timing-based approach. If the map takes longer than 200ms to resize (e.g., on a slow device), the state update may happen while the map is still resizing, causing a visual glitch.

**Fix:** Use `mapViewRef.current?.waitForIdle()` after `resetSize()` instead of a fixed timeout, similar to how the export pre-frame wait works.

---

### N-17: `ModalDialog` open/close lifecycle can lose focus if modal is opened while another is closing

**Severity:** LOW
**Confidence:** Low
**File:** `src/components/ModalDialog.tsx:87-158`

**Problem:** The `openModalStack` is a module-level array that tracks open modals. If a modal opens while another is in its closing animation, the stack management can get out of sync. The `closeModal` function uses `lastIndexOf` to find the modal to remove, which handles duplicates, but the body overflow and inert attribute management only restores on empty stack.

**Failure scenario:** Modal A is closing (cleanup not yet run). Modal B opens. Stack: [A, B]. A's cleanup runs, removes A from stack: [B]. But A's cleanup also restores `previousActiveElement` focus, which is now behind Modal B. Then B's focus management tries to focus inside B, but A's cleanup just moved focus elsewhere.

**Fix:** This is a minor edge case. The focus management could be improved by using a stack of `previousActiveElement` values, but the current behavior is acceptable for the two modal types in this app (ExportPanel and GoogleGuide are not opened simultaneously).

---

### N-18: `GoogleGuide` SVG illustrations use inline CSS variables that may not resolve in SSR

**Severity:** LOW
**Confidence:** Medium
**File:** `src/components/GoogleGuide.tsx:13-16`

**Problem:** The SVG illustrations use CSS variables like `rgb(var(--gl))` and `var(--t3)` in inline styles. These are client-side-only and depend on the theme being applied. In SSR, these variables have no values, so the SVGs would render with default/fallback values.

**Impact:** Minimal, since the GoogleGuide is a client-side modal dialog that only renders after user interaction. SSR is not a concern for this component.

---

### N-19: `harden-static-export.mjs` CSP regex does not account for attribute order variations

**Severity:** LOW
**Confidence:** Low
**File:** `scripts/harden-static-export.mjs:70`

**Problem:** The CSP meta tag regex is:
```js
const CSP_META_REGEX = /<meta\s+[^>]*http-equiv=(?:"Content-Security-Policy"|'Content-Security-Policy')[^>]*>/i
```

This assumes `http-equiv` appears after some attributes. But Next.js could theoretically emit `<meta http-equiv="Content-Security-Policy" ...>` with `http-equiv` as the first attribute, which would match `[^>]*http-equiv=` -- actually this would still match because `[^>]*` can match zero characters. So this is fine.

**Revised:** Not a bug. The regex handles all attribute orders correctly.

---

### N-20: `MapView` addTrackLayers callback has empty dependency array but uses `track` implicitly

**Severity:** LOW
**Confidence:** High
**File:** `src/components/MapView.tsx:586-647`

**Problem:** `addTrackLayers` is defined with `useCallback((map, track) => {...}, [])` with an empty dependency array. This is actually correct because `track` is passed as a parameter, not captured from the closure. The empty deps is intentional and correct.

**Revised:** Not a bug.

---

### N-21: Worker `parseGoogleLocationHistory` uses different branching logic than main thread

**Severity:** MEDIUM
**Confidence:** High
**File:** `public/workers/trackParser.worker.js:131-151` vs `src/lib/parser.ts:337-360`

**Problem:** The main-thread dispatcher first checks `Array.isArray(data) && ...some(looksLikeGoogleLocationRecord)` (line 337), then uses `else if` for `data.locations` (line 342). The worker combines these into a single `if/else if` chain (lines 131-134). The main thread can match both the flat array AND `data.locations` if the data is an array with a `locations` property (impossible for a real array, but the different structure matters for the `semanticSegments` etc. branches). The main thread uses independent `if` blocks for the remaining formats while the worker nests them under `else if (data && typeof data === 'object')`.

This means the main thread can process a flat array AND `timelineObjects` from the same data object, while the worker cannot (the flat array check is `if` and the object checks are `else if`). For most real data this doesn't matter, but it's a behavioral divergence.

**Fix:** Align the worker's dispatcher logic exactly with the main thread.

---

## Final Sweep: Commonly Missued Issues

1. **Memory leaks on rapid track switching:** When `loadTrackIntoSession` is called, `resetTrackWorkspace` clears state, but the MapView's `useEffect` that loads the track onto the map may still be running. If a new track is loaded before the previous one's map setup completes, the old effect's cleanup removes the new track's layers. The `key={trackSessionKey}` on TimelineSelector forces remount, but MapView has no such key. **Not filing as separate issue** -- the existing `map.off('style.load', onStyleReady)` cleanup in the track loading effect handles this correctly.

2. **XSS via track names:** Track names from GPX/KML/JSON are rendered as text content (not innerHTML), so XSS is not a risk. The `downloadVideo` filename sanitization (videoEncoder.ts:139-145) also strips dangerous characters. Confirmed safe.

3. **WebGL context loss:** The app has no recovery mechanism for WebGL context loss on the map. If the browser loses the WebGL context (tab backgrounded, GPU pressure), the map goes black with no recovery path. This is a known limitation of MapLibre GL JS and not easily fixable without a full page reload. The ErrorBoundary handles general errors but not WebGL context loss specifically. **Worth noting but not filing as a new issue** -- this is a MapLibre limitation.

4. **No unit tests:** The codebase relies entirely on e2e tests (Playwright). There are no unit tests for pure functions like `interpolateAlongTrack`, `computeBearing`, `normalizeScenes`, `parseOptionalNumber`, etc. These are ideal candidates for unit testing. **Filing as a recommendation, not a bug.**

5. **`generateId()` fallback is not cryptographically unique:** The fallback `${Date.now()}-${Math.random().toString(36).slice(2)}` when `crypto.randomUUID` is unavailable can produce collisions under rapid calls. Since this is used for Scene IDs and Toast IDs, collision risk is low but nonzero. **Low severity, noting for awareness.**

---

## Recommendations

1. **Add unit tests** for pure functions in `interpolate.ts`, `camera.ts`, and `parser.ts`. These are easy to test and have no React dependencies.
2. **Synchronize worker with main thread** -- the worker should be a 1:1 mirror of the main-thread parsing logic. Consider generating the worker from the same source using a build step.
3. **Add error codes to parser errors** instead of relying on English message matching.
4. **Consider WebCodecs API detection** before showing the export panel, to avoid users attempting exports that will fail on unsupported browsers.
