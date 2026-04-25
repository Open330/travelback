# Test Engineering Review Cycle 5

This revision preserves the prior cycle 5 review direction and tightens it against the current repository state after a full repo sweep. No fixes were implemented.

## Scope and Inventory

Reviewed executable and test-bearing surfaces:

- `package.json`
- `playwright.config.ts`
- `playwright.static.config.ts`
- `e2e/travelback.spec.ts`
- `scripts/run-dev-e2e.mjs`
- `scripts/run-static-e2e.mjs`
- `scripts/serve-static.mjs`
- `scripts/smoke-static.mjs`
- `src/lib/parser.ts`
- `src/lib/interpolate.ts`
- `src/lib/camera.ts`
- `src/lib/usePlaybackController.ts`
- `src/lib/useExportController.ts`
- `src/lib/videoEncoder.ts`
- `src/components/FileUpload.tsx`
- `src/components/ModalDialog.tsx`
- `src/components/Toast.tsx`
- `src/components/TimelineSelector.tsx`
- `src/components/SceneEditor.tsx`
- `src/components/MapView.tsx`
- `src/components/ExportPanel.tsx`

Fixture inventory reviewed:

- `e2e/fixtures/*.gpx`
- `e2e/fixtures/*.kml`
- `e2e/fixtures/*.json`

Current test surface summary:

- `package.json:5-17` defines only Playwright and static-smoke lanes; there is no unit/component/hook test harness.
- `e2e/travelback.spec.ts` is the only behavioral test suite.
- `scripts/smoke-static.mjs` verifies static-export deployment invariants, but not helper-level branch behavior in the script layer.

## Findings

### 1. No lower-layer test harness exists for deterministic parser/math/controller code

- Severity: High
- Confidence: High
- File/region: `package.json:5-17`, `src/lib/interpolate.ts:3-185`, `src/lib/camera.ts:12-193`, `src/lib/parser.ts:19-675`, `src/lib/usePlaybackController.ts:17-228`, `src/lib/useExportController.ts:33-247`, `src/lib/videoEncoder.ts:40-225`
- Failure scenario: Regressions in antimeridian handling, segment-distance math, scene normalization, playback progress math, export cleanup, or JSON deduplication ship without detection because only the browser happy path is exercised.
- Evidence: The repo exposes only Playwright/static-smoke commands, and `rg -n "test\\(|describe\\(|it\\(" -S .` returns the single Playwright spec only.
- Concrete fix: Add a lower-layer test harness first, then cover pure/helper-heavy surfaces before expanding browser tests. Highest-value initial targets are `parseGoogleLocationHistory`, `parseTrackFile`, `interpolateAlongTrack`, `normalizeScenes`, `computeCameraForScene`, `usePlaybackController`, `useExportController`, and `downloadVideo`.

### 2. Parser worker, fallback, and error-code branches are largely untested

- Severity: High
- Confidence: High
- File/region: `src/lib/parser.ts:446-675`, `src/components/FileUpload.tsx:52-93`, covered browser imports `e2e/travelback.spec.ts:1215-1287`
- Failure scenario: A broken worker URL, missing `Worker`, worker crash, deep JSON payload, oversized JSON, file read failure, or underpopulated track returns the wrong error or silently falls back to the wrong path in production.
- Evidence:
  - `src/lib/parser.ts:446-462` enforces JSON depth limits with no targeted test surface.
  - `src/lib/parser.ts:529-620` contains four distinct JSON parse paths: no worker, worker creation failure, worker message error/no-track, and `worker.onerror` fallback.
  - `src/lib/parser.ts:623-675` contains `FILE_TOO_LARGE`, `TOO_FEW_POINTS`, `TOO_MANY_POINTS`, `READ_FAILED`, and unsupported-format branches.
  - `src/components/FileUpload.tsx:63-86` maps parser codes to localized user-facing errors, but the current e2e suite only checks unsupported format.
- Concrete fix: Add unit tests around `parseGoogleLocationHistory` and `parseTrackFile` with mocked `Worker`, `FileReader`, and `File`, plus component tests for `FileUpload` error mapping. Cover `JSON_DEPTH_EXCEEDED`, `INVALID_GOOGLE_JSON`, `UNSUPPORTED_GOOGLE_FORMAT`, `READ_FAILED`, `TOO_FEW_POINTS`, `TOO_MANY_POINTS`, worker fallback, and large-file rejection explicitly.

### 3. Export lifecycle coverage stops before the risky behavior starts

- Severity: High
- Confidence: High
- File/region: `src/lib/useExportController.ts:90-245`, `src/lib/videoEncoder.ts:40-212`, `src/components/ExportPanel.tsx:117-405`, current e2e coverage `e2e/travelback.spec.ts:1139-1209`, `e2e/travelback.spec.ts:1292-1346`
- Failure scenario: Export cancellation can leave playback state corrupted, object URLs unreclaimed, prior exports overwritten incorrectly, picker/fallback download behavior mislabeled, or export progress/reset state stuck while the current suite still passes because it only verifies the dialog opens.
- Evidence:
  - `useExportController` manages abort, `preExportProgress`, object URL revocation, download method labeling, resize/reset cleanup, and restoration of playback progress.
  - `videoEncoder.ts:94-145` includes abort-sensitive finalization and no-buffer failure behavior.
  - `ExportPanel.tsx:211-405` has separate `done`, `exporting`, advanced options, size gating, and codec gating states.
  - Browser tests assert dialog semantics and preset selection only; none starts export, cancels export, or verifies completion states.
- Concrete fix: Add hook/component tests with mocked `MapViewHandle`, `exportVideo`, `downloadVideo`, `URL.createObjectURL`, and `URL.revokeObjectURL`. Cover success, cancel, map-idle timeout, pre-existing export replacement, and download method state (`picker` / `fallback` / `ready`) separately.

### 4. Playback logic and hotkey suppression rely on timing/global events without direct tests

- Severity: Medium
- Confidence: High
- File/region: `src/lib/usePlaybackController.ts:17-154`, `src/lib/usePlaybackController.ts:156-228`, related browser coverage `e2e/travelback.spec.ts:498-510`, `e2e/travelback.spec.ts:746-784`
- Failure scenario: Space/arrow hotkeys can fire inside dialogs or export mode, playback may fail to restart from the end, and `speed`/`duration` changes can desynchronize the accumulator-based progress loop without a deterministic failing test.
- Evidence:
  - The hook maintains mutable refs and requestAnimationFrame timing state across `togglePlay`, `seekTo`, `pausePlayback`, and speed/duration changes.
  - The hotkey hook suppresses events based on selectors and `isExporting`; current e2e only proves one timeline keyboard path does not bubble `ArrowLeft`.
- Concrete fix: Add hook tests with fake timers and mocked `requestAnimationFrame` for progress math, restart-at-end, clamping, and speed/duration updates. Add component tests for hotkey suppression inside `[role="dialog"]`, form fields, sliders/spinbuttons, and export mode.

### 5. The Playwright suite still uses hard waits in stateful map/playback tests

- Severity: Medium
- Confidence: High
- File/region: `e2e/travelback.spec.ts:147`, `e2e/travelback.spec.ts:507`, `e2e/travelback.spec.ts:523`, `e2e/travelback.spec.ts:817`, `e2e/travelback.spec.ts:845`, `e2e/travelback.spec.ts:922`, `e2e/travelback.spec.ts:937`, `e2e/travelback.spec.ts:1299`, `e2e/travelback.spec.ts:1336`
- Failure scenario: CI resource variance causes tests to fail intermittently because the app settles after the arbitrary delay instead of before it.
- Evidence: The suite uses `page.waitForTimeout(...)` in app readiness, playback, map-layer attachment, camera stability, and full-journey flows rather than waiting on observable app state.
- Concrete fix: Replace fixed sleeps with `expect.poll`, debug-state polling via `__travelbackDebug`, explicit progress changes, map idle signals, or exported state transitions.

### 6. The dev-mode test harness deletes the Next overlay instead of treating it as a failure signal

- Severity: Medium
- Confidence: High
- File/region: `e2e/travelback.spec.ts:135-147`, `e2e/travelback.spec.ts:212-235`, related app bootstrap `src/app/layout.tsx` scope noted in prior report
- Failure scenario: A real hydration/runtime regression appears in dev mode, but the suite removes the overlay DOM and proceeds green, masking a broken development build.
- Evidence: `waitForApp` and `beforeEach` explicitly remove `nextjs-portal` and `[id^="nextjs"]` nodes, including a mutation observer that keeps deleting them.
- Concrete fix: Either fix the underlying hydration/dev-overlay condition and assert the overlay never appears, or shift the affected checks to the static/build lane where the overlay is not part of runtime behavior.

### 7. Multiple assertions are broad enough to pass against the wrong control or duplicate layout

- Severity: Medium
- Confidence: High
- File/region: `e2e/travelback.spec.ts:309-316`, `e2e/travelback.spec.ts:405-419`, `e2e/travelback.spec.ts:698-710`, `e2e/travelback.spec.ts:1004-1006`, `e2e/travelback.spec.ts:1168-1177`, `e2e/travelback.spec.ts:1184-1200`, `e2e/travelback.spec.ts:1219-1269`
- Failure scenario: A new button, duplicate mobile/desktop element, or unrelated matching text satisfies the assertion while the intended UI regresses.
- Evidence:
  - `.first()` is used repeatedly on text and combobox locators.
  - `button svg` is used as a generic “controls appeared” assertion.
  - `.space-y-2 select` ties scene-editor assertions to incidental styling structure.
  - `text=/\\d+ \\/ \\d+ locations/` is unscoped and can match the wrong container.
- Concrete fix: Replace broad selectors with panel-scoped `getByRole`/`getByTestId` locators tied to the intended region (`track-toolbar`, export dialog, scene editor panel, visible track title container).

### 8. Timer-driven modal, toast, scene-undo, and timeline-hint behavior has zero direct coverage

- Severity: Medium
- Confidence: High
- File/region: `src/components/ModalDialog.tsx:31-161`, `src/components/Toast.tsx:19-90`, `src/components/SceneEditor.tsx:244-364`, `src/components/TimelineSelector.tsx:76-86`
- Failure scenario: Nested dialog cleanup can leave `body.style.overflow` or `inert` stuck, toast dismissal timing can double-fire or leak timers, scene undo can expire/reset incorrectly, and the timeline hint can fail to persist across sessions.
- Evidence:
  - `ModalDialog` uses module-level `openModalStack` and `lockedBodyOverflow`.
  - `ToastItem` uses an enter animation frame plus chained timeout dismissal.
  - `SceneEditor` maintains a 5-second undo timer.
  - `TimelineSelector` persists hint dismissal in `localStorage`.
  - None of these components has direct tests.
- Concrete fix: Add component tests with fake timers to verify modal stack cleanup, toast auto-dismiss timing, scene undo reset behavior, and timeline hint persistence/localStorage failure tolerance.

### 9. Static/dev parity around worker-backed JSON import is still only indirectly covered

- Severity: Medium
- Confidence: Medium
- File/region: `src/lib/parser.ts:536-620`, `playwright.static.config.ts:17-49`, `scripts/smoke-static.mjs:191-203`, worker asset `public/workers/trackParser.worker.js`
- Failure scenario: The static build serves a broken worker path under `/travelback`, but small fixtures keep passing through main-thread fallback and production users only fail on real, larger Google exports.
- Evidence:
  - Static smoke verifies the server, chunk asset, CSP, and local map styles, but not the worker request path.
  - JSON import browser tests use small fixtures that do not force the worker-only path.
  - The worker URL is base-path dependent: `new Worker(\`${basePath}/workers/trackParser.worker.js\`)`.
- Concrete fix: Add a static-mode test that proves the worker asset is requested successfully under `/travelback`, using a JSON fixture large enough to avoid silent main-thread fallback.

### 10. Script coverage is limited to integration happy paths; branch behavior is unpinned

- Severity: Low
- Confidence: High
- File/region: `scripts/serve-static.mjs:14-181`, `scripts/run-dev-e2e.mjs:5-58`, `scripts/run-static-e2e.mjs:5-58`, `scripts/smoke-static.mjs:11-215`
- Failure scenario: Path traversal handling, `HEAD` behavior, invalid-port exits, `EADDRINUSE` fallback, or wrapper exit propagation regresses and only surfaces in CI or deployment tooling.
- Evidence:
  - `serve-static.mjs` contains explicit branches for redirect, `400`, `403`, `404`, `405`, `500`, `HEAD`, and cache-control calculation.
  - The e2e wrappers contain independent `parsePort` and `reserveAvailablePort` logic.
  - `smoke-static.mjs` validates integration invariants but not helper branches in isolation.
- Concrete fix: Add script-level tests for `resolveFile`, cache-control/header selection, invalid-port failure, and `EADDRINUSE` fallback behavior. These do not need a browser.

## Fixture Blind Spots

Confirmed fixture gaps that leave important parser/export paths unexercised:

- No JSON fixture large enough to force the worker-only path past `MAIN_THREAD_JSON_FALLBACK_SIZE` in `src/lib/parser.ts:523-533`.
- No malformed/deeply nested JSON fixture covering `JSON_DEPTH_EXCEEDED` in `src/lib/parser.ts:446-462`.
- No fixture for single-point/empty imports that would hit `TOO_FEW_POINTS` in `src/lib/parser.ts:635-638`.
- No fixture for oversized JSON/non-JSON files that proves `FILE_TOO_LARGE` behavior in `src/lib/parser.ts:626-633`.
- No export fixture/mocks covering the `done` and `ready` states in `src/components/ExportPanel.tsx:211-267`.

## TDD Opportunities

Best next RED-first targets:

1. `src/lib/parser.ts`
   Write failing tests for worker creation failure, worker error fallback, deep JSON rejection, and `TOO_FEW_POINTS`/`READ_FAILED`.
2. `src/lib/interpolate.ts` and `src/lib/camera.ts`
   Lock antimeridian interpolation, zero-distance bearing fallback, scene normalization, and overview framing before any math refactor.
3. `src/lib/useExportController.ts`
   Write failing lifecycle tests for cancel, success, stale URL replacement, and playback progress restoration.
4. `src/components/ModalDialog.tsx`, `Toast.tsx`, `TimelineSelector.tsx`, `SceneEditor.tsx`
   Add fake-timer tests for timer/global-state behavior before cleanup work.

## Missed-Issue Sweep

Second pass checks performed:

- Re-ran test-file discovery via `rg -n "test\\(|describe\\(|it\\(" -S .` to confirm no hidden unit/component suites exist.
- Re-checked parser/controller/export/script surfaces line-by-line after reading the existing review draft to avoid duplicating stale claims.
- Re-checked static-smoke coverage to narrow the parity concern specifically to worker-backed JSON import, not general static export coverage.

No higher-severity issue than the items above surfaced on the second pass.

## Skipped-File Confirmation

No executable TS/TSX/MJS file in the reviewed inventory above was intentionally skipped for the purposes of this coverage review.
