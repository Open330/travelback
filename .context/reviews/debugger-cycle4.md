# Debugger -- Cycle 4 (2026-04-21)

## Summary
Investigated potential failure modes and edge cases. Found 2 new issues.

## Findings

### D4-001: Export progress can exceed 100% due to floating-point rounding [LOW]
- **File:** `src/lib/videoEncoder.ts` line 98
- **Issue:** `const progress = frame / (totalFrames - 1)` computes a 0-1 progress value. With `totalFrames = Math.max(2, Math.ceil(safeDuration * safeFps))`, the division by `totalFrames - 1` ensures the last frame has progress = 1.0 exactly. However, floating-point rounding in `frame / (totalFrames - 1)` for intermediate frames could produce values very slightly > 1.0 or < 0.0 in edge cases.
- **Impact:** Negligible. The `onProgress` callback in ExportPanel just displays `Math.round(exportProgress * 100)`, which rounds to the nearest integer. Even a slight overshoot would round to 100%.

### D4-002: Map resize during export could leave incorrect canvas size [MEDIUM]
- **File:** `src/lib/useExportController.ts` lines 112, 177-187
- **Issue:** `mapHandle.resize(config.resolution.width, config.resolution.height)` is called at the start of export. If the export is aborted or fails, `resetSize()` is called in the `finally` block. But if `resetSize()` throws (e.g., the map was already removed), the error is caught by the empty catch on line 184. This means the map could be left at the export resolution.
- **Impact:** Medium. If the user cancels an export and the map fails to reset, the map container will be at the export resolution (e.g., 3840x2160 for 4K), causing layout issues. The `resetSize` method is simple (sets container style to empty string and calls `map.resize()`), so failure is unlikely but possible if the map was destroyed during export.

### D4-003: `handleModeChange` does not sync localStorage on error [LOW]
- **File:** `src/app/page.tsx` line 278
- **Issue:** `try { localStorage.setItem('travelback-theme', mode) } catch { /* ignore */ }` silently ignores localStorage write failures. If localStorage is full or blocked (private browsing in some browsers), the theme preference won't persist across reloads, but the user won't be notified.
- **Impact:** Low. This is the expected behavior -- if localStorage is unavailable, the app falls back to system preference on next load. No user-facing error is needed.

## Positive Observations
- The abort flow in the export pipeline is robust with multiple signal checks
- The `mountedRef` pattern in useExportController prevents state updates after unmount
- The `completed` flag in exportVideo prevents writing corrupt MP4 files on abort
- Error boundary wraps the entire app, preventing white-screen crashes
