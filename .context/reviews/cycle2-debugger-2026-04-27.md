# Debugger — Cycle 2 (2026-04-27)

## Re-evaluation of carried findings

| Prior | Status | Notes |
|-------|--------|-------|
| N06 (renderFrameAndWait deadlock) | RESOLVED | 5-second timeout + identical-state fast path. |
| N15 (worker crash fallback 16MB) | PARTIALLY RESOLVED | Error message now suggests "smaller date range or different browser" (parser.ts:668-669). The 16MB fallback limit is unchanged. |
| N16 (export resized map) | RESOLVED | `resetSize` clears container styles first, wraps `map.resize()` in try/catch. |

## New findings

### DBG2-01 — `renderFrameAndWait` rounding comparison could miss near-identical states that MapLibre considers identical

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:526-545`
- **Detail:** The comparison rounds coordinates to 6 decimal places and zoom to 3. If the camera moves by less than the rounding threshold (e.g., 0.0000001 degrees), the comparison considers the state identical and resolves immediately without calling `jumpTo`. This means the frame is captured with the old camera position. The 5-second timeout would not fire because the promise is already resolved.
- **Impact:** For export, this could produce a frame with a very slightly wrong camera position. The visual difference is negligible (sub-pixel at typical zoom levels). The alternative — always calling `jumpTo` and waiting for render — would reintroduce the deadlock risk for truly identical states.
- **Verdict:** Acceptable trade-off. The rounding is tight enough that visual artifacts are undetectable.

### DBG2-02 — `waitForIdle` in export cleanup can reject with AbortError if the signal is already aborted

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:230-235`
- **Detail:** The cleanup code checks `if (!abortController.signal.aborted && mapViewRef.current)` before calling `waitForIdle(abortController.signal)`. If the signal becomes aborted between the check and the `waitForIdle` call, the `waitForIdle` would reject with `AbortError`. The outer catch block (line 233) catches this, so it's handled.
- **Impact:** None — the catch block handles the race.

### DBG2-03 — `precomputedSegmentsRef` is not cleared when track is set to null

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:933-939`
- **Detail:** When `track` is null, `cumulDistRef.current = []` (line 939) and `precomputedSegmentsRef.current = []` (line 940) are both cleared. This is correct.
- **Verdict:** NOT A BUG. The prior review cycle may have flagged this; it's now handled correctly.

## Summary

- Carried forward: 3 findings evaluated (2 resolved, 1 partially resolved)
- New findings: 3 (all LOW)
