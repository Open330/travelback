# Cycle 2 Implementation Plan (2026-04-23)

Source: `.context/reviews/_aggregate.md` (superseded by cycle 1 orchestrator-run aggregate)

## Status: SUPERSEDED BY `.context/plans/cycle1-implementation-2026-04-23.md`

An earlier partial cycle authored this file and `.context/reviews/cycle2-*-2026-04-23.md` describing "no new findings". A subsequent full gate run in the current orchestrator cycle uncovered a blocking `npm run smoke:static` regression (C1-F1 in the updated aggregate) caused by commit `5788949` reintroducing remote CARTO/OSM basemap sources, which directly contradicts the product offline/local-only contract in `.context/project/02-architecture.md`.

Action items for C1-F1 (revert the 5 bundled style JSONs and drop `cartocdn.com` from both CSP policies) are scheduled in `.context/plans/cycle1-implementation-2026-04-23.md` as task C1-T1.

### Prior Cycle 2 Fixes (from earlier session, all confirmed still applied)

| Item | Description | Status |
|------|-------------|--------|
| P0-1 | Fix parser segment remap filter dropping index 0 | CONFIRMED APPLIED |
| P1-1 | Add aria-valuetext to SceneEditor sliders | CONFIRMED APPLIED |
| P1-2 | Fix ExportPanel frame count display to match encoder clamping | CONFIRMED APPLIED |

### Prior Cycle 1/17 Fixes (all confirmed still applied)

| Item | Description | Status |
|------|-------------|--------|
| C17-P0-1 | FileUpload duplicate size check removed | CONFIRMED APPLIED |
| C17-P0-2 | Map style persisted to localStorage | CONFIRMED APPLIED |
| C17-P0-3 | handleRangeChange segment filter `index >= 0` | CONFIRMED APPLIED |
| C17-P0-4 | usePlaybackController mountedRef guard | CONFIRMED APPLIED |
| C17-P0-5 | Korean `export.at` translation | CONFIRMED APPLIED |
| C17-P0-6 | reader.onerror uses ParseError with READ_FAILED | CONFIRMED APPLIED |
| C17-P0-7 | ThemeToggle matchMedia onModeChange guard | CONFIRMED APPLIED |
| C17-P0-8 | Toast aria-live by severity | CONFIRMED APPLIED |
| C17-P1-1 | Scene overlap detection in SceneEditor | CONFIRMED APPLIED |
| C17-P1-2 | TimelineSelector onRangeChange during drag | CONFIRMED APPLIED |

### Gate Verification (from pre-regression partial cycle)

- [x] ESLint: 0 errors, 0 warnings (PASSED)
- [x] TypeScript (tsc --noEmit): 0 errors (PASSED)
- [x] Next.js build: Compiled successfully (PASSED)
- [ ] **`npm run smoke:static`: FAILED** (see C1-F1 / C1-T1) — fixed under `.context/plans/cycle1-implementation-2026-04-23.md`.
- [x] Playwright E2E tests (last full pass): 53 passed (4.3m)
