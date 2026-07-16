# Cycle 8 Test Engineer — 2026-07-17

Reviewed revision `81342b7fab1cc2577909b63025bb2452dcb5446b` read-only on `codex/review-plan-fix-2026-07-16`.

## Outcome

**No new actionable test gap.** New finding count: **0**. The current suite has focused regressions for every Cycle 7 repair, and the final catalog/sweep found no untested branch tied to a newly confirmed current failure. The known release-gate omission B01 remains confirmed and authority-blocked.

This role did not start a server or rerun gates. The exact-HEAD completion evidence records 16 unit files / 393 passing tests, 97 passing dev E2E and 97 passing production-static E2E cases with no retries, four focused dev plus static regressions, static smoke/build/CSP parity, and one real MP4 export (`.context/plans/cycle7-implementation-2026-07-17.md:164-172`). Those are provenance, not represented as fresh Cycle 8 execution.

## Complete test and repository inventory

- All 54 `src` paths were inventoried and every one of the 53 textual runtime/test files was read from its behavior or test-consumer angle. The binary favicon was checked only at the app/build boundary.
- All 16 Vitest suites were reviewed in full: component suites for ElevationProfile, ExportPanel, FileUpload, JourneyCreator, SceneEditor, TimelineSelector; library suites for camera, env, i18n, interpolate, map-geometry, map-render, parser, useExportController, videoEncoder; and the parser-worker entry suite.
- The complete 2,783-line `e2e/travelback.spec.ts` catalog and all 18 fixtures were mapped to behavior. Coverage includes landing/focus/theme/locales, guide tabs, file cancellation and valid/invalid/large imports, every Google representation, duplicate/revisit behavior, map failure/retry/style generations, mobile/desktop geometry and hit ownership, Journey Creator, playback and segmented routes, timeline mouse/keyboard/cancel/reset/seek, scenes/undo/preview/trim invalidation, dialogs/focus, codec/export/cancel/save/share/session reset, static base path/CSP assets, and gated real export.
- Harness/config review covered both Playwright configs, Vitest inclusion, TypeScript/ESLint/Next/PostCSS, package scripts, worker generation/parity, both E2E wrappers, static server, static smoke, CSP hardener, the Pages job, package metadata, and lockfile structure.
- All textual public assets and generated-worker ownership were checked. Current context, project/development conventions, README, aggregate, Cycle 6/7 implementation records, pending instruction, and all twelve Cycle 7 reports were reviewed for promised acceptance criteria and stale assertions.

Historical reviews/plans were searched for prior gaps and deferrals rather than counted as current executable requirements. Generated/minified output and binary font/favicon data were assessed through source, parity, asset, CSP, and smoke provenance.

## New findings

None.

## Existing release-assurance finding — confirmed unchanged, not refiled

### B01 — The deploy workflow omits all 393 unit/component tests

- Severity / confidence: **High / High**
- Status: **Confirmed existing authority-blocked carryover**
- File/region: `.github/workflows/deploy-pages.yml:26-32`; test command at `package.json:16`; inclusion at `vitest.config.ts:4-7`
- Concrete failure: a parser ordering/budget, worker transport, render-wait cleanup, component drag lifecycle, i18n parity, export cancellation/finalization, or geometry regression visible only to Vitest can reach the Pages artifact while the workflow's lint/typecheck/build/static-browser subset remains green.
- Fix: after explicit authorization to edit CI/CD, add `npm test` before the artifact build/upload boundary and validate the workflow without dispatching it.

## Coverage assessment and rejected candidates

- Cycle 7 parser ordering is tested for missing/empty/invalid timestamps, partially timed segments, fully timed chronological sorting, and source/worker parity (`src/lib/parser.test.ts:550-630`; `src/workers/trackParser.worker.test.ts:174-268`).
- Missing elevation now has deterministic line/area assertions for leading, trailing, interior, isolated, flat, zero-distance, single-point, and all-missing cases (`src/components/ElevationProfile.test.ts:4-56`), while browser coverage retains the malformed-file integration check.
- Help hit ownership, segmented focus paint, localized guide art/import limits, and timeline date semantics have browser regressions added at `e2e/travelback.spec.ts:567-603,1319-1420,1553-1635`; timeline component tests retain keyboard, drag cancellation, one-commit, and timeless fallbacks.
- Parser tests deliberately assert aggregate candidate allocation rejection before flattening (`src/lib/parser.test.ts:1419-1449`). A proposed test expecting duplicate candidates to bypass that budget would contradict the peak-memory protection contract, so it was rejected.
- The selected timeline region has an `onTouchStart` path without `touch-action: none`, while handles set it (`src/components/TimelineSelector.tsx:533-577,617-639`). Synthetic touch coverage targets handle cancellation and browser coverage targets mouse/keyboard. This is a longstanding physical-touch evidence gap already represented in historical deferrals, not a newly confirmed failure; without a device/browser reproduction it was not promoted. The appropriate future validation is a real pointer/touch region drag that proves no browser gesture cancellation.
- The dev/static wrappers release their probe socket before Playwright owns the port. The race is theoretical, was not reproduced, and the exact-HEAD runs completed with no retry. It remains a harness note rather than a finding.
- Playwright's configured retry of one can mask intermittency, but the recorded full Cycle 7 suites used no retry. The real-export case is intentionally environment-gated and was separately run once with retries disabled.

## Flakiness, false-positive, and interaction sweep

The final pass checked permissive assertions, hidden skips, host locale/time-zone dependence, async `act` ownership, stale DOM locators, generated-worker drift, port/process ownership, retry masking, temp fixture cleanup, map style generations, cancellation races, focus restoration, hit-testing rather than screenshot-only evidence, export test-stub isolation, real MP4 structure, and parity between dev and static base-path execution. No additional gap had a concrete current failure and a regression that would fail for the right reason.
