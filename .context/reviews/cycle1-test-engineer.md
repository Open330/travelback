# Cycle 1 Deep Review — Test Engineer

Repository: `/Users/hletrd/flash-shared/Travelback`  
Date: 2026-04-25  
Lane: test-engineer

## Scope and method

- Reviewed repository test posture, test scripts, Playwright harness, fixtures, source code, public worker, and static-export scripts.
- Excluded generated/vendor/runtime output directories: `node_modules/`, `.git/`, `.next/`, `out/`, `test-results/`, `playwright-report/`, `.omx/`, `.omc/`.
- Fresh verification commands run during review:
  - `npm run lint` — passed.
  - `npm run typecheck` — passed (`next typegen && tsc --noEmit`).
  - `npx playwright test -c playwright.config.ts --list` — listed 74 Chromium tests in `e2e/travelback.spec.ts`.
- No source/test modifications were made; this review file is the only intended write.
- `$tdd` skill path `/Users/hletrd/.codex/skills/tdd/SKILL.md` was missing, so I applied the test-engineer/TDD review posture directly.

## File inventory reviewed

### Test and fixture files
- `e2e/travelback.spec.ts` — Playwright e2e suite, 74 tests.
- `e2e/fixtures/antimeridian.gpx`
- `e2e/fixtures/google-mixed-duplicate-branches.json`
- `e2e/fixtures/google-records.json`
- `e2e/fixtures/google-revisit-segments.json`
- `e2e/fixtures/google-semantic-location.json`
- `e2e/fixtures/google-semantic-segments.json`
- `e2e/fixtures/google-timeline-edits.json`
- `e2e/fixtures/invalid-elevation.gpx`
- `e2e/fixtures/korea-japan.gpx`
- `e2e/fixtures/korea-japan.json`
- `e2e/fixtures/korea-japan.kml`
- `e2e/fixtures/multiline-entity.gpx`
- `e2e/fixtures/point-placemarks.kml`
- `e2e/fixtures/sample.gpx`
- `e2e/fixtures/segmented-city-hop.gpx`
- `e2e/fixtures/single-quote-attrs.gpx`
- `e2e/fixtures/tiny-trim.gpx`

### Harness/config/script files
- `package.json`
- `.github/workflows/deploy-pages.yml`
- `playwright.config.ts`
- `playwright.static.config.ts`
- `scripts/fetch-map-styles.mjs`
- `scripts/harden-static-export.mjs`
- `scripts/run-dev-e2e.mjs`
- `scripts/run-static-e2e.mjs`
- `scripts/serve-static.mjs`
- `scripts/smoke-static.mjs`

### Source/runtime files
- `public/workers/trackParser.worker.js`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/Controls.tsx`
- `src/components/ElevationProfile.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/components/ExportPanel.tsx`
- `src/components/FileUpload.tsx`
- `src/components/GlobalToolbar.tsx`
- `src/components/GoogleGuide.tsx`
- `src/components/JourneyCreator.tsx`
- `src/components/KeyboardHelp.tsx`
- `src/components/MapView.tsx`
- `src/components/ModalDialog.tsx`
- `src/components/SceneEditor.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/TimelineSelector.tsx`
- `src/components/Toast.tsx`
- `src/components/TrackToolbar.tsx`
- `src/components/TrackWorkspace.tsx`
- `src/lib/camera.ts`
- `src/lib/env.ts`
- `src/lib/i18n.ts`
- `src/lib/interpolate.ts`
- `src/lib/parser.ts`
- `src/lib/useExportController.ts`
- `src/lib/usePlaybackController.ts`
- `src/lib/videoEncoder.ts`
- `src/styles/vitro-base.css`
- `src/types.ts`

Non-code public assets (`public/*.svg`, fonts, map style JSON, `public/sample-trip.gpx`, `src/app/favicon.ico`) were inventoried and considered only as fixtures/assets; no generated/vendor files were reviewed as source.

## Findings

### 1. No unit/component test layer protects the pure parser, math, camera, export, and hook logic

- **Region:** `package.json:5-17`, `package.json:28-37`, `src/lib/parser.ts:25-700`, `src/lib/interpolate.ts:18-185`, `src/lib/camera.ts:19-428`, `src/lib/videoEncoder.ts:32-235`, `src/lib/usePlaybackController.ts:17-220`, `src/lib/useExportController.ts:44-270`.
- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed
- **Evidence:** `package.json` exposes lint/typecheck/e2e/static smoke scripts only. The only test file found outside fixtures is `e2e/travelback.spec.ts`; Playwright lists 74 e2e tests, but there is no unit runner, component test runner, or colocated `*.test.ts(x)` coverage.
- **Concrete failure scenario:** A change to `computeCumulativeDistances()` or `flattenGoogleSegments()` can break distance calculations or dedupe semantics while broad e2e tests still pass because they assert only visible titles/counts for most fixtures. Failures would surface late through slow browser tests or user imports rather than fast TDD feedback.
- **Suggested test/fix:** Add a unit test layer for pure modules first, then component/hook tests where behavior cannot be asserted through pure functions. Initial TDD targets:
  - `src/lib/parser.ts`: GPX/KML/Google JSON happy paths, malformed JSON/XML, unsupported shapes, too few points, depth limit, point limit, segment boundaries.
  - `src/lib/interpolate.ts`: antimeridian interpolation, segment gaps, duplicate points, distance formatting, invalid durations.
  - `src/lib/camera.ts`: scene normalization, transition blending, antimeridian overview/follow cameras.
  - `src/lib/videoEncoder.ts`: config clamping, max-size rejection, abort-before/after-render behavior, filename sanitization, download picker/fallback branches with DOM stubs.
  - Hooks/controllers: export cancellation and object URL cleanup with mocked `MapViewHandle`, `URL`, and encoder.

### 2. Duplicated Google JSON worker parser has no behavioral parity contract with the main parser

- **Region:** `src/lib/parser.ts:253-539`, `src/lib/parser.ts:557-640`, `public/workers/trackParser.worker.js:1-343`, `scripts/smoke-static.mjs:183-213`.
- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed
- **Evidence:** The public worker reimplements the Google parser in plain JS. `smoke-static.mjs` checks selected constants/error-code strings only, not output parity. `parseTrackFile()` uses `new Worker(...)` for JSON imports when available.
- **Concrete failure scenario:** A future parser bugfix for `semanticSegments`, duplicate handling, depth checking, or point limits lands in `src/lib/parser.ts` but not in `public/workers/trackParser.worker.js`. Small fallback/manual parsing behaves one way while production browser JSON imports behave another way; large files are worker-only, so the regression can escape until a real Takeout file is imported.
- **Suggested test/fix:** Add worker/main contract tests over every JSON fixture plus deliberately malformed cases. The test should feed the same text to `parseGoogleLocationHistory()` and to the worker parser and assert equal point count, segment starts, first/last points, timestamps, and error codes. Prefer extracting shared parser logic into a worker-compatible module to delete the duplicate implementation; if that is too large, keep the parity test as the safety net.

### 3. Real video encoding, abort, and download paths are only stubbed in e2e

- **Region:** `e2e/travelback.spec.ts:1297-1306`, `src/components/ExportPanel.tsx:37-46`, `src/components/ExportPanel.tsx:137-166`, `src/lib/useExportController.ts:105-245`, `src/lib/videoEncoder.ts:46-169`, `src/lib/videoEncoder.ts:181-235`.
- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed
- **Evidence:** The e2e export completion test enables `travelback-export-test-stub` and asserts a download link. The real `exportVideo()` dynamic import, Mediabunny output pipeline, `waitForIdle` loop, abort paths, `URL.createObjectURL`/revoke behavior, `downloadVideo()` picker/fallback branches, and codec probing are not exercised by tests.
- **Concrete failure scenario:** A CSP/static-export change blocks the Mediabunny dynamic import, `downloadVideo()` fails under File System Access API cancellation, or abort leaves the map resized/object URL leaked. The stubbed e2e still passes because it bypasses the production encoder and download behavior.
- **Suggested test/fix:** Add unit tests with a mocked `mediabunny` module for `exportVideo()` frame count, clamping, max-size rejection, abort behavior, filename sanitization, and progress callbacks. Add controller tests with mocked `MapViewHandle`, `URL`, and `downloadVideo()` for success, map idle timeout, abort, cleanup, and prior-export preservation. Keep the stub e2e, but add one quarantined/smoke browser test for a tiny real canvas export if CI supports WebCodecs reliably.

### 4. Fixed sleeps in Playwright tests create avoidable flaky-test risk and hide readiness bugs

- **Region:** `e2e/travelback.spec.ts:78-86`, `e2e/travelback.spec.ts:529`, `e2e/travelback.spec.ts:545`, `e2e/travelback.spec.ts:840`, `e2e/travelback.spec.ts:868`, `e2e/travelback.spec.ts:945`, `e2e/travelback.spec.ts:957`, `e2e/travelback.spec.ts:1040`, `e2e/travelback.spec.ts:1475`, `e2e/travelback.spec.ts:1512`.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed
- **Evidence:** The suite uses `page.waitForTimeout()` and raw `setTimeout` sampling for map/camera/layout readiness. Several sleeps precede assertions that already have observable conditions available through DOM, debug map state, or Playwright polling.
- **Concrete failure scenario:** On a slow CI runner, map layers attach after a 750 ms/3 s wait and the test fails intermittently; on a fast runner, a sleep masks an actual race by delaying until the app eventually self-heals. Retries then hide first-attempt flakes.
- **Suggested test/fix:** Replace fixed sleeps with readiness predicates:
  - For map/layer tests, poll `window.__travelbackDebug.getMapState()` until route/trail/marker/reference-grid state is present.
  - For camera tests, start sampling only after `isPlaying`/button state and camera baseline change are observed.
  - For layout tests, use `expect.poll` on bounding boxes until stable across two samples instead of a blind wait.
  - For full journey tests, wait on visible track title, layer state, or export-panel state rather than fixed 1 s delays.

### 5. Playwright retries and single-worker execution reduce flake visibility and concurrency coverage

- **Region:** `playwright.config.ts:13-15`, `playwright.static.config.ts:13-15`, `playwright.config.ts:44-48`, `scripts/run-dev-e2e.mjs:35-56`.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed
- **Evidence:** Both configs set `retries: 1`, `workers: 1`, and `fullyParallel: false`. The dev runner may reuse an existing Next dev server if `.next/dev/lock` is active.
- **Concrete failure scenario:** A test that leaks `localStorage`, app debug state, object URLs, route interception, or map resources passes in serial but fails when the suite is sharded or run with default Playwright parallelism. A local stale dev server can also make `npm run test:e2e` validate old code rather than the current checkout.
- **Suggested test/fix:** Keep the conservative CI lane if needed, but add a separate no-retry flake-detection lane (`PLAYWRIGHT_REUSE_EXISTING_SERVER=0`, `retries: 0`) and periodic parallel/sharded run. For the wrapper, add an opt-out/default that starts a fresh server unless reuse is explicitly requested, and assert the served build/dev server is reachable from the current checkout.

### 6. Fixture coverage is broad for happy-path imports but thin for negative/parser-limit cases

- **Region:** `e2e/fixtures/*`, `e2e/travelback.spec.ts:403-463`, `e2e/travelback.spec.ts:1381-1458`, `src/lib/parser.ts:466-483`, `src/lib/parser.ts:541-699`, `public/workers/trackParser.worker.js:291-341`.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed
- **Evidence:** Fixtures cover several GPX/KML/Google JSON variants, single-quoted XML, multiline entities, antimeridian, and invalid elevation. Missing fixtures/tests for invalid JSON syntax, unsupported Google JSON shapes, excessive JSON depth, worker message too large, too few points, point limit boundaries, FileReader errors, and JSON worker crash/fallback behavior.
- **Concrete failure scenario:** A real user uploads a Takeout JSON with metadata only, deeply nested malformed JSON, a one-point route, or a huge file that must be rejected by worker/main limits. The app may show the wrong localized error, attempt expensive parsing, or silently produce an empty track without a regression test catching it.
- **Suggested test/fix:** Add small fixture generators/unit tests for each parser error code: `INVALID_GOOGLE_JSON`, `UNSUPPORTED_GOOGLE_FORMAT`, `JSON_DEPTH_EXCEEDED`, `FILE_TOO_LARGE`, `TOO_FEW_POINTS`, `TOO_MANY_POINTS`, `XML_PARSE_ERROR`, `READ_FAILED`. Assert both thrown `ParseError.code` and user-facing error classification in `FileUpload`/e2e.

### 7. Timeline trimming and scene/export reset behavior is mostly e2e-only and lacks direct boundary tests

- **Region:** `src/app/page.tsx:288-315`, `src/components/TimelineSelector.tsx:182-319`, `e2e/travelback.spec.ts:718-804`, `e2e/travelback.spec.ts:1087-1108`, `e2e/travelback.spec.ts:1318-1365`.
- **Severity:** Medium
- **Confidence:** Medium
- **Status:** Likely
- **Evidence:** There are valuable e2e tests for trimming not collapsing to one point, distance scale, keyboard trimming, clearing scenes, and export reset. The underlying index conversion/segment-start preservation/reset behavior is still not directly tested at boundary values and depends on geometry-driven Playwright interactions.
- **Concrete failure scenario:** A trim that starts exactly on a segment boundary keeps `segmentStartIndices: [0]` or drops a needed boundary, causing playback distance to bridge a gap only for certain tracks. The current e2e fixtures may not exercise exact boundary ratios or all drag/keyboard/no-op paths deterministically.
- **Suggested test/fix:** Extract/test a pure `sliceTrackByIndexes(fullTrack, startIdx, endIdx)` helper and `ratioToIndex`-style boundary cases (start at 0, end at last, exact segment start, one-point attempted range, no-op clicks). Then keep e2e for one representative user flow.

### 8. Map geometry helpers and antimeridian rendering rely on debug-state e2e rather than unit-level geometry assertions

- **Region:** `src/components/MapView.tsx:93-206`, `src/components/MapView.tsx:699-781`, `src/components/JourneyCreator.tsx:72-94`, `e2e/travelback.spec.ts:838-899`, `e2e/travelback.spec.ts:973-993`.
- **Severity:** Medium
- **Confidence:** Medium
- **Status:** Likely
- **Evidence:** E2E asserts that layers/sources exist and one antimeridian camera scenario does not zoom to the world. The helper output shapes for segmented tracks, antimeridian wrapping, degenerate bounds, and partial trail geometry are private and have no direct contract tests.
- **Concrete failure scenario:** A refactor to `buildTrackGeometry()` or `buildFitBounds()` creates a LineString that bridges from +179° to -179° across the world, but sources/layers still exist and broad e2e checks pass; users see a route line crossing the whole map.
- **Suggested test/fix:** Move geometry builders into a pure module or export behind a test-only module boundary. Add tests for MultiLineString segmentation, antimeridian wrapping, partial trail endpoint inclusion, degenerate two-point bounds, and journey line wrapping.

### 9. Accessibility and i18n coverage samples a few locales/flows but lacks systematic key and modal interaction tests

- **Region:** `src/lib/i18n.ts:1778-1847`, `src/components/ModalDialog.tsx:69-173`, `src/components/GoogleGuide.tsx:135-399`, `src/components/ExportPanel.tsx:181-431`, `e2e/travelback.spec.ts:251-301`, `e2e/travelback.spec.ts:1231-1245`.
- **Severity:** Low
- **Confidence:** Medium
- **Status:** Likely
- **Evidence:** E2E verifies several translated labels and two dialog focus traps. There is no test that all translation keys exist for every supported locale, no snapshot/contract for missing-key fallback, and no systematic nested-modal/top-modal escape behavior despite `ModalDialog` maintaining global modal stack state.
- **Concrete failure scenario:** A new translation key is added in English only, so a non-English flow shows raw keys or fallback English. A nested confirmation dialog closes the wrong modal on Escape because top-modal stack behavior regressed, but only the guide/export happy paths are tested.
- **Suggested test/fix:** Add a translation-key completeness test over `translations` and component tests for `ModalDialog` stack behavior: focus first visible control, Tab wrap, Escape only closes the top modal, `aria-hidden` app-root toggling restores after close.

### 10. Static-export hardening script has smoke assertions but no focused unit tests for HTML edge cases

- **Region:** `scripts/harden-static-export.mjs:46-130`, `scripts/smoke-static.mjs:111-155`, `.github/workflows/deploy-pages.yml:28-32`.
- **Severity:** Low
- **Confidence:** Medium
- **Status:** Confirmed
- **Evidence:** CI runs build plus static smoke before deploy, and smoke checks the resulting `out/index.html` CSP invariants. The hardener itself is not unit-tested against representative HTML inputs; functions are script-local.
- **Concrete failure scenario:** Next changes the inline bootstrap serialization shape, `inlineTravelbackBootstrap()` fails to replace it or hashes the wrong decoded content. Smoke may catch the current built artifact, but a focused test would identify exactly which HTML transformation regressed and cover multiple script/meta shapes without a full build.
- **Suggested test/fix:** Extract pure hardening helpers into a small module and test: multiple inline scripts, no inline scripts, entity-decoded scripts, missing CSP meta, already-hardened CSP, malformed bootstrap payload, and no `frame-ancestors` in meta CSP.

## TDD opportunities prioritized

1. **Parser/worker parity first:** red tests against all JSON fixtures plus malformed/depth/limit cases before refactoring shared parser code.
2. **Export controller and video encoder:** red tests for abort, cleanup, clamping, and real encoder integration with mocked Mediabunny before any export UX changes.
3. **Track slicing/segment boundaries:** extract pure slicing/index helpers with boundary tests before changing timeline UX.
4. **Map geometry pure helpers:** test antimeridian and segmentation outputs before map rendering refactors.
5. **Modal/i18n completeness:** add deterministic component/key tests before adding more localized UI.

## E2E harness health notes

- Strengths: broad browser coverage of primary workflows; fixtures cover common GPX/KML/Google formats; static deploy CI runs lint, typecheck, audit, build, smoke, and static e2e.
- Weaknesses: one giant serial Playwright file, one browser/project, retries enabled by default, fixed sleeps, no no-retry flake lane, no unit/component layer, and dev runner may reuse an existing server.

## Missed-issue sweep

- Searched for `test.only`, `test.skip`, fixed sleeps, timers, localStorage test flags, worker/parser duplication, export stub paths, and package scripts.
- No `test.only` or `test.skip` was found in the e2e suite.
- Confirmed there are no colocated `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files outside `e2e/travelback.spec.ts`.
- Reviewed prior review/planning directories only as context inventory; findings above are based on current source/config inspection, not copied from archived reviews.

## Skipped-file confirmation

Skipped only generated/vendor/runtime artifacts and binary/static assets not relevant to test strategy:

- Generated/vendor/runtime: `node_modules/`, `.git/`, `.next/`, `out/`, `test-results/`, `playwright-report/`, `.omx/`, `.omc/`, `tsconfig.tsbuildinfo`, `next-env.d.ts`.
- Static/binary assets considered but not line-reviewed as executable code: `public/*.svg`, `public/fonts/*`, `public/map-styles/*.json`, `public/sample-trip.gpx`, `src/app/favicon.ico`.

