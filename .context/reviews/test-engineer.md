# Test Engineer Review — review-plan-fix cycle 2

Date: 2026-04-24
Repo: `/Users/hletrd/flash-shared/Travelback`
Reviewer lane: test-engineer
Scope: coverage-gap review only; no source files edited

## Summary

The repo still has one executable test layer: Playwright. `package.json:5-17` defines lint/typecheck/build plus E2E commands, but there is no unit or component test harness for the pure logic in `src/lib/*` or the controller-heavy UI surfaces in `src/components/*`. The existing browser suite is broad on happy-path UX, especially map/style/theme and basic imports, but it leaves the highest-risk correctness branches under-protected: parser worker/fallback behavior, export lifecycle cleanup, keyboard/hotkey guards, and the stability of the Playwright gate itself.

## Inventory

### Source files inventoried

- App shell: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Parser/runtime libs: `src/lib/parser.ts`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/lib/i18n.ts`, `src/lib/env.ts`
- Type/config surface: `src/types.ts`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `package.json`
- Map/theme/UI surfaces: `src/components/MapView.tsx`, `FileUpload.tsx`, `JourneyCreator.tsx`, `TimelineSelector.tsx`, `TrackWorkspace.tsx`, `Controls.tsx`, `ExportPanel.tsx`, `TrackToolbar.tsx`, `GlobalToolbar.tsx`, `ThemeToggle.tsx`, `ModalDialog.tsx`, `SceneEditor.tsx`, `ElevationProfile.tsx`, `ErrorBoundary.tsx`, `GoogleGuide.tsx`, `KeyboardHelp.tsx`, `Toast.tsx`
- Static/runtime support: `public/workers/trackParser.worker.js`, `public/map-styles/*.json`, `public/sample-trip.gpx`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`, `scripts/harden-static-export.mjs`

### Playwright/spec inventory

- Spec surface: `e2e/travelback.spec.ts:1-1293`
- Helper layer is inline in the spec, not split into separate Playwright fixtures: `e2e/travelback.spec.ts:19-208`
- Configs:
  - Dev-server lane: `playwright.config.ts:5-45`
  - Static-export lane: `playwright.static.config.ts:5-45`

### Fixture inventory

- GPX: `e2e/fixtures/sample.gpx`, `segmented-city-hop.gpx`, `tiny-trim.gpx`, `single-quote-attrs.gpx`, `invalid-elevation.gpx`, `antimeridian.gpx`, `korea-japan.gpx`
- KML: `e2e/fixtures/korea-japan.kml`, `point-placemarks.kml`
- Google JSON: `e2e/fixtures/korea-japan.json`, `google-records.json`, `google-semantic-location.json`, `google-semantic-segments.json`, `google-timeline-edits.json`
- Missing fixture classes for important negative paths: malformed XML, too-few-points GPX/KML, over-limit JSON/GPX, deeply nested JSON, worker-unavailable/fallback cases, export success/cancel mocks

## Findings

### TE-201 — Pure logic remains outside any deterministic test harness
- Severity: High
- Confidence: High
- Code region:
  - `package.json:5-17`
  - `src/lib/parser.ts:19-675`
  - `src/lib/interpolate.ts:18-185`
  - `src/lib/camera.ts:19-427`
  - `src/lib/usePlaybackController.ts:17-227`
- Why it matters:
  - All of the highest-risk logic is pure or near-pure, but the repo only exposes browser E2E commands. That means scene normalization, interpolation math, JSON-depth guards, segment-distance handling, and playback timing only get indirect browser coverage.
- Concrete failure scenario:
  - A regression in `computeCameraForProgress()` gap/transition blending (`src/lib/camera.ts:339-427`) or `computeCumulativeDistances()` segmented-distance math (`src/lib/interpolate.ts:18-38`) can ship while the browser suite stays green because the current E2E checks only sample a few UI-visible trajectories, not the underlying math contracts.
- Suggested fix/test:
  - Add a deterministic low-level test lane for parser/interpolate/camera/controller logic.
  - Start with table-driven tests for segmented distances, antimeridian interpolation, `normalizeScenes()`, and `computeCameraForProgress()` gap/transition behavior.

### TE-202 — Google JSON worker, fallback, and error-code branches are materially under-tested
- Severity: High
- Confidence: High
- Code region:
  - `src/lib/parser.ts:446-533`
  - `src/lib/parser.ts:536-620`
  - `src/lib/parser.ts:623-673`
  - `public/workers/trackParser.worker.js:289-321`
  - `src/components/FileUpload.tsx:52-93`
  - Covered today only by happy-path JSON imports in `e2e/travelback.spec.ts:1186-1214` and one unsupported-extension check in `e2e/travelback.spec.ts:1219-1232`
- Why it matters:
  - The app has distinct paths for depth checks, worker parsing, worker creation failure, worker runtime failure, large-file rejection, and UI error-code mapping. The current suite only proves that a few small valid JSON fixtures import and that `.txt` is rejected.
- Concrete failure scenario:
  - A browser without worker support or with a worker creation failure takes the fallback path in `src/lib/parser.ts:536-560`. If that path regresses, the UI can spin, surface the wrong message, or mishandle dates returned from the worker (`src/lib/parser.ts:595-600`) without any current test failing.
- Suggested fix/test:
  - Add parser-level tests for `JSON_DEPTH_EXCEEDED`, `INVALID_GOOGLE_JSON`, `UNSUPPORTED_GOOGLE_FORMAT`, `FILE_TOO_LARGE`, and `TOO_MANY_POINTS`.
  - Add parity tests that run the same JSON fixture through both `parseGoogleLocationHistory()` and `public/workers/trackParser.worker.js` and assert identical `points`, `segmentStartIndices`, and error codes.
  - Add UI-level tests for the `FileUpload` error mapping matrix, not just unsupported extension.

### TE-203 — Export success, cancel, and cleanup state machine is almost entirely unexercised
- Severity: High
- Confidence: High
- Code region:
  - `src/lib/useExportController.ts:87-220`
  - `src/lib/videoEncoder.ts:40-212`
  - `src/components/ExportPanel.tsx:140-295`
  - `src/app/page.tsx:156-186`
  - Current Playwright coverage stops at opening/configuring the dialog: `e2e/travelback.spec.ts:1111-1166`, `e2e/travelback.spec.ts:1237-1290`
- Why it matters:
  - The risky behavior is not the dialog chrome; it is the async controller loop: pausing playback, resizing the map, waiting for idle, cancelling via `AbortController`, restoring progress, revoking object URLs, picker-vs-fallback downloads, and cleaning up after failure.
- Concrete failure scenario:
  - A cancelled export can leave the map container stuck at export dimensions (`src/lib/useExportController.ts:189-203`), restore the wrong playback progress (`src/lib/useExportController.ts:215-218`), or finalize a corrupt MP4 on abort if the encoder contract regresses (`src/lib/videoEncoder.ts:88-140`). None of that is asserted today because no test actually starts or cancels an export.
- Suggested fix/test:
  - Add controller tests with a mocked `MapViewHandle`, mocked `exportVideo`, and mocked `downloadVideo` to cover:
    - success path
    - cancel via `AbortError`
    - map resize/reset fallback
    - playback progress restoration
    - blob URL revocation and download method state
  - Add one browser integration test that presses `Start Export`, then cancels with Escape and asserts the overlay closes without leaving export state behind.

### TE-204 — Keyboard/hotkey guard rails are only partially covered
- Severity: Medium
- Confidence: High
- Code region:
  - `src/lib/usePlaybackController.ts:64-135`
  - `src/lib/usePlaybackController.ts:156-227`
  - `src/components/ModalDialog.tsx:109-147`
  - `src/app/page.tsx:156-186`
  - `src/components/JourneyCreator.tsx:501-539`
  - Existing coverage is limited to timeline keyboard trim and one dialog focus-loop check: `e2e/travelback.spec.ts:738-777`, `e2e/travelback.spec.ts:1111-1125`
- Why it matters:
  - Playback hotkeys are intentionally suppressed for dialogs, inputs, sliders, and active export. Those branches are easy to regress because they depend on focus target semantics and event propagation rather than obvious UI rendering.
- Concrete failure scenario:
  - While the export dialog or Journey Creator search input is focused, pressing Space or Arrow keys can toggle playback or scrub the main track underneath the modal. Escape can also double-handle by both cancelling export and closing a modal if propagation rules regress.
- Suggested fix/test:
  - Add browser tests that assert:
    - Space/Arrow keys do not affect playback while focus is inside `ExportPanel`
    - search input arrow/enter behavior in `JourneyCreator` does not leak to playback hotkeys
    - Escape during active export cancels export without leaving the app in an inconsistent modal state

### TE-205 — The Playwright gate is still fragile because it relies on fixed sleeps, forced clicks, and the dev server
- Severity: Medium
- Confidence: High
- Code region:
  - Fixed sleeps in `e2e/travelback.spec.ts:146`, `e2e/travelback.spec.ts:500`, `e2e/travelback.spec.ts:516`, `e2e/travelback.spec.ts:809`, `e2e/travelback.spec.ts:837`, `e2e/travelback.spec.ts:914`, `e2e/travelback.spec.ts:929`, `e2e/travelback.spec.ts:958`, `e2e/travelback.spec.ts:1244`, `e2e/travelback.spec.ts:1281`
  - Frequent `force: true` interaction overrides throughout `e2e/travelback.spec.ts`, including `266`, `314`, `401`, `442`, `456`, `470`, `499`, `785`, `981`, `1030`, `1113`, `1133`, `1265`, `1289`
  - Dev-server primary gate in `playwright.config.ts:40-45`
  - Static-export lane exists but is separate in `playwright.static.config.ts:40-45`
- Why it matters:
  - `waitForTimeout()` creates false negatives on slow CI and false positives on fast machines. `force: true` suppresses actionability failures that would otherwise expose layout overlap or focus bugs. Running the main suite against `next dev` also means the primary gate is exercising hydration and overlay behavior that is not the production deployment path.
- Concrete failure scenario:
  - A toolbar overlap regression blocks a real user click, but the test still passes because it uses `click({ force: true })`. Or a slower runner misses a `waitForTimeout(1000)` playback expectation and fails nondeterministically even though the feature is correct.
- Suggested fix/test:
  - Replace fixed sleeps with `expect.poll()` or explicit debug-state predicates.
  - Remove `force: true` anywhere the assertion is supposed to protect actionability/layout.
  - Treat the static-export Playwright lane plus `smoke:static` as a required gate, not an optional secondary check.

## Coverage notes by surface

- Parser/imports:
  - Happy-path GPX/KML/Google JSON coverage exists.
  - Negative-path coverage is thin beyond unsupported extension and malformed elevation.
- Export:
  - Dialog rendering is covered.
  - Start/cancel/success/download/cleanup paths are not.
- Playback:
  - Basic play, trim, camera motion, and unit toggle are covered.
  - Hook-level timing and hotkey suppression branches are not.
- Map/theme:
  - Style cycling, error UI, reload, dark-default mapping, and explicit-style persistence are covered well.
  - Low-level camera/interpolation math is still only indirectly covered.
- UI/modal/error states:
  - Basic dialog semantics are covered for guide/export.
  - Error boundary reset/reload and modal-stack behavior are not explicitly exercised.

## Final sweep

No relevant source-of-truth file in the requested scope was skipped. I reviewed every file under `src/lib`, all interactive files under `src/components`, the app shell under `src/app`, both Playwright configs, the sole Playwright spec, every committed fixture under `e2e/fixtures`, the parser worker under `public/workers`, and the static-export support scripts. I did not review generated artifacts under `.next/`, `out/`, `playwright-report/`, `test-results/`, `.omc/`, or `.omx/` line-by-line because they are derived outputs rather than test-design sources.
