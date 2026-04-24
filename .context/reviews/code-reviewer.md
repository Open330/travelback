## Code Review Summary

**Files Reviewed:** 38
**Total Issues:** 3

### By Severity
- CRITICAL: 0
- HIGH: 0
- MEDIUM: 2
- LOW: 1

### Stage 1: Spec / Behavioral Compliance
The repository is broadly aligned with the documented product shape in `.context/project/01-overview.md` and `.context/project/02-architecture.md`: local-only parsing, local bundled map styles, scene-based playback, export flow, and static-export hardening are all present.

The confirmed gaps below are behavioral defects in current UX/runtime behavior rather than missing top-level features.

### Stage 2: Code Quality / Correctness Findings

[MEDIUM] Confirmation dialogs render as unstyled full-width strips instead of actual modal panels
**Files:** `src/components/SceneEditor.tsx:669-690`, `src/components/JourneyCreator.tsx:817-830`, `src/components/ModalDialog.tsx:74-76`, `src/components/ModalDialog.tsx:165-183`
**Confidence:** High
**Issue:** `ModalDialog` defaults both `overlayClassName` and `panelClassName` to empty strings. Most call sites provide centering/backdrop/panel classes, but the preset-replace confirmation in `SceneEditor` and the discard confirmation in `JourneyCreator` do not. That means these confirmations render inside a bare `fixed inset-0` wrapper with an unstyled dialog node, so they appear as a top-left/full-width strip instead of a centered modal. I confirmed the preset-replace dialog in a browser run: its bounding box was `x=0, y=0, width=1280, height=74`, with parent class `fixed inset-0` and an empty panel class.
**Failure scenario:** A user clicks `Cinematic` after authoring scenes, or tries to cancel a manual journey with points present. The confirmation is visually detached from the rest of the modal system, easy to miss, and does not present the expected backdrop/panel affordance. This is especially risky on mobile where the strip can look like part of the underlying screen rather than a blocking confirmation.
**Fix:** Either give these two call sites explicit `overlayClassName`/`panelClassName` matching the other dialogs, or make `ModalDialog` provide safe default centered/backdrop styles so omitted classes cannot degrade into an effectively broken modal.

[MEDIUM] Seeking or restarting playback at 0% leaves the camera at a stale mid-route position
**File:** `src/components/MapView.tsx:862-942`
**Confidence:** High
**Issue:** Auto-camera updates are gated behind `progress > 0` on line 863. Marker/trail updates still run for `progress === 0`, but the camera branch is skipped entirely and the `else` path only clears `lastCameraStateRef`. After the user has already moved through the route, seeking back to the start or restarting from the end resets playback state without moving the camera back to the route start.
**Failure scenario:** A user scrubs the timeline back to the beginning or presses Play again after reaching 100%. The marker snaps to the start, but the map camera remains where it was last left until progress becomes non-zero again. That produces an incorrect first frame and a visible jump at playback restart.
**Fix:** Treat `progress === 0` as a valid follow-camera state on explicit seeks/restarts, or add a dedicated start-frame camera reset path keyed off `seekNonce`/restart events so the camera snaps to the correct starting state while preserving the initial fit-bounds view on first load.

[LOW] Post-export share/download actions discard the actual generated filename
**Files:** `src/lib/videoEncoder.ts:154-157`, `src/lib/useExportController.ts:167-176`, `src/components/ExportPanel.tsx:149-152`, `src/components/ExportPanel.tsx:237-244`
**Confidence:** High
**Issue:** The encoder generates a sanitized, track-specific filename like `Travelback - <Track Name>.mp4`, and the initial browser save flow uses it. But once export reaches the `done` state, the panel's secondary actions hardcode `travelback.mp4` for both Web Share and the manual download link. The controller does not preserve the generated filename in state.
**Failure scenario:** If the user chooses the post-export `Download MP4` or `Share` action instead of relying on the initial save/download path, every export collapses to the same generic filename. That makes exported files harder to distinguish and inconsistent with the original save prompt.
**Fix:** Store the generated filename alongside `exportedVideoUrl`/`exportedVideoBlob` in `useExportController`, then feed that value into the export-complete UI for both the anchor `download` attribute and the `File` passed to `navigator.share`.

### Verification Notes
- `git diff --name-only`: clean worktree; review performed against current repository state.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed, including `postbuild` CSP hardening.
- `npm run smoke:static`: passed.
- `mcp__omx_code_intel__` diagnostics/search tools were unavailable in this session (`Transport closed`), so repo-wide shell verification was used instead.

### Recommendation
**REQUEST CHANGES**

The repository is in solid shape overall, but the two medium-severity issues are user-visible behavioral defects: one breaks confirmation-modal presentation in two flows, and the other leaves playback restarts/seeks visually inconsistent. The low-severity filename issue should be cleaned up while touching the export-complete path.

### Residual Risks
- I did not rerun the full Playwright suite; the review relied on code inspection plus build/static smoke validation.
- Because the code-intel MCP was unavailable, I used `typecheck`, `lint`, targeted source searches, and direct file inspection instead of `lsp_diagnostics`/`ast_grep`.
