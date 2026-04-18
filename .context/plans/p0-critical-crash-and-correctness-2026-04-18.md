# P0 Critical — Crash & Correctness Fixes — 2026-04-18

**Priority:** P0 — must fix before next release
**Source:** comprehensive-deep-code-review-2026-04-18 (P0-1, P0-2, P1-1, P1-4, P1-5, P1-8), comprehensive-security-review-2026-04-18 (HIGH-1, HIGH-3, MED-6)
**Estimated effort:** 3-4 hours

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| CD-P0-1 | `Math.min/max(...valid)` crashes on tracks with >100K elevation points | P0 | ElevationProfile.tsx |
| CD-P0-2 | `normalizeScenes()` called per-frame during export — 900 allocations for 30s video | P0 | camera.ts, videoEncoder.ts |
| CD-P1-1 | `handleRangeChange` can produce 0-1 point degenerate tracks | P1 | page.tsx |
| CD-P1-4 | `videoEncoder` calls `output.finalize()` on abort — potential corrupt MP4 | P1 | videoEncoder.ts |
| CD-P1-5 | `parseGoogleLocationHistory` sorts mixed null-time points incorrectly | P1 | parser.ts |
| CD-P1-8 | `trackCenter` / `estimateOverviewZoom` return NaN on empty points | P1 | camera.ts |
| SEC-HIGH-1 | XML entity expansion (billion laughs) via GPX/KML | HIGH | parser.ts |
| SEC-HIGH-3 | No input validation in Web Worker postMessage | HIGH | trackParser.worker.js |
| SEC-MED-6 | No JSON nesting depth limit in worker | MED | trackParser.worker.js |

---

## Implementation steps

### 1. ElevationProfile — replace Math.min/max spread with loop

**File:** `src/components/ElevationProfile.tsx:29-30`

**Current:**
```ts
const valid = elevations.filter((e): e is number => e !== null)
const min = Math.min(...valid)
const max = Math.max(...valid)
```

**Fix:** Replace with a manual loop that avoids spreading the entire array:
```ts
let min = Infinity, max = -Infinity
for (const e of elevations) {
  if (e !== null) {
    if (e < min) min = e
    if (e > max) max = e
  }
}
const range = max - min || 1
```

Remove the `valid` array allocation entirely. This eliminates both the `RangeError: Maximum call stack size exceeded` and the intermediate `valid` array.

**Verification:** Load a 250K-point Google Location History file with elevation data. Confirm no crash. Confirm elevation min/max labels display correctly.

---

### 2. Cache normalized scenes in export loop

**File:** `src/lib/camera.ts:325`, `src/lib/videoEncoder.ts`

**Current:** `computeCameraForProgress(scenes, ...)` calls `normalizeScenes(scenes)` at the top, which sorts + maps the scenes array into a new array. Called 900 times for a 30s@30fps export.

**Fix:** Compute `normalizedScenes` once before the frame loop in `videoEncoder.ts`, then pass it directly:

1. Export `normalizeScenes` from `camera.ts` (or make `computeCameraForProgress` accept pre-normalized scenes)
2. In `videoEncoder.ts`, compute once: `const normalizedScenes = normalizeScenes(scenes)`
3. Add a new internal function `computeCameraForProgressNormalized(normalizedScenes, ...)` that skips the normalization step
4. Call the normalized variant in the per-frame loop

**Verification:** Export a 30s video with scenes. Confirm export time is not regressed. Confirm camera transitions are identical.

---

### 3. Guard handleRangeChange against degenerate tracks

**File:** `src/app/page.tsx:142-158`

**Current:** `fullTrack.points.slice(startIdx, endIdx + 1)` with no validation.

**Fix:** Add a guard after slicing:
```ts
const slicedPoints = fullTrack.points.slice(startIdx, endIdx + 1)
if (slicedPoints.length < 2) return
```

**Verification:** Drag timeline handles to minimum span. Confirm track never collapses below 2 points.

---

### 4. Skip output.finalize() when export is aborted

**File:** `src/lib/videoEncoder.ts:115-118`

**Current:** `finally` block always calls `await output.finalize()`.

**Fix:** Track completion state:
```ts
let completed = false
try {
  for (let i = 0; i < totalFrames; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    // ... frame logic
  }
  completed = true
} finally {
  if (completed) {
    await output.finalize()
  }
}
```

**Verification:** Start an export, click cancel immediately. Confirm no corrupt file is downloaded. Complete a full export and confirm it still works.

---

### 5. Fix Google Location History null-time point sorting

**File:** `src/lib/parser.ts:284-337`

**Current:** `unique.sort((a, b) => (a.point.time?.getTime() ?? 0) - (b.point.time?.getTime() ?? 0))` — null-time points sort to the beginning with timestamp 0, interleaving incorrectly.

**Fix:** Separate timed from untimed points in sorting:
```ts
unique.sort((a, b) => {
  const aTime = a.point.time?.getTime()
  const bTime = b.point.time?.getTime()
  if (aTime != null && bTime != null) return aTime - bTime
  if (aTime != null) return -1
  if (bTime != null) return 1
  return a.order - b.order
})
```

Also add an `order` index when building the `unique` array to preserve insertion order for untimed points.

**Verification:** Import a Google Location History file with mixed timed/untimed records. Confirm animation does not jump backward.

---

### 6. Guard trackCenter / estimateOverviewZoom against empty points

**File:** `src/lib/camera.ts:46-76`

**Current:** Returns `[NaN, NaN]` for empty `points` array.

**Fix:** Add early return:
```ts
export function trackCenter(points: TrackPoint[]): [number, number] {
  if (points.length === 0) return [0, 20]
  // ... existing logic
}
```

Similarly for `estimateOverviewZoom`:
```ts
export function estimateOverviewZoom(points: TrackPoint[], mapWidth: number, mapHeight: number): number {
  if (points.length === 0) return 2
  // ... existing logic
}
```

And add a guard at the top of `computeCameraForScene`:
```ts
if (track.points.length === 0) return { center: [0, 20], zoom: 2, pitch: 0, bearing: 0 }
```

**Verification:** Unit test or manual test with a degenerate 0-point track. Confirm no NaN values propagate to MapLibre.

---

### 7. Strip XML DTD/entity declarations before DOMParser (billion laughs defense)

**File:** `src/lib/parser.ts:86-87,125-126`

**Current:** `DOMParser().parseFromString(text, 'application/xml')` without DTD stripping.

**Fix:** Add a preprocessing function:
```ts
function stripXmlEntities(text: string): string {
  return text.replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<!ENTITY[^>]*>/gi, '')
}
```

Call it before `DOMParser` in both `parseGPX` and `parseKML`.

Also add `<parsererror>` detection after parsing:
```ts
const parseError = doc.querySelector('parsererror')
if (parseError) throw new Error('Invalid XML: parse error')
```

**Verification:** Create a test GPX file with XML entity expansion. Confirm it does not crash the browser. Load a valid GPX file and confirm it still parses correctly.

---

### 8. Add input validation to Web Worker

**File:** `public/workers/trackParser.worker.js`

**Current:** `self.onmessage` accepts any message without validation.

**Fix:** Add structure, type, and size validation:
```js
self.onmessage = (event) => {
  if (!event.data || typeof event.data !== 'object') return
  if (typeof event.data.ext !== 'string' || typeof event.data.text !== 'string') return
  if (event.data.text.length > 200 * 1024 * 1024) {
    self.postMessage({ error: 'Input too large' })
    return
  }
  // Add nesting depth check before JSON.parse for json files
  if (event.data.ext === 'json') {
    let depth = 0
    for (let i = 0; i < Math.min(event.data.text.length, 10000); i++) {
      if (event.data.text[i] === '[' || event.data.text[i] === '{') depth++
      if (event.data.text[i] === ']' || event.data.text[i] === '}') depth--
      if (depth > 100) {
        self.postMessage({ error: 'JSON nesting too deep' })
        return
      }
    }
  }
  // ... existing parsing logic
}
```

Also update the main-thread fallback in `parser.ts` with the same depth check.

**Verification:** Create a deeply nested JSON file. Confirm parsing fails gracefully instead of crashing.

---

## Verification checklist

- [x] `npm run build` succeeds
- [x] `npm run test:e2e:static:ci` passes
- [x] 250K-point track loads without ElevationProfile crash (US-001: manual loop)
- [x] Export with scenes does not allocate per-frame normalized arrays (US-002: pre-normalized)
- [x] Timeline trimming cannot produce <2-point tracks (US-003: early return)
- [x] Aborted export does not produce corrupt MP4 (US-004: completed flag)
- [x] Google Location History with null-time points sorts correctly (US-005: timed-first sort)
- [x] Empty-points camera computation returns valid fallback (US-006: empty guards)
- [x] XML entity expansion GPX does not crash browser (US-007: stripXmlEntities)
- [x] Worker validates message structure and JSON depth (US-008: validation + depth check)

**Status: COMPLETE** — All 9 findings implemented and verified. Commit: `eb1419c`
