# Tracer — Travelback (2026-05-04, Cycle 2)

## Summary

Traced the export pipeline end-to-end. The key finding is the progress restoration bug in the export flow.

## Flow: Export Pipeline (re-traced after cycle 1 changes)

### Trace
1. `ExportPanel.onExport` -> `useExportController.exportTrack(config)`
2. `exportTrack` creates AbortController, sets `isExporting=true`, pauses playback
3. Resizes map -> waits for idle -> starts frame loop
4. Each frame: compute camera -> `renderFrameAndWait` -> wait for idle -> capture frame
5. On success: `setPlaybackProgress(1)` (line 254), `setExportState('done')` (line 251)
6. **Finally block**: `setPlaybackProgress(preExportProgress)` (line 307), `setIsExporting(false)` (line 308)

### Finding 1: Progress restoration overwrites success value — MEDIUM risk, HIGH confidence
**File**: `src/lib/useExportController.ts:254,306-307`
**Issue**: Step 5 sets progress to 1, step 6 immediately overwrites it to the pre-export value. This is a confirmed bug.
**Root cause**: The finally block was written to handle abort/cleanup, but it also runs on success, undoing the success path's progress update.

### Finding 2: `isExporting` gating verified — PASS
**File**: `src/components/MapView.tsx:1066-1067`
**Issue**: The progress-driven useEffect returns early when `isExporting` is true. During export, visual updates are handled imperatively by `renderFrameAndWait`. Correct.

### Finding 3: `renderFrameAndWait` trail/marker update verified — PASS
**File**: `src/components/MapView.tsx:569-593`
**Issue**: The imperative trail and marker update inside `renderFrameAndWait` correctly reads from `precomputedSegmentsRef` and `cumulDistRef`. Correct.
