# Cycle 12 Code Review — 2026-04-27

Reviewer: code-reviewer
Scope: All source files

## Review inventory

All source files examined:
- `src/lib/parser.ts`, `src/lib/parser.test.ts`
- `src/lib/videoEncoder.ts`, `src/lib/videoEncoder.test.ts`
- `src/lib/interpolate.ts`, `src/lib/interpolate.test.ts`
- `src/lib/camera.ts`, `src/lib/camera.test.ts`
- `src/lib/env.ts`, `src/lib/env.test.ts`
- `src/lib/useExportController.ts`, `src/lib/usePlaybackController.ts`
- `src/lib/i18n.ts`, `src/lib/test-stub.ts`
- `src/components/MapView.tsx`, `src/components/TimelineSelector.tsx`
- `src/components/JourneyCreator.tsx`, `src/components/ExportPanel.tsx`
- `src/components/FileUpload.tsx`, `src/components/Controls.tsx`
- `src/components/ElevationProfile.tsx`, `src/components/SceneEditor.tsx`
- `src/components/TrackWorkspace.tsx`, `src/components/ModalDialog.tsx`
- `src/components/Toast.tsx`, `src/components/ErrorBoundary.tsx`
- `src/components/GoogleGuide.tsx`, `src/components/KeyboardHelp.tsx`
- `src/components/GlobalToolbar.tsx`, `src/components/TrackToolbar.tsx`
- `src/components/ThemeToggle.tsx`
- `src/app/page.tsx`, `src/app/layout.tsx`
- `src/types.ts`
- `scripts/harden-static-export.mjs`

## Findings

### C12-CR-01 — `downloadVideo` skips `showSaveFilePicker` after long exports due to stale user activation

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:206-207`
- **Detail:** The `downloadVideo` function checks `navigator.userActivation.isActive` before attempting `showSaveFilePicker`. After a video export that takes more than a few seconds, `isActive` will be `false` because the user's click activation has expired. This causes the code to skip the File System Access API save dialog and fall back to the automatic `<a>` download, which saves to the Downloads folder without letting the user choose a location. After spending minutes rendering a video, users expect a save dialog.
- **Failure scenario:** User exports a 60-second video (takes ~30 seconds). After export completes, the download auto-saves to Downloads instead of showing a save dialog. User cannot choose where to save their video.
- **Suggested fix:** Remove the `hasUserActivation` guard for `showSaveFilePicker`. The API itself will throw if the browser requires user activation, and the existing `catch` block already handles that fallback. Alternatively, save the activation state at export start and restore it, or simply always try `showSaveFilePicker` first and fall back.

### C12-CR-02 — `buildFilteredTrack` returns full track on degenerate slice instead of signaling failure

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:40-55`
- **Detail:** When `slicedPoints.length < 2`, `buildFilteredTrack` returns the original `fullTrack` unchanged. This fallback silently produces an incorrect result — the caller asked for a slice but gets the full track. All current callers check the length before calling, but the function's contract is misleading. A future caller that doesn't pre-check would get wrong data without any error signal.
- **Failure scenario:** A new code path calls `buildFilteredTrack` with a single-point range. Instead of getting an error or null, it receives the full track, leading to incorrect map display.
- **Suggested fix:** Return `null` or throw when the slice is too small, making the caller handle the degenerate case explicitly.

### Verified correct (no longer findings)

- `parseXml` ordering: `preflightXml` is correctly called before `stripXmlEntities` (C11-F01 fix confirmed at `parser.ts:188-198`).
- `JourneyCreator` drag cleanup: All map event listeners (mousemove, mouseup, touchmove, touchend, touchcancel) are properly removed in the cleanup function at lines 440-444 (C11-F02 confirmed as NOT A BUG).
- Export abort flow: `AbortError` is correctly handled at every level (C11-F03 confirmed correct).
- Time-based export throttle: Playback progress uses `performance.now()` with 100ms interval (C10-F04/C11-F04 fix confirmed at `useExportController.ts:207`).
