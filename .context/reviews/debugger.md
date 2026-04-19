# Prompt 1 latent-bug review

**Scope reviewed:** `.context/**`, `package.json`, root configs, `src/**`, `scripts/**`, `e2e/**`, `public/**`

## Findings

### 1) Export cancellation still waits on a non-abortable cleanup path
- **File/region:** `src/lib/useExportController.ts:158-170`
- **Triggering scenario:** Start a video export, then click **Cancel** while the map is still settling or while a frame render is in flight.
- **Why it breaks:** The main export work is aborted correctly, but the `finally` block always does `await mapViewRef.current?.waitForIdle()` without passing the abort signal. That wait can sit for up to the full idle timeout even after cancellation, which leaves the export overlay active and makes cancel feel hung.
- **Suggested fix:** Pass the abort signal through the cleanup wait, or skip the post-reset idle wait entirely when the export was aborted.
- **Confidence:** High
- **Status:** Confirmed

### 2) Export panel can start an unsupported codec before codec support probing finishes
- **File/region:** `src/components/ExportPanel.tsx:92-118, 273-331`
- **Triggering scenario:** Open the export panel and click **Start Export** quickly, before the async codec support check resolves.
- **Why it breaks:** `codecSupport` starts as `null` for all codecs, and `handleExport()` only blocks when `codecSupport[codec] === false`. While support is still unknown, the button remains usable and can launch an export with a codec the browser cannot actually encode, which then fails later and less clearly.
- **Suggested fix:** Disable export until the selected codec’s support state is known, or perform a synchronous final support check in `handleExport()` and reject `null` the same way as `false`.
- **Confidence:** High
- **Status:** Confirmed

### 3) Zero-distance tracks resolve to the wrong interpolation point
- **File/region:** `src/lib/interpolate.ts:55-129`
- **Triggering scenario:** Load a track with 2+ points but no actual movement between them, or a path made entirely of repeated coordinates.
- **Why it breaks:** When every cumulative distance is `0`, the binary search in `interpolateAlongTrack()` returns a later index instead of the first point. Playback and export then begin from the second point in the sequence rather than the track origin, so the marker/camera can jump to the wrong spot on the very first frame.
- **Suggested fix:** Special-case `total <= 0` and return the first point (or otherwise force the lower bound to index `0`) before the binary search path.
- **Confidence:** High
- **Status:** Confirmed

### 4) Theme toggle assumes modern `MediaQueryList` APIs without a fallback
- **File/region:** `src/components/ThemeToggle.tsx:7-19, 34-47`
- **Triggering scenario:** Open the app in a legacy browser or embedded WebView that supports `matchMedia` but not `MediaQueryList.addEventListener/removeEventListener`.
- **Why it breaks:** The component calls `window.matchMedia('(prefers-color-scheme: dark)')` unguarded in the initializer and then unconditionally registers `mql.addEventListener('change', ...)`. Older browser engines can throw here, which can break the toolbar or the whole page during mount.
- **Suggested fix:** Feature-detect the listener API and fall back to `addListener/removeListener`, and guard the `matchMedia` call the same way the bootstrap script already does.
- **Confidence:** Medium
- **Status:** Risk

### 5) Timeline drag updates can outlive the component because the pending RAF is never cancelled
- **File/region:** `src/components/TimelineSelector.tsx:155-184, 212-229`
- **Triggering scenario:** Drag the timeline handles, then immediately close the track/session or unmount the component before the next animation frame flushes.
- **Why it breaks:** `applyDrag()` schedules updates with `requestAnimationFrame`, but neither the effect cleanup nor `endDrag()` cancels a pending frame. If the component unmounts while a frame is queued, the callback can still run and call `setStartRatio` / `setEndRatio` after teardown.
- **Suggested fix:** Store the RAF id in a ref, cancel it in `endDrag()` and in the effect cleanup, and clear the ref when the drag finishes.
- **Confidence:** Medium
- **Status:** Likely

## Final sweep

The last remaining risk cluster is not in the obvious happy path; it is in **transitions**:

- export aborts still have a delayed cleanup wait,
- export codec support is checked asynchronously but the action is not gated,
- interpolation has a degenerate zero-distance edge case,
- theme wiring assumes modern browser APIs,
- timeline dragging leaves a queued frame behind on teardown.

Those are the places most likely to surface as “it works most of the time, but not when the user does X fast / on Y browser / with a degenerate file.”
