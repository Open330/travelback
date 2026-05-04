# Debugger Review — Travelback (2026-05-04, Cycle 2)

## Summary

New debugging focus on the export pipeline since cycle 1 changes introduced `isExporting` gating, `renderFrameAndWait`, and `resetSize` improvements. The main finding is a progress restoration bug on successful export.

## Findings

### C2-DB-01. Export progress restored to pre-export value on success — MEDIUM risk, HIGH confidence
**File**: `src/lib/useExportController.ts:254,306-307`
**Issue**: The `finally` block at lines 306-307 unconditionally sets `setPlaybackProgress(preExportProgress)` and `setIsExporting(false)`. On success, `setPlaybackProgress(1)` at line 254 is immediately overwritten by the finally block. The user sees the progress jump back after export completes.
**Concrete scenario**: User has playback at 0.5, starts export. Export succeeds. Progress jumps from 1 (set in try) back to 0.5 (set in finally).
**Fix**: Only restore preExportProgress when export was aborted or failed. Check exportState before restoring.

### C2-DB-02. `renderFrameAndWait` identical-state fast path uses imprecise rounding — LOW risk, MEDIUM confidence
**File**: `src/components/MapView.tsx:597-617`
**Issue**: The fast path compares current and target camera states using `Math.round(center.lng * 1e6) / 1e6` (6 decimal places). Differences smaller than ~0.000001 degrees (~0.11m) are treated as identical. Acceptable for video export.
**Suggestion**: No change needed.

### C2-DB-03. `waitForIdle` timeout of 5 seconds could produce blank frames — LOW risk, LOW confidence
**File**: `src/components/MapView.tsx:741`
**Issue**: If tiles haven't loaded after 5 seconds, `waitForIdle` returns `false`. The export controller tracks consecutive timeouts and aborts after 2 (10 seconds total). Reasonable safety valve.
**Suggestion**: No change needed.

### C2-DB-04. `resetSize` try/catch correctly handles destroyed map — PASS
**File**: `src/components/MapView.tsx:685-702`
**Issue**: Container styles cleared unconditionally before try/catch. Even if `map.resize()` throws, container is restored. Correct.
**Suggestion**: No change needed.
