# Deferred Findings - Cycle 3 Review - 2026-04-24

Repo rules checked: `.context/development/01-conventions.md` requires GPG-signed semantic gitmoji commits, build/lint/e2e verification, and `.context/` as the project rule source. No repo rule permits deferring confirmed security, correctness, or data-loss defects; the items below are deferred only where they are architecture/test/defense-in-depth backlog or stale repeats not confirmed in the current source.

## Deferred Items

### DF-C3-001 - Parser implementation duplicated between main thread and worker
- Original severity/confidence: High / High
- Citation: `src/lib/parser.ts:218-621`, `public/workers/trackParser.worker.js:14-322`
- Reason: broad architecture refactor/generation work; current cycle will not restructure the worker build pipeline.
- Exit criterion: reopen when touching Google import formats, worker loading, or adding a source-generation step for `public/workers/trackParser.worker.js`.

### DF-C3-002 - Theme/map-style bootstrap duplicates style keys/defaults
- Original severity/confidence: Medium / High
- Citation: `src/app/layout.tsx:53-67`, `src/app/page.tsx:32-84`, `src/types.ts:21-46`
- Reason: no current user-facing failure confirmed after previous theme fixes; this is a future style-registry drift risk.
- Exit criterion: reopen before adding/removing a `MapStyleKey` or changing first-paint theme/bootstrap behavior.

### DF-C3-003 - JourneyCreator owns raw MapLibre layers/listeners
- Original severity/confidence: Medium / Medium
- Citation: `src/components/MapView.tsx:26-34`, `src/components/JourneyCreator.tsx:170-441`
- Reason: broad map ownership refactor; no current runtime break confirmed beyond the concrete journey icon wording fixed this cycle.
- Exit criterion: reopen before refactoring MapView lifecycle, style-load handling, or journey drawing interactions.

### DF-C3-004 - Static CSP hardener depends on Next internal script serialization
- Original severity/confidence: Medium / High
- Citation: `scripts/harden-static-export.mjs:71-116`, `scripts/smoke-static.mjs:76-119`
- Reason: current smoke gate catches this failure mode; replacing the bootstrap delivery model is broader than this cycle.
- Exit criterion: reopen on Next upgrades or any change to static bootstrap/CSP postbuild behavior.

### DF-C3-005 - Dev Playwright setup removes Next overlay nodes
- Original severity/confidence: Medium / High
- Citation: `e2e/travelback.spec.ts:135-147`, `e2e/travelback.spec.ts:211-238`
- Reason: test-signal improvement, not a confirmed runtime defect. This cycle prioritizes fixing the blocking static-port gate.
- Exit criterion: reopen when touching hydration/bootstrap tests or when a dev-overlay regression is suspected.

### DF-C3-006 - Parser worker/fallback/limit branches need targeted tests
- Original severity/confidence: High / High
- Citation: `src/lib/parser.ts:521-675`, `e2e/travelback.spec.ts:1214-1260`
- Reason: coverage backlog requiring a test harness for browser `Worker`/`File` behavior; not a newly confirmed runtime defect in verifier pass.
- Exit criterion: reopen when adding unit/integration test infrastructure or changing parser worker fallback behavior.

### DF-C3-007 - Export success/cancel/download branches need targeted tests
- Original severity/confidence: High / High
- Citation: `src/lib/useExportController.ts:92-220`, `src/lib/videoEncoder.ts:40-225`, `e2e/travelback.spec.ts:1139-1201`
- Reason: this cycle fixes confirmed export-state bugs; deeper mocked export lifecycle coverage remains a separate test-harness task.
- Exit criterion: reopen when touching export lifecycle, object URL cleanup, save picker behavior, or adding hook/component tests.

### DF-C3-008 - Journey Creator interactions need broader tests
- Original severity/confidence: Medium / High
- Citation: `src/components/JourneyCreator.tsx:243-444`, `src/components/JourneyCreator.tsx:562-820`, `e2e/travelback.spec.ts:446-496`
- Reason: coverage backlog; this cycle fixes the confirmed icon-label mismatch without expanding full map-event testing.
- Exit criterion: reopen when touching click/delete/drag/undo/clear/done/discard route authoring behavior.

### DF-C3-009 - Playwright suite is coupled to exact English copy
- Original severity/confidence: Low / High
- Citation: `e2e/travelback.spec.ts:138`, `e2e/travelback.spec.ts:400-407`, `e2e/travelback.spec.ts:498-510`, `e2e/travelback.spec.ts:1139-1201`
- Reason: low-severity maintainability item; not a blocking correctness defect.
- Exit criterion: reopen during test selector cleanup or localization-driven test failures.

### DF-C3-010 - Security hardening assumptions remain
- Original severity/confidence: Low / High and Low / Medium
- Citation: `src/app/layout.tsx:53-66`, `.context/project/02-architecture.md:114-119`, `src/app/layout.tsx:66`, `scripts/harden-static-export.mjs:21`
- Reason: security reviewer found no confirmed exploitable issue; anti-framing header support depends on hosting and style inline allowance is an accepted current containment tradeoff.
- Exit criterion: reopen when moving off GitHub Pages/fronting with a CDN or when replacing inline style needs.

### DF-C3-011 - Stale debugger repeats not confirmed in current source
- Original severity/confidence: Medium/High, Medium/High, Low/High
- Citation: `src/lib/parser.ts:145-157`, `src/lib/useExportController.ts:92-180`, `src/components/JourneyCreator.tsx:243-250`
- Reason: retry debugger report marked these as already-confirmed, but current source and fresh verifier evidence do not confirm them as new live defects; the relevant current export/journey issues are handled separately in this cycle plan.
- Exit criterion: reopen only with a fresh reproduction or failing regression test for the exact claimed behavior.

## Deferred Gate Warnings

### DGW-C3-001 - Playwright warns that `e2e/travelback.spec.ts` is a slow single test file
- Gate warning severity/confidence: Low / High
- Citation: `e2e/travelback.spec.ts:240-1302`
- Reason: both configured Playwright gates passed, but the suite reported the file as slow (`20.0m` dynamic and `14.9m` static). Splitting the suite into parallel-safe files is a test-harness refactor that needs careful fixture isolation and is out of scope for the confirmed cycle-3 runtime/UI fixes.
- Exit criterion: reopen when e2e runtime blocks iteration speed, when adding new e2e coverage to this file, or when isolating fixtures enough to run Playwright files in parallel.
