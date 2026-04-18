# P2 Code Quality & Robustness — 2026-04-18b

**Priority:** P2 — code health, robustness, and maintainability
**Source:** comprehensive-deep-code-review-2026-04-18b (P1-4, P1-7, P1-8, P2-1 through P2-13), code-maintainability plan (deferred items)
**Estimated effort:** 5-8 hours (can be spread across iterations)

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| P1-4 | SceneEditor warnings computed on already-normalized scenes | P1 | SceneEditor.tsx |
| P1-7 | ElevationProfile click-to-seek uses point-index, not distance-based | P1 | ElevationProfile.tsx |
| P1-8 | MapView animation effect re-runs on scenes/duration change | P1 | MapView.tsx |
| P2-1 | Worker checkJsonDepth counts braces inside strings | P2 | trackParser.worker.js |
| P2-2 | downloadVideo leaks a DOM node | P2 | videoEncoder.ts |
| P2-3 | computeCumulativeDistances computed redundantly in 3 locations | P2 | page.tsx, MapView.tsx, videoEncoder.ts |
| P2-4 | i18n setLocale writes document.documentElement.lang twice | P2 | i18n.ts |
| P2-6 | buildReferenceGridData uses floating-point step accumulation | P2 | MapView.tsx |
| P2-7 | SceneEditor stores closure in React state (pendingPreset) | P2 | SceneEditor.tsx |
| P2-8 | estimateOverviewZoom doesn't account for viewport size | P2 | camera.ts |
| P2-9 | handleSearchSubmit unnecessary searchEnabled guard | P2 | JourneyCreator.tsx |
| P2-10 | SceneEditor undoDelete uses stale index | P2 | SceneEditor.tsx |
| P2-11 | Haversine NaN for antipodal points | P2 | interpolate.ts |
| P2-12 | JSON.parse in Google parser has no try/catch | P2 | parser.ts |
| P2-13 | looksLikeGoogleLocationRecord some() O(n) on large arrays | P2 | parser.ts |
| Deferred | MapView animation effect deps — store scenes/duration in refs | P1 | MapView.tsx |
| Deferred | page.tsx useReducer refactor | P2 | page.tsx |
| Deferred | TrackWorkspace prop grouping | P2 | TrackWorkspace.tsx |
| Deferred | i18n split into per-locale files | P2 | i18n.ts |
| Deferred | eslint-disable explanatory comments | P2 | multiple |

---

## Implementation steps

### Phase 1 — Animation & interaction correctness (P1 items)

#### 1a. MapView animation effect — store scenes/duration/transitionDuration in refs

**File:** `src/components/MapView.tsx:831`

**Fix:**

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

**Verification:** Edit scenes during playback. Confirm no frame drops or camera flicker.

---

#### 1b. ElevationProfile — distance-based X positioning

**File:** `src/components/ElevationProfile.tsx:45-49`

**Current:** `const x = (i / (n - 1)) * w` — point-index based, not distance-based.

**Fix:** Use cumulative distances for X positioning:

```ts
const cumulDist = useMemo(
  () => computeCumulativeDistances(track.points, track.segmentStartIndices),
  [track]
)
const totalDist = cumulDist[cumulDist.length - 1] ?? 0

// In path generation:
const x = totalDist > 0 ? (cumulDist[i] / totalDist) * w : (i / (n - 1)) * w
```

Import `computeCumulativeDistances` from `interpolate.ts`.

**Verification:** Load a track with dense clusters of points (e.g., stationary Google Location History). Click on the dense cluster in the elevation profile. Confirm seeking jumps to the correct distance-based position.

---

#### 1c. SceneEditor — show warnings before normalization

**File:** `src/components/SceneEditor.tsx:275-291`

**Current:** Warnings are computed on already-normalized scenes, so overlap warnings never appear.

**Fix:** Compute warnings on the un-normalized scenes, and optionally show a notification when normalization adjusts values:

```ts
const warnings = useMemo(() => {
  const w: string[] = []
  // Check un-normalized scenes for overlaps
  for (let i = 1; i < scenes.length; i++) {
    const prev = scenes[i - 1]
    const s = scenes[i]
    if (s.startPercent < prev.endPercent) {
      w.push(t('scenes.overlapWarning') ?? `Scene ${i + 1} overlaps with the previous scene`)
    }
  }
  for (const s of scenes) {
    if (s.startPercent >= s.endPercent) {
      w.push(t('scenes.zeroLengthWarning') ?? `Scene "${s.name}" has zero length`)
    }
  }
  return w
}, [scenes, t])
```

Add i18n keys for `scenes.overlapWarning` and `scenes.zeroLengthWarning` in all 5 locales.

**Verification:** Create two overlapping scenes. Confirm a warning appears before normalization fixes the overlap.

---

### Phase 2 — Parser robustness (P2 items)

#### 2a. Fix worker checkJsonDepth — skip string literals

**File:** `public/workers/trackParser.worker.js:171-182`

**Fix:**

```js
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

**Verification:** Create a JSON file with many braces inside string values. Confirm it is no longer falsely rejected.

---

#### 2b. Add try/catch around JSON.parse in Google parser

**File:** `src/lib/parser.ts:295`

**Fix:**

```ts
let data: GoogleLocationData | Record<string, unknown>[]
try {
  data = JSON.parse(text)
} catch {
  throw new Error('Invalid JSON file. Please check that the file is a valid Google Location History export.')
}
```

**Verification:** Load a truncated/corrupted JSON file. Confirm a user-friendly error message appears.

---

#### 2c. Limit looksLikeGoogleLocationRecord scan to first N elements

**File:** `src/lib/parser.ts:300`

**Fix:**

```ts
if (Array.isArray(data) && data.length > 0 && data.slice(0, 100).some(looksLikeGoogleLocationRecord)) {
```

Also add value-type validation in `looksLikeGoogleLocationRecord`:

```ts
function looksLikeGoogleLocationRecord(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false
  const r = obj as Record<string, unknown>
  return ('latitude' in r || 'latitudeE7' in r) &&
         ('longitude' in r || 'longitudeE7' in r) &&
         (r.latitude == null || typeof r.latitude === 'number') &&
         (r.longitude == null || typeof r.longitude === 'number')
}
```

**Verification:** Load a 200MB non-Google JSON file. Confirm it is rejected quickly (not scanning millions of entries).

---

#### 2d. Fix Haversine NaN for antipodal points

**File:** `src/lib/interpolate.ts:10-11`

**Fix:**

```ts
const h = Math.min(1, sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng)
return 2 * R * Math.asin(Math.sqrt(h))
```

**Verification:** Unit test with nearly antipodal points. Confirm no NaN propagation.

---

### Phase 3 — Code quality improvements (P2 items)

#### 3a. Fix downloadVideo DOM leak

**File:** `src/lib/videoEncoder.ts:149-154`

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

Note: This fix is also in the P0/P1 plan for Safari. Coordinate to do both in one change.

---

#### 3b. Deduplicate computeCumulativeDistances

**Files:** `src/app/page.tsx:241`, `src/components/MapView.tsx:671`, `src/lib/videoEncoder.ts:60`

**Fix:** Compute once in `page.tsx` and pass through via props or context:

```ts
// In page.tsx:
const cumulativeDistances = useMemo(
  () => track ? computeCumulativeDistances(track.points, track.segmentStartIndices) : [],
  [track]
)

// Pass to children that need it
```

Alternatively, add a `cumulativeDistances` field to the `Track` type, computed once during parsing.

---

#### 3c. Fix i18n double lang attribute write

**File:** `src/lib/i18n.ts:1716-1724`

**Fix:** Remove the direct DOM write from `setLocale` (line 1722). The `useEffect` at line 1716 already handles it:

```ts
const setLocale = useCallback((l: Locale) => {
  setLocaleState(l)
  try { localStorage.setItem(LOCALE_STORAGE_KEY, l) } catch { /* ignore */ }
}, [])
```

---

#### 3d. Fix reference grid float accumulation

**File:** `src/components/MapView.tsx:225-254`

**Fix:** Use integer-based iteration:

```ts
for (let i = 0; i < count; i++) {
  const longitude = Math.floor(expandedMinLng / step) * step + i * step
  // ...
}
```

---

#### 3e. Replace SceneEditor pendingPreset closure with preset type

**File:** `src/components/SceneEditor.tsx:195`

**Fix:**

```ts
const [pendingPresetType, setPendingPresetType] = useState<string | null>(null)

// In preset button:
onClick={() => {
  if (scenes.length > 0) setPendingPresetType('cinematic')
  else commitScenes(generateDefaultScenes())
}}

// Execute based on type:
const executePreset = useCallback((type: string) => {
  switch (type) {
    case 'cinematic': commitScenes(generateDefaultScenes()); break
    case 'simple': commitScenes(generateSimpleFlyover()); break
    case 'birdeye': commitScenes(generateBirdsEye()); break
    case 'dynamic': commitScenes(generateDynamic()); break
  }
  setPendingPresetType(null)
}, [commitScenes])
```

---

#### 3f. Fix SceneEditor undoDelete stale index

**File:** `src/components/SceneEditor.tsx:246-252`

**Fix:** Store the preceding scene's ID instead of absolute index:

```ts
const [deletedScene, setDeletedScene] = useState<{
  scene: Scene
  precedingSceneId: string | null
} | null>(null)

// When deleting:
const idx = scenes.indexOf(scene)
setDeletedScene({
  scene,
  precedingSceneId: idx > 0 ? scenes[idx - 1].id : null,
})

// When undoing:
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

#### 3g. Remove unnecessary searchEnabled guard

**File:** `src/components/JourneyCreator.tsx:458-461`

Remove `if (!searchEnabled) return` from `handleSearchSubmit` — the callback is only reachable when search is active. Add a comment if keeping as defensive check.

---

#### 3h. Improve estimateOverviewZoom with viewport awareness

**File:** `src/lib/camera.ts:62-78`

**Fix:** Use MapLibre's `cameraForBounds` API when the map instance is available (for the overview camera mode), or improve the heuristic:

```ts
export function estimateOverviewZoom(
  points: TrackPoint[],
  mapWidth: number = 800,
  mapHeight: number = 600,
  padding: number = 80
): number {
  if (points.length === 0) return 2
  // ... existing span calculation
  const effectiveWidth = mapWidth - 2 * padding
  const effectiveHeight = mapHeight - 2 * padding
  const zoomX = Math.log2(360 * effectiveWidth / (dLng * mapWidth)) - 0.5
  const zoomY = Math.log2(180 * effectiveHeight / (dLat * mapHeight)) - 0.5
  return Math.min(zoomX, zoomY)
}
```

---

### Phase 4 — Deferred items from code-maintainability plan

#### 4a. page.tsx useReducer refactor

Group related state into a single `useReducer` to reduce the 15+ `useState` calls. Low urgency, high impact on maintainability.

#### 4b. TrackWorkspace prop grouping

Group the 47 props into typed objects (`PlaybackState`, `PlaybackActions`, etc.).

#### 4c. i18n per-locale file split

Move translations to `src/locales/en.ts`, `src/locales/ko.ts`, etc.

#### 4d. eslint-disable explanatory comments

Add comments above each `eslint-disable-next-line react-hooks/exhaustive-deps`.

---

## Verification checklist

- [x] `npm run build` succeeds
- [ ] `npm run test:e2e:static:ci` passes
- [x] M-1: Transition blend capped when transitionDuration > sceneDuration
- [x] M-2: Blob URL revoked when creating new one
- [x] M-3: handleShare distinguishes AbortError from other errors
- [x] M-4: handleSelectPlace adds waypoint after flying
- [x] M-5: undoDelete guards findIndex returning -1
- [x] M-6: Dedup key rounds to 7 decimal places
- [x] M-7: parseGPX uses direct-child selection for ele/time
- [x] M-8: Camera gap at progress=0 interpolates from overview
- [x] M-9: Bounding box cached to avoid double iteration
- [x] MapView animation smooth during scene edits (1a)
- [x] Elevation profile click-to-seek aligns with distance (1b)
- [x] Scene overlap warnings appear before normalization (1c)
- [x] Worker depth check handles string literals (2a)
- [x] Invalid JSON gives user-friendly error (2b)
- [x] Large non-Google JSON rejected quickly (2c)
- [x] No NaN from antipodal track points (2d)
- [x] No duplicate DOM writes in i18n (3c)
- [x] SceneEditor undo puts scene at correct position (3f)
- [x] computeCumulativeDistances memoized in page.tsx (3b)
- [x] downloadVideo appends/removes <a> from DOM (3a)
