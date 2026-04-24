# Verifier Review - Review-Plan-Fix Cycle 4

## Verdict

PARTIAL

The static export, CSP hardening, local map assets/privacy, parser format support, and keyboard/focus primitives all verified cleanly in the current source and smoke gates. I did find one confirmed runtime defect and one confirmed coverage gap that keep this from being a clean pass.

## Evidence

- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm run build` - passed; Next prerendered the app statically and `postbuild` hardened CSP across 3 HTML files.
- `npm run smoke:static` - passed; served `out` at `/travelback/`, verified hardened CSP, local-only map styles, and no tool-state residue.
- `find . -maxdepth 3 ...` - only `e2e/travelback.spec.ts`, `playwright.config.ts`, and `playwright.static.config.ts` matched; there are no unit-test files in the repo tree.
- `src/app/layout.tsx:59-66`, `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs` - the static export hardening path is implemented and validated.
- `public/map-styles/*.json` and `scripts/fetch-map-styles.mjs` - bundled styles are local-only and contain no remote tiles, glyphs, or sprites.
- `src/lib/parser.ts:623-675` and `src/lib/parser.ts:541-619` - parser dispatch covers GPX, KML, Google JSON, and the worker/fallback path.
- `e2e/travelback.spec.ts:1265-1319` - the current "full journey" tests open the export panel and stop at `Start Export` visibility.

## Findings

1. Search results dropdown uses an undefined CSS custom property, so the listbox can render with a transparent background
   - Severity: Low
   - Confidence: High
   - Evidence: `src/components/JourneyCreator.tsx:680-685`
   - Evidence: repo-wide search for `--bg1` only returns those two usages in `JourneyCreator.tsx`; there is no definition in `src/app/globals.css` or `src/styles/vitro-base.css`.
   - Failing scenario: once coordinate search returns results, the dropdown container and its rows request `var(--bg1)`. Because that variable is undefined, the browser drops the declaration and the results overlay can sit directly on top of the map with no stable fill, reducing contrast and readability.
   - Suggested fix: replace `var(--bg1)` with an existing token such as `var(--bg)`, `var(--go-bg)`, or `var(--gc-bg)`, or define `--bg1` centrally with light/dark values.

2. Export completion and download behavior are not actually covered by automated tests
   - Severity: Medium
   - Confidence: High
   - Evidence: `e2e/travelback.spec.ts:1265-1319`
   - Evidence: `find . -maxdepth 3 ...` only surfaced Playwright config/spec files, so there are no unit tests for the parser or export controller branches.
   - Evidence: `src/lib/useExportController.ts:165-177` and `src/lib/videoEncoder.ts:171-211` contain the post-encode download-method handling that is not exercised by the current "full journey" tests.
   - Evidence: `src/lib/parser.ts:541-619` contains the Google JSON worker/fallback path that is not covered by any dedicated unit test in this repo.
   - Failing scenario: regressions in the file-save picker path, fallback anchor download path, or Google JSON worker/fallback logic could ship while the current suite still passes, because the named "completes full journey" tests stop after the export panel becomes visible and never click `Start Export`.
   - Suggested fix: add at least one true export E2E that reaches the done state and verifies the success UI, plus focused tests for download-method selection and the Google JSON worker/fallback branches.

## Gaps

- I did not find a docs-vs-code mismatch in the currently stated parsing formats, static export behavior, map asset/privacy claims, or CSP hardening path.
- I did not confirm the deferred TrackToolbar mobile focus-trap item in this pass; it remains a backlog concern rather than a new verified defect here.

## Risks

- Browser-specific export behavior still depends on `showSaveFilePicker`, synthetic anchor downloads, and worker availability, but those branches are only partially covered today.
- The search dropdown styling bug is low-risk for function but visible to users and likely to recur if the undefined token is copied elsewhere.
- No behavior-relevant files were intentionally skipped in the review sweep; the inspected surface covered `src/app/*`, `src/components/*`, `src/lib/*`, `public/map-styles/*.json`, `public/workers/trackParser.worker.js`, `scripts/*`, `e2e/travelback.spec.ts`, `playwright*.ts`, `.context/project/01-overview.md`, and `plan/cycle4-plan.md`.
