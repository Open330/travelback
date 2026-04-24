## Code Review Summary

**Scope:** Whole-repository review for cycle 4, using `.context` as authoritative.

**Files Reviewed:** 45 review-relevant code/config/doc files
**Inventory Complete:** Yes
**Non-code assets intentionally excluded from line-by-line review:** `public/*.svg`, `public/fonts/*`, `public/map-styles/*.json`, `public/sample-trip.gpx`, `e2e/fixtures/*`.
These were treated as generated/static data; their behavior was reviewed through the consuming code (`MapView`, static-export scripts, Playwright tests) rather than as executable logic.

### Reviewed Inventory
- Docs / rules:
  - `.context/README.md`
  - `.context/development/01-conventions.md`
  - `.context/project/01-overview.md`
  - `.context/project/02-architecture.md`
- Root config / test config:
  - `package.json`
  - `tsconfig.json`
  - `next.config.ts`
  - `playwright.config.ts`
  - `playwright.static.config.ts`
- App shell / shared types:
  - `src/types.ts`
  - `src/app/layout.tsx`
  - `src/app/page.tsx`
  - `src/app/globals.css`
- Libraries:
  - `src/lib/env.ts`
  - `src/lib/i18n.ts`
  - `src/lib/interpolate.ts`
  - `src/lib/parser.ts`
  - `src/lib/camera.ts`
  - `src/lib/usePlaybackController.ts`
  - `src/lib/useExportController.ts`
  - `src/lib/videoEncoder.ts`
- Components:
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
- Scripts / static tooling:
  - `scripts/fetch-map-styles.mjs`
  - `scripts/harden-static-export.mjs`
  - `scripts/run-static-e2e.mjs`
  - `scripts/serve-static.mjs`
  - `scripts/smoke-static.mjs`
- Tests / worker:
  - `e2e/travelback.spec.ts`
  - `public/workers/trackParser.worker.js`

### Stage 1: Spec / Intent Check
The repository still matches the intended product shape from `.context`: a static Next/React/TypeScript frontend that parses local track data, drives playback/camera/export state on the client, and validates both dev and static flows with Playwright. The main gaps I found are not feature omissions; they are delivery-quality issues in the configured gates and cross-file maintenance surface.

### Stage 2: Quality / Logic Findings

#### [HIGH][Confirmed][High confidence] `npm run typecheck` is not reliable on a clean checkout, so the configured gate order is currently broken.
- File / region:
  - `package.json:10-15`
  - `tsconfig.json:25-31`
- Evidence:
  - A pre-build `npm run typecheck` failed with:
    - `.next/types/validator.ts(5,56): error TS2307: Cannot find module './routes.js' or its corresponding type declarations.`
  - After `npm run build` generated `.next/types/routes.d.ts`, `npm run typecheck` passed.
- Failure scenario:
  - The orchestrator’s required order is `lint -> typecheck -> build ...`.
  - On a fresh clone, after `.next` cleanup, or in CI jobs that do not build before typecheck, the repo fails the gate before any application code is checked.
  - That means the repo is not meeting its own configured quality contract even when the source itself type-checks after generation.
- Why this is a problem:
  - `tsc --noEmit` is depending on generated Next artifacts that are not guaranteed to exist yet.
  - That creates a false-negative gate and makes review/CI results environment-dependent.
- Suggested fix:
  - Either stop including generated `.next` validator files in plain `tsc` input, or make `typecheck` explicitly run the supported Next type generation step before `tsc`.
  - The fix should preserve the current route-type validation without requiring an earlier production build.

#### [MEDIUM][Confirmed][High confidence] The static Playwright config points at the base path without a trailing slash, so `page.goto('/')` resolves to the wrong URL and already produced a flaky retry failure in this review run.
- File / region:
  - `playwright.static.config.ts:17-18`
  - `e2e/travelback.spec.ts:236`
  - `e2e/travelback.spec.ts:282-286`
- Evidence:
  - `playwright.static.config.ts` sets `baseURL` to ``http://localhost:${PORT}/travelback``.
  - In URL resolution, `page.goto('/')` resolves that to the site root (`http://localhost:4173/`), not `/travelback/`.
  - During `npm run test:e2e:static`, Playwright retried `language picker can switch the landing UI away from English` and logged:
    - `page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:4173/`
- Failure scenario:
  - Static tests unintentionally depend on the root-path redirect in `scripts/serve-static.mjs` instead of navigating directly to the exported app base path.
  - Retries/startup races can hit the wrong root URL and fail before app logic is exercised, creating CI noise and masking real regressions.
- Why this is a problem:
  - The test harness is encoding the wrong canonical entry URL for the static app.
  - This makes static E2E less deterministic than the actual deployed path.
- Suggested fix:
  - Change the static `baseURL` to ``http://localhost:${PORT}/travelback/``.
  - Alternatively, stop using `page.goto('/')` in this suite and navigate explicitly to `/travelback/` through a helper.

#### [LOW][Risk needing manual validation][High confidence] Google Location History parsing is duplicated in two separate implementations, so parser behavior can drift by file size or worker availability.
- File / region:
  - `src/lib/parser.ts:221-360`
  - `src/lib/parser.ts:465-620`
  - `public/workers/trackParser.worker.js:44-149`
  - `public/workers/trackParser.worker.js:206-321`
- Evidence:
  - The repo keeps a full Google JSON parser in `src/lib/parser.ts` and a second, separate copy in `public/workers/trackParser.worker.js`.
  - Both files contain explicit “must match” comments for limits/error codes, which is direct evidence of manual coupling.
- Failure scenario:
  - A future fix for a Google Takeout schema edge case lands in one parser but not the other.
  - Small JSON imports or worker-disabled browsers use one path; larger/worker-backed imports use the other.
  - The same file format can then parse differently depending on browser support or file size threshold, which is exactly the kind of cross-file drift this app is sensitive to.
- Why this is a problem:
  - This is a maintainability and correctness trap at the parser/data-flow boundary.
  - The current E2E suite covers JSON imports, but it does not force parity between worker and main-thread fallback paths.
- Suggested fix:
  - Extract shared Google parsing logic into one source that both the main thread and worker consume, or generate the worker from shared parser code.
  - Add parity coverage that explicitly exercises both worker-enabled and worker-disabled / fallback parsing paths.

### Quality Gates Observed
- `npm run lint`: passed
- `npm run typecheck`: failed before build, passed after build
- `npm run build`: passed
- `npm run test:e2e`: started and progressed during review; no failure observed before I stopped waiting for completion
- `npm run test:e2e:static`: started and reproduced the static base-URL retry failure above; the full suite was still running when I stopped waiting for completion

### Tooling Notes
- `mcp__omx_code_intel__.lsp_diagnostics_directory` and `ast_grep_search` were attempted first, but the MCP transport closed immediately. I fell back to repo-native checks (`npm run lint`, `npm run typecheck`, `npm run build`) plus shell-based scans.

### Missed-Issues Sweep
I did a final pass specifically for:
- parser/data flow: `parser.ts`, `trackParser.worker.js`, `interpolate.ts`, `camera.ts`
- playback/export state: `page.tsx`, `usePlaybackController.ts`, `useExportController.ts`, `videoEncoder.ts`, `ExportPanel.tsx`
- map/camera state: `MapView.tsx`, `SceneEditor.tsx`, `TimelineSelector.tsx`, `JourneyCreator.tsx`
- UI composition / modal / locale interactions: all component files plus `i18n.ts`
- scripts / static export / test harness: all `scripts/*.mjs`, Playwright configs, `e2e/travelback.spec.ts`

No additional confirmed whole-repo logic bugs surfaced beyond the findings above.

### Recommendation
**REQUEST CHANGES**

Reason:
- The repo currently fails a required configured gate (`npm run typecheck`) in the documented pre-build order.
- The static Playwright harness is also misconfigured around the exported base path and already produced a retry failure during this review.
