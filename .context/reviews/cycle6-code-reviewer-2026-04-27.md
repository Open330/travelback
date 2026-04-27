# Code Reviewer — Cycle 6 (2026-04-27)

## Files reviewed
`src/lib/useExportController.ts`, `src/components/MapView.tsx`, `src/app/page.tsx`, `src/lib/parser.ts`, `src/lib/videoEncoder.ts`, `src/types.ts`, `src/components/TimelineSelector.tsx`, `src/components/ExportPanel.tsx`, `src/components/SceneEditor.tsx`, `src/components/JourneyCreator.tsx`, `src/lib/camera.ts`, `src/lib/interpolate.ts`, `src/components/TrackToolbar.tsx`, `src/components/Toast.tsx`, `src/components/ModalDialog.tsx`, `src/lib/usePlaybackController.ts`

## Findings

### C6-CR-01 — Export trail/marker freeze: `isExporting` guard blocks all visual updates during video export

- **Severity:** HIGH
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:997-1004`, `src/components/MapView.tsx:512-589`
- The progress effect in MapView (line 997) has `if (isExporting) return` at the top, which was intended to "avoid redundant state updates and React re-render overhead." However, `renderFrameAndWait` (line 512) only updates the camera via `map.jumpTo()` — it does NOT update the trail source, marker position, or position marker source. The comment on line 999 claims "camera/trail/marker updates are handled by renderFrameAndWait" but this is incorrect.
- **Failure scenario:** User starts export. Camera pans along route. The orange trail and red marker remain frozen at their pre-export positions. The exported video shows a moving camera over a static trail, making flyover/ground/closeup scenes look broken.
- **Suggested fix:** During export, update the trail and marker imperatively inside `renderFrameAndWait` (or a new `applyExportFrame` method) before waiting for the render event. This avoids the React re-render overhead while still producing correct visual output.

### C6-CR-02 — `hadExistingExport` stale after `revokeExportedVideoUrl()`: shows 'done' state with no video

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:121, 131, 233`
- At line 121, `hadExistingExport` captures whether a video URL existed before export. At line 131, `revokeExportedVideoUrl()` clears the URL/blob/filename. But in the catch block (line 233), `setExportState(hadExistingExport ? 'done' : 'idle')` uses the stale flag. Since the video was revoked, showing 'done' state is misleading — there is no video to display or download.
- **Failure scenario:** User exports track A successfully, loads track B, starts export of track B. Export fails. UI shows "done" state but the video preview area is empty and the download button links to a revoked URL. User is confused.
- **Suggested fix:** After `revokeExportedVideoUrl()`, set `hadExistingExport = false` (or just always use `'idle'` on failure since there's no video to show).

### C6-CR-03 — `playbackProgress` in `exportTrack` dependency array causes unnecessary callback churn

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:262`
- `playbackProgress` (which is `progress` from the playback controller, updated at ~60fps during playback) is in the dependency array of `exportTrack` useCallback. This causes `exportTrack` to be recreated on every progress tick. While export pauses playback so this doesn't cause functional bugs, it causes unnecessary re-renders of any component receiving `exportTrack` as a prop.
- **Failure scenario:** During normal playback (no export), the ExportPanel re-renders on every progress tick because its `onExport` prop (`exportTrack`) changes identity.
- **Suggested fix:** Read `playbackProgress` from a ref instead of closing over it. The `preExportProgress` pattern already captures the value at export start.

### C6-CR-04 — `downloadVideo` type casts are unsafe and fragile

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:209-215`
- `showSaveFilePicker` result is cast as `FileSystemWritableFileStream`, but the actual return is `FileSystemFileHandle`. Then `createWritable()` is accessed via another type cast. These casts bypass TypeScript's type checking and will silently break if the File System Access API changes.
- **Failure scenario:** Browser updates the File System Access API return types. The casts still compile but produce runtime errors.
- **Suggested fix:** Use proper type narrowing with the `in` operator or type predicates instead of `as unknown as` chains.

### C6-CR-05 — `renderFrameAndWait` 5-second timeout resolves instead of reporting stale frame

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:577-579`
- When MapLibre never fires a render event within 5 seconds, `renderFrameAndWait` resolves successfully instead of reporting the issue. The comment says "a duplicate frame is acceptable for export; a deadlock is not." But there's no logging or metric for this condition, making it invisible in production.
- **Failure scenario:** Tile server is slow. Export produces a video with several "frozen" duplicate frames that the user perceives as a glitch, with no way to diagnose the cause.
- **Suggested fix:** Log a warning when the timeout fires, and consider exposing a "stale frame" counter to the caller so the export progress UI can warn the user.
