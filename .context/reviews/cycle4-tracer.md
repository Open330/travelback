# Cycle 4 Tracer Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Methodology
Causal tracing of suspicious flows and competing hypotheses for failure modes. Traced data flows through parser, playback, camera, export, and map rendering.

## Findings

### C4-TR01 — Trail rendering: precomputed segment index mismatch during rapid seeks
- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:1024-1081`
- **Detail:** The trail update loop iterates `precomputedSegmentsRef.current` and compares `seg.range.start` / `seg.range.end` against `segmentIndex` from `interpolateAlongTrack`. During rapid seeks (keyboard arrow keys, seekNonce changes), the `segmentIndex` can jump significantly. The loop logic `if (seg.range.start > segmentIndex) break` stops early if a segment starts after the current index, which is correct. However, the `partialCoords` construction copies coordinates up to `seg.range.start + i > segmentIndex`, which depends on the coordinate array indices aligning with point indices. Since `seg.coordinates[i]` maps to `points[seg.range.start + i]`, this is correct. Traced through: seek -> progress change -> interpolateAlongTrack returns segmentIndex -> trail loop uses segmentIndex to select segments and partial coordinates. No bug found, but the indexing is subtle and worth an explicit invariant comment.
- **Suggested fix:** Add a comment documenting the invariant that `seg.coordinates[i]` corresponds to `points[seg.range.start + i]`.

### C4-TR02 — Export cleanup: race between `resetSize()` and `waitForIdle()` in finally block
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:225-249`
- **Detail:** The finally block calls `mapViewRef.current?.resetSize()` then `await mapViewRef.current?.waitForIdle(abortController.signal)`. If the map was destroyed during export (e.g., user navigated away), `resetSize()` tries to clear container styles (safe) then calls `map.resize()` which catches exceptions. Then `waitForIdle()` is called on a potentially destroyed map. The `waitForIdle` implementation checks `if (!map) { resolve(true); return }` at the start, but `mapRef.current` might still point to the map object even if it's been destroyed. MapLibre's `map.remove()` sets internal state but the JavaScript object still exists.
- **Suggested fix:** Add a try/catch around the `waitForIdle` call in the finally block (already done — the catch is present on line 243). The current code handles this correctly.

### C4-TR03 — Camera smoothing applied even after large seek jumps
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:1116-1157`
- **Detail:** When the user seeks (seekNonce changes), `explicitSeek` is set to true, and the code skips camera smoothing (`canSmoothCamera` is false). The camera state jumps directly to the target. However, if the user holds down the arrow key, `seekNonce` increments rapidly. Each seek updates `lastCameraStateRef.current`, and the next frame's smoothing calculation uses the previous camera state. Between seeks, if `seekNonce` hasn't changed but progress is still updating via animation, smoothing could produce unexpected results for a frame.
- **Suggested fix:** Already handled — `explicitSeek` comparison with `lastSeekNonceRef.current` ensures smoothing is skipped on seek frames. No fix needed.

### C4-TR04 — Worker message handler doesn't handle cases where worker returns both `error` and `track`
- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/parser.ts:639-670`
- **Detail:** The `worker.onmessage` handler first checks `event.data.error`, then checks `!event.data.track`. If the worker returns both an error and a track, the error takes precedence and the track is discarded. This is correct (error means something went wrong). But the worker code in `public/workers/trackParser.worker.js` should never send both — verifying the worker's message contract would strengthen this.
- **Suggested fix:** Add a comment documenting the message contract: `{ track?: Track, error?: string, code?: string }` where error and track are mutually exclusive.

### C4-TR05 — `interpolateAlongTrack` returns `totalDist: 0` when track has only one point
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/interpolate.ts:92-100`
- **Detail:** When `points.length === 1`, the function returns `totalDist: 0` and `distanceTraveled: 0`. This is correct but means any progress-based calculation would divide by zero. The callers in MapView and camera.ts guard against this by checking `cumulDistRef.current.length === 0` (MapView:1008) or `total <= 0` (interpolate:104).
- **Suggested fix:** No fix needed — callers guard against zero totalDist.

## Summary
| Severity | Count |
|----------|-------|
| HIGH | 0 |
| MEDIUM | 2 |
| LOW | 3 |
| **Total** | **5** |
