# Debugger — Cycle r9 (2026-04-24)

## Latent Bug Surface Analysis

### Failure Mode: Export overlay not dismissed after cancel

**Scenario:** User starts export, presses Escape, export is cancelled but overlay remains visible.

**Analysis:** In `page.tsx:141-155`, the Escape handler calls `cancelExport()`, which aborts the export controller. In `useExportController.ts:80-82`, `cancelExport` calls `exportAbortRef.current?.abort()`. The abort triggers the `catch` block in `exportTrack` (line 165-173), which checks `error instanceof DOMException && error.name === 'AbortError'`, shows a cancellation toast, and sets `exportState` to `'idle'`. In the `finally` block (line 175-207), `setIsExporting(false)` is called, which causes the overlay to unmount (since it's conditionally rendered on `isExporting`). This flow is correct.

### Failure Mode: TimelineSelector range exceeds track bounds after drag

**Scenario:** User drags timeline handles rapidly, causing `onRangeChange` to fire with out-of-bounds indices.

**Analysis:** In `TimelineSelector.tsx:153-161`, `clampRatios` enforces `minGap` between start and end ratios. In `ratioToIndex` (line 25-48), the result is always clamped to `[0, lastIndex]`. The `resolveRangeIndexes` function (line 125-140) further clamps `startIdx` and `endIdx` to valid ranges. This is correct.

### Failure Mode: MapView WebGL context lost during export

**Scenario:** GPU runs out of memory during 4K export, causing WebGL context loss.

**Analysis:** MapView's `onMapError` handler (line 613-618) catches map errors and sets `mapError` state, which shows the error overlay. However, during export, the `useExportController` does not check for map errors. If the WebGL context is lost during export, `waitForIdle` would timeout (after 5 seconds), and the export would fail with "Map did not finish rendering in time for export." The user would see an error toast. This is acceptable behavior — the user can retry.

### Failure Mode: Concurrent state updates during rapid interactions

**Scenario:** User rapidly toggles play/pause, causing stale closure in animation frame.

**Analysis:** `usePlaybackController` uses refs (`isPlayingRef`, `progressRef`, etc.) to avoid stale closure issues in the animation loop (line 34-39). The animation loop checks `isPlayingRef.current` and `mountedRef.current` on each frame. Toggle operations update both the state and the ref atomically (via `setIsPlaying` + the `useEffect` on line 34-39 that syncs refs). This is correct.

### Findings

No new latent bugs found. All analyzed failure modes are handled correctly.

## Summary

- 0 new findings
- 4 failure modes analyzed, all handled correctly
