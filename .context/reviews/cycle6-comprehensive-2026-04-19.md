# Cycle 6 Comprehensive Deep Code Review — 2026-04-19

Generated from a fresh full-repo read of the current `main` branch.

## Review scope

All source files under `src/`, `public/workers/`, `scripts/`, and configuration files were read in their entirety. This review focuses on new findings not caught in prior cycles, and re-evaluates deferred items for changes in severity.

## New findings

### C6-001 — MEDIUM — `cumulativeDistances` memo depends on `track` object reference in `page.tsx`

**Files:** `src/app/page.tsx:246-249`

**Code:**
```ts
const cumulativeDistances = useMemo(
  () => track ? computeCumulativeDistances(track.points, track.segmentStartIndices) : [],
  [track]
)
```

**Why it matters:**
The `track` object is a new reference every time `setTrack(filteredTrack)` or `setTrack(nextTrack)` is called (even if the points data is the same). This triggers an O(n) recomputation of cumulative distances via haversine on every track reference change. The prior cycle (C5-AGG-007) fixed the same issue in `Controls.tsx` for `totalDistance`, but the same pattern persists in `page.tsx` for `cumulativeDistances`, which is the more expensive computation (it builds an entire array, not just a scalar).

Additionally, `computeCumulativeDistances` is also redundantly called inside `MapView.tsx:765`:
```ts
cumulDistRef.current = computeCumulativeDistances(track.points, track.segmentStartIndices)
```
This means every track change triggers the computation twice: once in `page.tsx` (for props) and once in `MapView` (for internal animation state). The `MapView` computation could use the prop instead.

**Suggested fix:**
1. Change memo deps to `[track?.points, track?.segmentStartIndices]` in `page.tsx:248`.
2. Pass `cumulativeDistances` into `MapView` as a prop instead of recomputing inside the component.

**Confidence:** High

---

### C6-002 — MEDIUM — `MapView` recomputes `cumulDist` internally despite receiving `cumulativeDistances` via `TrackWorkspace`

**Files:** `src/components/MapView.tsx:765`

**Code:**
```ts
cumulDistRef.current = computeCumulativeDistances(track.points, track.segmentStartIndices)
```

**Why it matters:**
`page.tsx` already computes `cumulativeDistances` and passes it through `TrackWorkspace` to children like `ElevationProfile` and `TimelineSelector`. But `MapView` is rendered directly from `page.tsx` and does NOT receive `cumulativeDistances` as a prop. Instead, it recomputes it internally on every track change. This is a redundant O(n) haversine computation for tracks with up to 250K points.

**Suggested fix:**
Add `cumulativeDistances` as a prop to `MapView` and use it instead of recomputing. Fall back to computing only if the prop is empty.

**Confidence:** High

---

### C6-003 — LOW — `useExportController` still recomputes `cumulDist` internally despite the `cumulDistParam` parameter being available

**Files:** `src/lib/useExportController.ts:131`

**Code:**
```ts
const cumulDist = computeCumulativeDistances(track.points, track.segmentStartIndices)
```

**Why it matters:**
Cycle 5 added `cumulDistParam` support to `exportVideo`, but `useExportController` still computes `cumulDist` locally on line 131 and passes it as the 8th argument. The `page.tsx` already has `cumulativeDistances` available but does not pass it to `useExportController`. This means every export trigger recomputes distances unnecessarily.

**Suggested fix:**
Add `cumulativeDistances` to `UseExportControllerOptions` and pass it through to `exportVideo`.

**Confidence:** High

---

### C6-004 — LOW — `parseSemanticSegments` worker uses `continue` inside `visit` block which skips segment-start index recording

**Files:** `public/workers/trackParser.worker.js:128`

**Code:**
```js
if (lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
  out.push({ lat, lng, time: gTime(seg.startTime) })
}
```

Wait — on closer inspection, the worker's visit block does NOT use `continue`. The main-thread parser at `parser.ts:305` uses `continue` which skips the `segStarts.push(afterPathLen)` on line 311 when the coordinate is invalid. Let me re-check...

Actually, looking at the main-thread `parser.ts:305`:
```ts
if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
```

This `continue` skips the rest of the `if (visit)` block AND also skips `if (out.length > afterPathLen && afterPathLen > 0) segStarts.push(afterPathLen)` on line 311. This means that if a visit has invalid coordinates, the segment-start index for that visit is never recorded, even though a previous `timelinePath` within the same segment may have added points (and `afterPathLen > preLen` was already true).

In contrast, the worker's visit block at line 128 does NOT use `continue` — it uses an `if` guard:
```js
if (lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
  out.push(...)
}
```

This means the worker correctly falls through to the segment-start recording on line 134, while the main-thread parser skips it. This is a behavioral difference between the two parsers.

**Why it matters:**
When a semantic segment has a timelinePath with valid points followed by a visit with invalid coordinates, the main-thread parser will miss recording the segment break between them, while the worker correctly records it. This leads to inconsistent track segmentation depending on which parser path is used.

**Suggested fix:**
In `parser.ts:305`, replace the `continue` with an `if` guard (same pattern as the worker), so that execution falls through to the segment-start recording on line 311.

**Confidence:** Medium (the main-thread fallback path is only hit when the worker fails, so this is a low-frequency path, but the behavioral inconsistency is real)

---

### C6-005 — LOW — `ElevationProfile` SVG uses `useId()` for gradient/clip IDs but SVG `id` attributes can collide across React concurrent renders

**Files:** `src/components/ElevationProfile.tsx:18-19`

**Code:**
```ts
const gradientId = useId()
const clipId = useId()
```

**Why it matters:**
React's `useId()` generates unique IDs within a React render tree, but SVG `id` attributes are document-global. If `ElevationProfile` were ever rendered multiple times on the same page (currently it's not), the IDs could theoretically collide. More practically, the `useId()` hook generates IDs like `:r0:`, `:r1:` which contain colons — while valid in HTML5, these can cause issues with CSS selectors and `document.getElementById()` in some older browser edge cases. This is a very low-risk finding but worth noting.

**Confidence:** Low (no actual bug today, but a latent concern)

---

### C6-006 — LOW — `GlobalToolbar` select element uses `appearance-none` but has no custom dropdown indicator

**Files:** `src/components/GlobalToolbar.tsx:53`

**Code:**
```tsx
className="gi min-h-11 px-2 py-1.5 text-xs font-medium cursor-pointer appearance-none text-center"
```

**Why it matters:**
The locale select in the global toolbar hides the native dropdown arrow with `appearance-none`, but no custom chevron/indicator is provided. On most browsers, this makes it unclear that the element is a dropdown. The other selects in the app (ExportPanel, SceneEditor) do not use `appearance-none` and retain their native indicators.

**Suggested fix:**
Either remove `appearance-none` to show the native dropdown indicator, or add a custom chevron icon (consistent with other dropdowns in the app).

**Confidence:** Medium

---

### C6-007 — LOW — `Toast` container uses `role="status"` with `aria-live="polite"` — the `role` already implies `aria-live`

**Files:** `src/components/Toast.tsx:66`

**Code:**
```tsx
<div role="status" aria-live="polite" className="fixed bottom-28 sm:bottom-24 right-4 z-50 flex flex-col gap-2">
```

**Why it matters:**
The `role="status"` already has an implicit `aria-live="polite"` per the ARIA spec. Adding `aria-live="polite"` explicitly is redundant but harmless. This is a minor code cleanliness issue, not a bug.

**Confidence:** High (cosmetic)

---

### C6-008 — LOW — `buildReferenceGridData` computes `latCount` using `expandedMinLng` instead of `expandedMinLat` for the latitude step calculation

**Files:** `src/components/MapView.tsx:306`

**Code:**
```ts
const latCount = Math.ceil((expandedMaxLat + step / 2 - Math.floor(expandedMinLng / step) * step) / step)
```

**Why it matters:**
This line computes the number of latitude grid lines, but uses `Math.floor(expandedMinLng / step)` instead of `Math.floor(expandedMinLat / step)`. When `expandedMinLng` and `expandedMinLat` are different values (which is typical), the latitude grid will have an incorrect starting position and count. For most tracks, this produces a slightly off grid that still looks acceptable, but for tracks near the poles or with large latitude spans, the grid may be visibly misaligned.

**Suggested fix:**
Change `Math.floor(expandedMinLng / step)` to `Math.floor(expandedMinLat / step)` on line 306.

**Confidence:** High — this is a clear copy-paste bug

---

### C6-009 — MEDIUM — `downloadVideo` fallback path does not revoke the object URL created for the `<a>` download

**Files:** `src/lib/videoEncoder.ts:183-194`

**Code:**
```ts
const a = document.createElement('a')
a.href = url
a.download = filename
document.body.appendChild(a)
a.click()
setTimeout(() => { a.remove() }, 100)
return { saved: true, method: 'fallback' }
```

**Why it matters:**
The `url` parameter is an object URL created by `URL.createObjectURL(blob)`. In the `showSaveFilePicker` path (line 172), the blob is written directly and no extra fetch is needed. But the caller (`useExportController`) tracks the URL in state and revokes it on cleanup. However, if the `showSaveFilePicker` path is taken and succeeds, the caller's `revokeExportedVideoUrl` will still revoke the URL later — that's fine.

The real concern: if `downloadVideo` is called with a URL that was NOT created by the caller (e.g., a future refactor), the URL may leak. More practically, the `<a>` fallback path at line 172 does `await fetch(url)` to get a blob — this is a network roundtrip to a blob URL that could be avoided by using the `blob` parameter directly (which is already available).

Wait, re-reading: the `showSaveFilePicker` path on line 172 does `const writeBlob = blob ?? await (await fetch(url)).blob()`. So when `blob` is provided (which it always is from `useExportController`), the fetch is skipped. This is fine.

The actual finding: the `<a>` fallback path does NOT use the `blob` parameter at all. It sets `a.href = url` which points to the object URL. This works, but the `<a>` element's download attribute triggers a navigation-based download, which some browsers handle by fetching the URL again. If the URL has been revoked between creation and the `<a>` click (race condition), the download silently fails. This is a minor improvement opportunity — the fallback could create a data URL from the blob instead of relying on the object URL.

**Suggested fix:**
In the fallback path, if `blob` is available, create a new object URL just for the download and revoke it after the timeout, rather than relying on the potentially-shared URL.

**Confidence:** Low (the race condition window is very small in practice)

---

## Re-evaluation of deferred items

### DF-C2-002 — Playback progress drives whole-app rerenders
- **Current status:** Still valid. The `usePlaybackController` hook uses `setProgress` (React state) on every animation frame, which causes the entire `HomeInner` component tree to re-render at ~60fps during playback. The `progress` prop flows through to `MapView`, `Controls`, `TrackWorkspace`, `ElevationProfile`, etc.
- **Severity unchanged:** HIGH / HIGH
- **Note:** This is the most impactful performance issue in the codebase. Each playback frame triggers: React reconciliation of the full component tree, `buildTrackGeometry` (O(n) array allocation), `interpolateAlongTrack` (O(log n) binary search + interpolation), and a MapLibre `setData` + `jumpTo`. For tracks with 100K+ points, this is significant.

### DF-C4-001 — `preserveDrawingBuffer: true` always on
- **Current status:** Still valid. The comment at `MapView.tsx:554-558` explains the trade-off but no conditional logic exists to disable it when not exporting.

### DF-C5-001 — TrackToolbar mobile menu focus trapping
- **Current status:** Still valid. Low priority a11y enhancement.

### DF-C5-002 — MapView animation effect stable callback dependencies
- **Current status:** Still valid. `addTrackLayers` and `ensureMarker` are still stable `useCallback([])`.

## Items verified as already fixed or not actual issues

| Prior ID | Description | Why closed |
|----------|-------------|------------|
| C5-AGG-001 | `downloadVideo` fallback `<a>` removal timing | Fixed with `setTimeout` — confirmed at `videoEncoder.ts:193` |
| C5-AGG-002 | `exportVideo` computes `cumulDist` internally | Partially fixed — `cumulDistParam` accepted but `useExportController` still computes locally (see C6-003) |
| C5-AGG-003 | `formatDuration` NaN/Infinity guard | Fixed at `interpolate.ts:179` |
| C5-AGG-004 | Worker `var` to `const`/`let` | Fixed in worker at lines 116-128 |
| C5-AGG-005 | Worker boundary-check style consistency | Parity comment added at worker line 120-121 |
| C5-AGG-006 | JourneyCreator search error message | Already clear in current code |
| C5-AGG-007 | Controls `totalDistance` memo dependency | Fixed at `Controls.tsx:42` with `[track.points, track.segmentStartIndices]` |
| C5-AGG-008 | Reduced-motion spinner | Fixed at `globals.css:44-47` |

## Summary of new actionable findings

| ID | Severity | Description | Confidence |
|----|----------|-------------|------------|
| C6-001 | MEDIUM | `cumulativeDistances` memo depends on `track` reference | High |
| C6-002 | MEDIUM | `MapView` recomputes `cumulDist` internally | High |
| C6-003 | LOW | `useExportController` recomputes `cumulDist` despite parameter | High |
| C6-004 | LOW | Main-thread `parseSemanticSegments` `continue` skips segment-start recording | Medium |
| C6-005 | LOW | ElevationProfile SVG `useId()` colons in selectors | Low |
| C6-006 | LOW | GlobalToolbar select missing dropdown indicator | Medium |
| C6-007 | LOW | Toast redundant `aria-live` with `role="status"` | High |
| C6-008 | LOW | `buildReferenceGridData` uses `expandedMinLng` instead of `expandedMinLat` | High |
| C6-009 | MEDIUM | `downloadVideo` fallback path URL race condition risk | Low |
