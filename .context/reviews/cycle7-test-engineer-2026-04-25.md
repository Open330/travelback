# Test Engineer Review — Cycle 7 (2026-04-25)

## Scope and method

- Scope: whole repository, test-engineer lane only.
- Method: static inspection of the repo, test harness, and behavior-critical code paths. No source files were modified.
- Execution status: no test run performed in this review pass; findings below are based on coverage analysis, assertion strength, and infrastructure review.

## Inventory: test-relevant and behavior-relevant files

### Explicit tests and fixtures

- `e2e/travelback.spec.ts` — sole automated spec file; 69 Playwright tests covering landing, import, playback, scenes, theming, export UI, mobile layout, and some static a11y flows.
- `e2e/fixtures/*.gpx|*.kml|*.json` — import and camera fixtures used by the Playwright suite.

### Test harness and verification scripts

- `package.json` — only Playwright-backed test scripts are defined; no unit/integration test runner is configured.
- `playwright.config.ts`
- `playwright.static.config.ts`
- `scripts/run-dev-e2e.mjs`
- `scripts/run-static-e2e.mjs`
- `scripts/smoke-static.mjs`
- `scripts/serve-static.mjs`

### Behavior-critical source: parsing, math, playback, export

- `src/lib/parser.ts`
- `public/workers/trackParser.worker.js`
- `src/lib/interpolate.ts`
- `src/lib/camera.ts`
- `src/lib/usePlaybackController.ts`
- `src/lib/useExportController.ts`
- `src/lib/videoEncoder.ts`
- `src/lib/env.ts`
- `src/types.ts`

### Behavior-critical UI shell and interaction surfaces

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/MapView.tsx`
- `src/components/ModalDialog.tsx`
- `src/components/FileUpload.tsx`
- `src/components/TrackWorkspace.tsx`
- `src/components/Controls.tsx`
- `src/components/TimelineSelector.tsx`
- `src/components/SceneEditor.tsx`
- `src/components/ExportPanel.tsx`
- `src/components/JourneyCreator.tsx`
- `src/components/GlobalToolbar.tsx`
- `src/components/TrackToolbar.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/KeyboardHelp.tsx`
- `src/components/ElevationProfile.tsx`
- `src/components/GoogleGuide.tsx`
- `src/components/Toast.tsx`
- `src/components/ErrorBoundary.tsx`

## Findings

### 1. High — parser worker/fallback/error branches are almost entirely unprotected by deterministic tests

- Files:
  - `src/lib/parser.ts:537-690`
  - `public/workers/trackParser.worker.js:255-334`
  - `e2e/travelback.spec.ts:1343-1389`
- Scenario:
  - The UI suite proves a few happy-path JSON imports, but it does not exercise worker creation failure, `worker.onerror`, the “no track and no error” fallback path, JSON depth rejection, large-file fallback boundaries, or `ParseError.code` parity between the main-thread parser and worker responses.
  - Those branches are browser-specific and failure-mode-specific; if they regress, they can ship unnoticed because the current suite mostly checks that a valid import eventually renders.
- Confidence: high
- Concrete test/fix:
  - Add direct parser tests for `parseGoogleLocationHistory`, `parseTrackFile`, and `parseGoogleLocationHistoryInWorkerBuffer` with mocked `Worker` behaviors:
    - worker construction throws
    - worker posts `{ error, code }`
    - worker posts `{}` with no track
    - worker crashes via `onerror`
    - no `Worker` global available
    - JSON depth exceeded
    - large JSON rejected when fallback copy is disallowed
  - Add a small worker-harness test that feeds the worker the existing JSON fixtures and asserts returned point counts plus error codes.

### 2. High — export cancellation, failure, and cleanup state transitions have no real automated coverage

- Files:
  - `src/lib/useExportController.ts:105-244`
  - `src/lib/videoEncoder.ts:40-212`
  - `e2e/travelback.spec.ts:1274-1323`
- Scenario:
  - The existing export tests cover only the local stub happy path, a duration clamp, and reset-after-edit behavior.
  - They do not verify abort during export, map-idle timeout failures, `downloadVideo()` picker-vs-fallback behavior, object URL revocation, `resetSize()` cleanup, or the restoration of pre-export playback progress after errors/cancel.
  - That leaves the most failure-prone state machine in the app effectively untested.
- Confidence: high
- Concrete test/fix:
  - Add hook/component tests around `useExportController` with a mocked `MapViewHandle` and mocked `exportVideo`/`downloadVideo` covering:
    - abort before completion
    - map idle timeout
    - export encoder error
    - prior export exists, new export fails
    - download picker cancel vs fallback link path
    - cleanup calls `resetSize()` and restores prior playback progress
  - Add one targeted Playwright path that starts an export with a controllable stub, presses `Escape`, and asserts the cancel toast plus restored idle UI.

### 3. Medium-High — camera correctness is validated only through timing-sensitive browser tests, which is both flaky and incomplete

- Files:
  - `src/lib/camera.ts:101-119`
  - `src/lib/camera.ts:125-193`
  - `src/lib/camera.ts:339-427`
  - `e2e/travelback.spec.ts:44-133`
  - `e2e/travelback.spec.ts:920-972`
- Scenario:
  - The current suite samples camera state using repeated `setTimeout` polling and coarse statistical thresholds after fixed sleeps.
  - That is inherently sensitive to CI timing, MapLibre readiness, and WebGL scheduling, while still not proving core math branches like gap interpolation, transition blending, pre-first-scene overview interpolation, or longitude lerp correctness across the antimeridian.
  - A camera math regression can pass because the thresholds are wide; a healthy build can fail because the timing sample was noisy.
- Confidence: high
- Concrete test/fix:
  - Add deterministic unit tests for:
    - `normalizeScenes()`
    - `lerpCamera()` antimeridian interpolation
    - `computeCameraForScene()` overview and bird’s-eye branches
    - `computeCameraForProgress()` gap handling and boundary blending
  - Keep only one slim Playwright camera smoke test, and gate it on an explicit “map ready/debug ready” signal instead of fixed `waitForTimeout()` delays.

### 4. Medium — playback hotkey behavior is largely untested outside one trim-specific regression

- Files:
  - `src/lib/usePlaybackController.ts:176-248`
  - `e2e/travelback.spec.ts:748-786`
- Scenario:
  - The suite covers keyboard trimming on timeline handles, but it does not verify the main hotkey matrix:
    - space toggles play only when a track exists
    - arrow keys seek only outside interactive controls
    - `f`, `e`, `?`, and `Escape` suppress correctly during export or inside dialogs/inputs
    - `data-disable-playback-hotkeys="true"` actually blocks propagation
  - These are easy to regress because they depend on DOM target shape rather than one visible UI state.
- Confidence: high
- Concrete test/fix:
  - Add focused hook/component tests that dispatch `keydown` events against:
    - plain document body
    - input/select/textarea
    - dialog content
    - custom `data-disable-playback-hotkeys="true"` containers
    - exporting vs not exporting
  - Assert exactly one callback fires per key path and that forbidden contexts fire none.

### 5. Medium — dialog focus-trap tests are too weak to prove actual containment, wraparound, or focus restoration

- Files:
  - `src/components/ModalDialog.tsx:31-160`
  - `e2e/travelback.spec.ts:249-262`
  - `e2e/travelback.spec.ts:1210-1224`
- Scenario:
  - Both dialog tests press `Tab` a fixed number of times and then assert only that the active element is still somewhere inside a dialog.
  - They do not verify first-to-last wraparound, `Shift+Tab` reverse wrap, inert/`aria-hidden` on the app root, or focus returning to the previously active trigger after close.
  - That means a partial focus-trap regression could still pass as long as focus lands on any descendant before the assertion.
- Confidence: high
- Concrete test/fix:
  - Add component-level tests for `ModalDialog` that assert:
    - initial focus lands on the first visible focusable element
    - forward tab from the last element wraps to the first
    - reverse tab from the first wraps to the last
    - `Escape` closes and restores focus to the opener
    - opening a modal sets `inert`/`aria-hidden` on the app root, and closing removes them
  - In Playwright, replace the current “insideDialog” assertion with explicit focus-order expectations.

### 6. Medium — static serving and header hardening checks are narrower than the implementation surface they are supposed to guard

- Files:
  - `scripts/serve-static.mjs:69-170`
  - `scripts/smoke-static.mjs:70-83`
  - `scripts/smoke-static.mjs:223-236`
- Scenario:
  - `serve-static.mjs` implements 302 base-path redirects, 400 decode failures, 403 traversal protection, `HEAD` handling, and multiple security headers (`X-Frame-Options`, COOP, CORP, Permissions-Policy, nosniff, HSTS).
  - The smoke script verifies only a small subset: a few statuses, cache headers, CSP hardening, worker constant parity, and absence of remote map assets.
  - If one of the explicit security headers or request-routing branches regresses, CI can still stay green.
- Confidence: medium-high
- Concrete test/fix:
  - Add a direct Node integration test for `serve-static.mjs` covering:
    - `/` -> base-path redirect
    - malformed percent-encoding -> 400
    - traversal attempt -> 403
    - `HEAD` request behavior
    - presence and values of all hardening headers
  - Keep `smoke-static.mjs` as a deployment smoke check, but stop using it as the only guard for static-server behavior.

### 7. Medium — several Playwright tests are weak “visibility-only” assertions that do not lock the underlying behavior

- Files:
  - `e2e/travelback.spec.ts:499-512`
  - `e2e/travelback.spec.ts:1335-1389`
  - `e2e/travelback.spec.ts:1412-1467`
- Scenario:
  - Examples:
    - `playback controls work after importing track` only checks that a camera-tracking button is visible after a forced click plus `waitForTimeout(1500)`.
    - most KML/Google import tests check only that a generic location count and visible title appear, not exact fixture-derived counts or segment behavior.
    - the two “completes full journey” tests never actually complete export or assert any finished-state artifact.
  - These tests are expensive E2E runs but still leave room for silent behavioral regressions.
- Confidence: high
- Concrete test/fix:
  - Tighten existing E2E assertions before adding more tests:
    - assert playback progress changes or play/pause state transitions
    - assert exact point counts for fixed fixtures
    - assert scene count / segment-specific effects where fixtures are purpose-built
    - rename “completes full journey” tests unless they really execute and verify the end state

## Coverage gaps by area

- Parser and worker failure handling — High risk
- Export state machine and cleanup — High risk
- Camera math and scene transitions — High risk
- Playback hotkeys and keyboard routing — Medium risk
- Modal/focus-management internals — Medium risk
- Static serving/security-header behavior — Medium risk
- Import fixture assertions and some E2E happy-path checks — Medium risk

## Flaky test risks

- `e2e/travelback.spec.ts:44-133, 920-949` — camera stability tests use fixed sleeps plus sampled motion thresholds; likely CI-noise sensitive.
- `e2e/travelback.spec.ts:499-512, 524, 819, 847, 924, 936, 1019, 1419, 1456` — repeated `waitForTimeout()` usage weakens determinism and makes failures timing-dependent rather than state-dependent.

## Missed-issue sweep

I rechecked the remaining high-value surfaces after drafting findings:

- `src/app/page.tsx` session/reset wiring
- `src/components/MapView.tsx` debug and idle-wait exposure
- `src/lib/interpolate.ts` distance/bearing helpers
- `src/app/layout.tsx` / `scripts/harden-static-export.mjs` CSP hardening path

No additional test gap rose above the seven findings above. The dominant repo-wide issue remains structural: nearly all deterministic logic is still protected only by a single large Playwright file, so failures cluster in slow browser tests instead of being pinned close to the logic that can regress.
