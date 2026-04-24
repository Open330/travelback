# Cycle 2 Fresh Review Implementation Plan — 2026-04-24

Source aggregate: `.context/reviews/_aggregate.md`

## Repository Rules Consulted

- `.context/development/01-conventions.md`: strict TypeScript, no semicolons,
  single quotes, 2-space indentation, `npm run build` / `npm run lint` required,
  GPG-signed semantic gitmoji commits.
- `.context/README.md`, `.context/project/01-overview.md`, and
  `.context/project/02-architecture.md`: client-only/static-export privacy
  boundary, local map styles, camera/export architecture, and review/plan
  traceability.
- No root `CLAUDE.md`, root `AGENTS.md`, `.cursorrules`, or `CONTRIBUTING.md`
  exists in the repo.

## Scheduled Implementation Items

### C2F-TASK-1 — Harden XML entity stripping

- **Findings:** C2-AGG-001
- **Severity/confidence:** Medium / High
- **Files:** `src/lib/parser.ts`, `e2e/travelback.spec.ts`
- **Plan:**
  1. Reject or strip newline-spanning entity declarations before XML parsing.
  2. Add a GPX regression fixture/test proving multi-line entity declarations
     fail safely rather than bypassing the sanitizer.
- **Status:** DONE — `stripXmlEntities` now removes newline-spanning entity
  declarations, with E2E GPX fixture coverage.

### C2F-TASK-2 — Preserve previous export previews on failed retry

- **Findings:** C2-AGG-003
- **Severity/confidence:** Medium / High
- **Files:** `src/lib/useExportController.ts`
- **Plan:** Move previous-export revocation until after map/canvas/track
  validation and the new export session has actually started.
- **Status:** DONE — failed retries preserve the prior completed export preview
  until a replacement export succeeds.

### C2F-TASK-3 — Clear scene state when timeline trimming changes track bounds

- **Findings:** C2-AGG-004
- **Severity/confidence:** Medium / High
- **Files:** `src/app/page.tsx`, `e2e/travelback.spec.ts`
- **Plan:**
  1. Treat non-full timeline trims as a change in scene coordinate space.
  2. Clear existing scenes and close the scene editor when a trim changes the
     loaded track slice.
  3. Add an E2E regression so authored scenes do not silently persist after a
     trim.
- **Status:** DONE — non-full trims clear authored scenes and close the scene
  editor, with E2E coverage.

### C2F-TASK-4 — Retry Journey Creator binding until MapLibre is ready

- **Findings:** C2-AGG-005
- **Severity/confidence:** Low / Medium
- **Files:** `src/components/JourneyCreator.tsx`
- **Plan:** Add a short bounded retry when create mode is active but the map
  handle is not available yet, so listeners/layers bind once the map exists.
- **Status:** DONE — create mode now retries briefly while the MapLibre handle
  finishes initializing.

### C2F-TASK-5 — Make reference-grid bounds antimeridian-aware

- **Findings:** C2-AGG-006
- **Severity/confidence:** Medium / High
- **Files:** `src/components/MapView.tsx`
- **Plan:** Compute grid longitudes in the same shifted domain used by
  antimeridian fit/route logic before expanding the grid extent.
- **Status:** DONE — reference-grid longitude extents use the same shifted
  antimeridian domain as fit bounds.

### C2F-TASK-6 — Classify map-render export failures separately from codec failures

- **Findings:** C2-AGG-007
- **Severity/confidence:** Medium / High
- **Files:** `src/lib/useExportController.ts`, `src/lib/i18n.ts`
- **Plan:** Add localized copy for map-render export failures and use it when
  `waitForIdle`/resize failures throw known map-render messages.
- **Status:** DONE — map render readiness failures now use localized map-render
  export copy instead of codec copy.

### C2F-TASK-7 — Make mobile file replacement discoverable

- **Findings:** C2-AGG-008
- **Severity/confidence:** Medium / High
- **Files:** `src/components/FileUpload.tsx`, `src/lib/i18n.ts`,
  `e2e/travelback.spec.ts`
- **Plan:** Add a short visible mobile label while keeping the control compact
  enough for the stacked mobile header.
- **Status:** DONE — mobile replacement upload control now keeps a compact
  visible label with E2E width coverage.

### C2F-TASK-8 — Add in-app map retry

- **Findings:** C2-AGG-009
- **Severity/confidence:** Medium / High
- **Files:** `src/components/MapView.tsx`, `src/lib/i18n.ts`
- **Plan:** Add a retry/reinitialize button to map error UI so users do not have
  to reload the whole page for recoverable MapLibre/WebGL failures.
- **Status:** DONE — map error UI now offers in-app map retry/reinitialization
  alongside full reload.

## Deferred Findings

Deferred items follow review-plan-fix rules: original severity/confidence is
preserved, no finding is silently dropped, and each item has a concrete exit
criterion.

### C2F-DEF-001 — GPX/KML imports can lock the UI via main-thread XML parsing

- **Finding:** C2-AGG-002
- **Citation:** `src/lib/parser.ts:521-523`, `src/lib/parser.ts:653-673`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Full XML workerization or streaming parser work
  crosses build/runtime boundaries and overlaps with the existing deferred
  parser-worker architecture items. This cycle applies the narrower XML entity
  hardening but does not add a new worker build lane.
- **Exit criterion:** Re-open when introducing a bundled worker/shared parser
  module or when lowering file-size limits for XML imports.

### C2F-DEF-002 — Shipped map style is a route grid, not a real basemap

- **Finding:** C2-AGG-010
- **Citation:** `public/map-styles/*.json`, `src/components/MapView.tsx:225-369`
- **Original severity/confidence:** High / High
- **Reason for deferral:** This is a product/asset strategy decision. The repo
  intentionally pins local-only map styles and static smoke tests assert that no
  external basemap sources are present.
- **Exit criterion:** Re-open when choosing between local basemap assets and
  explicit route-grid product positioning/copy.

### C2F-DEF-003 — File System Access save path may lose user activation

- **Finding:** C2-AGG-011
- **Citation:** `src/lib/useExportController.ts:146-163`,
  `src/lib/videoEncoder.ts:171-188`
- **Original severity/confidence:** Medium / Medium
- **Reason for deferral:** Requires browser/device validation and a larger UX
  choice about requesting save handles before long exports.
- **Exit criterion:** Re-open with target-browser evidence for picker behavior
  or when redesigning export save UX.

### C2F-DEF-004 — Google JSON parsing is duplicated between main and worker paths

- **Finding:** C2-AGG-012
- **Citation:** `src/lib/parser.ts:242-620`,
  `public/workers/trackParser.worker.js:44-320`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Requires build-pipeline design to generate or bundle
  the public worker from shared code. This is already represented by prior
  parser-worker deferred items and is too broad for this fix batch.
- **Exit criterion:** Re-open when adding a generated/shared worker entry and
  parser parity tests.

### C2F-DEF-005 — Large JSON worker failures are too generic

- **Finding:** C2-AGG-013
- **Citation:** `src/lib/parser.ts:529-560`,
  `src/components/FileUpload.tsx:62-85`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** The user-facing message depends on the broader
  parser-worker fallback strategy and should be fixed with the worker-required
  error-code design.
- **Exit criterion:** Re-open when defining worker-unavailable error codes and
  localized recovery copy.

### C2F-DEF-006 — Core export flow is not tested end-to-end

- **Finding:** C2-AGG-014
- **Citation:** `e2e/travelback.spec.ts:1111-1173`,
  `e2e/travelback.spec.ts:1237-1291`
- **Original severity/confidence:** High / High
- **Reason for deferral:** A reliable export test requires a WebCodecs/mock seam
  or target-browser policy. This cycle fixes export state correctness but does
  not introduce a new test harness or encoder mock.
- **Exit criterion:** Re-open when adding an export controller test seam or a
  low-cost browser export smoke lane.

### C2F-DEF-007 — Pure parser/camera/interpolate/controller logic lacks a deterministic harness

- **Finding:** C2-AGG-015
- **Citation:** `package.json:5-17`, `src/lib/parser.ts`,
  `src/lib/interpolate.ts`, `src/lib/camera.ts`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Adding a unit-test harness is tooling scope and would
  require choosing how TypeScript test execution should run without adding
  dependencies.
- **Exit criterion:** Re-open when selecting a repo-supported unit-test runner
  or Node test compilation path.

### C2F-DEF-008 — Playback/export frame loop rebuilds expensive geometry

- **Finding:** C2-AGG-016
- **Citation:** `src/components/MapView.tsx:107-167`,
  `src/components/MapView.tsx:844-850`, `src/lib/camera.ts:53-95`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Requires performance design and likely changes to map
  layer update strategy; not needed to fix correctness regressions in this cycle.
- **Exit criterion:** Re-open when adding performance profiling or a long-track
  export/playback optimization pass.

### C2F-DEF-009 — Playwright suite is monolithic and timing/actionability fragile

- **Finding:** C2-AGG-017
- **Citation:** `e2e/travelback.spec.ts`, `playwright.config.ts:7-11`,
  `playwright.static.config.ts:7-11`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Suite restructuring is a test-maintenance project and
  should be separate from this behavior-fix batch.
- **Exit criterion:** Re-open when splitting E2E specs or hardening CI flake
  behavior.

### C2F-DEF-010 — Static export/deployment is hard-coupled to `/travelback`

- **Finding:** C2-AGG-018
- **Citation:** `next.config.ts:3-10`, `package.json:8-16`,
  `playwright.static.config.ts:13-43`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Deployment topology is an external hosting decision;
  changing it can break the current GitHub Pages contract.
- **Exit criterion:** Re-open when adding multi-target deployment support or a
  configurable `BASE_PATH` build contract.

### C2F-DEF-011 — Locale bootstrapping is weaker than theme bootstrapping

- **Finding:** C2-AGG-019
- **Citation:** `src/app/layout.tsx:50-53`, `src/lib/i18n.ts:1738-1788`
- **Original severity/confidence:** Medium / Medium
- **Reason for deferral:** First-visit locale negotiation requires product
  policy for default locale vs. browser locale and hydration behavior. Existing
  persisted locale behavior is covered.
- **Exit criterion:** Re-open when defining first-visit locale policy.

### C2F-DEF-012 — Anti-framing and style CSP remain deployment/hardening risks

- **Finding:** C2-AGG-020
- **Citation:** `src/app/layout.tsx:60-64`,
  `.github/workflows/deploy-pages.yml:34-46`,
  `scripts/harden-static-export.mjs:14-29`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** Header enforcement depends on production hosting/CDN,
  and removing inline styles is a broad UI styling migration.
- **Exit criterion:** Re-open when moving to header-capable hosting or starting
  an inline-style reduction pass.

### C2F-DEF-013 — RTL assumptions are not wired through document or controls

- **Finding:** C2-AGG-021
- **Citation:** `src/app/layout.tsx:50-53`, `src/components/GoogleGuide.tsx:289-310`,
  `src/components/TimelineSelector.tsx:396-415`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** The current supported locales are LTR. RTL behavior
  should be handled before adding an RTL locale, not partially patched without a
  supported RTL target.
- **Exit criterion:** Re-open when adding Arabic/Hebrew or any RTL locale.

## Implementation Progress

Status: implemented and verified.

- [x] C2F-TASK-1
- [x] C2F-TASK-2
- [x] C2F-TASK-3
- [x] C2F-TASK-4
- [x] C2F-TASK-5
- [x] C2F-TASK-6
- [x] C2F-TASK-7
- [x] C2F-TASK-8

## Gate Fixes This Cycle

- Fixed two lint warnings found during implementation: a stale
  `react-hooks/exhaustive-deps` disable in `JourneyCreator.tsx` and an
  unnecessary callback dependency in `useExportController.ts`.
- Fixed a Playwright strict-selector failure in the map-error recovery test by
  targeting the named recovery buttons.
- Removed inherited `NO_COLOR`/`FORCE_COLOR` warning noise from Playwright npm
  scripts.
- Removed React development CSP `eval()` warning noise with a dev-only
  `unsafe-eval` placeholder; static production HTML remains hash-hardened by
  `scripts/harden-static-export.mjs`.
- Hardened the antimeridian scene camera test against a static-mode retry by
  waiting for the actual debug-camera condition instead of a fixed sleep.
- Remaining Playwright slow-file warning is deferred under C2F-DEF-009 because
  splitting the monolithic suite is a broader test-maintenance task.

## Gate Evidence

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run build` — passed; postbuild CSP hardening processed 3 HTML files.
- `npm run test:e2e` — passed, 61/61 tests, no retries.
- `npm run test:e2e:static` — passed, build + static smoke + 61/61 tests, no
  retries.
