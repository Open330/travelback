# Cycle 4 Performance Reviewer — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Methodology
Reviewed all source files for performance issues: CPU hot paths, memory allocation patterns, unnecessary recomputation, and UI responsiveness concerns.

## Findings

### C4-PR01 — `buildReferenceGridData` recomputes on every `track` reference change
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:478`
- **Detail:** `const referenceGridData = useMemo(() => buildReferenceGridData(track), [track])` — this is keyed on the `track` object reference. Every time `track` is set (including after trim operations that create a new object), the grid is recomputed. The grid depends only on the bounding box of the track points, so if the points haven't changed (e.g., only scene state changed), the grid is unnecessarily rebuilt. However, since `track` objects are typically replaced when points change, this is mostly correct.
- **Suggested fix:** Key the memo on `track?.points` and `track?.segmentStartIndices` instead of `track`, matching the pattern used in `page.tsx` for `cumulativeDistances`.

### C4-PR02 — Trail update constructs `GeoJSON.Feature` wrapper object every frame
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:1070-1074`
- **Detail:** Each animation frame creates a new `{ type: 'Feature', properties: {}, geometry: trailGeometry }` object. The `properties` object is always empty. While GC pressure from small short-lived objects is manageable in modern engines, this creates consistent allocation pressure during playback.
- **Suggested fix:** Reuse a pre-allocated Feature object and only update its `geometry` property. Low priority.

### C4-PR03 — `computeCumulativeDistances` is called with O(n) work even when track hasn't changed
- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/app/page.tsx:149-158`
- **Detail:** Two `useMemo` calls compute cumulative distances for `track` and `fullTrack`. The dependency arrays use `track?.points` and `track?.segmentStartIndices`, which is correct. However, the `useExportController` also calls `computeCumulativeDistances` as a fallback (line 157 of `useExportController.ts`), potentially duplicating work during export.
- **Suggested fix:** The fallback in `useExportController` is defensive and only fires when `cumulativeDistancesProp` is empty. Low priority.

### C4-PR04 — Export frame loop awaits `waitForIdle` per frame without concurrency
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:159`
- **Detail:** Each frame awaits `waitForIdle()` sequentially. This is correct for ensuring tile loading, but for tracks with simple styles (local bundled themes), the idle check may resolve immediately most of the time. The 5-second timeout fallback in `waitForIdle` could significantly slow exports if tiles are slow to load.
- **Suggested fix:** Already optimized with the `consecutiveIdleTimeouts` counter (2 consecutive timeouts triggers an error). No further fix needed.

### C4-PR05 — `precomputeWrappedSegments` creates coordinate arrays that duplicate point data
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:116-138`
- **Detail:** `precomputeWrappedSegments` creates new `[lng, lat]` coordinate arrays for every point in every segment. For a track with 250K points, this creates up to 250K two-element arrays. This is necessary for the O(1) trail update optimization but doubles memory for coordinate data.
- **Suggested fix:** This is an intentional trade-off (memory for speed). No fix needed.

### C4-PR06 — `SceneRangeEditor` pointer event listeners on `window` fire during every drag frame
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/SceneEditor.tsx:104-149`
- **Detail:** `pointermove` and `pointerup` are registered on `window` during drag. This is correct for capturing drag outside the element. The `pointermove` handler reads `containerRef.current.getBoundingClientRect().width` on every event, which triggers a layout recalculation. For smooth dragging, this should be cached.
- **Suggested fix:** Cache `getBoundingClientRect().width` at drag start and reuse it during the drag.

## Summary
| Severity | Count |
|----------|-------|
| HIGH | 0 |
| MEDIUM | 2 |
| LOW | 4 |
| **Total** | **6** |
