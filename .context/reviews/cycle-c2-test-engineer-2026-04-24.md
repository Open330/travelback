# Cycle C2 Test Engineer Review — 2026-04-24

## Scope and rules read

Read the project rules first:

- `.context/README.md:27-29` — Travelback animates GPX/KML/Google Location History into map/video journeys.
- `.context/development/01-conventions.md:52-57` — required gates are build, lint, Playwright e2e, and manual sample-file testing.
- `.context/project/01-overview.md:15-25` — Playwright is the documented automated test layer.
- `.context/project/02-architecture.md:24-67` — parser → track session → interpolation/camera/map/export data flow.

## Inventory reviewed

Testing and gate surfaces:

- `package.json:5-17` — scripts for `lint`, `typecheck`, `build`, `smoke:static`, `test:e2e`, `test:e2e:static`, and `test:e2e:static:ci`.
- `.github/workflows/deploy-pages.yml:26-33` — CI deploy gate runs npm install, Playwright browser install, lint, typecheck, audit, build, smoke, and static e2e.
- `playwright.config.ts:5-45` — dev-server Playwright config, Chromium-only, serial, one retry.
- `playwright.static.config.ts:5-45` — static-export Playwright config against `/travelback`, Chromium-only, serial, one retry.
- `scripts/smoke-static.mjs:76-145,167-180` — CSP/local-map/static-asset smoke assertions.
- `e2e/travelback.spec.ts:1-1219` — sole executable test file; 56 listed tests.
- `e2e/fixtures/*` — GPX/KML/Google JSON fixtures; none are antimeridian/dateline fixtures.

Source areas sampled for testability and current gaps:

- `src/lib/parser.ts:43-107,399-407,429-482,493-515`
- `public/workers/trackParser.worker.js:197-203,206-240,289-322`
- `src/lib/interpolate.ts:5-15,41-47,57-130`
- `src/lib/camera.ts:53-117`
- `src/components/JourneyCreator.tsx:27-32,253-259,465-475`
- `src/components/FileUpload.tsx:52-93`
- `src/components/MapView.tsx:112-166`

Prior/deferred-test context reviewed:

- `.context/plans/deferred-findings-cycle17-2026-04-23.md:55-59` — broad “no unit tests” is already deferred until a test-infrastructure pass.
- `.context/plans/deferred-findings-cycle-r3-2026-04-23.md:56-60` — antimeridian unit/e2e coverage was previously deferred as low/medium.
- `.context/plans/deferred-findings-cycle-r7-2026-04-23.md:29-43` — export-overlay a11y e2e guard remains deferred until export flow is mockable/test-visible.
- `.context/reviews/cycle-r9-test-engineer-2026-04-24.md:9-18` — parser error-code mapping, export cancel flow, camera interpolation, and scene normalization unit tests were already tracked as test gaps.
- `.context/reviews/cycle-c2-verifier-2026-04-24.md:74-131` — current cycle verifier found live antimeridian camera/JourneyCreator defects.

## Gate and test health

- Current automated coverage is Playwright-heavy: `e2e/travelback.spec.ts` contains 56 tests spanning landing/upload, i18n, theme, map errors, sample/fixture imports, journey creator, playback, timeline trimming, layout regressions, map styles, export-panel UI, and basic full-journey flows (`e2e/travelback.spec.ts:238-1218`).
- Fresh local checks run for this review:
  - `npm run lint` → pass.
  - `npm run typecheck` → pass.
  - `npx playwright test --list -c playwright.static.config.ts` → `Total: 56 tests in 1 file`.
- Full expensive gates were not re-run by this read-only review, but the same cycle's verifier reports `npm run lint`, `npm run typecheck`, `npm run build`, `npm run smoke:static`, and `npm run test:e2e:static:ci` all passing with 56/56 tests (`.context/reviews/cycle-c2-verifier-2026-04-24.md:29-43`).
- Gate adequacy is generally strong for deploy safety: GitHub Pages CI includes lint/typecheck/audit/build/smoke/static-e2e (`.github/workflows/deploy-pages.yml:26-33`).

## Findings

### C2-TE-001 — Antimeridian regressions need a targeted failing test before repair

- **Severity:** Medium
- **Confidence:** High
- **Type:** Coverage gap / TDD opportunity
- **Status vs deferred work:** This is related to the already-deferred broad antimeridian coverage item (`.context/plans/deferred-findings-cycle-r3-2026-04-23.md:56-60`), but the exit condition has effectively been met: cycle C2 now has confirmed live antimeridian defects in current source. This should be treated as a bounded actionable regression test, not as the broad “add unit tests everywhere” effort.

**Evidence:**

- `src/lib/camera.ts:53-74` detects antimeridian-crossing boxes using shifted longitude bounds, and `src/lib/camera.ts:86-94` derives overview zoom from that shifted span. As confirmed by the C2 verifier, a route around `170°E`/`170°W` can be interpreted as a near-world span instead of the short dateline-crossing span (`.context/reviews/cycle-c2-verifier-2026-04-24.md:74-107`).
- `src/lib/camera.ts:102-117` attempts shifted-domain interpolation in `lerpCamera`; the C2 verifier reproduced that the formula does not preserve the start camera at `t=0` for `170 -> -170` (`.context/reviews/cycle-c2-verifier-2026-04-24.md:87-97`).
- `src/components/JourneyCreator.tsx:27-32` subtracts raw longitude in `approxDistanceMeters`, and both click/paste duplicate-suppression paths depend on it (`src/components/JourneyCreator.tsx:253-259,465-475`). This leaves near-duplicate points across ±180° uncovered and currently wrong (`.context/reviews/cycle-c2-verifier-2026-04-24.md:111-131`).
- Existing tests exercise ordinary tracks and a segmented Korea/Japan fixture (`e2e/travelback.spec.ts:866-877`), route/camera stability on non-dateline tracks (`e2e/travelback.spec.ts:885-920`), and JourneyCreator coordinate paste with Seoul coordinates (`e2e/travelback.spec.ts:454-466`), but there is no dateline fixture or assertion in the 56-test list (`e2e/travelback.spec.ts:238-1218`).
- The repo already has correct longitude primitives in `src/lib/interpolate.ts:5-15,41-47`, and `MapView` has its own wrap-near logic in `src/components/MapView.tsx:112-166`; tests should lock the expected shared behavior before any implementation refactor.

**Why this is actionable now:**

The previous broad coverage gap was just “no antimeridian tests.” Cycle C2 has concrete failing behavior: camera overview/interpolation and JourneyCreator proximity logic. A small TDD slice can reproduce those defects without introducing a full unit-test framework migration.

**Recommended TDD shape:**

1. Add the smallest failing regression first, ideally unit-level if a test runner is introduced in a dedicated test-infra slice; otherwise use a short Playwright fixture:
   - `lerpCamera({ center: [170, 0] }, { center: [-170, 0] }, 0)` preserves `[170, 0]`.
   - Midpoint interpolation follows the short dateline path, not a sweep through `0°`/wrong hemisphere.
   - Overview camera for a dateline-crossing route keeps route-scale zoom rather than clamping to world view.
   - JourneyCreator ignores a second waypoint within 5 m when longitudes straddle ±180°.
2. Run the new test and confirm red.
3. Only then fix `camera.ts`/`JourneyCreator.tsx` by reusing `normalizeLng`/`shortestLngDelta` or a shared geodesic helper.
4. Confirm the new regression and existing static e2e gate pass.

## Deferred / not counted as new findings

These remain real gaps but are already documented, broad, or blocked by prior exit criteria; I did not count them as new cycle-C2 findings:

- **No unit-test layer generally** — already deferred as DF-C17-008 (`.context/plans/deferred-findings-cycle17-2026-04-23.md:55-59`). Still the largest strategic coverage gap, but not a new cycle-C2 issue by itself.
- **Parser error-code mapping unit tests** — already tracked in prior test reviews (`.context/reviews/cycle-r9-test-engineer-2026-04-24.md:15`). Current e2e only asserts one unsupported-format path at `e2e/travelback.spec.ts:1145-1158`.
- **Export-overlay/export-cancel e2e guard** — already deferred as R7-AGG-D22 until the export flow is mockable/test-visible (`.context/plans/deferred-findings-cycle-r7-2026-04-23.md:29-43`). Existing tests open/configure the export panel but intentionally do not run a real export (`e2e/travelback.spec.ts:1037-1099,1163-1218`).
- **Flaky-test risks from fixed waits** — the suite contains fixed waits (`e2e/travelback.spec.ts:145,784,889,904,1170,1207`), but I found no current failing/flaky evidence in this cycle's reports. Treat as watch-list only unless failures recur.
- **Broader parser worker/main-thread parity coverage** — already deferred as worker fallback/systematic parser reliability work (`.context/plans/deferred-findings-cycle17-2026-04-23.md:12-17`).

## Summary

- **New actionable findings:** 1
- **Critical:** 0
- **High:** 0
- **Medium:** 1
- **Low:** 0
- **Flaky tests confirmed:** 0
- **Gate adequacy:** deploy gate is adequate for current static-release posture; the actionable gap is targeted dateline regression coverage before fixing the live C2 geo bugs.
