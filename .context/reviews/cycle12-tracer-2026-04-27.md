# Cycle 12 Tracer Review — 2026-04-27

Reviewer: tracer
Scope: Causal tracing of suspicious flows, competing hypotheses

## Traces

### T12-01 — Export download path after async export

**Flow:** User clicks "Start Export" -> `handleExport` -> `exportTrack` (async, takes seconds to minutes) -> `downloadVideo` -> `navigator.userActivation.isActive` check

**Hypothesis:** `isActive` is `false` after export completes, causing save dialog to be skipped.

**Trace result: CONFIRMED.** The User Activation API's `isActive` property becomes `false` within a few seconds of the user's last interaction. By the time the export completes (typically 10-60 seconds), `isActive` is guaranteed to be `false`. The `hasUserActivation` guard at `videoEncoder.ts:206` evaluates to `false`, and the code skips the `showSaveFilePicker` branch entirely, falling through to the `<a>` download fallback.

**Impact:** Users lose the ability to choose save location after investing time in an export. This is a UX regression.

**Suggested fix:** Remove the `hasUserActivation` guard. Always attempt `showSaveFilePicker`; let the browser's own user-activation enforcement handle rejection, and catch the resulting error as the fallback.

### T12-02 — Scene range normalization during trim

**Flow:** User drags timeline handles -> `handleRangeChange` -> checks `scenes.length > 0` -> if scenes exist, sets `pendingTrimRange` -> user confirms -> `confirmTrimClear` clears scenes and applies trim

**Trace result: CORRECT.** The flow correctly preserves scenes during the confirmation dialog and only clears them on explicit user action. The track state is not modified until confirmation, so the map/controls remain consistent with the full track during the dialog.

### T12-03 — Export abort during waitForIdle

**Flow:** `exportVideo` frame loop -> `renderFrame` callback -> `waitForIdle(signal)` -> signal fires between `signal.aborted` check and `waitForIdle` call -> `waitForIdle` throws `AbortError`

**Trace result: CORRECT.** The `AbortError` thrown by `waitForIdle` propagates to the `exportVideo` try/catch, which doesn't catch it (letting it propagate to `useExportController`'s catch block). The catch block at `useExportController.ts:241` correctly handles `DOMException` with `name === 'AbortError'`. The abort flow is clean at every level.

### T12-04 — buildFilteredTrack degenerate fallback

**Flow:** `handleRangeChange` -> checks `slicedPoints.length < 2` -> returns early if true -> `buildFilteredTrack` is never called with < 2 points

**Trace result: CORRECT by current callers.** Both `handleRangeChange` and `confirmTrimClear` check `slicedPoints.length < 2` before calling `buildFilteredTrack`. The fallback code path in `buildFilteredTrack` is dead code in current usage. However, the function's public contract (returning the full track on degenerate input) is misleading and could cause bugs if called from new code.
