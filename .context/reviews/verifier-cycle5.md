# Verifier - Cycle 5 (2026-04-25)

## Verdict
PARTIAL

## Evidence
- `npm run build` - passed in the prior cycle; Next prerendered the app statically and `postbuild` hardened the emitted HTML.
- `npm run smoke:static` - passed in the prior cycle; served `out/` at `/travelback/` and verified hardened CSP, local map styles, and no tool-state residue.
- `npm run test:e2e:static:ci` - passed in the prior cycle with 1 flaky retry; `62 passed`.
- `src/lib/parser.ts:160-675`, `public/workers/trackParser.worker.js:1-320`, and `e2e/travelback.spec.ts:1248-1268` - GPX, KML, and Google JSON variants are implemented and exercised by fixtures.
- `src/lib/useExportController.ts:94-190`, `src/lib/videoEncoder.ts:1-219`, and `src/components/ExportPanel.tsx:211-266` - export encoding, download, and success-state rendering are wired through the controller/panel split.
- `public/map-styles/*.json`, `scripts/fetch-map-styles.mjs`, `scripts/smoke-static.mjs`, and `scripts/serve-static.mjs` - bundled styles are local-only and the static server/smoke checks the emitted assets have no sprite/glyph/source dependency.
- `next.config.ts:1-10`, `src/app/layout.tsx:55-67`, and `scripts/harden-static-export.mjs:1-94` - static export hardening path exists and was validated by build/smoke.
- `playwright.static.config.ts:1-39` - static E2E runs against `/travelback/` with the Chromium/SwiftShader harness the suite expects.

## Findings

### 1. Export completion and save/share behavior are not actually covered by automated tests
- Severity: Medium
- Confidence: High
- Status: Confirmed gap
- Evidence: `e2e/travelback.spec.ts:1329-1346` stops after opening the export panel and asserting `Start Export`; it never clicks the export button or waits for `exportState === 'done'`.
- Evidence: The completion path lives in `src/lib/useExportController.ts:150-178`, where `exportVideo()` is awaited, `downloadVideo()` is called, and the controller transitions to `'done'`.
- Evidence: The success UI is in `src/components/ExportPanel.tsx:211-266`, which shows the preview, download link, and share action only after `exportState === 'done'`.
- Problem: The suite can pass even if `output.finalize()`, `downloadVideo()`, or the exported-video state handoff regresses, because the tests never enter the completion branch.
- Concrete failure scenario: a browser-specific regression in the download picker path or anchor fallback path ships, but the current E2E suite still passes because it never verifies the file-save outcome.
- Fix: add at least one export E2E or integration test that drives the panel to completion, asserts the success screen, and exercises picker success/cancel plus anchor fallback behavior.

### 2. The error boundary fallback removes the main landmark that the normal app root exposes
- Severity: Low
- Confidence: High
- Status: Confirmed
- Evidence: `src/app/page.tsx:382-384` renders the normal app inside `<main id="app" data-travelback-app-root="true">`.
- Evidence: `src/components/ErrorBoundary.tsx:37-72` replaces that subtree with a plain `<div>` fallback when any child throws.
- Evidence: `e2e/travelback.spec.ts:248-252` codifies the main-landmark contract on the happy path by asserting `main#app[data-travelback-app-root="true"]` is attached.
- Problem: a runtime error in MapView, parser, or another child component drops assistive-tech users onto a fallback screen with no `<main>` landmark, so the landmark navigation guarantee is not preserved in the failure state.
- Concrete failure scenario: a WebGL or parser crash sends the user to the fallback page, but screen-reader navigation loses the main region entirely, forcing them to tab through the whole error shell.
- Fix: render the fallback inside `<main>` or add `role="main"` and a labeled heading to the error screen.

### 3. `waitForApp()` is using a weaker readiness signal than the app root and is already flaky
- Severity: Low
- Confidence: High
- Status: Confirmed by test run
- Evidence: `e2e/travelback.spec.ts:135-145` waits for `getByRole('heading', { name: 'Travelback' })` before removing the Next.js overlay.
- Evidence: The prior `npm run test:e2e:static:ci` run reported one flaky retry on `e2e/travelback.spec.ts:319-322` (`dark system theme is applied on first render without needing a manual toggle`) because the heading did not appear within the timeout on the first attempt.
- Problem: the helper treats the heading as the readiness gate even though `main#app[data-travelback-app-root="true"]` or the map container would be a more direct render signal.
- Concrete failure scenario: a slightly slower static server, browser startup, or hydration path pushes the heading past 30s while the app root is already present, causing avoidable retries in CI.
- Fix: wait on `main#app[data-travelback-app-root="true"]` or `data-testid="map-container"` first, then assert the heading separately.

## Missed-Issue Sweep
- Rechecked the parser dispatch, the worker copy, local map style assets, static export hardening, playback/export controllers, modal and landmark markup, the static Playwright config, and the full Playwright surface after the initial pass.
- I did not find a separate code defect in the supported GPX/KML/Google JSON format claims, local map asset packaging, or static export CSP hardening.
- I did not promote the `semanticSegments.visit.topCandidate.placeLocation` wording into a finding because the parser, fixtures, docs, and worker all agree on the concrete `latLng` string shape that the repo actually exercises.

## Skipped Files
- No behavior-relevant files were intentionally skipped.
- Inspected surfaces: `src/app/*.tsx`, `src/components/*.tsx`, `src/lib/*.ts`, `public/workers/trackParser.worker.js`, `public/map-styles/*.json`, `scripts/*.mjs`, `next.config.ts`, `playwright.config.ts`, `playwright.static.config.ts`, `e2e/travelback.spec.ts`, and `e2e/fixtures/*`.
- I did not inspect unrelated artwork/font assets or historical review archives beyond using them as context.
