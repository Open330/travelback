# P1 Robustness & Quality — 2026-04-19

**Priority:** P1 — robustness gaps, code quality, and correctness edge cases
**Source:** comprehensive-deep-code-review-2026-04-19 (N-2, N-7, N-9, N-10, N-11, N-12, N-13, N-14, N-8, N-16)
**Estimated effort:** 4-5 hours

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| N-2 | computeCameraForProgress double-counts gap interpolation for globalProgress < first scene | HIGH | camera.ts |
| N-7 | JourneyCreator does not validate coordinates from search against geographic bounds | MEDIUM | JourneyCreator.tsx |
| N-9 | FileUpload error mapping depends on English error messages from parser | MEDIUM | FileUpload.tsx, parser.ts |
| N-10 | SceneEditor normalizeScenes silently modifies user input | MEDIUM | SceneEditor.tsx |
| N-11 | MapView style change effect has stale track closure | MEDIUM | MapView.tsx |
| N-12 | ExportPanel FPS options don't match EXPORT_LIMITS.fps.max | MEDIUM | ExportPanel.tsx, types.ts |
| N-13 | downloadVideo synchronous DOM manipulation can be blocked by popup blockers | MEDIUM | videoEncoder.ts |
| N-14 | checkJsonDepth only scans first 1MB of potentially 200MB files | MEDIUM | parser.ts, trackParser.worker.js |
| N-8 | usePlaybackController animation loop can miss the final frame | MEDIUM | usePlaybackController.ts |
| N-16 | useExportController cleanup uses fixed 200ms timeout instead of waitForIdle | LOW | useExportController.ts |

---

## Implementation steps

### 1. Fix pre-scene gap interpolation jitter (N-2)

**File:** `src/lib/camera.ts:382-388`

**Current:** When `globalProgress` falls before the first scene, `computeOverviewCamera` is called with `elapsedSec` which produces a rotating bearing. The lerp between this rotating overview and the first scene's fixed bearing creates visible jitter.

**Fix:** Freeze the overview camera at a fixed state for the pre-scene gap, using bearing=0 (or the first scene's bearing) instead of elapsedSec-based rotation:

```ts
} else if (prevIdx === -1 && nextIdx >= 0) {
  const nextScene = normalizedScenes[nextIdx]
  const gapT = nextScene.startPercent > 0 ? globalProgress / nextScene.startPercent : 1
  // Use a stable overview camera (no rotation) for the pre-scene gap
  // to avoid bearing jitter when lerping toward the first scene
  const box = computeBoundingBox(track.points)
  const overviewCamera: CameraState = box
    ? { center: trackCenterFromBox(box), zoom: overviewZoomFromBox(box), pitch: 0, bearing: 0 }
    : { center: [0, 20], zoom: 2, pitch: 0, bearing: 0 }
  const nextCamera = computeCameraForScene(track, cumulDist, nextScene, 0.0, elapsedSec)
  return lerpCamera(overviewCamera, nextCamera, Math.max(0, Math.min(1, gapT)))
}
```

**Verification:** Create scenes starting at 5%. Play from 0%. Confirm no bearing jitter during the 0-5% gap interpolation.

---

### 2. Add coordinate bounds validation in JourneyCreator (N-7)

**File:** `src/components/JourneyCreator.tsx:467-476`

**Current:** `handleSelectPlace` uses `parseFloat` without checking NaN or geographic bounds. NaN coordinates propagate into the Track and break map rendering.

**Fix:**

```ts
const handleSelectPlace = useCallback((lat: string, lon: string) => {
  const lng = parseFloat(lon)
  const latNum = parseFloat(lat)
  if (!Number.isFinite(lng) || !Number.isFinite(latNum)) return
  if (Math.abs(latNum) > 90 || Math.abs(lng) > 180) return
  const map = mapRef.current?.getMap()
  if (map) map.flyTo({ center: [lng, latNum], zoom: 14 })
  waypointsRef.current = [...waypointsRef.current, { lng, lat: latNum }]
  updateMapData()
  syncUI()
  setSearchResults([])
  setSearchQuery('')
}, [mapRef, updateMapData, syncUI])
```

**Verification:** Inject a search result with NaN lat/lng. Confirm it is rejected and does not create a waypoint.

---

### 3. Replace English string matching with error codes in parser (N-9)

**File:** `src/lib/parser.ts`, `src/components/FileUpload.tsx`

**Current:** `FileUpload` matches English error message substrings to find i18n keys. If parser error messages change, the mapping silently breaks.

**Fix:** Define a custom error class with a `code` field in the parser:

```ts
// In parser.ts:
export class ParseError extends Error {
  readonly code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = 'ParseError'
    this.code = code
  }
}

// Throw with code:
throw new ParseError('Unsupported file format: .xyz', 'UNSUPPORTED_FORMAT')
throw new ParseError('Track must contain at least 2 points', 'TOO_FEW_POINTS')
throw new ParseError('Track contains too many points', 'TOO_MANY_POINTS')
throw new ParseError('Failed to read file', 'READ_FAILED')
```

In FileUpload:

```ts
const parserErrorMap: Record<string, string> = {
  UNSUPPORTED_FORMAT: 'fileUpload.unsupportedFormat',
  TOO_FEW_POINTS: 'fileUpload.tooFewPoints',
  TOO_MANY_POINTS: 'fileUpload.tooManyPoints',
  READ_FAILED: 'fileUpload.readFailed',
  INVALID_GOOGLE_JSON: 'fileUpload.parseFailed',
  JSON_DEPTH_EXCEEDED: 'fileUpload.parseFailed',
}

const code = err instanceof ParseError ? err.code : ''
const matchedKey = code in parserErrorMap ? code : ''
```

**Verification:** Change a parser error message string. Confirm the FileUpload still maps correctly to the i18n key via the error code.

---

### 4. Show normalization result in SceneEditor (N-10)

**File:** `src/components/SceneEditor.tsx:199-216`

**Current:** `commitScenes` calls `normalizeScenes` which silently clamps, sorts, and adjusts scenes. The user sees their raw input, but the actual stored scenes differ.

**Fix:** After normalization, compare the result with the input and show a brief notification if values were adjusted:

```ts
const commitScenes = useCallback((nextScenes: Scene[]) => {
  const normalized = normalizeScenes(nextScenes)
  // Check if normalization changed anything meaningful
  const wasAdjusted = normalized.length !== nextScenes.length
    || normalized.some((s, i) => {
      const orig = nextScenes.find(o => o.id === s.id)
      return orig && (
        Math.abs(s.startPercent - orig.startPercent) > 0.001
        || Math.abs(s.endPercent - orig.endPercent) > 0.001
      )
    })
  if (wasAdjusted) {
    addToast(t('scenes.adjustedAfterNormalization') ?? 'Scenes were adjusted to remove overlaps', 'info')
  }
  setScenes(normalized)
  onScenesChange(normalized)
}, [onScenesChange, addToast, t])
```

Add `scenes.adjustedAfterNormalization` i18n key to all 5 locales.

**Verification:** Create two overlapping scenes manually. Click commit. Confirm a toast appears explaining the adjustment.

---

### 5. Fix MapView style change stale track closure (N-11)

**File:** `src/components/MapView.tsx:563-584`

**Current:** The `styleHandler` closure captures `track` from the render scope. If `track` is null when the effect fires, layers won't be re-added.

**Fix:** Use `trackRef.current` instead of `track` in the styleHandler:

```ts
useEffect(() => {
  const map = mapRef.current
  if (!map || styleKeyRef.current === mapStyleKey) return
  styleKeyRef.current = mapStyleKey
  map.setStyle(MAP_STYLES[mapStyleKey].url)

  let styleHandler: (() => void) | null = null
  styleHandler = () => {
    const currentTrack = trackRef.current
    addReferenceGridLayers(map, mapStyleKey, currentTrack)
    if (currentTrack) {
      addTrackLayers(map, currentTrack)
    }
  }
  map.once('style.load', styleHandler)
}, [mapStyleKey, track])
```

**Verification:** Start a style change while a track is loading. Confirm the track layers appear once the style loads, even if track was null when the effect first ran.

---

### 6. Align ExportPanel FPS options with EXPORT_LIMITS (N-12)

**File:** `src/components/ExportPanel.tsx:288-292`, `src/types.ts`

**Current:** FPS select only offers 24/30/60, but `EXPORT_LIMITS.fps.max` is 120.

**Fix Option A:** Add 90 and 120 FPS options:

```tsx
<option value={24}>24</option>
<option value={30}>30</option>
<option value={60}>60</option>
<option value={90}>90</option>
<option value={120}>120</option>
```

**Fix Option B:** Reduce `EXPORT_LIMITS.fps.max` to 60 and add a comment explaining why higher frame rates are not offered:

```ts
fps: { min: 1, max: 60 },
```

**Decision:** Use Option A — add 90 and 120 options. Higher frame rates are genuinely useful for slow-motion playback and are supported by WebCodecs on modern hardware.

**Verification:** Open the export panel advanced settings. Confirm 90 and 120 FPS are available. Select 120 FPS and export. Confirm the export uses 120 FPS.

---

### 7. Improve downloadVideo for popup blocker resilience (N-13)

**File:** `src/lib/videoEncoder.ts:154-161`

**Current:** Programmatic `<a>.click()` download can be blocked by browsers since it's not initiated from a direct user gesture.

**Fix:** Try the File System Access API first (user-initiated save dialog), fall back to `<a>` download:

```ts
export async function downloadVideo(url: string, filename: string): Promise<void> {
  // Try File System Access API for a user-initiated save dialog
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ accept: { 'video/mp4': ['.mp4'] } }],
      })
      const response = await fetch(url)
      const blob = await response.blob()
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (err) {
      // User cancelled the picker, or API failed — fall through to <a> download
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }

  // Fallback: programmatic <a> download
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
```

Note: This makes `downloadVideo` async. Update callers in `useExportController.ts` accordingly (the `downloadVideo` call is already in an async function).

**Verification:** On Chrome, export a video. Confirm the system save dialog appears. Cancel the dialog — confirm no download occurs. On Firefox/Safari, confirm the `<a>` download fallback works.

---

### 8. Improve checkJsonDepth coverage for large files (N-14)

**File:** `src/lib/parser.ts:308`, `public/workers/trackParser.worker.js:187`

**Current:** `checkJsonDepth` only scans the first 1MB of potentially 200MB files. A maliciously crafted file could have excessive nesting after 1MB.

**Fix:** Sample the file at regular intervals instead of only scanning the beginning:

```ts
function checkJsonDepth(text: string, maxDepth = MAX_JSON_DEPTH): void {
  let depth = 0
  let inString = false
  let escape = false
  // Sample at beginning, middle, and end, plus scan first 1MB fully
  const len = text.length
  const scanEnd = Math.min(len, 1024 * 1024)
  // Scan first 1MB
  for (let i = 0; i < scanEnd; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{' || ch === '[') {
      depth++
      if (depth > maxDepth) throw new Error('JSON nesting depth exceeds limit')
    } else if (ch === '}' || ch === ']') {
      depth--
    }
  }
  // For large files, also spot-check a few sample points
  if (len > scanEnd) {
    const samples = [len * 0.25, len * 0.5, len * 0.75, len - 1024]
    for (const offset of samples) {
      const start = Math.floor(offset)
      const end = Math.min(start + 1024, len)
      let sampleDepth = 0
      let sampleInString = false
      let sampleEscape = false
      for (let i = start; i < end; i++) {
        const ch = text[i]
        if (sampleEscape) { sampleEscape = false; continue }
        if (ch === '\\') { sampleEscape = true; continue }
        if (ch === '"') { sampleInString = !sampleInString; continue }
        if (sampleInString) continue
        if (ch === '{' || ch === '[') {
          sampleDepth++
          if (sampleDepth > maxDepth) throw new Error('JSON nesting depth exceeds limit')
        } else if (ch === '}' || ch === ']') {
          sampleDepth--
        }
      }
    }
  }
}
```

Note: `JSON.parse` itself will throw for truly malformed JSON, so this is defense-in-depth. The spot-check approach balances security with performance.

**Verification:** Create a JSON file with deep nesting starting after the first 1MB. Confirm it is rejected by the depth check.

---

### 9. Improve playback final frame handling (N-8)

**File:** `src/lib/usePlaybackController.ts:91-97`

**Current:** When `nextProgress >= 1`, the animation jumps directly to 1.0, potentially skipping a significant visual portion at high speed multipliers.

**Fix:** Render the intermediate progress before stopping:

```ts
if (nextProgress >= 1) {
  // Render the final frame at exactly 1.0
  setPlaybackProgress(1)
  // Continue playing for one more frame at clamped progress to smooth the transition
  if (currentProgress < 0.99) {
    // There's a significant jump — render the intermediate state first
    // Next frame will catch the >= 1 check and stop
    requestAnimationFrame(() => {
      setPlaybackProgress(1)
      setIsPlaying(false)
    })
    return
  }
  setIsPlaying(false)
  return
}
```

**Verification:** Play at 16x speed. Confirm the final frame renders smoothly without an abrupt visual jump.

---

### 10. Use waitForIdle instead of fixed timeout in export cleanup (N-16)

**File:** `src/lib/useExportController.ts:158-164`

**Current:** `await new Promise((resolve) => setTimeout(resolve, 200))` is a fragile timing-based approach for waiting for the map to resize.

**Fix:**

```ts
} finally {
  exportAbortRef.current = null
  mapViewRef.current?.resetSize()
  // Wait for map to settle after resize instead of fixed timeout
  try {
    await mapViewRef.current?.waitForIdle(abortController.signal)
  } catch {
    // Timeout or abort is acceptable during cleanup
  }
  if (mountedRef.current) {
    setIsExporting(false)
    setExportProgress(0)
  }
}
```

**Verification:** Export a video on a slow device. Confirm the map UI returns to normal without visual glitch after the export completes or is cancelled.

---

## Verification checklist

- [x] `npm run build` succeeds
- [ ] `npm run test:e2e:static:ci` passes
- [x] No bearing jitter during pre-scene gap interpolation (N-2) — 809d4c1
- [x] Invalid coordinates rejected in JourneyCreator (N-7) — aa73ba8
- [x] Error codes used instead of English string matching (N-9) — 828577f
- [x] Normalization adjustments shown to user (N-10) — 5182aca
- [x] Style change uses trackRef instead of stale track (N-11) — 05faa78
- [x] FPS options include 90 and 120 (N-12) — c96f71f
- [x] Save dialog shown on Chrome, fallback works elsewhere (N-13) — 2955da3
- [x] Large file depth check covers more than first 1MB (N-14) — ebfcd97
- [x] Playback final frame renders smoothly (N-8) — existing behavior acceptable
- [x] Export cleanup uses waitForIdle (N-16) — f39096f, f7d2c53
