# Test Engineer Review — review-plan-fix cycle 1/100

Date: 2026-04-24
Repo: `/Users/hletrd/flash-shared/Travelback`
Reviewer lane: test-engineer
Scope: test coverage gaps, flaky-test risks, missing regression tests, Playwright config/fixtures, TDD opportunities
Modification policy: only this review file was changed

## Inventory

### Review-relevant repo files examined
- Test/config surface: `package.json`, `playwright.config.ts`, `playwright.static.config.ts`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`
- E2E suite and fixtures: `e2e/travelback.spec.ts`, all files under `e2e/fixtures/`
- Parsing/runtime logic: `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/lib/i18n.ts`, `src/lib/env.ts`, `src/types.ts`
- App/session orchestration: `src/app/layout.tsx`, `src/app/page.tsx`
- Interactive UI/components relevant to testability: `src/components/FileUpload.tsx`, `MapView.tsx`, `JourneyCreator.tsx`, `TimelineSelector.tsx`, `TrackWorkspace.tsx`, `Controls.tsx`, `ExportPanel.tsx`, `SceneEditor.tsx`, `TrackToolbar.tsx`, `GlobalToolbar.tsx`, `ThemeToggle.tsx`, `ModalDialog.tsx`, `ElevationProfile.tsx`, `Toast.tsx`, `ErrorBoundary.tsx`, `GoogleGuide.tsx`, `KeyboardHelp.tsx`
- Static/runtime scripts: `scripts/harden-static-export.mjs`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`, `scripts/fetch-map-styles.mjs`
- Static/public assets relevant to fixture/runtime behavior: `public/sample-trip.gpx`, `public/map-styles/*.json`, `public/guide/*.svg`, `public/workers/trackParser.worker.js`

### Context docs examined
- `.context/README.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `.context/development/01-conventions.md`
- `.context/reviews/_aggregate.md`
- `.context/reviews/cycle-r9-test-engineer-2026-04-24.md`
- `.context/reviews/cycle-r10-test-engineer-2026-04-24.md`
- `plan/cycle1-review-plan-2026-04-24.md`
- `plan/deferred-cycle1-review-plan-2026-04-24.md`

## Overall assessment

The repository still has a single executable test layer: Playwright E2E. `package.json:10-17` exposes lint, typecheck, build, smoke, and Playwright commands, but there is no unit or component test runner. The current Playwright suite is broad at the UI level and now contains 59 tests (`e2e/travelback.spec.ts:209-1272`), but core parser, export, playback, camera, and touch-specific behaviors remain either untested or only indirectly tested through slow browser flows.

## Findings

### TE-001 — Confirmed: parser correctness and main-thread/worker parity still lack deterministic regression coverage
- Severity: High
- Confidence: High
- Status: Confirmed issue
- Evidence:
  - Main parser behavior lives in `src/lib/parser.ts:19-360` and `src/lib/parser.ts:169-314`.
  - Worker parser duplicates much of that logic in `public/workers/trackParser.worker.js:1-248` and `public/workers/trackParser.worker.js:289-322`.
  - Error mapping in the UI depends on explicit parser codes at `src/components/FileUpload.tsx:61-86`.
  - Current JSON/GPX/KML tests only assert UI-level success/failure at `e2e/travelback.spec.ts:408-439`, `e2e/travelback.spec.ts:1178-1214`, and `e2e/travelback.spec.ts:1219-1230`.
- Why this is a problem:
  - The parser and worker are separate implementations with separate guardrails, but there is no deterministic test suite asserting they produce the same `Track`, the same `segmentStartIndices`, and the same `ParseError.code` values for the same inputs.
  - The UI depends on those codes for user-facing behavior, so parser drift can become a silent UX regression instead of a visible test failure.
- Concrete failure scenario:
  - A future change updates `parseGoogleLocationHistory()` in `src/lib/parser.ts` but not `public/workers/trackParser.worker.js`, or adds a new `ParseError.code` without extending `FileUpload` mapping. Browser imports still show a loaded track title or a generic parse error, so the current Playwright suite stays green while worker/main outputs diverge or the wrong localized error path is shown.
- Suggested fix:
  - Add a deterministic parser test layer that feeds the same fixtures and synthetic malformed cases through both parser paths and asserts exact output parity: points, timestamps, segment boundaries, deduplication, and error codes.
  - Add a focused regression test for `FileUpload` error-code mapping so every supported `ParseError.code` is intentionally covered.
  - Best TDD entry point: a RED test for parser/worker parity on a segmented Google fixture plus one RED test for unmapped parser error codes in `FileUpload`.

### TE-002 — Confirmed: the export state machine is still effectively untested
- Severity: High
- Confidence: High
- Status: Confirmed issue
- Evidence:
  - Export controller flow: `src/lib/useExportController.ts:28-243`
  - Encoder loop/download behavior: `src/lib/videoEncoder.ts:40-225`
  - Export UI gates and codec probing: `src/components/ExportPanel.tsx:47-165` and `src/components/ExportPanel.tsx:201-280`
  - Current Playwright export coverage stops at opening/configuring the panel: `e2e/travelback.spec.ts:1111-1173`, `e2e/travelback.spec.ts:1237-1272`
- Why this is a problem:
  - The riskiest export behavior is inside async controller/encoder logic: abort handling, map resize/reset cleanup, object URL lifecycle, picker fallback, progress restoration, and unsupported-codec gating. None of that is asserted today.
- Concrete failure scenario:
  - A regression causes `resetSize()` cleanup to be skipped after an export failure, or `downloadVideo()` to report success incorrectly, or `exportTrack()` to leave stale `exportedVideoUrl` blobs around. The current suite still passes because it never presses `Start Export`, never injects a mock encoder, and never verifies cancel/success cleanup behavior.
- Suggested fix:
  - Add hook/unit tests around `useExportController` with a fake `MapViewHandle`, mocked `exportVideo`, controllable aborts, and explicit assertions for map resize/reset, progress restoration, toast paths, and blob URL cleanup.
  - Add unit tests around `videoEncoder.ts` for config clamping, abort-before-finalize, filename sanitization, picker cancellation, and fallback download behavior.
  - If real-browser export remains too expensive for CI, add a mockable export seam and one integration test that exercises the overlay/cancel/done states through that seam.

### TE-003 — Confirmed: static smoke protections are not part of the main CI-oriented static Playwright command
- Severity: Medium
- Confidence: High
- Status: Confirmed issue
- Evidence:
  - Static scripts in `package.json:12-17`
  - Static Playwright config in `playwright.static.config.ts:5-45`
  - Static smoke coverage in `scripts/smoke-static.mjs:76-179`
  - CSP hardening and preview-server logic in `scripts/harden-static-export.mjs:14-103` and `scripts/serve-static.mjs:69-158`
- Why this is a problem:
  - `npm run test:e2e:static` chains build plus smoke plus Playwright, but `npm run test:e2e:static:ci` only runs Playwright against the static config. That means the CI-oriented command can miss the exact script-level invariants that protect the static deployment path.
- Concrete failure scenario:
  - A change breaks CSP hardening, cache headers, path traversal handling, tool-residue checks, or local-only style constraints. `npm run test:e2e:static:ci` can still pass because the browser suite does not assert those script-level invariants, and the smoke gate is not part of that command.
- Suggested fix:
  - Replace the split commands with one canonical static CI command that always runs build + `smoke:static` + static Playwright.
  - Add a small script-level test harness for `serve-static.mjs` edge cases such as bad percent encoding, `HEAD`, `405`, traversal rejection, and base-path redirects.

### TE-004 — Confirmed: the Playwright suite still relies on fixed sleeps and a global retry to hide timing uncertainty
- Severity: Medium
- Confidence: High
- Status: Confirmed issue
- Evidence:
  - Global retries in `playwright.config.ts:7-11` and `playwright.static.config.ts:7-11`
  - Blanket settle in `e2e/travelback.spec.ts:134-147`
  - Sampling helper sleeps in `e2e/travelback.spec.ts:63-84`
  - Additional direct waits at `e2e/travelback.spec.ts:189`, `e2e/travelback.spec.ts:217`, `e2e/travelback.spec.ts:294-295`, `e2e/travelback.spec.ts:309`, `e2e/travelback.spec.ts:338`, `e2e/travelback.spec.ts:224`, `e2e/travelback.spec.ts:261`
- Why this is a problem:
  - Fixed sleeps make the suite slower while still leaving it sensitive to CI GPU/WebGL timing, background-tab throttling, and map-style load variance. `retries: 1` then masks the first failure instead of removing the root cause.
- Concrete failure scenario:
  - A slow CI runner takes longer than the baked-in `waitForTimeout()` windows for map initialization or camera stabilization. The first run fails and the retry passes, producing a flaky green build that is hard to trust and hard to diagnose.
- Suggested fix:
  - Replace raw sleeps with event-driven assertions against `__travelbackDebug`, route/trail source presence, map idle readiness, and observable playback-state changes.
  - Reduce or remove retries after the suite is made event-driven.
  - For camera tests, prefer deterministic stepping or debug-state polling over long wall-clock waits.

### TE-005 — Likely risk: “mobile” coverage is viewport simulation only, so touch-specific paths are largely unverified
- Severity: Medium
- Confidence: Medium-High
- Status: Likely risk
- Evidence:
  - Playwright projects only launch Desktop Chrome in `playwright.config.ts:21-38` and `playwright.static.config.ts:21-38`
  - Mobile tests use viewport resizing only at `e2e/travelback.spec.ts:560-664` and `e2e/travelback.spec.ts:779-805`
  - Touch-specific handlers exist in `src/components/JourneyCreator.tsx:318-347`, `src/components/TimelineSelector.tsx:365-395` and `src/components/TimelineSelector.tsx:449-452`, and `src/components/ExportPanel.tsx:84-94`
- Why this is a problem:
  - The suite validates mobile layout, but not real mobile interaction semantics. Desktop Chrome with a small viewport does not exercise the same touch event paths, browser behavior, or platform quirks as actual touch-enabled Chromium/WebKit.
- Concrete failure scenario:
  - Timeline handle dragging works with mouse events in CI, but touchstart/touchmove ordering fails on real phones. Or the export panel’s swipe-to-close path works in desktop simulation but misfires on mobile Safari. The current suite would stay green because it does not run a touch-capable project.
- Suggested fix:
  - Add at least one real mobile project (`devices['Pixel 7']` or similar) and one WebKit mobile project if iOS behavior matters.
  - Promote a small subset of high-value touch flows into that lane: timeline trim, Journey Creator point placement/drag, and export panel touch-close behavior.

## TDD opportunities

1. Parser/worker parity:
   Start with a failing shared-fixture test asserting exact equality of parser and worker outputs, including `segmentStartIndices` and error codes.
2. Export controller:
   Start with a failing test asserting export cancellation restores pre-export progress, resets map size, and leaves `exportState` back at `idle`.
3. Static CI contract:
   Start with a failing script-level test showing that `test:e2e:static:ci` currently skips `smoke:static` protections.
4. Flake reduction:
   Start with one failing camera/playback test rewritten without `waitForTimeout()`, using only observable readiness signals.
5. Mobile touch lane:
   Start with one failing touch-project test for timeline-handle drag on a mobile device profile.

## Coverage gaps summary

- No unit/component harness for parser, interpolation, camera, playback, export, or modal logic.
- No deterministic parity tests between `src/lib/parser.ts` and `public/workers/trackParser.worker.js`.
- No tests that execute `Start Export` through a mockable or real export path.
- No CI-canonical command that guarantees static smoke checks run together with static Playwright.
- No true touch-device Playwright project despite touch-specific code paths in production.

## Final sweep note

Examined the repository-wide test surface, relevant production files, static scripts, public worker/runtime assets, Playwright configs, all current E2E fixtures, and the main `.context` project/conventions/review docs listed above. I did not do a line-by-line review of generated build artifacts under `.next/`, `out/`, `playwright-report/`, `test-results/`, `.omc/`, or `.omx/` because they are derived/runtime state rather than source-of-truth for test design; the source files that generate or verify those artifacts were reviewed instead. No code or test implementation changes were made.
