# Tracer — Cycle 1 (2026-04-27)

Reviewer: tracer
Repository: `/Users/hletrd/flash-shared/Travelback`
Scope: Full codebase including uncommitted changes, causal tracing of suspicious flows

## Flow Traces

### T-01 — File Upload to Track State (with uncommitted parser changes)

**Path:** FileUpload.onChange -> parseTrackFile -> parseGPX/parseKML/parseGoogleLocationHistory -> finalizeTrack -> onTrackLoaded -> loadTrackIntoSession -> setTrack

**Suspicion:** What if `assertPointBudget` (newly added in uncommitted diff) throws during segment accumulation?
**Analysis:** In `parseGPX` (line 222, uncommitted), `assertPointBudget(acc.points, segment.length)` is now called before `acc.points.push(...segment)`. If this throws, the error propagates up through `parseGPX` -> `parseTrackFile` -> `FileUpload` -> `addToast`. The track is never partially loaded because the exception prevents `finalizeTrack` from being called. In `extractPointsFromGeoJSON` (line 74, uncommitted), the same pattern applies: `assertPointBudget(points, nextPoints.length)` before `points.push(...nextPoints)`.
**Verdict:** Correct. Point budget is enforced before data is accumulated, preventing partial tracks.

### T-02 — Export with new `renderFrameAndWait` (uncommitted)

**Path:** useExportController.exportTrack -> exportVideo (frame loop) -> renderFrame callback -> mapHandle.renderFrameAndWait -> map.once('render') -> requestAnimationFrame -> resolve

**Suspicion:** What if `renderFrameAndWait` is called but the map has no visible tiles to render (local style, fully loaded)?
**Analysis:** MapLibre fires the `render` event after any camera mutation triggers a repaint, even for local styles with no tile sources. The `map.jumpTo()` at line 491 triggers a repaint cycle. The `map.once('render', onRender)` listener catches this. The extra `requestAnimationFrame` at line 502 provides an additional safety buffer for WebGL canvas painting.
**Verdict:** Correct for local styles. The `render` event fires reliably after camera changes.

**Suspicion:** What if the abort signal fires between `map.jumpTo` and `map.once('render')`?
**Analysis:** The abort listener (`onAbort`) is attached via `signal?.addEventListener('abort', onAbort, { once: true })` before the render listener. If abort fires after `jumpTo` but before `render`, `onAbort` removes the render listener and rejects. The camera state is already applied but no frame is captured. The export controller's catch block handles `AbortError` gracefully.
**Verdict:** Correct. Abort during camera mutation is safe.

### T-03 — Journey Creator degenerate LineString guard (uncommitted)

**Path:** JourneyCreator.updateMapData -> buildLineGeoJSON -> lineSrc.setData

**Suspicion:** What happens when waypoints.length is 0 or 1?
**Analysis:** The uncommitted guard in `buildLineGeoJSON` (line 81-91) returns an empty-coordinates LineString when `waypoints.length < 2`. The `updateMapData` function (line 210-211) also has a guard: `if (lineSrc && waypointsRef.current.length >= 2)`. So for 0-1 waypoints, `buildLineGeoJSON` returns empty coordinates but `updateMapData` does not call `lineSrc.setData`. The initial layer creation at line 221-223 uses `buildLineGeoJSON([], ...)` which also returns empty coordinates.
**Verdict:** Correct. Empty LineString is never sent to MapLibre for 0-1 waypoints. The guard is redundant but harmless.

### T-04 — Timeline end-handle mapping (uncommitted fix for F10)

**Path:** TimelineSelector.drag-end -> commitRatios -> resolveIndexesForRatios -> ratioToIndex -> onRangeChange

**Suspicion:** Does the simplified `ratioToIndex` return value cause under-selection on sparse tracks?
**Analysis:** The old code was: `return edge === 'end' && (cumulDist[hi] ?? targetDist) <= targetDist ? hi : lo`. This returned `hi` for end edge only when `cumulDist[hi] <= targetDist`. The new code is: `return edge === 'end' ? hi : lo`. This always returns `hi` for end edge. Since `hi` is the first index where `cumulDist[hi] > targetDist`, and `lo` is the last index where `cumulDist[lo] <= targetDist`, returning `hi` for end means we include the first point at or after the target distance. This is the correct behavior for the end handle — it includes the point nearest to the target, preventing under-selection.
**Verdict:** Correct. The simplified logic properly includes the boundary point for the end handle.

### T-05 — Bootstrap rewrite guard in harden-static-export.mjs (uncommitted)

**Path:** npm run build -> harden-static-export.mjs -> inlineTravelbackBootstrap

**Suspicion:** What if the bootstrap payload exists but the regex does not match?
**Analysis:** The uncommitted guard adds `hasBootstrap` detection before the replace and `replaced` tracking during the replace. If `travelback-bootstrap` text is found in the HTML (via `/travelback-bootstrap/.test(html)`) but the regex `nextScriptPattern` does not match, the function throws: `'travelback-bootstrap payload found in HTML but regex did not match — Next.js output shape may have changed'`. This prevents the CSP hardening from silently passing while the bootstrap remains in non-executing form.
**Verdict:** Correct. The guard catches the case where Next.js changes its serialization format.

### T-06 — Export throttle skips React state updates at ~10Hz

**Path:** useExportController.exportTrack -> exportVideo frame loop -> renderFrame callback -> setPlaybackProgress (throttled)

**Suspicion:** Can the throttle cause the progress bar to show stale values?
**Analysis:** The throttle `nextProgress - exportProgressRef.current >= 0.02` means visible progress updates happen at ~2% increments. At the end of export, `setPlaybackProgress(1)` is called unconditionally (line 208), so the progress bar always reaches 100%. During export, the bar updates ~10 times per second (at 60fps, every 6 frames = 10Hz). This is sufficient for user perception of progress. The `exportProgress` state (separate from `playbackProgress`) updates on every frame for the progress bar in the export panel.
**Verdict:** Correct. The throttle reduces React churn without sacrificing perceived progress feedback.

## Summary

All traced flows (including uncommitted changes) are correct with proper guards. No causal bugs found.

| Flow | Verdict |
|------|---------|
| T-01: Parser point budget | PASS |
| T-02: Export renderFrameAndWait | PASS |
| T-03: Degenerate LineString guard | PASS |
| T-04: Timeline end-handle | PASS |
| T-05: Bootstrap rewrite guard | PASS |
| T-06: Export throttle | PASS |
