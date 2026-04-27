# Designer/UI-UX — Cycle 6 (2026-04-27)

## Files reviewed
All component files, `src/styles/vitro-base.css`, `src/app/layout.tsx`.

## Findings

### D6-01 — Export video output does not match live playback experience (visual regression)

- **Severity:** HIGH
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:997-1004`
- The exported video shows a moving camera with a frozen trail and marker, while live playback shows the trail advancing and the marker moving. This creates a jarring mismatch between what the user sees during playback and what they get in the exported video. The export is the primary "save/share" action, so its output must match expectations.
- **Impact:** Users will perceive the export feature as broken. The orange trail (the primary visual indicator of progress along the route) is a key part of the Travelback experience — it MUST advance in the video.
- **Suggested fix:** Ensure trail and marker update during export frames, not just the camera.

### D6-02 — Export progress bar visual feedback during fast exports

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/components/ExportPanel.tsx:296`
- The progress bar uses `transition: 'width .05s linear'` which is very fast. CF5-10 identified that the bar lags behind progress; the current 50ms transition is an improvement but for very fast exports (5 seconds, 30fps = 150 frames in ~5s), the bar may still appear to "jump" rather than smoothly progress.
- **Suggested fix:** Consider removing the transition entirely during active export (only animate the final 100% state).

### D6-03 — Toast positioning does not account for modal dialogs

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/Toast.tsx:69`, `src/styles/vitro-base.css:800-818`
- The toast is positioned at `bottom: 11rem` when a track is loaded, to avoid overlapping playback controls. But when a modal dialog (ExportPanel, SceneEditor preset confirmation, trim confirmation) is open, the toast can overlap the dialog. The modal has `z-index: 30/40` while the toast has `z-index: 50`, so the toast appears on top of the modal.
- **Suggested fix:** Reduce toast z-index to below the modal z-index, or add a `data-modal-open` attribute to adjust toast positioning when a modal is active.
