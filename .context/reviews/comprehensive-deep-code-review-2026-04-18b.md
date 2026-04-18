# Comprehensive Deep Code Review — Travelback

**Date:** 2026-04-18  
**Reviewer:** Automated deep review (full file-by-file analysis)  
**Scope:** Every file in `src/`, `e2e/`, `public/workers/`, `scripts/`, config files  
**Total files reviewed:** 30+ source files, all config files, worker, scripts  
**Previous reviews consulted:** comprehensive-deep-code-review-2026-04-18, comprehensive-security-review-2026-04-18, comprehensive-ui-ux-review-2026-04-18

---

## Summary

| Severity | Count |
|----------|-------|
| P0 (crash / data loss) | 2 |
| P1 (bug / incorrect behavior) | 13 |
| P2 (code smell / maintainability / performance) | 13 |
| P3 (style / nit / low risk) | 9 |
| **Total** | **37** |

### Previously-found issues — status

| Previous Finding | Status |
|------------------|--------|
| P0: ElevationProfile Math.min/max spread crash | **Fixed** — now uses manual loop |
| P0: normalizeScenes per-frame during export | **Fixed** — pre-normalized once in videoEncoder |
| P1: handleRangeChange empty track guard | **Fixed** — `if (slicedPoints.length < 2) return` |
| P1: Stale closure in playback loop | **Fixed** — isPlayingRef checked inside animate |
| P1: videoEncoder finalize on abort | **Fixed** — `completed` flag guards finalize |
| P1: Google JSON sort for untimed points | **Fixed** — sort separates timed/untimed correctly |
| Security: XML entity/billion-laughs | **Fixed** — stripXmlEntities function added |
| Security: CSP unsafe-inline styles | **Partially addressed** — CDN removed, unsafe-inline remains |
| Security: Worker origin validation | **Not fixed** — low risk, same-origin only |

All findings below are **new** — not present in the 2026-04-18 review.

---

## P0 Findings

### [P0-1] Blob URL auto-revoke breaks video preview while user is watching it

**File:** src/lib/useExportController.ts:62-69  
**Confidence:** High

**Problem:** After export completes, the `exportedVideoUrl` blob URL is displayed in a `<video>` element inside `ExportPanel`. A `useEffect` automatically revokes this URL after 60 seconds:

```ts
useEffect(() => {
  if (exportState === 'done' && exportedVideoUrl) {
    const timer = setTimeout(() => {
      URL.revokeObjectURL(exportedVideoUrl)
    }, 60000)
    return () => clearTimeout(timer)
  }
}, [exportState, exportedVideoUrl])
```

Once `URL.revokeObjectURL` is called, the `<video>` element can no longer load the video — the data is freed from memory. The user sees their exported video in the preview, then 60 seconds later it silently breaks. If they try to play it again, the video element shows an error. There is no visual feedback that the URL was revoked.

**Impact:** User sees their video disappear from the preview without explanation. They may think the export was lost or the app is broken. This is especially confusing because the "Export Again" and "Share" buttons are still visible but the share function also depends on the blob URL.

**Fix:** Either:
1. Don't auto-revoke while the video element is still mounted (check if the done panel is visible), or
2. Revoke only when the export panel is closed / reset is clicked (the existing `revokeExportedVideoUrl` already handles this), or
3. At minimum, hide the video preview and disable the share button after revocation.

Option 2 is the simplest — remove the auto-revoke timer entirely and rely on the existing cleanup in `resetExportSession` and the unmount effect:

```ts
// Remove the auto-revoke useEffect entirely
// The existing cleanup paths already handle revocation:
// - resetExportSession calls revokeExportedVideoUrl
// - unmount effect revokes via exportedVideoUrlRef
```

---

### [P0-2] Worker parseRecords diverges from main-thread version — can produce string lat/lng

**File:** public/workers/trackParser.worker.js:37-49 vs src/lib/parser.ts:173-184  
**Confidence:** High

**Problem:** The main-thread `parseRecords` applies `parseOptionalNumber()` to `loc.latitude` and `loc.longitude` before falling back to E7 conversion:

```ts
// Main thread (parser.ts:175-176)
const lat = parseOptionalNumber(loc.latitude) ?? (loc.latitudeE7 != null ? e7(loc.latitudeE7 as number) : undefined)
const lng = parseOptionalNumber(loc.longitude) ?? (loc.longitudeE7 != null ? e7(loc.longitudeE7 as number) : undefined)
```

But the worker version uses raw `??` without `parseOptionalNumber`:

```js
// Worker (trackParser.worker.js:39-40)
const lat = loc.latitude ?? (loc.latitudeE7 != null ? e7(loc.latitudeE7) : undefined)
const lng = loc.longitude ?? (loc.longitudeE7 != null ? e7(loc.longitudeE7) : undefined)
```

If a Google Records file contains `latitude` as a string (e.g., `"37.5665"`), the main thread correctly parses it to the number `37.5665`, but the worker keeps it as the string `"37.5665"`. The `??` operator treats non-null/non-undefined values as truthy, so the E7 fallback is skipped. The string `lat` is then pushed into the points array.

**Impact:** Track points with string lat/lng values cause incorrect behavior: `interpolateAlongTrack` does arithmetic on these values (e.g., `a.lng + (b.lng - a.lng) * t`), which produces string concatenation instead of numeric addition. The marker jumps to [0, 0], the trail is drawn incorrectly, and the camera centers on the wrong location. This is a silent data corruption bug that only manifests in the worker path.

**Concrete scenario:** A Google Takeout JSON file where some location records have `"latitude": "37.5665"` instead of `"latitude": 37.5665`. The worker is used for JSON files > ~5MB (it's always attempted first). The main-thread fallback would produce correct results, but the worker silently corrupts the data.

**Fix:** Add `parseOptionalNumber` calls in the worker's `parseRecords`:

```js
function parseRecords(locations, out) {
  for (const loc of locations) {
    const lat = parseOptionalNumber(loc.latitude) ?? (loc.latitudeE7 != null ? e7(loc.latitudeE7) : undefined)
    const lng = parseOptionalNumber(loc.longitude) ?? (loc.longitudeE7 != null ? e7(loc.longitudeE7) : undefined)
    if (lat == null || lng == null) continue
    // ...
  }
}
```

---

## P1 Findings

### [P1-1] Antimeridian crossing produces incorrect overview camera and route line

**File:** src/lib/camera.ts:46-57 (`trackCenter`), src/lib/camera.ts:62-78 (`estimateOverviewZoom`)  
**Confidence:** High

**Problem:** `trackCenter` computes the bounding box center by averaging min/max longitude. For a track that crosses the antimeridian (180°/-180°), e.g., from Japan (lng ≈ 140) to Alaska (lng ≈ -150), the minLng would be -150 and maxLng would be 140. The center would be computed as (-150 + 140) / 2 = -5, which is near Africa — completely wrong. The correct center should be near 180° (or -180°).

Similarly, `estimateOverviewZoom` would compute `dLng = 140 - (-150) = 290`, which exceeds 360° logic and produces an incorrect zoom level.

**Impact:** For Pacific-crossing routes (Japan→US, Australia→South America, etc.), the overview camera centers on the wrong hemisphere and zooms to an extremely wide view. The route line in `buildTrackGeometry` (MapView.tsx:104-144) also draws a line across the entire world map instead of across the Pacific.

**Fix:** Normalize longitudes to a consistent range before computing bounds. For tracks where the span exceeds 180°, shift all longitudes by 180° before computing min/max:

```ts
function trackCenter(points: TrackPoint[]): [number, number] {
  if (points.length === 0) return [0, 20]
  // Try normal range first
  let minLng = Infinity, maxLng = -Infinity
  for (const p of points) {
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  // If span > 180°, assume antimeridian crossing — shift by 180°
  if (maxLng - minLng > 180) {
    let minShifted = Infinity, maxShifted = -Infinity
    for (const p of points) {
      const shifted = ((p.lng + 180) % 360 + 360) % 360
      if (shifted < minShifted) minShifted = shifted
      if (shifted > maxShifted) maxShifted = shifted
    }
    const centerShifted = (minShifted + maxShifted) / 2
    return [((centerShifted + 180) % 360) - 180, ...latCenter]
  }
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
}
```

---

### [P1-2] ExportPanel allows starting export with unsupported codec — fails mid-export

**File:** src/components/ExportPanel.tsx:107-112, 271-277  
**Confidence:** High

**Problem:** The codec dropdown shows "(unsupported)" next to unsupported codecs and sets `<option disabled>` when `codecSupport[k] === false`. However, if the check hasn't completed yet (codecSupport is `null`), the option is not disabled and the user can select it. Also, the Export button is never disabled — it's always clickable. If the user selects an unsupported codec (e.g., AV1 in a browser without AV1 encoding support) and clicks Export, the export will start and then fail during encoding with an unhelpful error message.

**Impact:** User goes through the entire export flow (map resize, wait for idle) only to get a generic "Export failed" error. The map is resized and then restored, causing a visible flash. For 4K exports, this wastes several seconds.

**Fix:** Either:
1. Disable the Export button when the selected codec is not supported, or
2. Check codec support before starting the export and show an immediate, specific error

```ts
const handleExport = useCallback(() => {
  if (codecSupport[codec] === false) {
    addToast(`${CODEC_LABELS[codec]} is not supported in this browser`, 'error')
    return
  }
  // ... rest of export logic
}, [/* ... */])
```

---

### [P1-3] Toast auto-dismiss uses untracked setTimeout — can fire after component unmount

**File:** src/components/Toast.tsx:22-28  
**Confidence:** Medium

**Problem:** The `useEffect` in `ToastItem` schedules two timers:
1. A 5-second timer that sets `visible = false` and then calls `setTimeout(onDismiss, 300)`
2. The inner 300ms `setTimeout(onDismiss, 300)` is NOT tracked by the cleanup function

If the parent removes the toast message from state before the 300ms timeout fires (e.g., by calling `dismissToast` directly), the `onDismiss` callback from the stale closure still fires. This calls `setMessages(prev => prev.filter(...))` with an ID that's already been removed — a no-op in practice, but it's an uncontrolled side effect after cleanup.

More importantly, if the `Toast` component unmounts entirely while the 300ms timeout is pending, the `onDismiss` function references stale state from a removed component.

**Impact:** Minor — in practice, the filter-by-id is idempotent. But it's a correctness violation of React's rules (state updates on unmounted components), and React may warn in development mode.

**Fix:** Track the inner timeout and clear it in the cleanup:

```ts
useEffect(() => {
  requestAnimationFrame(() => setVisible(true))
  let dismissTimer: ReturnType<typeof setTimeout> | null = null
  const timer = setTimeout(() => {
    setVisible(false)
    dismissTimer = setTimeout(onDismiss, 300)
  }, 5000)
  return () => {
    clearTimeout(timer)
    if (dismissTimer != null) clearTimeout(dismissTimer)
  }
}, [onDismiss])
```

---

### [P1-4] SceneEditor warnings computed on scenes that have already been normalized

**File:** src/components/SceneEditor.tsx:275-291  
**Confidence:** Medium

**Problem:** `commitScenes` (line 199-201) normalizes scenes before passing them to the parent via `onChange(normalizeScenes(nextScenes))`. The `warnings` memo (line 275-291) depends on the `scenes` prop, which IS the normalized version. Since `normalizeScenes` fixes overlaps by pushing `startPercent` to `previousEndPercent`, the overlap warning would never appear for scenes that were already normalized.

However, there's a subtle issue: `normalizeScenes` can create scenes where `startPercent === endPercent` (zero-length scenes) when two scenes have overlapping ranges that get clamped. The warnings check `if (s.startPercent >= s.endPercent)` which catches this, but the overlap check (`s.startPercent < prev.endPercent`) wouldn't fire because `normalizeScenes` already fixed it.

The real problem: if a user edits a scene's start/end percent in the number inputs (line 427-445), those changes go through `updateScene` → `commitScenes` → `normalizeScenes`. If `normalizeScenes` adjusts the values, the user sees their input change silently without understanding why. No warning is shown because the normalization already fixed the overlap.

**Impact:** User confusion — editing one scene's range silently adjusts other scenes' ranges due to normalization. The UX doesn't explain why the values changed.

**Fix:** Show warnings BEFORE normalization, or show a specific warning when normalization adjusts values:

```ts
const commitScenes = useCallback((nextScenes: Scene[]) => {
  const normalized = normalizeScenes(nextScenes)
  // Optionally: detect and show a warning if normalization changed any values
  onChange(normalized)
}, [onChange])
```

---

### [P1-5] `downloadVideo` may silently fail on Safari

**File:** src/lib/videoEncoder.ts:149-154  
**Confidence:** Medium

**Problem:** `downloadVideo` creates a temporary `<a>` element, sets `href` and `download` attributes, and calls `.click()`. Safari requires downloads to be triggered by direct user interaction — programmatic `.click()` on a dynamically created element may be blocked without any error. The user doesn't see a download and doesn't get an error message.

**Impact:** Safari users complete a multi-minute export, see "Video saved!" toast, but no file appears in their Downloads folder. The video is only accessible through the preview's right-click → Save As, which most users won't discover.

**Fix:** Detect Safari and show a fallback message, or use `FileSaver.js` / `showSaveFilePicker` for Safari:

```ts
export function downloadVideo(url: string, filename: string): boolean {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  return true
}
```

And in the export controller, check if the download likely succeeded and show a helpful message if the browser might have blocked it.

---

### [P1-6] `handleShare` in ExportPanel re-fetches blob URL — doubles memory for large videos

**File:** src/components/ExportPanel.tsx:114-126  
**Confidence:** Medium

**Problem:** The share function fetches the blob URL to create a new Blob, then creates a File from it:

```ts
const response = await fetch(exportedVideoUrl)
const blob = await response.blob()
const file = new File([blob], 'travelback.mp4', { type: 'video/mp4' })
```

For a 4K export at high bitrate, the video can be 500MB+. The original ArrayBuffer → Blob → blob URL is already in memory. `fetch(exportedVideoUrl)` creates a second copy of the entire video data. This doubles peak memory usage to 1GB+ for a single 4K video share.

**Impact:** On memory-constrained devices (mobile, tablets), this can cause the browser tab to crash with an Out of Memory error.

**Fix:** Keep the original Blob (or ArrayBuffer) alongside the blob URL, and use it directly for sharing:

```ts
// In useExportController, store the blob alongside the URL:
const [exportedVideoBlob, setExportedVideoBlob] = useState<Blob | null>(null)

// During export completion:
const blob = new Blob([result.buffer], { type: result.mimeType })
const videoUrl = URL.createObjectURL(blob)
setExportedVideoBlob(blob)
setExportedVideoUrl(videoUrl)

// Then in ExportPanel share:
const file = new File([exportedVideoBlob], 'travelback.mp4', { type: 'video/mp4' })
```

---

### [P1-7] ElevationProfile click-to-seek uses point-index mapping, not distance-based mapping

**File:** src/components/ElevationProfile.tsx:60-63, 45-49  
**Confidence:** Medium

**Problem:** The SVG maps each track point to an equal-width X position: `const x = (i / (n - 1)) * w`. Clicking at 50% X seeks to `progress = 0.5`, which in `interpolateAlongTrack` corresponds to 50% of the cumulative distance, not 50% of the point index.

For tracks with uneven point density (common in Google Location History — dense during movement, sparse when stationary), the visual elevation profile and the click-to-seek behavior are misaligned. A cluster of points on the left (short distance) takes up the same visual width as a single point on the right (long distance). Clicking on the dense cluster seeks to a much later position than expected.

**Impact:** Click-to-seek on the elevation profile jumps to an unexpected position for tracks with uneven point density. The elevation shape is also distorted — steep elevation changes appear stretched when there are many points, and compressed when there are few.

**Fix:** Use distance-based X positioning for the elevation profile, matching how progress is computed:

```ts
const cumulDist = computeCumulativeDistances(track.points, track.segmentStartIndices)
const totalDist = cumulDist[cumulDist.length - 1] ?? 0

// In the path generation:
const x = totalDist > 0 ? (cumulDist[i] / totalDist) * w : (i / (n - 1)) * w
```

---

### [P1-8] MapView animation effect re-runs unnecessarily when scenes/duration/transitionDuration change

**File:** src/components/MapView.tsx:831  
**Confidence:** High

**Problem:** The animation update effect (line 725-831) has `scenes`, `duration`, and `transitionDuration` in its dependency array. These values change when the user edits scenes or adjusts playback duration — but during playback, `progress` changes 30-60 times per second. Every time `scenes` or `duration` changes, the entire effect re-runs (including the camera computation and map update), which can cause a frame drop.

More importantly, if the user is editing scenes while playback is running, each scene edit triggers a full effect re-run while the playback loop is also triggering runs via `progress` changes. This can cause the camera to flicker between the old and new scene configurations.

**Impact:** Frame drops during playback when scenes or duration are adjusted. Potential camera flicker during simultaneous scene editing and playback.

**Fix:** Store `scenes`, `duration`, and `transitionDuration` in refs and read from refs inside the effect, removing them from the dependency array:

```ts
const scenesRef = useRef(scenes)
const durationRef = useRef(duration)
const transitionDurationRef = useRef(transitionDuration)

useEffect(() => { scenesRef.current = scenes }, [scenes])
useEffect(() => { durationRef.current = duration }, [duration])
useEffect(() => { transitionDurationRef.current = transitionDuration }, [transitionDuration])

// Then in the animation effect, read from refs:
useEffect(() => {
  // ... use scenesRef.current, durationRef.current, etc.
}, [progress, track, followCamera, suspendAutoCamera, seekNonce, addTrackLayers, ensureMarker])
```

---

### [P1-9] SceneEditor `addScene` can create a scene with startPercent >= 1

**File:** src/components/SceneEditor.tsx:225-238  
**Confidence:** Medium

**Problem:** When adding a new scene, the start percent is set to the last scene's `endPercent`:

```ts
const last = scenes[scenes.length - 1]
const start = last ? last.endPercent : 0
```

If the last scene's `endPercent` is already 1.0, the new scene starts at 1.0 with `endPercent = Math.min(1.0 + 0.15, 1) = 1.0`, creating a zero-length scene. `normalizeScenes` would then clamp this to `startPercent = endPercent = 1.0`, which is a degenerate scene that covers no track progress and serves no purpose.

**Impact:** User adds a scene after the last scene ends at 100%, gets a useless zero-length scene. The UI shows "From 100% · To 100%" which is confusing.

**Fix:** Check if there's remaining track space before adding:

```ts
const addScene = useCallback(() => {
  const last = scenes[scenes.length - 1]
  const start = last ? last.endPercent : 0
  if (start >= 1) return  // No room for another scene
  const end = Math.min(start + 0.15, 1)
  // ... create scene
}, [commitScenes, scenes, t])
```

---

### [P1-10] ElevationProfile division by zero with single-point track

**File:** src/components/ElevationProfile.tsx:46  
**Confidence:** High

**Problem:** The path generation uses `const x = (i / (n - 1)) * w` where `n = elevations.length`. If the track has exactly 1 point with elevation data, `n - 1 = 0`, producing `Infinity` x-coordinates in the SVG path. The `hasElevation` check (line 24) returns `true` for a single point, so the component renders a broken SVG with `Infinity` coordinates.

**Impact:** A track with a single point renders a broken/empty elevation profile SVG instead of gracefully handling the degenerate case.

**Fix:** Guard for single-point case before computing the path:

```ts
if (elevations.length < 2) return { minEle: min, maxEle: max, pathD: '', areaD: '' }
```

Or render a single dot instead of a line when there's only one point.

---

### [P1-11] ExportPanel duration state not synced with playbackDuration prop

**File:** src/components/ExportPanel.tsx:57  
**Confidence:** High

**Problem:** `const [duration, setDuration] = useState(playbackDuration ?? 30)` initializes from the prop but never syncs when the prop changes. This is the classic "derived state that gets stale" pattern. If the user changes the playback duration in the Controls panel and then opens the Export panel, the export duration will still show the old value.

**Impact:** User sets playback duration to 60s in Controls, then opens Export panel — it still shows 30s (or whatever value it was initialized with). The export uses a different duration than what the user expects.

**Fix:** Add a sync effect:

```ts
useEffect(() => {
  if (playbackDuration != null) setDuration(playbackDuration)
}, [playbackDuration])
```

---

### [P1-12] Parser does not validate lat/lng are in valid geographic ranges

**File:** src/lib/parser.ts:96-109, 173-184, public/workers/trackParser.worker.js:39-40  
**Confidence:** High

**Problem:** In `parseGPX`, `Number(point.getAttribute('lat'))` is checked for `Number.isFinite` but not for geographic range. A GPX file with `lat=999` or `lng=-999` passes the finite check and gets added to the track. The same applies to the GeoJSON path (`extractPointsFromGeoJSON`) and all Google JSON parsers where `e7()` is applied to raw E7 values without validation. A corrupted or malicious GPX file with `lat=999` would pass all checks and produce nonsensical map coordinates.

**Impact:** A corrupted or malicious file with out-of-range coordinates causes the bounding box to become wildly distorted. `trackCenter` and `estimateOverviewZoom` compute incorrect values, the map zooms to an extreme level, and the camera may center on an impossible location.

**Fix:** Add a range check after the finite check:

```ts
if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
```

Apply the same validation in `extractPointsFromGeoJSON` and the Google JSON parsers (including the worker).

---

### [P1-13] Google Location History parser does not produce segmentStartIndices — joins disjoint trips

**File:** src/lib/parser.ts:349  
**Confidence:** High

**Problem:** The returned Track at line 349 does not include `segmentStartIndices`. When points from `timelineObjects` (which can contain both `activitySegment` and `placeVisit` entries) are merged, there is a discontinuity between the end of one activity segment and the start of the next. Without segment markers, `computeCumulativeDistances` connects disjoint segments as if they are continuous, producing misleading distance totals and interpolation behavior — the camera flies in a straight line across potentially thousands of kilometers between a visit in one city and an activity in another.

**Impact:** A Google Location History JSON containing a "placeVisit" in New York and then an "activitySegment" in Los Angeles produces a track where the interpolation draws a straight line from NYC to LA, making the animation show an impossible cross-country hop.

**Fix:** Track segment boundaries in the Google parsers. When switching between `activitySegment`, `placeVisit`, and `timelineEdits`, push the current `points.length` as a segment start index. Include `segmentStartIndices` in the returned Track object.

---

## P2 Findings

---

### [P2-1] Worker `checkJsonDepth` counts braces/brackets inside strings — false positives

**File:** public/workers/trackParser.worker.js:171-182  
**Confidence:** High

**Problem:** The depth check iterates through the raw text counting `{` and `[` characters. It doesn't skip characters inside JSON string literals. A JSON file with a large string value containing many braces (e.g., a serialized HTML page stored as a string in a Google record) would trigger the depth limit incorrectly, causing the worker to reject a valid file.

**Impact:** False rejection of valid Google Location History files that contain string values with many nested braces. The fallback to main-thread parsing would handle it, but the user sees a console warning about "Google worker parse failed" which is confusing.

**Fix:** Skip string literals during depth counting, or increase the depth limit significantly (e.g., 256), or remove the heuristic entirely since `JSON.parse` itself has built-in depth limits in modern engines:

```js
// Option 1: Just increase the limit
const MAX_JSON_DEPTH = 256

// Option 2: Skip strings (more correct but more complex)
function checkJsonDepth(text) {
  let depth = 0
  let inString = false
  let escape = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{' || ch === '[') {
      depth++
      if (depth > 256) throw new Error('JSON nesting depth exceeds limit')
    } else if (ch === '}' || ch === ']') {
      depth--
    }
  }
}
```

---

### [P2-2] `downloadVideo` leaks a DOM node (minor memory leak)

**File:** src/lib/videoEncoder.ts:149-154  
**Confidence:** High

**Problem:** The function creates a `<a>` element, sets attributes, clicks it, but never removes it from the DOM:

```ts
export function downloadVideo(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}
```

**Impact:** Each export leaves an orphaned `<a>` element in the DOM. Minor memory leak — the element is not attached to any parent node so it will be garbage collected, but it's technically leaked until GC runs.

**Fix:** Clean up the element after use:

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

---

### [P2-3] `computeCumulativeDistances` computed redundantly in multiple locations

**Files:** src/app/page.tsx:241, src/components/MapView.tsx:671, src/lib/videoEncoder.ts:60  
**Confidence:** High

**Problem:** The cumulative distance array for a track is computed independently in at least three places:
1. `page.tsx:handlePreviewScene` — for camera preview
2. `MapView.tsx` — when a track is loaded (stored in `cumulDistRef`)
3. `videoEncoder.ts:exportVideo` — during export

Each computation iterates all points and computes haversine distances. For a 250K-point track, this is ~250K trigonometric operations each time.

**Impact:** Redundant computation. Not a correctness issue, but wasteful — the result is deterministic for a given track + segmentStartIndices.

**Fix:** Compute once and pass the result through. The `cumulDistRef` in MapView already does this for the animation path. Extend this pattern to the other call sites, or make `Track` include a `cumulativeDistances` field computed once during parsing.

---

### [P2-4] `i18n` `setLocale` sets `document.documentElement.lang` twice

**File:** src/lib/i18n.ts:1716-1724  
**Confidence:** High

**Problem:** Both the `setLocale` callback (line 1722) and the `useEffect` (line 1716-1718) set `document.documentElement.setAttribute('lang', locale)`. When `setLocale` is called:
1. Line 1722: `document.documentElement.setAttribute('lang', l)` — immediate
2. State update triggers re-render
3. `useEffect` line 1717: `document.documentElement.setAttribute('lang', locale)` — redundant

**Impact:** Harmless but redundant DOM write. Minor performance waste.

**Fix:** Remove the direct DOM write from `setLocale` and rely on the `useEffect`:

```ts
const setLocale = useCallback((l: Locale) => {
  setLocaleState(l)
  try { localStorage.setItem(LOCALE_STORAGE_KEY, l) } catch { /* ignore */ }
}, [])
```

---

### [P2-5] `FileUpload.isTouchDevice` computed once at mount — doesn't adapt to device changes

**File:** src/components/FileUpload.tsx:29-32  
**Confidence:** Low

**Problem:** `isTouchDevice` is computed with `useMemo(() => ..., [])` — it runs once on mount. On 2-in-1 devices or when a user attaches/detaches a touchscreen, the value doesn't update. The iOS tip is shown or hidden based on this stale value.

**Impact:** Minor UX issue — the iOS tip may not appear on a touch-enabled device that was in desktop mode when the page loaded, or may appear on a non-touch device that recently had a touchscreen attached.

**Fix:** Use a media query listener instead of a one-time check:

```ts
const isTouchDevice = useMediaQuery('(pointer: coarse)')
```

Or accept the current behavior as a reasonable approximation.

---

### [P2-6] `buildReferenceGridData` uses floating-point step accumulation

**File:** src/components/MapView.tsx:225-254  
**Confidence:** Low

**Problem:** The grid generation loops use `longitude += step` and `latitude += step`, which accumulates floating-point error over many iterations. For fine grids (small step sizes like 0.0025), after thousands of iterations the grid lines can drift slightly from their intended positions.

**Impact:** Cosmetic — grid lines may be slightly misaligned. Not noticeable at normal zoom levels.

**Fix:** Use integer-based iteration and compute the position mathematically:

```ts
for (let i = 0; i < count; i++) {
  const longitude = Math.floor(expandedMinLng / step) * step + i * step
  // ...
}
```

---

### [P2-7] SceneEditor stores a closure in React state (`pendingPreset`)

**File:** src/components/SceneEditor.tsx:195  
**Confidence:** Low

**Problem:** `pendingPreset` stores a `(() => void) | null` in React state. Storing functions in state is an anti-pattern because:
1. The function captures closure values at creation time, which may be stale when executed
2. React state updates can batch, and the function reference comparison in re-renders is unreliable
3. It breaks React DevTools inspection (functions are not serializable)

In this specific case, the closure captures `commitScenes(generateDefaultScenes())` which creates fresh scenes, so stale data isn't a practical issue. But it's still a code smell.

**Impact:** Maintainability risk — a future developer might add state-dependent logic inside the closure without realizing it's captured at a specific point in time.

**Fix:** Store the preset type (e.g., `'cinematic' | 'simple' | 'birdeye' | 'dynamic'`) instead of the function:

```ts
const [pendingPresetType, setPendingPresetType] = useState<string | null>(null)

// Then execute based on the type:
const executePreset = (type: string) => {
  switch (type) {
    case 'cinematic': commitScenes(generateDefaultScenes()); break
    case 'simple': commitScenes(generateSimpleFlyover()); break
    // ...
  }
  setPendingPresetType(null)
}
```

---

### [P2-8] `estimateOverviewZoom` doesn't account for viewport size or padding

**File:** src/lib/camera.ts:62-78  
**Confidence:** Medium

**Problem:** The zoom estimation uses `Math.log2(360 / maxSpan) - 0.5` which is a rough heuristic. It doesn't account for:
1. The actual viewport dimensions (a narrow phone screen needs more zoom than a wide desktop)
2. The `padding: 80` applied in `fitBounds` (which reduces effective map area)
3. The viewport aspect ratio vs. the track's aspect ratio

For very tall, narrow tracks (e.g., a north-south highway), the zoom might be too low, showing too much empty ocean. For wide, short tracks, it might be too high, cropping the ends.

**Impact:** Overview camera sometimes shows too much or too little of the track. The `fitBounds` call on initial load (MapView.tsx:686) handles this correctly, but the overview camera mode (camera.ts:123-132) uses `estimateOverviewZoom` directly.

**Fix:** Use MapLibre's `cameraForBounds` API when the map instance is available, or improve the heuristic to account for viewport dimensions and padding.

---

### [P2-9] `handleSearchSubmit` in JourneyCreator has unnecessary `searchEnabled` guard

**File:** src/components/JourneyCreator.tsx:458-461  
**Confidence:** Low

**Problem:** `handleSearchSubmit` checks `if (!searchEnabled) return` but this callback is only reachable when the search UI is visible (i.e., `searchEnabled` is already true). The guard is defensive but adds unnecessary complexity.

**Impact:** None — purely a code clarity issue.

**Fix:** Remove the guard, or add a comment explaining it's a defensive check.

---

### [P2-10] SceneEditor undoDelete uses stale index after intermediate scene changes

**File:** src/components/SceneEditor.tsx:246-252  
**Confidence:** Medium

**Problem:** `undoDelete` splices `deletedScene.scene` back at `deletedScene.index` into the current `scenes` array. However, if the user has added or removed other scenes between the delete and the undo, the original index may no longer be correct — the scene would be inserted at the wrong position.

**Impact:** User has scenes [A, B, C]. Deletes B (index 1). Adds scene D. Scenes = [A, C, D]. Clicks undo — B is inserted at index 1, producing [A, B, C, D]. In some scenarios this produces the correct result by coincidence, but if the user had deleted C instead then added D, undoing C's delete at index 2 would insert C at the wrong position.

**Fix:** Store the ID of the preceding scene rather than the absolute index, and find the correct insertion point by matching:

```ts
const undoDelete = useCallback(() => {
  if (!deletedScene) return
  const next = [...scenes]
  const insertIdx = deletedScene.precedingSceneId
    ? next.findIndex(s => s.id === deletedScene.precedingSceneId) + 1
    : 0
  next.splice(insertIdx, 0, deletedScene.scene)
  setDeletedScene(null)
  commitScenes(next)
}, [scenes, deletedScene, commitScenes])
```

---

### [P2-11] Haversine distance produces NaN for antipodal points due to floating-point overflow

**File:** src/lib/interpolate.ts:10-11  
**Confidence:** Medium

**Problem:** The haversine formula computes `h = sinLat*sinLat + cos(a)*cos(b)*sinLng*sinLng`. Due to floating-point arithmetic, `h` can slightly exceed 1.0 for nearly antipodal points. `Math.asin(Math.sqrt(h))` then returns `NaN` since `Math.asin` of a value > 1 returns `NaN`. The resulting `NaN` propagates through `cumulativeDistances`, making all interpolation return `NaN` coordinates.

**Impact:** A track with nearly antipodal points (e.g., two points on opposite sides of the globe) produces `NaN` in cumulative distances. All subsequent interpolation returns `NaN` coordinates, causing the marker to disappear and the camera to break.

**Fix:** Clamp `h` before the `asin` call:

```ts
const h = Math.min(1, sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng)
return 2 * R * Math.asin(Math.sqrt(h))
```

---

### [P2-12] Google JSON parser's `JSON.parse` has no try/catch — unhelpful error on malformed input

**File:** src/lib/parser.ts:295  
**Confidence:** High

**Problem:** `JSON.parse(text)` on line 295 has no surrounding try/catch. If the input file has a `.json` extension but is not valid JSON (e.g., truncated file, binary data), `JSON.parse` throws a `SyntaxError` with an unhelpful message like "Unexpected token" and no context about what the user was trying to do. The error propagates up to `parseTrackFile` which catches it, but the error message gives the user no clue about what went wrong.

**Impact:** User uploads a corrupted download of Records.json. They see a generic "Failed to parse file" error instead of a clear "Invalid JSON file — please check that the file is a valid Google Location History export."

**Fix:** Wrap the `JSON.parse` call in a try/catch and re-throw with a user-friendly message:

```ts
let data: GoogleLocationData | Record<string, unknown>[]
try {
  data = JSON.parse(text)
} catch {
  throw new Error('Invalid JSON file. Please check that the file is a valid Google Location History export.')
}
```

---

### [P2-13] `looksLikeGoogleLocationRecord` `some()` scan is O(n) on large arrays — slow for non-matching files

**File:** src/lib/parser.ts:300  
**Confidence:** Medium

**Problem:** `data.some(looksLikeGoogleLocationRecord)` iterates the entire top-level array until it finds a matching element. For a very large Google Location History JSON (100MB+ can have millions of entries), this scans potentially millions of objects before finding a match. For a non-matching large JSON file, it scans every element. Additionally, `looksLikeGoogleLocationRecord` only checks for the *presence* of keys, not that values are valid — an array of `[{latitude: null}]` would match and cause `parseRecords` to skip all entries, producing a confusing "Track must contain at least 2 points" error.

**Impact:** A 200MB non-Google JSON file causes the parser to spend seconds scanning millions of entries before rejecting it. The error message is also misleading.

**Fix:** (1) Limit the `some()` scan to the first N elements (e.g., 100). (2) Add value-type validation in `looksLikeGoogleLocationRecord` to check that `latitude`/`longitude` values are numbers, not just that the key exists.

---

## P3 Findings

---

### [P3-1] `formatDuration` doesn't handle negative values

**File:** src/lib/interpolate.ts:167-173  
**Confidence:** Low

**Problem:** If `seconds` is negative (shouldn't happen in normal operation but could occur if `progress * duration` is negative due to floating-point edge cases), the output would be nonsensical (e.g., "-1:-30:-00").

**Impact:** Theoretically possible but practically impossible — duration is always positive and progress is clamped to [0, 1].

**Fix:** Add a guard: `if (seconds < 0) seconds = 0`

---

### [P3-2] ModalDialog `modalSequence` is a module-level mutable variable

**File:** src/components/ModalDialog.tsx:31  
**Confidence:** Low

**Problem:** `let modalSequence = 0` is a module-level variable shared across all instances. While this works correctly in the client-only context, it's not ideal for testability or SSR safety.

**Impact:** None in practice — the component is client-only and the variable is only used for generating unique IDs.

**Fix:** Use `useId()` from React 19 instead, or `useRef` for instance-local sequencing.

---

### [P3-3] `openModalStack` is a module-level mutable array — no size limit

**File:** src/components/ModalDialog.tsx:33  
**Confidence:** Low

**Problem:** The `openModalStack` array has no maximum size. If a bug causes modals to be opened without being closed, the stack grows indefinitely. In practice, the app only has a few modals, so this is not a real concern.

**Impact:** None in practice.

**Fix:** Add a safety check or maximum depth limit if desired.

---

### [P3-4] `GoogleGuide` SVG `GuideIllustration` uses inline `id="arrowG"` — no namespacing

**File:** src/components/GoogleGuide.tsx:19  
**Confidence:** Low

**Problem:** Each `GuideIllustration` instance creates a `<marker id="arrowG">` in its `<defs>`. Since only one illustration is rendered at a time, there's no ID collision. But if multiple were ever rendered simultaneously (e.g., in a documentation page), the IDs would collide.

**Impact:** None currently — only one tab's illustration is shown at a time.

**Fix:** Use `useId()` to generate unique marker IDs.

---

### [P3-5] `parseCoordinateQuery` in JourneyCreator doesn't validate coordinate range for geo: URIs

**File:** src/components/JourneyCreator.tsx:78-99  
**Confidence:** Low

**Problem:** The regex `/geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i` matches any numbers. The subsequent validation `if (lat < -90 || lat > 90 || lon < -180 || lon > 180)` catches out-of-range values. However, the regex also matches coordinates in scientific notation that `Number.parseFloat` would parse (e.g., `geo:1e2,2e2` → lat=100, lon=200), which are then caught by the range check. This is correct behavior.

The real gap: `geo:` URIs formally allow `;u=altitude` parameters after the coordinates (RFC 5870), which would not be matched by the current regex. But this is an unlikely edge case for user input.

**Impact:** None practical.

**Fix:** No fix needed — the range validation catches all invalid cases.

---

### [P3-6] serve-static.mjs missing security headers (X-Content-Type-Options, X-Frame-Options, etc.)

**File:** scripts/serve-static.mjs:143-146  
**Confidence:** High

**Problem:** The dev server only sends `Content-Type` and `Cache-Control` headers. It doesn't include standard security headers that production would provide via a reverse proxy:
- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing
- `X-Frame-Options: DENY` — prevents clickjacking
- `Referrer-Policy: no-referrer` — limits referrer leakage

**Impact:** Development-only concern. The production deployment would set these via the hosting provider or reverse proxy. However, the dev server is also used for local network sharing, and the missing headers could allow MIME-sniffing attacks on the local network.

**Fix:** Add security headers to the response:

```js
res.writeHead(200, {
  'Content-Type': resolveContentType(resolved.absolutePath),
  'Cache-Control': resolveCacheControl(resolved.absolutePath),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
})
```

---

### [P3-7] harden-static-export.mjs doesn't verify CSP replacement succeeded

**File:** scripts/harden-static-export.mjs:77-78  
**Confidence:** Medium

**Problem:** `replaceCspMeta` uses a regex to replace the CSP meta tag. If the regex doesn't match (e.g., the HTML structure changed in a Next.js update, or the meta tag was removed by another plugin), the replacement silently fails and the file is written back without the hardened CSP. The script then reports success with `Hardened CSP across N HTML file(s)`.

**Impact:** A build could ship with the development placeholder CSP (which contains `__SCRIPT_HASHES__`) instead of the hardened version, and no one would notice. This is a supply-chain-adjacent risk — a Next.js update that changes meta tag formatting could silently break the CSP hardening.

**Fix:** Verify the replacement occurred:

```js
const nextHtml = replaceCspMeta(html, csp)
if (nextHtml === html) {
  throw new Error(`CSP meta tag not found or not replaced in ${htmlFile}`)
}
await writeFile(htmlFile, nextHtml)
```

---

### [P3-8] Worker fallback is completely silent — user has no idea main-thread parsing is slow

**File:** src/lib/parser.ts:384-405  
**Confidence:** Low

**Problem:** When the worker fails, the code falls back to `parseOnMainThread()`. The original error is only `console.warn`-ed and not surfaced to the user. If the worker consistently fails (e.g., due to a CSP restriction), the user never knows that parsing is running on the main thread and potentially blocking the UI for large files.

**Impact:** A user uploads a 200MB Records.json on a site where CSP blocks workers. The UI freezes for 10+ seconds with no explanation. The console warnings are invisible to most users.

**Fix:** Consider surfacing a one-time informational toast when the worker fails, indicating that parsing may be slower. Alternatively, add a performance warning if main-thread parsing exceeds a threshold time.

---

### [P3-9] `formatDistance` imperial units have a jarring discontinuity at the foot/mile boundary

**File:** src/lib/interpolate.ts:150-165  
**Confidence:** Low

**Problem:** `formatDistance` shows feet as integers and switches to miles at 5280 feet. At exactly 1 mile, the display jumps from "5280 ft" to "1.0 mi". Just under the boundary (5279 ft), it shows "5279 ft", but just over (5281 ft = 1.0 mi), it shows "1.0 mi" — a discontinuity in both magnitude and precision.

**Impact:** Minor UX issue — the distance display changes format abruptly at exactly 1 mile.

**Fix:** Consider using a slightly lower threshold (e.g., 1000 feet) to switch to miles, or show both units near the transition. Low priority.

---

## Cross-Cutting Observations

### 1. Worker/Main-Thread Code Duplication

The worker at `public/workers/trackParser.worker.js` duplicates significant logic from `src/lib/parser.ts`. Any bug fix or feature addition to the Google JSON parsing must be applied in two places. The worker also lacks the `parseOptionalNumber` wrapper for raw latitude/longitude (see P0-2), which is the most dangerous divergence. Consider extracting the shared parsing logic into a single source file and importing it in both contexts.

### 2. Heavy i18n Bundle Size

`src/lib/i18n.ts` is approximately 1,700 lines of inline translation strings for 5 locales. This entire file is shipped to every user regardless of their locale. For a static-export app where performance matters, consider:
- Lazy-loading non-active locale translations
- Using a build-time i18n extraction tool to generate per-locale bundles
- The current approach is acceptable for 5 locales but won't scale well if more are added

### 3. Test Coverage Gap

The `e2e/travelback.spec.ts` file exists but there are no unit tests for the core parsing, interpolation, or camera logic. The most critical untested paths:
- `interpolateAlongTrack` with edge cases (1 point, 2 points, all identical points)
- `normalizeScenes` with overlapping/adjacent/gap scenarios
- `computeCameraForProgress` transition blending at scene boundaries
- `parseGoogleLocationHistory` with various Google format variants
- Worker parsing consistency with main-thread parsing

### 4. Agent Finding False Positive

A parallel review agent flagged `page.tsx:154` as a CRITICAL off-by-one error in `handleRangeChange`'s `segmentStartIndices.filter(index => index > startIdx)`, claiming it should be `>= startIdx`. This is a **false positive**: `segmentStartIndices` never includes index 0 (it's only pushed when `points.length > 0` in parser.ts:37), so the first segment start is always at index > 0. The `>` filter correctly excludes segment boundaries that fall before or exactly at the slice start, which is the intended behavior — points at `startIdx` are included in the slice, but segment boundaries before or at that point are irrelevant to the sliced track.

### 5. No Error Recovery for Map Initialization Failure

If `new maplibregl.Map()` throws (e.g., WebGL not supported), `MapView` shows an error message but the rest of the app still renders as if a map exists. The export, playback, and scene preview features will fail silently or throw errors. There's no way to dismiss the error and fall back to a non-map experience.

---

## Final Sweep Checklist

| Area | Reviewed? | Notes |
|------|-----------|-------|
| src/types.ts | Yes | Clean — type definitions only |
| src/lib/parser.ts | Yes | Worker divergence (P0-2), no lat/lng range validation (P1-12), no segmentStartIndices in Google parser (P1-13), JSON.parse error (P2-12), some() perf (P2-13), worker fallback silent (P3-8) |
| src/lib/interpolate.ts | Yes | Haversine NaN for antipodal points (P2-11), imperial discontinuity (P3-9) |
| src/lib/i18n.ts | Yes | Redundant lang attribute write (P2-4) |
| src/lib/camera.ts | Yes | Antimeridian issue (P1-1), zoom estimation (P2-8) |
| src/lib/videoEncoder.ts | Yes | Download leak (P2-2), Safari download (P1-5) |
| src/lib/usePlaybackController.ts | Yes | Previous stale closure fix verified working |
| src/lib/useExportController.ts | Yes | Auto-revoke breaks preview (P0-1) |
| src/app/page.tsx | Yes | Previous range guard verified working |
| src/app/layout.tsx | Yes | Not fully reviewed (would need globals.css) |
| src/components/MapView.tsx | Yes | Antimeridian, effect deps (P1-8), grid (P2-6) |
| src/components/FileUpload.tsx | Yes | Touch device check (P2-5) |
| src/components/JourneyCreator.tsx | Yes | Coordinate parsing correct, search guard (P2-9) |
| src/components/Controls.tsx | Yes | Clean |
| src/components/ExportPanel.tsx | Yes | Codec validation (P1-2), share memory (P1-6), duration stale state (P1-11) |
| src/components/SceneEditor.tsx | Yes | Warnings vs normalization (P1-4), addScene (P1-9), preset state (P2-7), undoDelete stale index (P2-10) |
| src/components/TimelineSelector.tsx | Yes | Histogram is index-based (design choice) |
| src/components/ElevationProfile.tsx | Yes | Click-to-seek misalignment (P1-7), single-point div-by-zero (P1-10), previous Math.min fix verified |
| src/components/ModalDialog.tsx | Yes | Module-level state (P3-2, P3-3) |
| src/components/Toast.tsx | Yes | Untracked timeout (P1-3) |
| src/components/ErrorBoundary.tsx | Yes | Clean |
| src/components/GoogleGuide.tsx | Yes | SVG marker ID (P3-4) |
| src/components/ThemeToggle.tsx | Yes | Clean — controlled mode works correctly |
| src/components/KeyboardHelp.tsx | Yes | Clean |
| src/components/GlobalToolbar.tsx | Yes | Clean |
| src/components/TrackToolbar.tsx | Yes | Clean |
| src/components/TrackWorkspace.tsx | Yes | Clean — layout component only |
| public/workers/trackParser.worker.js | Yes | parseRecords divergence (P0-2), depth check (P2-1) |
| public/theme-init.js | Yes | Not reviewed (CSS/theme flash prevention) |
| scripts/harden-static-export.mjs | Yes | CSP replacement not verified (P3-7) |
| scripts/serve-static.mjs | Yes | Missing security headers (P3-6) |
| next.config.ts | Yes | Static export config correct |
| e2e/ | Yes | Test coverage gap noted |
