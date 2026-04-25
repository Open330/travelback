# Code Review Summary

**Date:** 2026-04-25  
**Reviewer:** code-reviewer lane  
**Scope:** full repository review under the repo contract

## Verdict

**REQUEST CHANGES**

Stage 1, spec-compliance: the repository still matches the documented product intent in [.context/project/01-overview.md](./.context/project/01-overview.md) and [.context/project/02-architecture.md](./.context/project/02-architecture.md). The issues below are correctness, workflow, and maintainability problems inside an otherwise on-spec implementation.

## Inventory

I inventoried and reviewed every runtime-relevant code/config surface in the repo:

- Root/config: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `playwright.config.ts`, `playwright.static.config.ts`, `.github/workflows/deploy-pages.yml`
- Scripts: `scripts/fetch-map-styles.mjs`, `scripts/harden-static-export.mjs`, `scripts/run-dev-e2e.mjs`, `scripts/run-static-e2e.mjs`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`
- App shell/styles: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/styles/vitro-base.css`, `src/types.ts`, `public/fonts/pretendard.css`
- Domain/runtime logic: `src/lib/camera.ts`, `src/lib/env.ts`, `src/lib/i18n.ts`, `src/lib/interpolate.ts`, `src/lib/parser.ts`, `src/lib/useExportController.ts`, `src/lib/usePlaybackController.ts`, `src/lib/videoEncoder.ts`
- UI components: every file under `src/components/`
- Worker/static runtime assets: `public/workers/trackParser.worker.js`, every file under `public/map-styles/`
- Tests: `e2e/travelback.spec.ts`; fixtures under `e2e/fixtures/` were inventoried as test inputs and presence-checked
- Project intent/conventions used for Stage 1: `.context/README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/development/01-conventions.md`

## Verification

- `git diff --name-only`: clean worktree
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm run smoke:static`: passed
- `npm run test:e2e`: failed reproducibly in the current environment; see Finding 2
- `npm run test:e2e:static:ci`: started successfully and advanced through the early static suite during review; I did not wait for all 65 tests to finish before writing this report
- Locale-key parity check against `src/lib/i18n.ts`: all 5 locales expose 309 keys
- CSS variable sweep across app CSS: no undefined custom properties remained

## By Severity

- HIGH: 1
- MEDIUM: 1
- LOW: 2

## Confirmed Findings

### [HIGH] Export completion state survives track mutations and can present a stale video for a different track state

- **Files:** `src/app/page.tsx:256-311`, `src/lib/useExportController.ts:56-62`, `src/lib/useExportController.ts:94-99`, `src/components/ExportPanel.tsx:222-279`
- **Confidence:** High
- **Why this is an issue:** `handleRangeChange()` updates the active track, clears scenes when needed, and resets playback, but it never invalidates the export session. `useExportController` keeps `exportState`, `exportedVideoUrl`, `exportedVideoBlob`, and `exportedVideoFilename` until `resetExportSession()` is called. `ExportPanel` renders the completed-export UI solely from `exportState === 'done'`.
- **Concrete failure scenario:** export the full trip, close the panel, trim the timeline to a smaller range, then reopen export. The panel can still show the old preview/download for the pre-trim track, even though the current track and future export output are now different.
- **Suggested fix:** invalidate export state whenever export inputs materially change, at minimum on track trim/load/reset. The simplest repair is to call `resetExportSession()` from `handleRangeChange()` when the range actually changes, and also invalidate on scene/transition changes if you want the panel state to stay truthful after camera edits.

### [MEDIUM] The advertised `npm run test:e2e` path is brittle and fails when another `next dev` server is already running

- **Files:** `package.json:12-13`, `scripts/run-dev-e2e.mjs:34-45`, `playwright.config.ts:44-48`, `.context/project/01-overview.md:24-27`
- **Confidence:** High
- **Evidence:** running `npm run test:e2e` during this review failed with `Another next dev server is already running` and `Process from config.webServer was not able to start`.
- **Why this is an issue:** `run-dev-e2e.mjs` correctly reserves a free Playwright port, but Playwright still launches a second `next dev` instance with `reuseExistingServer: false`. Next 16 refuses concurrent dev servers in the same workspace, so the repo’s documented verification path fails whenever a developer already has the app open locally.
- **Concrete failure scenario:** a contributor runs `npm run dev` in one terminal and then tries the documented `npm run test:e2e` command in another. The test run aborts before executing any spec.
- **Suggested fix:** make the dev E2E path reuse an existing dev server when appropriate, or stop depending on a second `next dev` instance altogether. Practical options are:
  - switch the Playwright web server to a reusable existing instance
  - run E2E against a production server (`next build` + `next start` or the existing static path)
  - isolate the Playwright dev server with a distinct Next runtime directory if you truly need a second live dev instance

### [LOW] Static CI executes the same smoke gate twice

- **Files:** `.github/workflows/deploy-pages.yml:31-33`, `package.json:14-16`
- **Confidence:** High
- **Why this is an issue:** the workflow runs `npm run smoke:static`, then immediately runs `npm run test:e2e:static:ci`, which itself starts with `npm run smoke:static`.
- **Concrete failure scenario:** none functionally, but each Pages build pays the same static smoke cost twice and duplicates the same log noise and failure surface.
- **Suggested fix:** remove the standalone workflow smoke step, or split `test:e2e:static:ci` into separate smoke and Playwright scripts so CI can compose them without duplication.

## Likely Issue

### [LOW] The live map likely renders two current-position markers at once

- **Files:** `src/components/MapView.tsx:761-780`, `src/components/MapView.tsx:783-805`, `src/components/MapView.tsx:889-892`
- **Confidence:** Medium
- **Why this looks wrong:** the code maintains both an HTML `maplibregl.Marker` and a canvas-rendered `POSITION_MARKER_LAYER`, and updates both every animation tick. The layer makes sense for export capture, but I did not find any branch that hides it during normal interactive playback.
- **Concrete failure scenario:** the on-screen marker appears thicker or slightly jittery because the DOM marker and the canvas circle are stacked but rendered by different pipelines.
- **Suggested fix:** decide which marker is authoritative for live preview. If the circle layer exists only for export capture, hide or remove it outside export mode; otherwise drop the HTML marker and keep one rendering path.

## Risks Needing Manual Validation

### [LOW] Production builds can expose the debug bridge via query string or localStorage

- **Files:** `src/components/MapView.tsx:595-633`
- **Confidence:** High
- **Why it matters:** `window.__travelbackDebug` is exposed not only in development, but also when `?__travelbackDebug=1` is present or `localStorage['travelback-debug'] === '1'`. I did not find a direct exploit, and the surface mostly exposes camera/map state, but it is still a production-only introspection hook.
- **What to validate manually:** decide whether this is acceptable for your threat model. If not, restrict it to development/test builds only.

## Final Sweep

- No skipped executable source/config files remain in the reviewed scope.
- Worker/main-thread parser parity, locale-key parity, bundled map-style privacy constraints, and CSS variable definitions all looked coherent in this pass.
- The biggest remaining problems are not syntax or type-safety regressions; they are workflow correctness and state invalidation across file boundaries.
