# Cycle 2 Test Engineer Review — 2026-04-26

Scope: whole-repository review from test coverage, flakiness, TDD, and regression-risk angle. This is a review-only artifact; no code was edited.

## Inventory and examination method

I built the inventory from `git ls-files` plus a filesystem sweep for untracked review/context files. Review-relevant files examined:

- **App/source:** `src/app/layout.tsx`, `src/app/page.tsx`, every file in `src/components/`, every file in `src/lib/`, `src/types.ts`, `src/styles/vitro-base.css`, `src/app/globals.css`.
- **Test suite and fixtures:** `e2e/travelback.spec.ts`; all fixtures in `e2e/fixtures/` (`*.gpx`, `*.kml`, `*.json`); `playwright.config.ts`; `playwright.static.config.ts`; `test-results/.last-run.json`; `playwright-report/index.html` metadata.
- **Build/test/deploy scripts and configs:** `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `postcss.config.mjs`, `.github/workflows/deploy-pages.yml`, `scripts/fetch-map-styles.mjs`, `scripts/harden-static-export.mjs`, `scripts/run-dev-e2e.mjs`, `scripts/run-static-e2e.mjs`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`.
- **Runtime/static assets relevant to behavior:** `public/workers/trackParser.worker.js`, `public/map-styles/*.json`, `public/sample-trip.gpx`, guide/icon/font assets enough to verify they are not test harnesses.
- **Docs/context:** `README.md`, `.context/README.md`, `.context/development/01-conventions.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, current and recent cycle review/plan context under `.context/reviews/` and `.context/plans/` that referenced testing or unresolved regression risk.

I validated behavior from source and configuration, not from comments alone. I did **not** run Playwright/build commands because the task prohibits modifying anything except this review markdown file, and those commands update `test-results/`, `playwright-report/`, `.next/`, or `out/`.

## Findings

### TE-01 — Core deterministic logic has no unit/integration test target; almost all regression signal is one browser E2E file

- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed
- **Region:** `package.json:5-17`; `e2e/travelback.spec.ts:216-1526`; high-risk logic in `src/lib/parser.ts:195-743`, `src/lib/interpolate.ts:18-198`, `src/lib/camera.ts:17-430`, `src/lib/videoEncoder.ts:32-244`, `src/lib/usePlaybackController.ts:17-205`, `src/lib/useExportController.ts:44-269`.
- **Evidence:** The only test scripts are E2E/static smoke scripts: `test:e2e`, `test:e2e:dev`, `test:e2e:static:ci`, `test:e2e:static`, and `smoke:static` (`package.json:12-16`). There is no unit/component test script and no tracked `*.test.ts(x)` files outside `e2e/travelback.spec.ts`. The E2E file is broad but exercises behavior through UI selectors rather than directly checking branch-level outcomes in parser/camera/interpolation/export functions.
- **Failure scenario:** A regression in deterministic math or parser branches can pass if the UI still renders a title/button. Examples: `computeCumulativeDistances` segment handling (`src/lib/interpolate.ts:18-39`), scene transition blending (`src/lib/camera.ts:350-430`), export memory estimation (`src/lib/videoEncoder.ts:32-59`), and parser validation/dedup/sorting (`src/lib/parser.ts:457-573`) are all logic-heavy and cheap to test directly, but currently require slow E2E reproduction and have weak branch isolation.
- **Suggested fix:** Add a fast unit/integration layer for pure functions before further feature work: parser fixtures with exact normalized `Track` outputs, interpolation segment/antimeridian cases, camera scene transition cases, video export estimate/limit cases, and hook-level playback/export state tests where practical. Wire it into `npm test` or a named CI step, keeping Playwright for end-to-end coverage.

### TE-02 — Main Google parser and public worker parser are duplicated without behavioral parity tests

- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed
- **Region:** Main parser: `src/lib/parser.ts:282-573`, worker handoff/fallback `src/lib/parser.ts:581-681`; worker implementation: `public/workers/trackParser.worker.js:45-268`, worker message handling `public/workers/trackParser.worker.js:270-349`; smoke check `scripts/smoke-static.mjs:223-260`.
- **Evidence:** Google JSON parsing, sorting, deduplication, semantic-point parsing, and point-budget logic exist twice: once in TypeScript and once in `public/workers/trackParser.worker.js`. `scripts/smoke-static.mjs:223-260` only regex-checks selected constants, error-code strings, and the presence of `parseSemanticPoint`; it does not execute the two parsers against the same fixtures and compare outputs.
- **Failure scenario:** A future fix lands in `src/lib/parser.ts` but not in `public/workers/trackParser.worker.js`. Small JSON files that fall back to the main parser and large JSON files that use the worker can then disagree on accepted coordinates, timestamps, segment boundaries, dedup behavior, or errors. Current fixtures are all tiny JSON files, so they do not force a large worker-only path; smoke only catches a narrow class of textual drift.
- **Suggested fix:** Prefer extracting shared Google parsing logic into a module consumed by both main thread and worker. If extraction is deferred, add a parity test that runs every JSON fixture through `parseGoogleLocationHistory` and through the worker script, serializes Dates consistently, and deep-compares `{ name, points, segmentStartIndices }`. Include malformed JSON, depth limit, point-budget, worker-unavailable, and worker-crash/fallback cases.

### TE-03 — Several Google import E2E tests assert “some count” instead of exact parser outcomes

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed
- **Region:** `e2e/travelback.spec.ts:1391-1438`; parser behavior being guarded weakly at `src/lib/parser.ts:282-573`.
- **Evidence:** The flat-array, Records.json, Semantic Location History, Timeline Edits, and Semantic Segments tests only check the title plus `/\d+ \/ \d+ locations/` (`e2e/travelback.spec.ts:1391-1395`, `1416-1438`). Only two newer Google regression tests assert exact counts (`1440-1448`).
- **Failure scenario:** If `parseTimelineObjects` drops `placeVisit` points (`src/lib/parser.ts:334-342`), `parseTimelineEdits` loses altitude/time (`350-363`), or `parseSemanticSegments` silently skips visit points (`378-420`), these tests can still pass as long as at least two points survive and the generic location-count regex appears. That reduces the tests’ value as regression documentation for Google’s multiple export shapes.
- **Suggested fix:** Replace generic count assertions with exact visible/full point counts for every Google fixture. Where segment behavior matters, expose a test-only normalized track summary or assert downstream behavior that depends on segment boundaries (distance excludes gaps, timeline range count, route/trail layer segment count). Add fixture comments or snapshots that document the expected count/order/segments.

### TE-04 — CI test gate does not run for pull requests

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed
- **Region:** `.github/workflows/deploy-pages.yml:3-6`, test/build/audit steps at `.github/workflows/deploy-pages.yml:26-32`.
- **Evidence:** The only GitHub Actions workflow triggers on `push` to `main` and `workflow_dispatch` (`.github/workflows/deploy-pages.yml:3-6`). The useful gates (`npm ci`, Playwright install, lint, typecheck, audit, build, static E2E) run only after code reaches `main` or someone starts the workflow manually.
- **Failure scenario:** A branch or PR can accumulate parser/export/UI regressions and be merged without an automated pre-merge signal. The workflow may catch the failure only after `main` is already broken, which is especially risky because the same workflow deploys Pages artifacts after the build job.
- **Suggested fix:** Add a `pull_request` trigger for the build/test job. If deploy permissions are a concern, split deploy from validation: run `npm ci`, lint, typecheck, build, `smoke:static`, and static E2E on PRs, and keep the Pages deploy step restricted to `push` on `main`.

### TE-05 — Playwright retries can turn intermittent failures green without a hard flake gate

- **Severity:** Medium
- **Confidence:** Medium
- **Status:** Risk
- **Region:** `playwright.config.ts:11-18`; `playwright.static.config.ts:26-33`; last-run metadata in `test-results/.last-run.json`.
- **Evidence:** Both Playwright configs set `retries: 1` while also using a single worker and HTML reporter. The checked `test-results/.last-run.json` only records `{ "status": "passed", "failedTests": [] }`, so this repository artifact does not preserve a simple machine-readable “passed on retry / flaky” count for review gates.
- **Failure scenario:** A timing-sensitive map, playback, export, or focus test can fail on the first attempt and pass on retry. CI exits green, and unless someone opens the HTML report, the flake becomes normalized instead of being triaged. This matters because the suite contains time- and animation-sensitive helpers (`e2e/travelback.spec.ts:46-87`, `179-188`, `943-972`) and many forced clicks/geometry assertions.
- **Suggested fix:** Keep retries only if CI also fails or flags the build when any test is flaky. Options: use Playwright JSON/JUnit reporter and parse flaky counts, add a scheduled no-retry run, or set `retries: 0` on PR validation while retaining retry artifacts on nightly/main.

### TE-06 — E2E tests create temporary files inside the tracked fixture directory

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed
- **Region:** `e2e/travelback.spec.ts:427-435`, `438-448`, `1398-1413`, `1452-1465`.
- **Evidence:** Several tests write temporary files under `e2e/fixtures/` using names based on `process.pid`, then unlink in `finally`.
- **Failure scenario:** If Playwright or Node is interrupted between write and cleanup, untracked files remain in the fixture directory and can be picked up by future inventory/review/test tooling. If future parallelism is enabled, PID-only names are weaker than Playwright’s per-test output isolation and can still collide across retries/workers/process reuse patterns.
- **Suggested fix:** Use `testInfo.outputPath()` or `fs.mkdtemp` under Playwright’s per-test output directory instead of the checked-in fixture directory. Include worker index/retry in names if manual temp files remain necessary.

## Positive coverage notes

- Static deployment has meaningful regression gates: CSP hardening, forbidden tool-residue checks, local map-style checks, worker/parser constant checks, cache-policy checks, and static E2E are wired through `npm run test:e2e:static:ci` and CI (`scripts/smoke-static.mjs:296-326`, `.github/workflows/deploy-pages.yml:31-32`).
- The Playwright suite covers many user-critical journeys: initial load, upload/import formats, map errors, theming, localization, mobile layout, timeline trimming, scene editor, map style cycling, export flow, and full KML/Google journeys (`e2e/travelback.spec.ts:225-1526`).
- Dev/static E2E configs run single-worker, serial browser tests, which reduces shared browser/server flake while the suite remains E2E-heavy (`playwright.config.ts:9-13`, `playwright.static.config.ts:24-28`).

## Final sweep — skipped-file check

No review-relevant source, config, script, test, fixture, worker, CI, or testing documentation file was intentionally skipped. Excluded from detailed analysis: generated/build/cache artifacts (`.next/`, `out/`, `node_modules/`, `tsconfig.tsbuildinfo` internals), binary/image/font assets except as static assets, and historical `.omc/.omx` logs except where they referenced testing context. These exclusions are not part of the executable test surface for this review.

## Finding count summary

- High: 2
- Medium: 3
- Low: 1
- Total: 6
