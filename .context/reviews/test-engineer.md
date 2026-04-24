# Test Engineer Review

## Scope and Inventory

I built the test/QA inventory first and examined each relevant file in the current tree:

- Test/config/gates: `package.json`, `playwright.config.ts`, `playwright.static.config.ts`, `.github/workflows/deploy-pages.yml`
- Static smoke/preview: `scripts/smoke-static.mjs`, `scripts/serve-static.mjs`, `scripts/harden-static-export.mjs`
- Automated tests: `e2e/travelback.spec.ts`, `e2e/fixtures/*`
- App shell and logic: `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/env.ts`, `src/lib/parser.ts`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/lib/i18n.ts`, `src/types.ts`
- UI components exercised by tests or quality gates: `src/components/Controls.tsx`, `ElevationProfile.tsx`, `ErrorBoundary.tsx`, `ExportPanel.tsx`, `FileUpload.tsx`, `GlobalToolbar.tsx`, `GoogleGuide.tsx`, `JourneyCreator.tsx`, `KeyboardHelp.tsx`, `MapView.tsx`, `ModalDialog.tsx`, `SceneEditor.tsx`, `ThemeToggle.tsx`, `TimelineSelector.tsx`, `Toast.tsx`, `TrackToolbar.tsx`, `TrackWorkspace.tsx`

Current automated-test inventory is a single Playwright suite:

- `e2e/travelback.spec.ts`

No unit/integration test files are present.

## Verification Run

- `npm run lint` -> passed
- `npm run typecheck` -> passed
- `npm run smoke:static` -> passed
- `npm run test:e2e:static:ci` -> could not complete in this shared workspace because Playwright hard-failed on `http://localhost:4173/travelback` already being in use; `lsof -nP -iTCP:4173 -sTCP:LISTEN` showed an existing `node` listener

## Findings

### 1. Dev Playwright setup masks hydration/dev-overlay regressions instead of detecting them
- Severity: Medium
- Confidence: High
- Region: `e2e/travelback.spec.ts:135-147`, `e2e/travelback.spec.ts:211-238`
- Failure scenario: the suite explicitly removes `nextjs-portal` and every `#nextjs*` overlay node before and after navigation. A real hydration mismatch or dev-only runtime error can therefore ship without any test ever surfacing it; the tests continue against a cleaned DOM.
- Why this matters: the current comments already acknowledge the overlay is being triggered by hydration mismatch conditions. That makes this a masked signal, not just a harmless workaround.
- Suggested fix: keep the workaround only where absolutely needed, but add an assertion path that fails if the overlay appears unexpectedly. At minimum, add one smoke test that does **not** remove the overlay and asserts no Next dev error portal is injected, or run that check in the static suite where the overlay should never appear.

### 2. Parser worker/fallback/limit branches are effectively untested
- Severity: High
- Confidence: High
- Region: `src/lib/parser.ts:521-675`; current coverage only touches happy-path JSON imports in `e2e/travelback.spec.ts:1214-1243` plus unsupported-format handling in `e2e/travelback.spec.ts:1247-1260`
- Failure scenario: a browser without `Worker`, a worker boot failure, a worker crash, a `JSON_DEPTH_EXCEEDED` case, `FILE_TOO_LARGE`, `TOO_FEW_POINTS`, or `TOO_MANY_POINTS` regression will not be caught by the current suite. Those branches are central to large Google Location History imports and are exactly the sort of browser-specific paths that browser E2E happy paths miss.
- Suggested fix: add direct tests around `parseGoogleLocationHistory` and `parseTrackFile` with mocked `Worker`, `File`, and `FileReader` behavior. Cover at least: worker unavailable, worker constructor failure, worker `onerror`, worker returns no `track`, depth limit rejection, JSON size limit rejection, and too-few-points rejection.

### 3. Export success/cancel/download flows have almost no regression protection beyond “panel opens”
- Severity: High
- Confidence: High
- Region: `src/lib/useExportController.ts:92-220`, `src/lib/videoEncoder.ts:40-225`; current Playwright coverage stops at dialog semantics/open-close in `e2e/travelback.spec.ts:1139-1201`
- Failure scenario: export can regress in ways the suite will miss, including:
  - abort not restoring map size or playback progress
  - stale object URLs not being revoked
  - `downloadMethod`/success-state logic reporting the wrong UI path
  - `showSaveFilePicker` fallback breaking silently
  - encoder abort/finalize behavior producing broken output paths
- Suggested fix: add unit/integration tests that mock `exportVideo`, `downloadVideo`, `mapViewRef`, and `URL.createObjectURL`/`revokeObjectURL`. Cover success, cancel, map-idle timeout, reset-size fallback, and previous-export replacement. If one browser-level test is desired, stub the encoder and assert the “done” state, cancel state, and ready/download actions.

### 4. Journey creator map interactions and confirm/discard flows are largely uncovered
- Severity: Medium
- Confidence: High
- Region: `src/components/JourneyCreator.tsx:243-444`, `src/components/JourneyCreator.tsx:562-820`; current coverage is limited to icon visibility and coordinate-search paths in `e2e/travelback.spec.ts:446-496`
- Failure scenario: regressions in click-to-add, click-to-delete, drag-to-move, undo, clear, done, confirm-create, or discard-confirm can ship with no failing test. Those handlers are stateful and map-event-driven, which makes them especially easy to break during refactors.
- Suggested fix: add integration tests around `JourneyCreator` with a mocked `MapViewHandle`/MapLibre surface, or add targeted Playwright coverage that actually places points on the map and verifies undo/clear/done/discard behavior.

### 5. Static Playwright smoke is fragile in shared/local environments because the port is fixed and collisions are fatal
- Severity: Medium
- Confidence: High
- Region: `playwright.static.config.ts:3-44`, `package.json:14-16`
- Failure scenario: in this review run, `npm run test:e2e:static:ci` failed immediately because `http://localhost:4173/travelback` was already occupied by another `node` process. In a shared workspace or developer machine, this makes the quality gate flaky even when the app itself is fine.
- Suggested fix: allow the port to come from an env var with a fallback, or let Playwright choose an open port. If the intent is to support an already-running preview server, switch to a validated `reuseExistingServer: true` path; otherwise, use a dynamically allocated port and thread it through `baseURL` and `webServer.command`.

### 6. The Playwright suite is too tightly coupled to English copy and exact text content
- Severity: Low
- Confidence: High
- Region: representative examples in `e2e/travelback.spec.ts:138`, `400-407`, `498-510`, `1139-1201`, `1247-1257`, `1265-1297`
- Failure scenario: harmless copy or localization wording changes will break broad swaths of the suite even when behavior is unchanged. Examples include exact matches for `Travelback`, `Try with a sample trip`, `Export`, `Export Video`, `Play`, and raw point-count text parsing.
- Suggested fix: prefer stable `data-testid` hooks, semantic roles scoped to stable containers, or helper functions that derive localized labels from the app’s own locale table. Keep a few copy assertions where copy itself is the product requirement, but not as the default selector strategy.

## Residual Risk

The repo’s current checks are good at catching static-export breakage, accessibility regressions on existing screens, and several map/timeline/scenes happy paths. The largest remaining risk is that core behavior still relies on indirect browser coverage only. Parser edge cases, export lifecycle correctness, and journey-creation interactions can regress without any targeted automated test failing.
