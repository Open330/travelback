# Document Specialist — Cycle 1 (2026-04-27)

Reviewer: document-specialist
Repository: `/Users/hletrd/flash-shared/Travelback`
Scope: Full codebase including uncommitted changes, focus on documentation accuracy and completeness

## Findings

### DS-01 — README camera mode names now match UI labels (uncommitted fix)

- **Severity:** INFO
- **Confidence:** High
- **Files:** `README.md:48` (uncommitted), `.context/project/02-architecture.md:73-80` (uncommitted)
- **Detail:** The uncommitted diff updates README line 48 from "Overview, Flyover, Orbit, Ground Follow, Closeup, Bird's Eye" to "Overview, Flyover, Spin Around, Street View, Closeup, Bird's Eye", matching the UI labels. The architecture doc table also adds a "UI label" column. This resolves F26 from cycle 2.
- **Suggested fix:** No further action needed for F26. Verify the camera mode table in README.md line 78-83 also matches.

### DS-02 — README import guide label updated (uncommitted fix)

- **Severity:** INFO
- **Confidence:** High
- **Files:** `README.md:64` (uncommitted)
- **Detail:** The uncommitted diff changes "Google Takeout Guide" to "Travel Data Import Guide", matching the actual 7-tab implementation. This resolves F25 from cycle 2.
- **Suggested fix:** No further action needed for F25.

### DS-03 — Export test stub is not documented in README or architecture docs

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:20-29` (undocumented developer feature)
- **Detail:** The `isLocalExportTestStubEnabled()` function checks for a localStorage flag `travelback-export-test-stub=1` that bypasses the entire video encoding pipeline. This is a developer-only feature for E2E testing but is not mentioned in the README, architecture docs, or development conventions. A developer who accidentally enables this flag will see "successful" exports that are 26-byte stubs.
- **Suggested fix:** Add a brief note in the development section of the README or architecture docs explaining the export test stub and how to enable/disable it. Add a console warning when the stub is active.

### DS-04 — Architecture doc does not document the `renderFrameAndWait` export path

- **Severity:** LOW
- **Confidence:** High
- **Files:** `.context/project/02-architecture.md:46-67`
- **Detail:** The "Export Pipeline" section documents: `waitForIdle()` -> capture frame. The uncommitted changes introduce `renderFrameAndWait(cameraState, signal)` as the primary export frame capture method, which uses MapLibre's `render` event + `requestAnimationFrame` instead of `waitForIdle`. The architecture doc should be updated to reflect this new path.
- **Suggested fix:** Update the Export Pipeline section to show: `camera.ts computeCameraForProgress() -> MapView.renderFrameAndWait() -> map.once('render') + rAF -> mediabunny CanvasSource.add()`. Note that `waitForIdle` is still used for initial map settling after resize.

### DS-05 — README architecture section shows outdated component tree

- **Severity:** LOW
- **Confidence:** High
- **Files:** `README.md:111-149`
- **Detail:** The README architecture tree lists some components but omits others (e.g., `GlobalToolbar`, `ErrorBoundary`, `KeyboardHelp`). It also shows `videoEncoder.ts` under `src/lib/` but omits `usePlaybackController.ts` and `useExportController.ts`. The project structure in `.context/project/01-overview.md` is more complete.
- **Suggested fix:** Sync the README architecture tree with the actual source structure, or link to the `.context/project/` documentation for the authoritative tree.

## Summary

| Severity | Count |
|----------|-------|
| INFO     | 2     |
| LOW      | 3     |
| **Total** | **5** |
