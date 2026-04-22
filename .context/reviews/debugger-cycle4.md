# Debugger -- Cycle 4 (2026-04-23)

## Summary
Investigated failure modes and edge cases. Confirmed cycle 3 fixes. Found 2 new issues, both MEDIUM or below. The map resize fallback added in a prior cycle adequately handles the export abort case.

## Findings

### D4-F1: Map resize during export abort already has fallback [MEDIUM / MITIGATED]
- **File:** `src/lib/useExportController.ts` lines 175-191
- **Issue:** If `resetSize()` throws during export cleanup, the code falls back to directly clearing the container's inline styles. This is a good defense-in-depth measure. However, if the map itself was destroyed during export (e.g., user navigated away), the `mapViewRef.current?.waitForIdle()` call on line 198 could also throw. The empty catch on line 200 handles this, but the error is silently swallowed.
- **Status:** Already mitigated. The fallback DOM reset ensures the layout recovers. The `waitForIdle` catch is appropriate since the export is already done.

### D4-F2: FileUpload concurrent parse race condition [MEDIUM / HIGH]
- **File:** `src/components/FileUpload.tsx` line 77-90
- **Issue:** Same as C4-F1. `handleDrop` does not guard against concurrent invocations. Two files dropped in quick succession will race: the second `setLoading(false)` from the finally block will clear the loading state while the first parse is still running. Additionally, `onTrackLoaded` will be called twice, with the second call overwriting the first.
- **Fix:** Add a `loading` guard in `handleDrop` (and `handleFileInput` if applicable).

## Positive Observations
- The abort flow in the export pipeline is robust with multiple signal checks
- The `mountedRef` pattern prevents state updates after unmount
- The `completed` flag prevents writing corrupt MP4 files on abort
- Export cleanup has good fallback behavior for resetSize failures
