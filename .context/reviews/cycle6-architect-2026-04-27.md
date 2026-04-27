# Architect — Cycle 6 (2026-04-27)

## Files reviewed
All source files. Focus: architectural/design risks, coupling, layering.

## Findings

### A6-01 — Export visual update path crosses React/imperative boundary without a clear contract

- **Severity:** HIGH
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:512-589, 997-1004`, `src/lib/useExportController.ts:186-193`
- The export path relies on `renderFrameAndWait` (imperative, ref-based) for camera updates and the React progress effect (declarative, state-based) for trail/marker updates. The `isExporting` flag was supposed to indicate that the imperative path handles everything, but it only handles the camera. There is no contract or interface that defines what `renderFrameAndWait` is responsible for updating.
- **Failure scenario:** Future developer adds a new visual element (e.g., elevation marker) that's updated in the progress effect. They add `isExporting` checks without realizing the export path doesn't update this element. Another export visual regression.
- **Suggested fix:** Define an explicit `ExportFrameUpdate` contract: `renderFrameAndWait` (or a new `applyExportFrame`) is responsible for updating ALL visual elements (camera, trail, marker, future elements). The React progress effect should be completely bypassed during export. Document this contract in the MapViewHandle interface.

### A6-02 — `useExportController` has too many responsibilities and dependency churn

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts`
- The hook manages: export state, progress tracking, video blob lifecycle, download triggering, abort control, map interaction, and playback state restoration. It has 13 dependency items in its main useCallback. The `playbackProgress` dependency causes the callback to be recreated at 60fps during playback.
- **Failure scenario:** Adding a new export feature (e.g., custom watermarks) requires modifying this already-complex hook, increasing the risk of introducing bugs.
- **Suggested fix:** Split into focused hooks: `useExportLifecycle` (state management), `useVideoBlob` (blob/URL lifecycle), `useExportProgress` (progress tracking). Read mutable values from refs instead of closing over them in the main callback.

### A6-03 — Camera gap transition lacks a defined interpolation strategy

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/lib/camera.ts:374-408`
- The `computeCameraForProgress` function handles gaps between scenes differently depending on position: before-first-scene uses lerp from overview camera, between scenes uses lerp from prev to next, after-last-scene falls through to default follow camera without any transition. There is no unified gap interpolation strategy.
- **Failure scenario:** User creates scenes that cover 0-80% of the track. The 80-100% gap has a jarring camera snap from the last scene's orbit mode to the default follow camera.
- **Suggested fix:** Define a unified gap transition strategy: always lerp from the last scene's end state to the next scene's start state (or to the default follow camera if there is no next scene).
