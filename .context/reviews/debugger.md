# Debugger Review — Cycle 1 (2026-04-23)

## Summary
Focused on latent bug surface, failure modes, and potential regressions.

---

## Finding 1: Race condition in worker fallback path
- **File**: `src/lib/parser.ts` lines 440-515
- **Severity**: Medium | **Confidence**: Medium
- **Description**: In `parseGoogleLocationHistoryInWorkerBuffer`, if the worker creation fails (line 456), the code falls back to `parseGoogleLocationHistory(textCopy)`. But if the worker creation succeeds and then the worker crashes (`onerror`), the code also falls back to `parseGoogleLocationHistory(textCopy)`. However, if the worker successfully starts but sends a message with `error` set (line 478), the code rejects with a ParseError and does NOT fall back. This means: (1) Worker starts, (2) worker fails to parse, (3) worker reports error, (4) main thread rejects. But (5) the main thread could potentially succeed if it tried the parse itself (since the worker environment might differ). The inconsistency is: some failure paths fall back, others don't.
- **Fix**: Consider consistently either always falling back to main-thread parse on worker failure, or never falling back. The current mixed approach could confuse users who get different results depending on timing.

---

## Finding 2: MapView map initialization effect depends on `mapStyleKey` from closure but not in deps
- **File**: `src/components/MapView.tsx` lines 547-647
- **Severity**: Low | **Confidence**: High
- **Description**: The map initialization `useEffect` (with `[]` deps) captures `mapStyleKey` from the closure but only uses it once (to set the initial style). The eslint-disable comment acknowledges this. If `mapStyleKey` changes before the map is fully initialized, the initial style could be stale. The separate `useEffect` for style changes (lines 650-671) handles this correctly by checking `styleKeyRef.current === mapStyleKey`.
- **Fix**: No action needed — the separate style change effect handles this correctly.

---

## Finding 3: Export cleanup may fail silently
- **File**: `src/lib/useExportController.ts` lines 176-205
- **Severity**: Low | **Confidence**: High
- **Description**: In the `finally` block, `mapViewRef.current?.resetSize()` is called. If this fails (e.g., map destroyed during export), the code falls back to a DOM query for `[data-testid="map-container"]` and resets inline styles. This fallback is correct but doesn't call `map.resize()`, which means the map might not properly recalculate its viewport. The subsequent `waitForIdle` call (line 197) would also fail if the map is destroyed.
- **Fix**: Add a guard to check if the map still exists before calling `waitForIdle` in the finally block.

---

## Finding 4: Playback progress can exceed 1.0 briefly due to rAF timing
- **File**: `src/lib/usePlaybackController.ts` lines 90-98
- **Severity**: Low | **Confidence**: High
- **Description**: The `animate` callback computes `nextProgress = startProgressRef.current + (elapsedSec * speedRef.current) / durationRef.current`. If the user changes speed or duration while playing, the refs update immediately but `startTimestampRef` and `startProgressRef` are only set when the effect re-runs (on `isPlaying` change). Between the ref update and the effect re-run, `nextProgress` could temporarily exceed 1.0 before the `if (nextProgress >= 1)` guard catches it.
- **Fix**: This is already handled by the `if (nextProgress >= 1)` guard and `setPlaybackProgress(1)`. No action needed.

---

## Finding 5: JourneyCreator map event listeners leak on rapid isActive toggles
- **File**: `src/components/JourneyCreator.tsx` lines 239-430
- **Severity**: Low | **Confidence**: Medium
- **Description**: The main `useEffect` for JourneyCreator binds map event listeners. If `isActive` toggles rapidly (e.g., due to React batched updates), the cleanup function and the setup function could interleave. The `layersAddedRef` and `cleanupRef` patterns help prevent double-binding, but there's a window where the cleanup from the previous effect hasn't run yet when the new effect starts.
- **Fix**: This is a theoretical concern — React guarantees cleanup runs before the next effect. No action needed.

---

## Final Sweep
- All failure modes and error paths traced.
- Race conditions and timing issues assessed.
- Cleanup patterns verified.
- Abort signal propagation checked.
