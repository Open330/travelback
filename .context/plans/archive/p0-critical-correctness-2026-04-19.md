# P0 Critical Correctness Fixes — 2026-04-19

**Priority:** P0 — correctness bugs that produce wrong output
**Source:** comprehensive-deep-code-review-2026-04-19 (N-1, N-3, N-4, N-5, N-21)
**Estimated effort:** 3-4 hours

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| N-1 | Worker does not remap segment start indices after dedup+sort | HIGH | trackParser.worker.js |
| N-3 | Parser format detection uses `if` not `else if`, causing double-parsing | HIGH | parser.ts, trackParser.worker.js |
| N-4 | lerpCamera longitude interpolation wraps incorrectly near antimeridian | HIGH | camera.ts |
| N-5 | TimelineSelector endDrag stale closure over onRangeChange | HIGH | TimelineSelector.tsx |
| N-21 | Worker dispatcher logic diverges from main thread | MEDIUM | trackParser.worker.js |

---

## Implementation steps

### 1. Fix worker segment start index remapping after dedup+sort

**File:** `public/workers/trackParser.worker.js:155-177`

**Current:** The worker returns `segStarts` directly without remapping. After dedup removes points and sort reorders them, the original indices in `segStarts` point to wrong positions.

**Fix:** Add the same `orderToNewIndex` remapping logic that the main thread uses (parser.ts:387-399):

```js
// After unique.sort(...), before the return:

const orderToNewIndex = new Map()
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

return {
  name: 'Google Location History',
  points: unique.map(({ point }) => point),
  ...(adjustedSegStarts.length > 0 ? { segmentStartIndices: adjustedSegStarts } : {}),
}
```

**Verification:** Import a Google Location History file with timelineObjects (activity segments). Confirm segment breaks appear at correct positions in the rendered track, matching main-thread behavior.

---

### 2. Fix parser format detection — use else-if chain or add explicit comment

**File:** `src/lib/parser.ts:337-360`, `public/workers/trackParser.worker.js:131-151`

**Current:** Independent `if` blocks allow a JSON file containing both `timelineObjects` and `semanticSegments` to have ALL formats parsed, causing duplicate points and unreliable segment indices.

**Fix (Option A — else-if for single format):** Change the format detection to use `else if` so only the first recognized format is parsed:

```ts
if (Array.isArray(data) && data.length > 0 && data.slice(0, 100).some(looksLikeGoogleLocationRecord)) {
  recognizedFormat = true
  parseRecords(data, points)
} else if (!Array.isArray(data)) {
  if (Array.isArray(data.locations)) {
    recognizedFormat = true
    parseRecords(data.locations, points)
  } else if (Array.isArray(data.timelineObjects)) {
    recognizedFormat = true
    parseTimelineObjects(data.timelineObjects, points, segStarts)
  } else if (Array.isArray(data.timelineEdits)) {
    recognizedFormat = true
    parseTimelineEdits(data.timelineEdits, points)
  } else if (Array.isArray(data.semanticSegments)) {
    recognizedFormat = true
    parseSemanticSegments(data.semanticSegments, points)
  }
}
```

**Fix (Option B — keep multi-format with comment):** If multi-format parsing is intentional for enrichment, add a comment explaining why, and ensure the dedup step handles it:

```ts
// Note: Multiple format branches can match the same file (e.g., a file with both
// timelineObjects and semanticSegments). This is intentional to extract maximum data.
// The dedup step below removes any resulting duplicate points.
```

**Decision:** Use Option B (keep multi-format) since Google Takeout files genuinely contain multiple format keys, and the dedup step already handles duplicates. But fix the worker to match the main-thread structure (N-21).

Apply the same structure to the worker. The worker currently uses `if/else if` for the top level but `if` for the nested checks inside `data && typeof data === 'object'`. Align exactly with main thread.

**Verification:** Create a JSON file with both `timelineObjects` and `semanticSegments`. Parse via both main thread and worker. Confirm no duplicate points in output and segment indices are correct.

---

### 3. Fix lerpCamera longitude interpolation near antimeridian

**File:** `src/lib/camera.ts:115-117`

**Current:** The shortest-path longitude lerp `(((b.center[0] - a.center[0] + 540) % 360) - 180)` can produce wrong results when camera states straddle the 180/-180 boundary. For a route from Tokyo (lng=139.7) to Anchorage (lng=-149.9), the interpolated center could go west through Europe instead of east across the Pacific.

**Fix:** Use the same shifted-longitude approach used in `computeBoundingBox`/`trackCenterFromBox`:

```ts
export function lerpCamera(a: CameraState, b: CameraState, t: number): CameraState {
  const s = t * t * (3 - 2 * t) // smoothstep
  const lerpAngle = (from: number, to: number, f: number) => {
    const diff = ((to - from + 540) % 360) - 180
    return from + diff * f
  }

  // Longitude interpolation: use shortest path, but detect antimeridian wrap
  // by checking if the direct span exceeds 180 degrees
  let lngDiff = b.center[0] - a.center[0]
  if (Math.abs(lngDiff) > 180) {
    // Shift into [0, 360) domain for interpolation, then shift back
    const aShifted = ((a.center[0] + 180) % 360 + 360) % 360
    const bShifted = ((b.center[0] + 180) % 360 + 360) % 360
    const diffShifted = bShifted - aShifted
    const interpShifted = aShifted + diffShifted * s
    var lngResult = ((interpShifted + 180) % 360) - 180
  } else {
    var lngResult = a.center[0] + lngDiff * s
  }

  return {
    center: [lngResult, a.center[1] + (b.center[1] - a.center[1]) * s],
    zoom: a.zoom + (b.zoom - a.zoom) * s,
    pitch: a.pitch + (b.pitch - a.pitch) * s,
    bearing: lerpAngle(a.bearing, b.bearing, s),
  }
}
```

Note: Use proper `let` instead of `var` — the `var` above is pseudocode. Use a single `const lngResult` computed conditionally.

**Verification:** Create a test track from Tokyo to Anchorage. During playback, confirm the camera center stays in the Pacific (lng ~165-180) and never jumps to lng ~0 (Africa/Europe).

---

### 4. Fix TimelineSelector endDrag stale closure over onRangeChange

**File:** `src/components/TimelineSelector.tsx:166-172, 175-192`

**Current:** `endDrag` captures `resolveRangeIndexes` and `onRangeChange` from the render scope. The global mouse/touch listeners registered in the `useEffect` only depend on `applyDrag`. If `onRangeChange` changes between renders, `endDrag` will call the stale version.

**Fix:** Use a ref for `onRangeChange`, similar to ModalDialog's `onCloseRef`:

```ts
const onRangeChangeRef = useRef(onRangeChange)
useEffect(() => { onRangeChangeRef.current = onRangeChange }, [onRangeChange])

const endDrag = useCallback(() => {
  dragState.current.dragging = null
  if (points.length > 0) {
    const { startIdx, endIdx } = resolveRangeIndexes()
    onRangeChangeRef.current(startIdx, endIdx)
  }
}, [resolveRangeIndexes, points.length])
```

Also update the initial-mount `useEffect` (line 98-103) to use `onRangeChangeRef.current` instead of `onRangeChange` directly, and remove `onRangeChange` from its dependency array (which was intentionally omitted via eslint-disable anyway).

**Verification:** Rapidly change the parent component state while dragging the timeline selector. Confirm the final `onRangeChange` callback fires with the latest parent callback, not a stale one.

---

### 5. Align worker dispatcher logic with main thread (N-21)

**File:** `public/workers/trackParser.worker.js:131-151`

**Current:** The main-thread dispatcher uses a chain of independent `if` blocks for format detection after the initial array check. The worker uses `else if (data && typeof data === 'object')` with nested `if` blocks. This is a behavioral divergence — the main thread can process both a flat array AND `timelineObjects` from the same data, while the worker cannot.

**Fix:** Align the worker's dispatcher to match the main thread exactly:

```js
// Flat array: [{ latitudeE7, ... }]
if (Array.isArray(data) && data.length > 0 && data.slice(0, 100).some(looksLikeGoogleLocationRecord)) {
  recognizedFormat = true
  parseRecords(data, points)
}
// Records.json / Location History.json: { locations: [...] }
if (!Array.isArray(data) && Array.isArray(data.locations)) {
  recognizedFormat = true
  parseRecords(data.locations, points)
}
// Semantic Location History (monthly): { timelineObjects: [...] }
if (!Array.isArray(data) && Array.isArray(data.timelineObjects)) {
  recognizedFormat = true
  parseTimelineObjects(data.timelineObjects, points, segStarts)
}
// Timeline Edits.json: { timelineEdits: [...] }
if (!Array.isArray(data) && Array.isArray(data.timelineEdits)) {
  recognizedFormat = true
  parseTimelineEdits(data.timelineEdits, points)
}
// Phone export / new format: { semanticSegments: [...] }
if (!Array.isArray(data) && Array.isArray(data.semanticSegments)) {
  recognizedFormat = true
  parseSemanticSegments(data.semanticSegments, points)
}
```

**Verification:** Create a JSON with `{ "locations": [...], "timelineObjects": [...] }`. Parse via both paths. Confirm both produce the same merged result.

---

## Verification checklist

- [x] `npm run build` succeeds
- [ ] `npm run test:e2e:static:ci` passes
- [x] Worker segment indices match main-thread after dedup+sort (N-1) — b3e64e1
- [x] Multi-format JSON files parse without duplicate points (N-3) — b3e64e1
- [x] Camera stays in Pacific for antimeridian-crossing routes (N-4) — 43314fb
- [x] TimelineSelector drag-end calls latest onRangeChange (N-5) — 47723df
- [x] Worker dispatcher matches main-thread behavior (N-21) — b3e64e1
