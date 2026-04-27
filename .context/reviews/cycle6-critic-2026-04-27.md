# Critic — Cycle 6 (2026-04-27)

## Files reviewed
All source files and architecture.

## Findings

### CC6-01 — Export visual correctness regression: trail/marker frozen during export (cross-cutting)

- **Severity:** HIGH
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:997-1004`, `src/lib/useExportController.ts:186-193`
- The `isExporting` guard in MapView's progress effect was added to prevent React re-render churn during export. But the export path only updates the camera (via `renderFrameAndWait`), not the trail or marker. The result: exported videos show a moving camera with a frozen trail and marker. This is a product-breaking regression — the export feature produces videos that look wrong.
- **Failure scenario:** User exports a video and shares it. The video shows the camera flying over the route but the orange trail doesn't advance and the red dot doesn't move. The video looks broken compared to the live playback experience.
- **Suggested fix:** Update trail/marker imperatively inside `renderFrameAndWait` (or a new method) before capturing the frame. This preserves the performance intent (avoid React re-renders) while producing correct output.

### CC6-02 — Export error recovery shows misleading 'done' state after video revoked

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:121, 131, 233`
- When export fails, the catch block uses `hadExistingExport` (captured before the video was revoked) to decide between 'done' and 'idle'. Since the video was revoked at the start, 'done' is misleading — there's no video. User sees a "done" state with an empty video preview area.
- **Failure scenario:** Track A exported successfully. Track B export fails. UI shows "done" but no video is visible. User thinks track B export succeeded but the result is missing.
- **Suggested fix:** Always use 'idle' on export failure since the video was revoked. Or set a `videoRevokedInThisExport` flag.

### CC6-03 — Scene camera gap transitions produce jarring bearing jumps

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/lib/camera.ts:393-407`
- When playback is in a gap between the last scene and the end of the track (prevIdx >= 0, nextIdx === -1), the code falls through to `computeDefaultFollowCamera`. This function computes a bearing from the current track segment, which may be wildly different from the previous scene's bearing (e.g., orbit mode rotating at 36 deg/s). The lerp in gap handling is bypassed.
- **Failure scenario:** Scene ends with an orbit at bearing 180deg. Gap starts. Default follow camera jumps to bearing 45deg instantly. User sees a jarring snap.
- **Suggested fix:** When in a gap after the last scene, interpolate from the last scene's end state to the default follow camera over the gap duration.

### CC6-04 — Normalization warnings still confusing after partial fix

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/components/SceneEditor.tsx:268-289`
- The fix for CF5-13 now shows "will be removed" for scenes with start >= end. But the "ranges adjusted" warning still fires on ANY normalization change, even trivial adjustments. The user doesn't know what was adjusted or how to fix it.
- **Failure scenario:** User creates a scene that slightly overlaps the previous one. Normalization shifts it. Warning says "ranges adjusted" but doesn't say which scene or by how much.
- **Suggested fix:** Show specific adjustments: "Scene X start moved from 15% to 20%" instead of a generic "ranges adjusted" message.
