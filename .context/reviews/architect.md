# Architect Review — review-plan-fix cycle 2

## Summary

The repo still largely matches its documented client-only, static-export
architecture, but there are three confirmed design defects: scene state is not
trim-aware, deployment topology is hard-coded to GitHub Pages under
`/travelback`, and locale bootstrapping is weaker than theme bootstrapping,
leaving first-render/hydration inconsistencies. Three architecture risks also
need manual validation: duplicated main-thread/worker parser logic, an export
pipeline with no real execution coverage, and a Journey Creator map-readiness
race.

## Inventory

Reviewed source/config/test/doc files relevant to the requested areas:
`package.json:5-17`, `next.config.ts:3-13`, `playwright.config.ts:1-41`,
`playwright.static.config.ts:1-45`, `.github/workflows/deploy-pages.yml:1-46`,
`.context/README.md:1-29`, `.context/development/01-conventions.md:1-66`,
`.context/project/01-overview.md:1-97`,
`.context/project/02-architecture.md:1-148`, `src/app/layout.tsx:1-85`,
`src/app/page.tsx:1-481`, `src/types.ts:1-117`,
`src/lib/{env,camera,i18n,interpolate,parser,useExportController,usePlaybackController,videoEncoder}.ts`,
`src/components/{MapView,TrackWorkspace,TrackToolbar,GlobalToolbar,ThemeToggle,FileUpload,JourneyCreator,SceneEditor,TimelineSelector,ExportPanel,Controls,ElevationProfile,ModalDialog,GoogleGuide,KeyboardHelp,ErrorBoundary,Toast}.tsx`,
`public/workers/trackParser.worker.js:1-322`, `public/map-styles/*.json`,
`scripts/{harden-static-export,serve-static,smoke-static,fetch-map-styles}.mjs`,
`e2e/travelback.spec.ts:1-1293`, `plan/cycle2-plan.md:1-22`,
`plan/cycle2-c2-plan.md:1-133`.

## Findings

### ARCH-001 — Scene ownership is not trim-aware

- **Status:** Confirmed issue
- **Severity/confidence:** Medium / High
- **Evidence:** `.context/project/02-architecture.md:130-138`,
  `src/app/page.tsx:188-214`, `src/app/page.tsx:216-237`,
  `src/lib/camera.ts:125-137`, `src/lib/camera.ts:339-428`
- **Problem:** Trim lifecycle and scene authoring are separate concerns in the
  docs, but trimming `track` does not touch `scenes`; scene ranges are then
  interpreted against the newly sliced track.
- **Failure scenario:** A user authors scenes on the full trip, trims to a
  subsection, then previews/exports and gets the same percentages applied to a
  different geographic slice with no warning.
- **Suggested fix:** Either clear scenes on any trim that changes track bounds,
  or store scene ranges in full-track distance space and re-project them onto
  the trimmed track.

### ARCH-002 — Static export/deployment is hard-coupled to GitHub Pages under `/travelback`

- **Status:** Confirmed issue
- **Severity/confidence:** Medium / High
- **Evidence:** `next.config.ts:3-10`, `package.json:8-16`,
  `src/app/layout.tsx:5-8`, `playwright.static.config.ts:13-15`,
  `playwright.static.config.ts:40-43`,
  `.github/workflows/deploy-pages.yml:17-46`,
  `.context/project/01-overview.md:17-31`
- **Problem:** Moving the app to a root path or another subpath/custom domain
  produces broken asset URLs, wrong OG/canonical URLs, and no CI coverage for
  that topology.
- **Suggested fix:** Make `basePath` and site origin explicit build-time env
  inputs, and run at least one static smoke path without `/travelback`.

### ARCH-003 — Locale persistence is weaker than theme persistence

- **Status:** Confirmed issue
- **Severity/confidence:** Medium / Medium
- **Evidence:** `src/app/layout.tsx:50-53`, `src/lib/i18n.ts:1738-1788`,
  `e2e/travelback.spec.ts:214-221`
- **Problem:** Theme/map style are bootstrapped before hydration, but first-time
  locale resolution falls back to `navigator.language` only on the client and
  updates `document.documentElement.lang` in an effect.
- **Failure scenario:** A first-time Korean/Japanese/Chinese/Spanish visitor
  gets English static HTML and `lang="en"` until hydration, which can flash the
  wrong copy and announce the wrong language to assistive tech.
- **Suggested fix:** Share initial locale resolution with the bootstrap path and
  the client provider, or serialize an initial locale into the HTML the same way
  theme/map-style are bootstrapped.

### ARCH-004 — Main-thread and worker JSON parsers are still duplicated

- **Status:** Risk needing manual validation
- **Severity/confidence:** Medium / High
- **Evidence:** `src/lib/parser.ts:242-620`,
  `public/workers/trackParser.worker.js:44-320`,
  `src/lib/parser.ts:537-620`, `e2e/travelback.spec.ts:170-175`,
  `e2e/travelback.spec.ts:1186-1214`
- **Failure scenario:** A new Google Takeout variant or parser fix lands in one
  copy but not the other, so large files, worker-disabled browsers, or
  worker-creation failures parse differently from the happy path.
- **Suggested fix:** Generate the worker from a shared parser module/bundled
  worker entry, and add targeted tests for `Worker === undefined` and
  worker-error fallback.

### ARCH-005 — The render/export pipeline has shell coverage, but not real encode/save coverage

- **Status:** Risk needing manual validation
- **Severity/confidence:** Medium / Medium
- **Evidence:** `src/lib/useExportController.ts:87-220`,
  `src/lib/videoEncoder.ts:40-159`,
  `e2e/travelback.spec.ts:1127-1149`,
  `e2e/travelback.spec.ts:1237-1291`,
  `scripts/smoke-static.mjs:165-180`
- **Failure scenario:** `waitForIdle()`, `CanvasSource.add()`, codec support,
  file-picker save, or fallback download can fail in a target browser while CI
  stays green because no test executes the pipeline.
- **Suggested fix:** Add one browser-level export smoke test with a short track
  and low resolution, or introduce a test seam that exercises the frame loop and
  save-path decisions deterministically.

### ARCH-006 — Journey Creator can still miss map initialization and never retry

- **Status:** Risk needing manual validation
- **Severity/confidence:** Low / Medium
- **Evidence:** `src/components/JourneyCreator.tsx:242-245`,
  `src/components/JourneyCreator.tsx:432-433`, `src/app/page.tsx:407-414`
- **Failure scenario:** If the panel becomes active before MapLibre finishes
  initializing, the panel renders but map layers/listeners are never attached,
  and the effect does not rerun when the map handle later becomes available.
- **Suggested fix:** Expose a `mapReady` signal from `MapView` or poll/retry
  until `getMap()` is non-null before binding Journey Creator layers.

## Root Cause

The recurring pattern is split ownership without a single source of truth: trim
state vs. scene state, theme bootstrap vs. locale bootstrap, deployment config
vs. preview/test config, and main-thread parser logic vs. worker parser logic.

## Final Sweep

No relevant file in the requested review areas was skipped. The review covered
source boundaries (`src/app`, `src/lib`, map/export/parser components),
deployment/config surfaces, repo docs/context files, and the full E2E suite for
evidence and coverage gaps.
