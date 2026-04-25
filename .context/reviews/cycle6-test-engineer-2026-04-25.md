# Cycle 6 Test Engineering Review

## Scope and inventory

Reviewed test-relevant surfaces end to end, not a sample:

- Test harness and CI: `package.json`, `playwright.config.ts`, `playwright.static.config.ts`, `.github/workflows/deploy-pages.yml`
- Test runners and hardening scripts: `scripts/run-dev-e2e.mjs`, `scripts/run-static-e2e.mjs`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`, `scripts/harden-static-export.mjs`, `scripts/fetch-map-styles.mjs`
- Existing automated tests: `e2e/travelback.spec.ts`
- Parser / math / export / controller logic: `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/videoEncoder.ts`, `src/lib/useExportController.ts`, `src/lib/usePlaybackController.ts`, `src/lib/i18n.ts`, `src/lib/env.ts`, `src/types.ts`
- App / component surfaces that drive E2E behavior: `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/{Toast,ErrorBoundary,GoogleGuide,ElevationProfile,TrackToolbar,Controls,MapView,ExportPanel,FileUpload,ModalDialog,TimelineSelector,GlobalToolbar,TrackWorkspace,ThemeToggle,JourneyCreator,KeyboardHelp,SceneEditor}.tsx`
- Fixture set: every file under `e2e/fixtures/`

## Findings

### 1. Confirmed: the repo still has no unit or integration test layer for the highest-risk logic
- Severity: High
- Confidence: High
- Evidence:
  - `package.json:5-18` defines only `test:e2e`, `test:e2e:dev`, `test:e2e:static(:ci)`, and `smoke:static`.
  - `.github/workflows/deploy-pages.yml:27-33` runs Playwright and static smoke only.
  - High-risk unprotected logic lives in `src/lib/parser.ts:43-679`, `public/workers/trackParser.worker.js:1-321`, `src/lib/interpolate.ts:3-185`, `src/lib/camera.ts:19-428`, `src/lib/videoEncoder.ts:40-225`, `src/lib/useExportController.ts:44-270`, and `src/lib/usePlaybackController.ts:17-248`.
- Failure scenario:
  - A regression in antimeridian math, Google JSON deduping, scene normalization, or export abort cleanup can ship while all current E2E tests stay green because those paths are only exercised indirectly and sparsely.
  - Parser edge cases such as `JSON_DEPTH_EXCEEDED`, `FILE_TOO_LARGE`, and worker fallback are especially exposed because reproducing them through browser E2E is expensive and currently absent.
- Suggested fix:
  - Add a fast unit/integration layer around pure logic first: parser branches, worker/main-thread parity, distance/bearing math, scene normalization, playback timing, export abort cleanup.
  - Keep Playwright for cross-surface confidence, not first-line regression protection.

### 2. Confirmed: the Playwright suite contains multiple fixed sleeps that will remain flaky under slower CI or browser variance
- Severity: High
- Confidence: High
- Evidence:
  - `e2e/travelback.spec.ts:490`, `:506`, `:800`, `:828`, `:905`, `:917`, `:1302`, `:1339` use `page.waitForTimeout(...)`.
  - `collectCameraSamples` also uses polling via raw `setTimeout` loops at `e2e/travelback.spec.ts:64-85`.
- Failure scenario:
  - On a busy CI host, route layers or camera motion can settle after the arbitrary delay; the same test flips between pass/fail without product changes.
  - On a fast host, the sleeps simply slow the suite without improving signal.
- Suggested fix:
  - Replace sleeps with state-based waits: `expect.poll(...)` on `window.__travelbackDebug`, layer presence, playback progress, or explicit UI state.
  - For camera-motion tests, wait for the first non-baseline debug sample before collecting assertions.

### 3. Confirmed: many E2E assertions are copy-coupled and locale-coupled instead of behavior-coupled
- Severity: Medium
- Confidence: High
- Evidence:
  - Examples: `e2e/travelback.spec.ts:240`, `:252`, `:275-285`, `:299`, `:384`, `:776`, `:853`, `:919`, `:937`, `:960`, `:1132-1213`, `:1323-1349`.
  - The app already exposes stable hooks in many places, such as `data-testid` on map, toolbar, timeline, and track title surfaces (`src/components/TrackWorkspace.tsx:122-136`, `src/components/TrackToolbar.tsx:96-99`, `src/components/TimelineSelector.tsx:338-555`, `src/components/MapView.tsx:988-1019`).
- Failure scenario:
  - A translation copy update or small wording tweak breaks unrelated tests even when behavior is unchanged.
  - This is especially costly in a multilingual UI because the suite mixes English, Korean, Japanese, Chinese, and Spanish exact-text assertions.
- Suggested fix:
  - Prefer stable `data-testid`, role, and state assertions over visible-copy assertions.
  - Keep a few explicit localization smoke tests, but move the bulk of behavioral tests off exact strings.

### 4. Confirmed: export regression protection is heavily stubbed; the real encoder and cancellation paths are not automated
- Severity: Medium-High
- Confidence: High
- Evidence:
  - The only successful export flow test is the local stub path in `e2e/travelback.spec.ts:1194-1204`.
  - The stub is enabled through local storage gates in `src/lib/useExportController.ts:20-29` and `src/components/ExportPanel.tsx:35-44`.
  - Real failure-prone logic exists in `src/lib/videoEncoder.ts:40-159`, `src/lib/useExportController.ts:101-244`, and `src/components/MapView.tsx:515-568`.
- Failure scenario:
  - A regression in `AbortError` handling, `waitForIdle` timeout behavior, `output.finalize()` cleanup, or download fallback can ship undetected because CI never executes the real export path.
  - Users will hit the break only after long-running exports.
- Suggested fix:
  - Add at least one integration test around cancellation and cleanup, even if the actual codec stays stubbed.
  - Minimum missing cases: cancel mid-export, map idle timeout, prior export replaced by new export, download fallback vs picker behavior.

### 5. Confirmed: parser/worker negative-path coverage is still missing despite complex error-code and fallback logic
- Severity: Medium-High
- Confidence: High
- Evidence:
  - Main-thread parser branches: `src/lib/parser.ts:446-679`.
  - Worker parity and worker-only limits: `public/workers/trackParser.worker.js:206-321`.
  - Current coverage is almost entirely happy-path imports plus one unsupported `.txt` upload in `e2e/travelback.spec.ts:1277-1290`.
  - `scripts/smoke-static.mjs:172-190` checks constant parity only; it does not validate runtime behavior.
- Failure scenario:
  - Worker/main-thread error codes drift, oversized JSON handling regresses, or unsupported Google formats start surfacing the wrong error to users without any failing automated test.
- Suggested fix:
  - Add direct tests for `INVALID_GOOGLE_JSON`, `JSON_DEPTH_EXCEEDED`, `UNSUPPORTED_GOOGLE_FORMAT`, `FILE_TOO_LARGE`, `TOO_FEW_POINTS`, `TOO_MANY_POINTS`, worker creation failure, and worker crash fallback for small files.

### 6. Likely: CI only protects the static-export runtime; the dev-server E2E path is effectively ungoverned
- Severity: Medium
- Confidence: High
- Evidence:
  - `package.json:12-15` distinguishes dev and static E2E commands.
  - `.github/workflows/deploy-pages.yml:31-33` runs only `smoke:static` and `test:e2e:static:ci`.
- Failure scenario:
  - A Next dev-only regression in hydration, bootstrap ordering, or route handling can quietly break local development while CI stays green.
  - This is particularly relevant because `playwright.config.ts:44-49` and `playwright.static.config.ts:44-49` exercise different servers and base URLs.
- Suggested fix:
  - Add at least a small dev smoke shard in CI, or run the full dev suite nightly if build time is sensitive.

### 7. Risk needing manual validation: journey-creator overlay lifecycle during style reloads is still under-tested
- Severity: Medium
- Confidence: Medium
- Evidence:
  - `src/components/JourneyCreator.tsx:255-453` maintains its own source/layer lifecycle, retries map readiness, and rebinds after `style.load`.
  - Existing tests cover creation basics and new-route cleanup, but not active editing across style changes or map retries (`e2e/travelback.spec.ts:429-589`, `:826-880`).
- Failure scenario:
  - While a user is actively drawing, a style reload or retry can orphan point layers, duplicate listeners, or clear interaction unexpectedly.
- Suggested fix:
  - Add a Playwright case that opens Journey Creator, places points, cycles map style, and verifies points remain editable with no duplicate click effects.

### 8. Risk needing manual validation: nested modal/focus-stack behavior has only partial regression coverage
- Severity: Low-Medium
- Confidence: Medium
- Evidence:
  - Shared modal stack logic is centralized in `src/components/ModalDialog.tsx:31-188`.
  - Nested usage exists in `src/components/SceneEditor.tsx:669-697` and `src/components/JourneyCreator.tsx:831-850`.
  - Current tests cover guide/export dialog focus trapping (`e2e/travelback.spec.ts:249-262`, `:1130-1144`) but not nested-dialog restore order.
- Failure scenario:
  - Opening a confirm dialog from inside Scene Editor or Journey Creator can restore focus to the wrong element or leave the app root incorrectly inert after close.
- Suggested fix:
  - Add a nested-modal focus-restoration test for scene preset replacement and discard-confirm flows.

## TDD opportunities

- `src/lib/parser.ts:446-679` and `public/workers/trackParser.worker.js:206-321`
  - Best TDD target in the repo. The branch count is high, inputs are file-fixture driven, and failures are easy to express as executable examples.
- `src/lib/camera.ts:19-428` and `src/lib/interpolate.ts:18-142`
  - Good TDD targets for antimeridian, scene gaps, overlap normalization, and degenerate-distance cases.
- `src/lib/useExportController.ts:101-244` plus `src/components/MapView.tsx:515-568`
  - Good TDD target for export cancel/cleanup sequencing because current behavior depends on race-prone async orchestration.

## Final sweep

Checked for commonly missed testing surfaces after the main pass:

- Production-only verification: `.github/workflows/deploy-pages.yml`, `scripts/smoke-static.mjs`, `scripts/harden-static-export.mjs`, `scripts/serve-static.mjs`
- Worker/runtime split: `public/workers/trackParser.worker.js`
- Fixture completeness: every file under `e2e/fixtures/`

Additional sweep result:

- No orphaned fixture files were found; every checked fixture is either referenced directly in `e2e/travelback.spec.ts` or exercised indirectly through the static smoke path.
- The biggest remaining weaknesses are not “missing files”; they are missing low-level tests, real export-path coverage, and persistent Playwright timing/copy brittleness.
