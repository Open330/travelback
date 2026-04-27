# Debugger — Cycle 1 (2026-04-27)

Reviewer: debugger
Repository: `/Users/hletrd/flash-shared/Travelback`
Scope: Full codebase including uncommitted changes, focus on failure modes and error paths

## Findings

### DBG-01 — Export can leave the map in a resized state if `resetSize` throws and the page is navigated away

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/lib/useExportController.ts:227-235`
- **Detail:** The `finally` block in `exportTrack` calls `mapViewRef.current?.resetSize()`. If this throws (e.g., the map was destroyed during export), the error is caught and logged but the container element may retain its forced width/height inline styles. The user would see a permanently resized map until they reload the page. The `resetSize` method clears `container.style.width` and `container.style.height`, then calls `map.resize()`. If `map.resize()` throws after the container styles are cleared, the map is in a partially-reset state.
- **Suggested fix:** In `resetSize`, clear the container styles first (already done), then wrap `map.resize()` in try/catch. If resize fails, the container is still restored. Alternatively, add a CSS class override that forces the container back to its natural size.

### DBG-02 — Worker crash fallback only works for files under 16MB

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.ts:609`, `src/lib/parser.ts:672-680`
- **Detail:** When the worker crashes (e.g., due to memory pressure), the `onerror` handler falls back to main-thread parsing only if `fallbackBuffer` is not null. `fallbackBuffer` is only created for files under 16MB (`MAIN_THREAD_JSON_FALLBACK_SIZE`). For files between 16MB and 100MB, a worker crash results in a `WORKER_FAILED` error with no recovery. The user sees "Worker parser failed" with no actionable guidance.
- **Suggested fix:** Improve the error message for large-file worker crashes to suggest: (1) the file may be too large for this browser, (2) try a smaller date range, (3) try a different browser. Consider adding a retry mechanism with a smaller chunk.

### DBG-03 — `renderFrameAndWait` can deadlock if MapLibre never fires a `render` event

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:486-517` (uncommitted)
- **Detail:** The new `renderFrameAndWait` method waits for MapLibre's `render` event after a `jumpTo`. If the camera state is identical to the current state (e.g., repeated frame), MapLibre may not repaint and the `render` event may never fire. This would leave the promise pending indefinitely, stalling the export. The `waitForIdle` method has a 5-second timeout for this reason, but `renderFrameAndWait` has no timeout.
- **Suggested fix:** Add a timeout to `renderFrameAndWait` (e.g., 3-5 seconds). If the timeout fires, resolve the promise anyway (the frame may be a duplicate, which is acceptable). Alternatively, check if the camera state is identical to the current map state and resolve immediately.

## Summary

| Severity | Count |
|----------|-------|
| MEDIUM   | 3     |
| **Total** | **3** |
