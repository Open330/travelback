# Comprehensive Deep Code Review — Cycle 2 (2026-04-19)

**Reviewer:** automated deep review (cycle 2 of 100)
**Scope:** full source tree (src/, public/workers/, scripts/, e2e/)
**Previous review:** comprehensive-deep-code-review-2026-04-19 (N-1 through N-21)
**Status:** all P0/P1 findings from previous review verified as fixed; new findings identified

---

## Previous findings — verification status

All 15 findings from the 2026-04-19 review have been verified as fixed:

| # | Issue | Status | Evidence |
|---|-------|--------|----------|
| N-1 | Worker segment start index remapping after dedup+sort | FIXED | `orderToNewIndex` map present in worker |
| N-2 | Pre-scene gap interpolation bearing jitter | FIXED | Stable overview camera with bearing=0 used |
| N-3 | Parser format detection double-parsing | FIXED | Multi-format with dedup, worker aligned |
| N-4 | lerpCamera antimeridian wrap | FIXED | Shifted-longitude approach in lerpCamera |
| N-5 | TimelineSelector stale onRangeChange closure | FIXED | `onRangeChangeRef` ref pattern used |
| N-7 | JourneyCreator coordinate bounds validation | FIXED | NaN/bounds check in handleSelectPlace |
| N-8 | Playback final frame handling | ACCEPTED | Existing behavior deemed acceptable |
| N-9 | FileUpload English string matching | FIXED | ParseError class with error codes |
| N-10 | SceneEditor silent normalization | FIXED | Toast notification on adjustment |
| N-11 | MapView stale track closure on style change | FIXED | trackRef.current used in styleHandler |
| N-12 | ExportPanel FPS options | FIXED | 90 and 120 FPS options added |
| N-13 | downloadVideo popup blocker | FIXED | File System Access API with fallback |
| N-14 | checkJsonDepth 1MB limit | FIXED | Spot-checking at 25%, 50%, 75%, end |
| N-16 | useExportController fixed timeout cleanup | FIXED | waitForIdle used in finally block |
| N-21 | Worker dispatcher divergence | FIXED | Worker aligned with main thread |

---

## New findings

### NEW-1: smoothCameraState uses old shortest-path longitude wrapping (not shifted-longitude)

**Severity:** HIGH
**Confidence:** HIGH (95%)
**File:** `src/components/MapView.tsx:76-86`
**Component:** camera smoothing

**Description:**
`smoothCameraState` applies per-frame camera smoothing using the shortest-path longitude formula:

```ts
center: [
  previous.center[0] + (((target.center[0] - previous.center[0] + 540) % 360) - 180) * factor,
  previous.center[1] + (target.center[1] - previous.center[1]) * factor,
],
```

This is the exact same pattern that was fixed in `lerpCamera` (N-4) with the shifted-longitude approach, but `smoothCameraState` was NOT updated. For antimeridian-crossing routes (e.g., Tokyo to Anchorage), the modulo-based shortest-path wrapping can produce the wrong interpolation direction — the camera center will swing west through Europe/Africa instead of east across the Pacific.

This affects every frame of playback for antimeridian-crossing tracks because `smoothCameraState` is called on every animation frame to dampen camera movement.

**Fix:** Apply the same shifted-longitude approach used in `lerpCamera`:

```ts
function smoothCameraState(previous: CameraState, target: CameraState, factor: number, bearingFactor?: number): CameraState {
  const lngDiff = target.center[0] - previous.center[0]
  let lngResult: number
  if (Math.abs(lngDiff) > 180) {
    const aShifted = ((previous.center[0] + 180) % 360 + 360) % 360
    const bShifted = ((target.center[0] + 180) % 360 + 360) % 360
    lngResult = aShifted + (bShifted - aShifted) * factor
    lngResult = ((lngResult + 180) % 360) - 180
  } else {
    lngResult = previous.center[0] + lngDiff * factor
  }
  return {
    center: [lngResult, previous.center[1] + (target.center[1] - previous.center[1]) * factor],
    zoom: previous.zoom + (target.zoom - previous.zoom) * factor,
    pitch: previous.pitch + (target.pitch - previous.pitch) * factor,
    bearing: smoothAngle(previous.bearing, target.bearing, bearingFactor ?? factor),
  }
}
```

---

### NEW-2: JSON files bypass the 200MB size check

**Severity:** HIGH
**Confidence:** HIGH (100%)
**File:** `src/lib/parser.ts:521`
**Component:** parser / file validation

**Description:**
In `parseTrackFile`, the size check explicitly skips JSON files:

```ts
if (ext !== 'json' && file.size > MAX_FILE_SIZE) {
  reject(new Error(`File is too large ...`))
  return
}
```

The rationale is likely that Google Location History JSON files can be large and need to be read as text for the worker. However, this means a 2GB JSON file will be read entirely into memory as a string, potentially crashing the browser tab. The worker path (`parseGoogleLocationHistoryInWorker`) reads the entire file text and posts it as a message, doubling memory usage.

**Fix:** Apply the size check to JSON files as well, but with a higher limit (e.g., 500MB) to accommodate legitimate large exports:

```ts
const JSON_MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB for JSON
const maxForType = ext === 'json' ? JSON_MAX_FILE_SIZE : MAX_FILE_SIZE
if (file.size > maxForType) {
  reject(new ParseError(`File is too large (${(file.size / 1024 / 1024).toFixed(0)}MB). Maximum size is ${(maxForType / 1024 / 1024).toFixed(0)}MB.`, 'FILE_TOO_LARGE'))
  return
}
```

Also add `FILE_TOO_LARGE` to the `ParseError` codes and the FileUpload error mapping.

---

### NEW-3: ElevationProfile click-to-seek mapping is incorrect for distance-based x-axis

**Severity:** MEDIUM
**Confidence:** HIGH (90%)
**File:** `src/components/ElevationProfile.tsx:66-69`
**Component:** elevation profile / seek

**Description:**
The SVG x-axis is based on cumulative distance (line 52):

```ts
const x = totalDist > 0 ? (cumulDist[i] / totalDist) * w : (i / (n - 1)) * w
```

But the click handler maps horizontal position to progress linearly (line 68-69):

```ts
const x = (e.clientX - rect.left) / rect.width
onSeek(Math.max(0, Math.min(1, x)))
```

For tracks with non-uniform point density (e.g., more points in cities, fewer on highways), clicking at a specific elevation point will seek to the wrong position. The click position represents a distance fraction, not a progress fraction.

**Fix:** Build a reverse mapping from distance fraction to progress fraction, or use a binary search on `cumulDist`:

```ts
const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const clickFraction = (e.clientX - rect.left) / rect.width
  const totalDist = cumulDist[cumulDist.length - 1] ?? 0
  if (totalDist <= 0) return
  const targetDist = clickFraction * totalDist
  // Binary search for the point index nearest to targetDist
  let lo = 0, hi = cumulDist.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (cumulDist[mid] < targetDist) lo = mid + 1
    else hi = mid
  }
  const progress = lo / (track.points.length - 1)
  onSeek(Math.max(0, Math.min(1, progress)))
}
```

---

### NEW-4: SceneRangeEditor useEffect re-registers listeners on every render if onChange is not memoized

**Severity:** MEDIUM
**Confidence:** MEDIUM (70%)
**File:** `src/components/SceneEditor.tsx:89-134`
**Component:** scene editor / drag interaction

**Description:**
The `SceneRangeEditor` component's drag useEffect has `onChange` in its dependency array (line 134):

```ts
}, [clampRange, dragging, onChange])
```

If the parent component does not memoize the `onChange` callback, this effect will re-register `pointermove`/`pointerup` listeners on every render. During active dragging, `onChange` fires on every pointer move, which could cause the parent to re-render, which re-fires this effect, creating a cascade.

In practice, `SceneEditor` does use `useCallback` for its `commitScenes` and the range editor's `onChange` is created inline, so this depends on the parent's render frequency. The risk is moderate but the fix is simple.

**Fix:** Use a ref for `onChange`, similar to the N-5 fix for TimelineSelector:

```ts
const onChangeRef = useRef(onChange)
useEffect(() => { onChangeRef.current = onChange }, [onChange])

// In useEffect listeners, use onChangeRef.current instead of onChange
// Remove onChange from the useEffect dependency array
```

---

### NEW-5: Multiple empty catch blocks silently swallow errors

**Severity:** LOW
**Confidence:** HIGH (100%)
**Files:** 13 instances across 8 files
**Component:** error handling

**Description:**
The codebase has 13 empty or comment-only catch blocks. Most are for localStorage operations where the catch is intentional (localStorage may be unavailable in private browsing). However, a few are more concerning:

1. **`src/lib/parser.ts:368`** — `catch {}` after JSON.parse in `parseGoogleLocationHistory`. If JSON.parse fails for a non-depth reason, this silently falls through to "unrecognized format" without logging.
2. **`src/lib/parser.ts:467`** — `catch {}` in worker message handler. If the worker throws, the error is silently swallowed and the promise never resolves (hang).
3. **`src/lib/videoEncoder.ts:188`** — `catch {}` in `downloadVideo` fallback. If the `<a>` download fails, there is no indication to the user.
4. **`src/components/ExportPanel.tsx:100`** — `catch {}` when reading stored settings. Corrupted localStorage data is silently ignored.

The localStorage catches are acceptable. The parser and video encoder catches should at minimum log to console.warn.

**Fix:** Add `console.warn` to non-localStorage empty catches. For the worker catch, reject the promise:

```ts
// parser.ts:368
} catch (err) {
  console.warn('Failed to parse Google Location History:', err instanceof Error ? err.message : 'Unknown error')
}

// parser.ts:467 (worker)
} catch (err) {
  reject(err instanceof Error ? err : new Error(String(err)))
}

// videoEncoder.ts:188
} catch (err) {
  console.warn('Download fallback failed:', err)
}
```

---

### NEW-6: eslint-disable comments indicate potential stale closure risks

**Severity:** LOW
**Confidence:** MEDIUM (60%)
**Files:** 5 instances across 3 files
**Component:** React hooks / effect dependencies

**Description:**
Five `eslint-disable-next-line react-hooks/exhaustive-deps` comments exist:

1. `TimelineSelector.tsx:104` — "only fire on points change, not on every ratio update during drag" — intentional
2. `TimelineSelector.tsx:151` — no explanation — potentially stale
3. `JourneyCreator.tsx:413` — no explanation — potentially stale
4. `MapView.tsx:560` — mount-only effect — intentional
5. `MapView.tsx:584` — style change effect — intentional (uses refs internally)

Items 2 and 3 lack justification comments and warrant review. The TimelineSelector line 151 effect depends on `points` but not `ratio`, `width`, or `onRangeChange`. If these values change without `points` changing, the effect won't re-fire. The JourneyCreator line 413 effect likely has a similar pattern.

**Fix:** Add justification comments to items 2 and 3, or verify that the excluded dependencies are covered by refs:

```ts
// eslint-disable-next-line react-hooks/exhaustive-deps -- ratio/width changes are handled via dragState ref
```

---

### NEW-7: TrackToolbar adds document-level listeners without passive flag for touchstart

**Severity:** LOW
**Confidence:** MEDIUM (65%)
**File:** `src/components/TrackToolbar.tsx:59-61`
**Component:** mobile interaction

**Description:**
```ts
document.addEventListener('mousedown', handlePointerDown)
document.addEventListener('touchstart', handlePointerDown, { passive: true })
document.addEventListener('keydown', handleKeyDown)
```

The `mousedown` listener is registered without `{ passive: true }`. While not as critical as `touchstart`/`touchmove` (which affect scroll performance), document-level listeners should be passive when they don't call `preventDefault()`. If `handlePointerDown` doesn't call `preventDefault()`, adding `{ passive: true }` to the mousedown listener would be a minor optimization.

This is low priority — the performance impact is negligible.

---

## Summary

| # | Issue | Severity | Component | Confidence |
|---|-------|----------|-----------|------------|
| NEW-1 | smoothCameraState uses old longitude wrapping (not shifted-longitude) | HIGH | MapView.tsx | 95% |
| NEW-2 | JSON files bypass 200MB size check | HIGH | parser.ts | 100% |
| NEW-3 | ElevationProfile click-to-seek incorrect for distance-based x-axis | MEDIUM | ElevationProfile.tsx | 90% |
| NEW-4 | SceneRangeEditor useEffect re-registers on onChange change | MEDIUM | SceneEditor.tsx | 70% |
| NEW-5 | Multiple empty catch blocks silently swallow errors | LOW | parser.ts, videoEncoder.ts, etc. | 100% |
| NEW-6 | eslint-disable comments without justification | LOW | TimelineSelector, JourneyCreator | 60% |
| NEW-7 | TrackToolbar document listener without passive flag | LOW | TrackToolbar.tsx | 65% |

**Total new findings:** 7 (2 HIGH, 2 MEDIUM, 3 LOW)
**Previously verified fixed:** 15/15
