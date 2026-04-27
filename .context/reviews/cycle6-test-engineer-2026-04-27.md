# Test Engineer — Cycle 6 (2026-04-27)

## Files reviewed
`src/lib/parser.test.ts`, `src/lib/camera.test.ts`, `src/lib/interpolate.test.ts`, `src/lib/videoEncoder.test.ts`, `src/lib/env.test.ts`, `e2e/travelback.spec.ts`, `vitest.config.ts`, `playwright.config.ts`

## Findings

### TE6-01 — No test for export trail/marker visual correctness during export

- **Severity:** HIGH
- **Confidence:** High
- **Files:** `e2e/travelback.spec.ts`, `src/components/MapView.tsx:997-1004`
- The export E2E test (which uses a stub) does not verify that the trail and marker are updated during export frames. The stub test (line 170-181 in useExportController) just resolves immediately with a test buffer. The real export test would need to verify that the MapView visual state (trail, marker) is correct for each frame.
- **Failure scenario:** The trail/marker freeze bug (C6-CR-01) is not caught by any test because no test verifies visual correctness during export.
- **Suggested fix:** Add a unit test for `renderFrameAndWait` (or its successor) that verifies trail source data and marker position are updated for each frame. Add an E2E test that captures a single export frame and verifies the trail/marker state.

### TE6-02 — `computeCameraForProgress` still missing unit tests for gap interpolation and scene transitions

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/camera.test.ts`, `src/lib/camera.ts:350-436`
- CF5-05 identified that `computeCameraForProgress` lacks unit tests. The current `camera.test.ts` covers basic normalization and single-scene cases but not: (a) gap interpolation between scenes, (b) transition blending at scene boundaries, (c) before-first-scene handling, (d) after-last-scene gap handling (the bearing snap issue in V6-03).
- **Failure scenario:** A code change breaks gap interpolation or transition blending. No test catches it.
- **Suggested fix:** Add tests for: two-scene transition, gap between scenes, before-first-scene, after-last-scene, zero-duration scene, overlapping scenes.

### TE6-03 — No test for `hadExistingExport` stale state after failed export

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:121, 131, 233`
- There are no unit tests for `useExportController`. The bug where a failed export shows 'done' state with no video (C6-CR-02) is not caught by any test.
- **Suggested fix:** Add unit tests for useExportController covering: successful export, failed export with previous video, failed export without previous video, cancel during export.

### TE6-04 — Worker message validation not tested

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.ts:643-673`
- The worker `onmessage` handler has no tests for malformed worker responses (missing both `track` and `error`, wrong data types, etc.).
- **Suggested fix:** Add tests simulating various worker message shapes.
