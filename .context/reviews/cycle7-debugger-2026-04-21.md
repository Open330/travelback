# Debugger -- Cycle 7 (2026-04-21)

## Methodology

Systematic search for latent bugs, failure modes, and regression risks. Focused on edge cases, null guards, and error paths.

## Bug Surface Analysis

### Checked Edge Cases

1. **Empty track after trim**: page.tsx:167-168 guards `slicedPoints.length < 2` -> returns early. Correct.

2. **Track with all identical points**: buildFitBounds (MapView.tsx:197-205) handles degenerate bounds by expanding 0.01 degrees. interpolateAlongTrack (interpolate.ts:82-93) handles `total <= 0` by returning the first point. Both correct.

3. **Export with zero scenes**: useExportController.ts:100-104 falls back to `scenes.length > 0 ? scenes : generateDefaultScenes()`. Correct.

4. **Map error during export**: MapView's `waitForIdle` has a 5-second timeout (WAIT_FOR_IDLE_TIMEOUT_MS). If the map errors during export, the `onMapError` handler sets `mapError` state, but the export loop continues attempting frames. The `signal.aborted` check is the only exit from the frame loop. If the map is in an error state, `waitForIdle` will keep timing out until `consecutiveIdleTimeouts >= 2` throws.

**Finding:** This is already handled by the consecutive idle timeout guard in useExportController.ts:119-131. After 2 consecutive idle timeouts, the export throws and the error path cleans up. Correct.

5. **Double-click on timeline during drag**: TimelineSelector uses `rafRef` for throttling drag updates and `dragState.current` for tracking drag state. If the user double-clicks, the second click would see `dragging: null` and start a new drag. The `endDrag` callback from the first drag would resolve indexes and call `onRangeChange`. The second drag would then start fresh. No data corruption risk, but the second click could cause a brief visual glitch.

6. **Race condition: rapid track loading**: If the user uploads two files in quick succession, `loadTrackIntoSession` is called twice. The first call sets `fullTrack` and `track`, the second call calls `resetTrackWorkspace` + `clearTrackArtifacts` + resets playback. Since React batches state updates, the final state should be consistent with the second file. The `trackSessionKey` increment ensures TimelineSelector remounts. No race condition risk.

## New Findings

### C7-DB-1: SceneEditor deletedScene undo timer can fire after unmount [LOW/MEDIUM]

**File:** src/components/SceneEditor.tsx:276-282
**Confidence:** MEDIUM

(This is the same finding as C7-CR-3 from the code reviewer. The `setTimeout` in the `deletedScene` effect is cleaned up when the effect re-runs or when `deletedScene` changes, but not on component unmount. If the component unmounts while the timer is active, the callback will fire and attempt to set state on an unmounted component.)

**Fix:** Return a cleanup function from the effect that clears the timer, or use a `mountedRef` guard.

## Summary

No HIGH or MEDIUM severity latent bugs found. The codebase has robust edge-case handling and proper null guards throughout.
