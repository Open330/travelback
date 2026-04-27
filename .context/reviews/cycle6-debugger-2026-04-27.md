# Debugger — Cycle 6 (2026-04-27)

## Files reviewed
All source files. Focus: latent bug surface, failure modes, regressions.

## Findings

### D6-01 — Export produces video with frozen trail and marker (critical regression)

- **Severity:** HIGH
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:997-1004`, `src/lib/useExportController.ts:186-193`
- **Latent bug mechanism:** The `isExporting` guard at line 1001 prevents the progress effect from running during export. The `renderFrameAndWait` method at line 512 only calls `map.jumpTo()` (camera update). Neither updates the trail source data or marker position.
- **Reproduction path:**
  1. Load a track.
  2. Start playback and let the trail advance partially.
  3. Open export panel and start export.
  4. During export, observe that the camera moves but the trail and marker remain at their pre-export positions.
  5. The exported video shows this same incorrect state.
- **Failure mode:** The exported video looks visually broken — the orange trail doesn't advance and the red marker doesn't move.
- **Suggested fix:** Update trail/marker inside `renderFrameAndWait` (or a dedicated export render method) before capturing the frame.

### D6-02 — Export failure after previous success shows 'done' with empty preview

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:121, 131, 233`
- **Latent bug mechanism:** `hadExistingExport` is captured at export start (line 121) when the video URL exists. Then `revokeExportedVideoUrl()` clears the video (line 131). On failure, `setExportState(hadExistingExport ? 'done' : 'idle')` uses the stale flag (line 233).
- **Reproduction path:**
  1. Export a track successfully. UI shows "done" with a video preview.
  2. Change some export settings (e.g., different resolution).
  3. Start a new export of the same track.
  4. Simulate an export failure (e.g., disconnect network during export).
  5. UI shows "done" but the video preview area is empty.
- **Suggested fix:** After revoking the video, always show 'idle' on failure.

### D6-03 — `resetSize()` in export cleanup can silently fail if map was destroyed

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:238-243`
- The `resetSize()` call in the finally block is wrapped in a try/catch that logs a warning. But if the map was destroyed during export (e.g., component unmounted), `mapRef.current` is null, and `resetSize()` returns early at line 624 without restoring the container dimensions. The container's inline `style.width` and `style.height` were already cleared at line 617-619, so this is not a critical issue. But the `originalSizeRef` is also cleared (line 620), which means a subsequent export won't have the original size to restore.
- **Failure scenario:** Map is destroyed during export. Container dimensions are restored from inline styles (good), but `originalSizeRef` is lost. If a new map is created, it starts with the correct container size.
- **Suggested fix:** This is already handled adequately. No action needed, but document the invariant.
