# Performance Review — Cycle 1 (2026-04-23)

## Summary
Performance concerns center on large file parsing, map rendering during animation, video export frame loop, and memory management.

---

## Finding 1: Video export frame loop uses sequential `waitForIdle` — potentially very slow
- **File**: `src/lib/videoEncoder.ts` lines 93-133
- **Severity**: Medium | **Confidence**: High
- **Description**: Each frame waits for map idle (up to 5 seconds). For 30s at 30fps (900 frames), even at 50ms/frame this takes 45 seconds. The 5-second timeout is a safety valve but could cause very long exports.
- **Fix**: Reduce `WAIT_FOR_IDLE_TIMEOUT_MS` for the export case (e.g., 2000ms), or use a progressive approach where frames with missing tiles are captured anyway.

---

## Finding 2: `parseGoogleLocationHistory` dedup/sort is O(n log n) for large files
- **File**: `src/lib/parser.ts` lines 393-429
- **Severity**: Medium | **Confidence**: High
- **Description**: For very large Google Location History files (100MB+), the dedup step creates a Set of string keys and sorts all unique points. For millions of points, this uses significant memory and CPU.
- **Fix**: Consider using a Web Worker for the entire parse+dedup+sort pipeline, or a more memory-efficient dedup strategy.

---

## Finding 3: MapView re-renders on every progress change during playback
- **File**: `src/components/MapView.tsx` lines 822-936
- **Severity**: Medium | **Confidence**: High
- **Description**: During playback, `progress` changes every ~16ms, triggering this effect. Each execution calls `interpolateAlongTrack`, updates trail source data, and potentially calls `map.jumpTo`. The `shouldApplyCamera` guard helps skip unnecessary calls, but the effect still runs every frame.
- **Fix**: Consider using `requestAnimationFrame` directly in MapView instead of relying on React's render cycle.

---

## Finding 4: `buildTrackGeometry` called on every progress update
- **File**: `src/components/MapView.tsx` line 847-850
- **Severity**: Medium | **Confidence**: High
- **Description**: During playback, `buildTrackGeometry` is called every frame to update the trail. For large tracks (10,000+ points), this is a per-frame O(n) operation.
- **Fix**: Optimize by only recomputing the trail segment that changed, rather than rebuilding the entire trail geometry.

---

## Finding 5: No unmount guard in usePlaybackController
- **File**: `src/lib/usePlaybackController.ts` lines 79-110
- **Severity**: Low | **Confidence**: High
- **Description**: If the component unmounts between `setPlaybackProgress` and the next `requestAnimationFrame` callback, the state update could be applied to an unmounted component.
- **Fix**: Add a mounted ref guard similar to `useExportController`.

---

## Finding 6: i18n translations object is ~1700 lines bundled inline
- **File**: `src/lib/i18n.ts`
- **Severity**: Low | **Confidence**: High
- **Description**: All 5 locales bundled into the main JS chunk. For a static-export site this is less critical.
- **Fix**: Consider code-splitting translations by locale. Low priority.

---

## Final Sweep
- No memory leaks found beyond the noted missing unmount guard.
- Web Worker usage for JSON parsing is a positive pattern.
- `preserveDrawingBuffer: true` has a known performance cost but is necessary for video export.
