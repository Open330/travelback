# Verifier — Cycle 6 (2026-04-27)

## Files reviewed
All source files. Focus: evidence-based correctness check against stated behavior.

## Findings

### V6-01 — Exported video does not match live playback: trail and marker are static (CONFIRMED BUG)

- **Severity:** HIGH
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:997-1004`, `src/lib/useExportController.ts:186-193`
- **Verification method:** Code trace of the export path.
  1. `exportTrack` in useExportController calls `exportVideo` with a `renderFrame` callback.
  2. The callback calls `mapHandle.renderFrameAndWait(cameraState, signal)` which calls `map.jumpTo()` and waits for a render event.
  3. The callback also calls `setPlaybackProgress(nextProgress)` (throttled).
  4. In MapView, the `progress` prop changes, triggering the progress effect.
  5. The progress effect has `if (isExporting) return` at line 1001, so it exits immediately.
  6. Trail source and marker position are NOT updated.
- **Expected behavior:** Exported video should match the live playback visual experience.
- **Actual behavior:** Exported video shows a moving camera with a static trail and marker.
- **Verdict:** CONFIRMED BUG. The `isExporting` guard is too broad — it should only skip React-driven camera updates (which are handled by `renderFrameAndWait`), not trail/marker updates (which are NOT handled by `renderFrameAndWait`).

### V6-02 — Failed export shows 'done' state with no video: `hadExistingExport` is stale (CONFIRMED)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:121, 131, 233`
- **Verification method:** Code trace of the error path.
  1. Line 121: `hadExistingExport` = true (previous video exists).
  2. Line 131: `revokeExportedVideoUrl()` clears the URL, blob, and filename.
  3. Export fails at some point.
  4. Line 233: `setExportState(hadExistingExport ? 'done' : 'idle')` = 'done'.
  5. UI renders the 'done' state, but `exportedVideoUrl` is null, `exportedVideoBlob` is null.
  6. The video preview area is empty and the download link points to a revoked URL.
- **Expected behavior:** Failed export should show 'idle' state since there is no video.
- **Actual behavior:** Shows 'done' with no video content.
- **Verdict:** CONFIRMED BUG.

### V6-03 — Camera gap transition bearing snap (CONFIRMED)

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/lib/camera.ts:393-407`
- **Verification method:** Code trace of gap handling.
  1. When progress is after the last scene and before track end, `nextIdx === -1` and `prevIdx >= 0`.
  2. Code falls to `computeDefaultFollowCamera(track, cumulDist, globalProgress)` at line 402.
  3. This returns a camera with bearing computed from the current track segment.
  4. No lerp from the previous scene's end state.
- **Expected behavior:** Smooth transition from the last scene's end state to the follow camera.
- **Actual behavior:** Instant bearing jump.
- **Verdict:** CONFIRMED (medium — only affects tracks with scene gaps at the end).
