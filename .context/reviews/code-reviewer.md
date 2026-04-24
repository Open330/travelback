# Code Review Summary

- Scope: whole-repository review of the live source/config/test/doc surface for `Travelback`
- Inventory method: `rg --files -uu` over the repo, then filtered to live review-relevant files
- Files reviewed: 78
  - Config: 10
  - Source/UI/lib/styles: 30
  - Scripts: 4
  - Public text/code assets: 8
  - Tests/fixtures: 15
  - Docs/plans: 11
- Verification performed:
  - `git diff --stat` / `git diff --name-only`: clean worktree
  - `npm run typecheck`: passed
  - `npm run lint`: passed
  - `npm audit --audit-level=high`: passed (`0 vulnerabilities`)
  - `npm run smoke:static`: passed
  - Code-intel MCP (`lsp_diagnostics_directory`, `ast_grep_search`) was unavailable in this session, so this review falls back to repo-native gates plus direct file inspection and grep/pattern scans
- Verification gap:
  - `npm run build` could not be freshly re-run because Next reported another build already running, and `.next/dev/lock` exists in the workspace. I did not remove generated lock state during a read-only review.

## Recommendation

**REQUEST CHANGES**

Highest severity found: **HIGH**.

## Severity Summary

- HIGH: 1
- MEDIUM: 5
- LOW: 0
- Risks needing manual validation: 2

## Findings

### 1. [HIGH] Core export flow is still untested end-to-end
- Classification: **Confirmed issue**
- Confidence: **High**
- File/code region:
  - `e2e/travelback.spec.ts:1111-1173`
  - `e2e/travelback.spec.ts:1237-1269`
  - `e2e/travelback.spec.ts:1274-1291`
- Issue:
  - The export-related tests stop at dialog semantics and control visibility. The two “completes full journey” tests never click **Start Export**, never assert cancellation, never assert the `done` state, and never verify that a result link/video/download affordance appears.
- Concrete failure scenario:
  - `useExportController`, `videoEncoder`, or `downloadVideo` regresses so exports fail after the button click. The current suite still passes because it only proves the export panel opens.
- Suggested fix:
  - Add at least one deterministic export smoke test that actually starts an export on a tiny fixture and asserts one of:
    - successful `done` state with preview/download UI
    - successful cancellation path
    - both
  - If WebCodecs makes CI nondeterministic, introduce a test-mode encoder seam or a documented/manual release gate that is enforced outside the current Playwright suite.

### 2. [MEDIUM] Google JSON parsing logic is duplicated between main-thread and worker paths
- Classification: **Confirmed issue**
- Confidence: **High**
- File/code region:
  - `src/lib/parser.ts:246-520`
  - `public/workers/trackParser.worker.js:44-320`
- Issue:
  - The worker contains its own copy of the Google Location History parsing pipeline instead of reusing a shared implementation.
- Concrete failure scenario:
  - A future format fix lands in `src/lib/parser.ts` but not in `public/workers/trackParser.worker.js`. Small JSON files parsed on the main thread and larger/worker-routed JSON files then produce different results for the same input shape.
- Suggested fix:
  - Move Google JSON parsing into a single shared module and bundle/generate the worker from that source, then add parity tests that exercise both execution paths against the same fixtures.

### 3. [MEDIUM] Large-JSON worker failures are surfaced as a generic parse error instead of an actionable browser/runtime limitation
- Classification: **Confirmed issue**
- Confidence: **High**
- File/code region:
  - `src/lib/parser.ts:529-533`
  - `src/lib/parser.ts:536-560`
  - `src/components/FileUpload.tsx:62-85`
- Issue:
  - The worker-unavailable path throws `ParseError(..., 'INVALID_GOOGLE_JSON')`, and `FileUpload` maps that code to the generic `fileUpload.parseFailed` copy.
- Concrete failure scenario:
  - A user opens a large Google JSON export in an environment where `Worker` is unavailable or worker creation fails. The UI says only “Failed to parse file,” even though the real problem is that the browser/runtime cannot support large JSON parsing without a worker.
- Suggested fix:
  - Introduce a dedicated error code such as `WORKER_REQUIRED` or `WORKER_UNAVAILABLE_FOR_LARGE_JSON`, add localized copy for it, and preserve the actionable message through the UI.

### 4. [MEDIUM] Trail rendering does an O(n) GeoJSON rebuild on every playback/export frame
- Classification: **Likely issue**
- Confidence: **High**
- File/code region:
  - `src/components/MapView.tsx:107-167`
  - `src/components/MapView.tsx:844-850`
- Issue:
  - `buildTrackGeometry()` walks the route and allocates fresh geometry, and the animation effect pushes that full rebuilt geometry into the `trail` source every frame.
- Concrete failure scenario:
  - Long tracks or high-FPS exports spend a large share of their frame budget rebuilding and re-uploading the whole trail geometry, causing jank in playback and very slow exports on weaker devices.
- Suggested fix:
  - Replace full per-frame geometry rebuilds with an incremental path update strategy, segmented/static geometry with a moving head, or a dedicated canvas/custom layer that avoids full GeoJSON regeneration each frame.

### 5. [MEDIUM] Overview scenes recompute invariant whole-track bounds every frame
- Classification: **Likely issue**
- Confidence: **High**
- File/code region:
  - `src/lib/camera.ts:53-95`
  - `src/lib/camera.ts:141-150`
  - `src/lib/camera.ts:339-427`
- Issue:
  - Every overview-frame camera computation can re-run `computeBoundingBox()` and `overviewZoomFromBox()` over the full track, even though those values are stable for a given track.
- Concrete failure scenario:
  - Overview-heavy exports on large tracks repeatedly burn CPU on unchanged bounding-box math, making scene rendering slower than necessary and compounding the `MapView` frame-cost issues.
- Suggested fix:
  - Cache overview bounds/zoom per track or per normalized scene set and reuse them throughout playback/export.

### 6. [MEDIUM] The Playwright suite is monolithic and tightly coupled to UI copy
- Classification: **Confirmed issue**
- Confidence: **High**
- File/code region:
  - `e2e/travelback.spec.ts:146`
  - `e2e/travelback.spec.ts:256`
  - `e2e/travelback.spec.ts:291-299`
  - `e2e/travelback.spec.ts:495-500`
  - `e2e/travelback.spec.ts:1237-1291`
  - `playwright.config.ts:7-11`
  - `playwright.static.config.ts:7-11`
- Issue:
  - One 1,293-line spec file carries the whole suite, uses many hard-coded copy selectors, multiple `force: true` clicks, and fixed waits, while both Playwright configs serialize execution with `workers: 1` and `retries: 1`.
- Concrete failure scenario:
  - A benign copy change, localization tweak, or slightly slower CI run breaks unrelated tests even though behavior is unchanged; one flaky path slows the entire suite because the whole file is effectively a single serialized maintenance unit.
- Suggested fix:
  - Split the suite by feature area, prefer `data-testid` / stable role selectors over copy text for critical flows, replace `waitForTimeout()` with deterministic readiness conditions, and keep retries as targeted exceptions rather than a suite-wide default crutch.

## Risks Needing Manual Validation

### R1. [MEDIUM] Production anti-framing still depends on deployment infrastructure outside the repo
- Classification: **Risk needing manual validation**
- Confidence: **High**
- File/code region:
  - `src/app/layout.tsx:60-64`
  - `.github/workflows/deploy-pages.yml:34-46`
  - `scripts/serve-static.mjs:147-158`
- Risk:
  - The local/static preview server adds `X-Frame-Options: DENY`, but the GitHub Pages deployment workflow only uploads static files. The real production host therefore still relies on the JS frame-buster unless a header-capable CDN/front door is added.
- Concrete failure scenario:
  - The production Pages site is embedded before the JS frame-buster runs or under conditions where JS is interfered with; the browser has no response-header anti-framing control to fall back to.
- Suggested fix:
  - Put the Pages site behind a header-capable CDN/host and enforce `Content-Security-Policy: frame-ancestors 'none'` and/or `X-Frame-Options: DENY` there.

### R2. [LOW] Production CSP still allows inline styles
- Classification: **Risk needing manual validation**
- Confidence: **High**
- File/code region:
  - `src/app/layout.tsx:63`
  - `scripts/harden-static-export.mjs:14-29`
- Risk:
  - Script CSP is hardened well, but `style-src 'unsafe-inline'` remains.
- Concrete failure scenario:
  - If a future HTML/style injection sink is introduced, CSP containment for CSS-based UI manipulation is weaker than the script path.
- Suggested fix:
  - Gradually migrate inline styles to static classes or a stricter styling strategy, then remove `unsafe-inline` from `style-src`.

## Files Reviewed

### Config (10)
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `postcss.config.mjs`
- `playwright.config.ts`
- `playwright.static.config.ts`
- `next-env.d.ts`
- `.gitignore`
- `.github/workflows/deploy-pages.yml`

### Source / UI / Lib / Styles (30)
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
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

### Scripts (4)
- `scripts/fetch-map-styles.mjs`
- `scripts/harden-static-export.mjs`
- `scripts/serve-static.mjs`
- `scripts/smoke-static.mjs`

### Public Text / Code Assets (8)
- `public/workers/trackParser.worker.js`
- `public/map-styles/voyager.json`
- `public/map-styles/positron.json`
- `public/map-styles/dark.json`
- `public/map-styles/liberty.json`
- `public/map-styles/bright.json`
- `public/fonts/pretendard.css`
- `public/sample-trip.gpx`

### Tests / Fixtures (15)
- `e2e/travelback.spec.ts`
- `e2e/fixtures/sample.gpx`
- `e2e/fixtures/korea-japan.gpx`
- `e2e/fixtures/segmented-city-hop.gpx`
- `e2e/fixtures/korea-japan.kml`
- `e2e/fixtures/google-records.json`
- `e2e/fixtures/invalid-elevation.gpx`
- `e2e/fixtures/single-quote-attrs.gpx`
- `e2e/fixtures/antimeridian.gpx`
- `e2e/fixtures/google-semantic-segments.json`
- `e2e/fixtures/tiny-trim.gpx`
- `e2e/fixtures/google-timeline-edits.json`
- `e2e/fixtures/google-semantic-location.json`
- `e2e/fixtures/korea-japan.json`
- `e2e/fixtures/point-placemarks.kml`

### Docs / Plans (11)
- `.context/README.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `.context/development/01-conventions.md`
- `.context/plans/README.md`
- `plan/cycle1-current-plan-2026-04-24.md`
- `plan/cycle1-plan.md`
- `plan/cycle2-c2-plan.md`
- `plan/deferred-cycle1-current-2026-04-24.md`
- `plan/deferred-cycle1-review-plan-2026-04-24.md`
- `plan/archive/cycle1-review-plan-2026-04-24.md`

## Areas Intentionally Skipped

- Generated/build output: `.next/`, `out/`, `playwright-report/`, `test-results/`, `tsconfig.tsbuildinfo`
- OMX/OMC state, logs, and session artifacts: `.omx/`, `.omc/`
- Binary/static art assets not relevant to code review logic: `*.woff2`, `*.ico`, `*.svg`
- Historical review artifacts and superseded archival docs not authoritative for current behavior: most of `.context/reviews/` and most of `.context/plans/archive/`
- Persona/helper prompt docs not tied to runtime behavior (for example `.context/agents/*`) unless referenced by an active plan

## Final Sweep

- I built an inventory first, then reviewed every file in the live review surface listed above.
- No live source/config/test/doc file from that chosen surface was skipped.
- The only exclusions were generated output, binary assets, state/log directories, and historical review/archive material that is not authoritative for current runtime behavior.
- The repo-level quality gates that were runnable in a read-only review (`typecheck`, `lint`, `audit`, `smoke:static`) were run and read. A fresh `next build` could not be completed because the workspace currently contains a Next build lock (`.next/dev/lock`) and Next reported another build already running.
