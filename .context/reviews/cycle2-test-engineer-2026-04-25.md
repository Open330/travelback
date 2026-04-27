# Cycle 2 Test Engineer Review — 2026-04-25

## Scope and inventory

Followed `.context/development/01-conventions.md`. This is a review-only pass; I did not change application code.

Inventory examined first, then reviewed by source area:

- `src/`: 31 files total
  - `src/app/`: `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico`
  - `src/components/`: 17 React components (`Controls`, `ElevationProfile`, `ErrorBoundary`, `ExportPanel`, `FileUpload`, `GlobalToolbar`, `GoogleGuide`, `JourneyCreator`, `KeyboardHelp`, `MapView`, `ModalDialog`, `SceneEditor`, `ThemeToggle`, `TimelineSelector`, `Toast`, `TrackToolbar`, `TrackWorkspace`)
  - `src/lib/`: 8 files (`camera`, `env`, `i18n`, `interpolate`, `parser`, `useExportController`, `usePlaybackController`, `videoEncoder`)
  - `src/types.ts`, `src/styles/vitro-base.css`
- `e2e/`: one Playwright spec, `e2e/travelback.spec.ts`, plus 17 fixtures.
- `scripts/`: 6 Node scripts (`fetch-map-styles`, `harden-static-export`, `run-dev-e2e`, `run-static-e2e`, `serve-static`, `smoke-static`).
- `public/workers/trackParser.worker.js` and public static fixtures/assets relevant to runtime parsing/static export.
- There are **0 unit/component test files under `src/`**.

Verification run during review:

- `npm run lint` → passed.
- `npm run typecheck` → passed (`next typegen` and `tsc --noEmit`).

## Executive summary

Test health: **NEEDS ATTENTION**.

The E2E suite is broad and valuable, especially for import flows, static export, accessibility landmarks, mobile layout, map style cycling, and export-result state. The main reliability risk is that nearly all behavior is guarded through one large Playwright file. Core deterministic logic (parser, worker parser, interpolation, camera scene normalization, export controller, static scripts) has no fast unit/integration harness, so regressions will be slow to isolate and many branch-level failures can pass behind weak UI assertions.

## Findings

### TE-01 — Core business logic has no unit coverage

- **Region:** `src/lib/parser.ts:49-700`, `src/lib/interpolate.ts:18-185`, `src/lib/camera.ts:19-428`, `src/lib/videoEncoder.ts:32-235`, `src/lib/usePlaybackController.ts:17-248`; inventory confirmed no `src/**/*.test.*` or `src/**/*.spec.*` files.
- **Failure scenario:** A regression in distance math, antimeridian interpolation, scene normalization, Google JSON sorting/deduplication, export clamping, filename sanitization, or playback hotkey filtering may only surface through slow E2E paths. Many branches are never directly asserted, so a small pure-function change can break production behavior while the E2E suite still sees “track loaded” or “button visible.”
- **Suggested test/fix:** Add a unit test runner (or Node `node:test` + tsx/ts-node if the team wants minimal footprint) and start with pure-function tests:
  - `interpolate`: segment boundary distances, antimeridian shortest path, duplicate points, zero-distance tracks, unit formatting.
  - `camera`: `normalizeScenes`, overview bounds across antimeridian, transition blending, default scene coverage.
  - `parser`: all fixture formats plus invalid coordinates/timestamps/elevation, size/depth limits, dedup semantics.
  - `videoEncoder`: export config clamping, output estimate limits, filename sanitization, abort behavior with fakes.
- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed
- **TDD opportunity:** Write failing unit tests for known invariants before the next parser/camera/export change; use the existing E2E fixtures as unit fixtures so changes start red locally before Playwright is needed.

### TE-02 — Main parser and worker parser are duplicated but only weakly checked for parity

- **Region:** `src/lib/parser.ts:224-539`, `src/lib/parser.ts:557-640`, `public/workers/trackParser.worker.js:1-343`, `scripts/smoke-static.mjs:183-213`.
- **Failure scenario:** The Google parser exists twice. `smoke-static` only regex-checks constants/error codes, not semantic parity. If one parser changes sort order, deduplication, point validation, segment breaks, altitude/time handling, or depth behavior, tests can pass depending on whether Playwright happens to use the worker path. Worker fallback and main-thread fallback behavior are not explicitly covered.
- **Suggested test/fix:** Prefer extracting shared parsing logic into a worker-importable module. If that is too large, add a parity test that runs every JSON fixture through both main parser and worker parser and deep-compares `{points, segmentStartIndices}` including Date serialization. Add explicit tests for worker unavailable, worker creation failure, worker error message, malformed JSON, oversized JSON, and depth limit.
- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed
- **TDD opportunity:** Add a failing parity fixture before any refactor so the duplicated implementation can be collapsed safely.

### TE-03 — Import assertions are often too weak to catch parser regressions

- **Region:** `e2e/travelback.spec.ts:1381-1436`, plus helpers at `e2e/travelback.spec.ts:166-177`.
- **Failure scenario:** KML and most Google JSON tests assert only the generic title and `/\d+ \/ \d+ locations/`. A parser could drop most points, lose segment boundaries, strip times/elevation, merge disconnected visits, or reorder tracks and still satisfy these assertions.
- **Suggested test/fix:** For every fixture, assert exact point counts, expected first/last coordinates (rounded), segment count/start indices via debug state or unit parser API, and date/timeline labels where relevant. Keep E2E smoke assertions but move exact parser invariants to unit tests.
- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed
- **TDD opportunity:** Convert each fixture into a table-driven expected-output contract. Start with `google-semantic-segments.json`, `google-revisit-segments.json`, `korea-japan.kml`, and `point-placemarks.kml` because they exercise segmentation and non-LineString extraction.

### TE-04 — Fixed sleeps create flaky and slow E2E behavior

- **Region:** `e2e/travelback.spec.ts:529`, `545`, `840`, `945`, `957`, `1040`, `1475`, `1512`; app-side async surfaces include `MapView.waitForIdle` at `src/components/MapView.tsx:515-553`.
- **Failure scenario:** Timed waits can be too short on slow CI or unnecessarily long on fast runs. They also hide readiness conditions. Camera stability tests wait 2–3 seconds before sampling, but if map initialization is delayed the samples may start too early; if it is already ready, the suite still burns time.
- **Suggested test/fix:** Replace sleeps with readiness predicates: debug map state/layer presence, map idle result, playback progress > 0, camera sample count/change, export state, or UI element state. For layout stabilization, poll bounding boxes until stable for two consecutive samples rather than sleeping.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed

### TE-05 — Retries can mask flaky regressions instead of forcing diagnosis

- **Region:** `playwright.config.ts:13-15`, `playwright.static.config.ts:13-15`.
- **Failure scenario:** `retries: 1` plus single-worker serial execution can make intermittent failures look green. That is useful for artifact capture, but it lowers signal unless CI reports first-attempt failures and quarantines recurring flakes.
- **Suggested test/fix:** Keep retry only in CI if needed, but add a flake-reporting mode (`--retries=0`) for pre-merge or nightly reliability checks. Track first-run failures as build warnings/failures. For known flaky tests, remove sleeps and add deterministic waits instead of relying on retry.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Risk

### TE-06 — No global console/page-error failure guard in E2E

- **Region:** `e2e/travelback.spec.ts:216-223` (`beforeEach`), entire spec has no `page.on('console')` / `page.on('pageerror')` assertion; known app error surfaces include `FileUpload.tsx:79`, `useExportController.ts:210`, `videoEncoder.ts:230-233`, `MapView.tsx:644`.
- **Failure scenario:** The app can log React errors, failed dynamic imports, map errors, export failures, or parser warnings while visible UI assertions still pass. This is especially risky because tests often assert presence of buttons/headings rather than absence of runtime errors.
- **Suggested test/fix:** Add a scoped fixture that collects `pageerror` and console `error` messages, with an allowlist for intentionally simulated map-style failures and expected unsupported-file tests. Fail at test end when unexpected errors occur.
- **Severity:** High
- **Confidence:** Medium
- **Status:** Likely

### TE-07 — Browser and device matrix is too narrow for browser-specific features

- **Region:** `playwright.config.ts:25-43`, `playwright.static.config.ts:25-43`, browser-specific code in `src/lib/videoEncoder.ts:181-221`, `src/components/ThemeToggle.tsx:39-59`, `src/components/ModalDialog.tsx:26-187`, `src/components/TimelineSelector.tsx:322-341`.
- **Failure scenario:** Tests run Chromium only. Export/download uses File System Access API and fallback anchor behavior; touch drag and mobile UI use pointer/touch-specific paths; `matchMedia` listener compatibility branches are present; modal focus handling can vary across browsers. Safari/WebKit and Firefox regressions would not be caught.
- **Suggested test/fix:** Add at least a small smoke matrix: Chromium desktop full suite, WebKit smoke for landing/upload/export panel, Firefox smoke for import/playback, and a mobile/touch project for timeline/journey interactions. Keep the expensive full suite Chromium-only if runtime is a concern.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed

### TE-08 — Static server and hardening scripts need direct integration tests

- **Region:** `scripts/serve-static.mjs:15-180`, `scripts/harden-static-export.mjs:46-127`, `scripts/smoke-static.mjs:251-266`.
- **Failure scenario:** `smoke-static` validates the current built `out/` directory, but edge behavior is only partially covered: encoded traversal, malformed percent escapes, HEAD body absence, non-GET/HEAD 405, base-path redirect variants, CSP meta replacement with reordered attributes/single quotes/multiple HTML files, and bootstrap inlining regex changes after Next upgrades.
- **Suggested test/fix:** Add script-level integration tests that create a temp `out/` fixture tree, spawn `serve-static`, and assert status/headers/body behavior. Add temp-file tests for `harden-static-export` with representative HTML snippets from Next output, including failure cases. Consider exporting pure helpers or running scripts against temp dirs via env vars to avoid mutating real `out/`.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed
- **TDD opportunity:** Before the next Next.js upgrade, pin the current emitted bootstrap/CSP shapes with failing tests so regex adjustments are deliberate.

### TE-09 — Export cancellation and failure paths are under-tested

- **Region:** `src/lib/useExportController.ts:101-244`, `src/lib/videoEncoder.ts:101-150`, E2E export tests at `e2e/travelback.spec.ts:1297-1367`.
- **Failure scenario:** Current export E2E uses the local success stub and reset/no-op flows. It does not assert cancel via Escape/Cancel button, map idle timeout failure, abort during frame rendering, cleanup after failed export, playback progress restoration after abort/failure, or object URL revocation. A failed export could leave `isExporting` stuck, resize the map permanently, or drop a previous completed export without detection.
- **Suggested test/fix:** Unit-test `useExportController` with fake `MapViewHandle`, fake `exportVideo`, fake `downloadVideo`, and fake timers. E2E-test the local stub cancel path if a test hook can make the stub long-running. Assert previous completed export remains available after a failed subsequent export.
- **Severity:** High
- **Confidence:** Medium
- **Status:** Likely

### TE-10 — Playback/hotkey behavior has limited direct regression coverage

- **Region:** `src/lib/usePlaybackController.ts:73-154`, `src/lib/usePlaybackController.ts:176-248`, E2E coverage at `e2e/travelback.spec.ts:520-533`, `769-808`, `941-971`.
- **Failure scenario:** Playback tests mostly check that buttons/toggles appear and progress moves. There is no deterministic test for clamping invalid seek values, replay from progress 1, speed/duration changes while playing, fallback timer behavior when rAF stalls, hotkey suppression in inputs/dialogs/sliders, or `isExporting` hotkey suppression.
- **Suggested test/fix:** Add hook tests with fake `requestAnimationFrame`, `performance.now`, and fake DOM events. Keep E2E for one happy path and one keyboard-path smoke.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed

### TE-11 — Timeline and scene editor pointer/keyboard paths need lower-level tests

- **Region:** `src/components/TimelineSelector.tsx:29-52`, `99-319`, `322-341`; `src/components/SceneEditor.tsx:48-139`, `244-409`; E2E at `e2e/travelback.spec.ts:718-808`, `1029-1109`.
- **Failure scenario:** E2E exercises selected timeline trimming and one scene preview-clear flow, but many branchy behaviors remain unguarded: distance-ratio-to-index edge cases, zero-distance fallback, drag no-op semantics, region dragging at bounds, keyboard Home/End, undo timeout, preset replacement confirmation, invalid ranges, overlap warnings, and touch drag behavior.
- **Suggested test/fix:** Unit-test pure helpers where possible (`ratioToIndex` should be exported or moved to a tested helper). Component-test pointer and keyboard interactions with deterministic fake layout boxes. Add E2E only for the highest-value user flows.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed

### TE-12 — Fixture lifecycle in E2E can leave residue and collide on retries/interruption

- **Region:** temp fixture creation in `e2e/travelback.spec.ts:425-433`, `436-446`, `1396-1411`, `1450-1463`.
- **Failure scenario:** Temp files are written into `e2e/fixtures` with names based on `process.pid`. If a test is interrupted before `finally`, residue remains in the fixture directory. If future parallelism is enabled, pid-based names are not enough to avoid all collision/residue risks across workers/retries.
- **Suggested test/fix:** Use `testInfo.outputPath()` or `fs.mkdtemp` under the Playwright per-test output directory, not the checked-in fixture directory. Include worker index/retry in names if manual temp files remain necessary.
- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed

### TE-13 — Coverage for accessibility regressions is useful but incomplete

- **Region:** `e2e/travelback.spec.ts:233-264`, `1231-1245`, modal implementation `src/components/ModalDialog.tsx:69-187`, guide tabs `src/components/GoogleGuide.tsx:135-314`.
- **Failure scenario:** Tests check landmark/dialog presence and that focus stays inside after several Tabs. They do not assert focus restoration after close, `aria-hidden`/inert behavior on app root, Escape behavior for nested/top modal only, tablist keyboard roles/selected states, toast live-region behavior, or reduced-motion behavior.
- **Suggested test/fix:** Add targeted component/E2E tests for focus restoration, Escape close, inert/aria-hidden cleanup after multiple modals, guide tab arrow-key navigation, and reduced-motion CSS behavior. Consider adding an accessibility scanner smoke if dependency policy allows it; otherwise use explicit role/attribute assertions.
- **Severity:** Medium
- **Confidence:** Medium
- **Status:** Likely

### TE-14 — Map debug hooks are useful but not a stable test contract yet

- **Region:** E2E debug access at `e2e/travelback.spec.ts:46-90`, `838-920`, `941-993`, map debug creation around `src/components/MapView.tsx:595-602`.
- **Failure scenario:** Many high-value assertions depend on `window.__travelbackDebug` after setting `localStorage.travelback-debug = '1'`. If the debug object shape changes or fails to initialize, tests report generic null/timeouts instead of clear contract failures. There is no dedicated test that the debug API itself is present and versioned.
- **Suggested test/fix:** Define and test a minimal debug contract (`getCamera`, `getMapState`, optional version). Add a helper that fails immediately with a descriptive message if unavailable. Keep debug-only hooks gated to localhost/test environments.
- **Severity:** Low
- **Confidence:** Medium
- **Status:** Risk

## Positive coverage already present

- Good E2E breadth for GPX/KML/Google JSON happy paths and several recent regressions.
- Static export smoke covers CSP hardening, local map-style pinning, forbidden tool residue, cache policy for runtime assets, and parser/worker constant drift.
- Several tests use accessible role selectors and semantic assertions rather than only CSS selectors.
- Local export success stub avoids depending on WebCodecs availability for the basic export flow.
- Serial workers reduce shared-environment flake while the suite is E2E-heavy.

## Prioritized next test plan

1. **Add unit parser/camera/interpolate tests first.** This gives the highest regression signal per runtime minute.
2. **Add worker/main parser parity tests.** Either extract shared logic or compare both implementations against all JSON fixtures.
3. **Harden E2E reliability.** Remove fixed sleeps, add console/page-error capture, and make temp fixture files per-test.
4. **Add focused script integration tests.** Cover `serve-static` and `harden-static-export` using temp `out` fixtures.
5. **Add browser/device smoke matrix.** Start with small WebKit/Firefox/mobile smoke projects rather than duplicating the full suite.
6. **Component/hook tests for controllers.** Playback, export, modal focus, timeline, and scene editor should not require full Next + MapLibre E2E for every branch.

## Final sweep

- Re-ran inventory after review: `src`, `e2e`, `scripts`, `public/workers`, and all 17 fixtures were included in the review scope.
- No application code changed.
- Report written to `.context/reviews/cycle2-test-engineer-2026-04-25.md`.
- Fresh verification: `npm run lint` passed; `npm run typecheck` passed.
