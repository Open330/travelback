# Cycle 3 code review — 2026-07-23

**Role:** code reviewer
**Reviewed revision:** `7f013a207e64ca54c0864edc5aaf061ebfb36bdf`
**Outcome:** one genuinely new actionable finding (Medium, high confidence)

## Scope and method

I inventoried the complete repository and reviewed the current application and
cross-file behavior at this revision:

- all production code under `src/app`, `src/components`, `src/lib`, and
  `src/workers`, including the generated worker's source/asset ownership;
- unit/component/worker tests, the E2E catalog and its helpers/fixtures, and the
  process-supervisor regression catalog;
- build, static-hardening, static-serving, smoke, and E2E wrapper scripts;
- package, TypeScript, ESLint, Vitest, Playwright, Next.js, PostCSS, workflow,
  base-path, public-asset, and map-style configuration;
- current project/development documentation, the Cycle 2 aggregate and
  implementation record, historical review provenance, and the three explicit
  Cycle 2 platform-boundary deferrals.

The final missed-path sweep covered imports and worker fallback, session
replacement, trim/scene/playback/export invalidation, map generations and
style hydration, route/trail/display geometry, camera computation, gesture
terminal states, localization/theme persistence, export finalization, and
static delivery. Historical reports were searched to reject duplicates rather
than treated as current source truth.

## CR3-01 — Finite multi-wrap tracks make longitude preparation quadratic

- **Severity:** Medium
- **Confidence:** High
- **Locations:** `src/lib/interpolate.ts:13-18`,
  `src/lib/map-geometry.ts:104-127`, `src/lib/map-geometry.ts:256-270`,
  `src/lib/parse-utils.ts:7`
- **Reachable consumer:** `src/components/MapView.tsx:1061-1085`
- **Missing regression:** `src/lib/map-geometry.test.ts:61-70,270-290`

`wrapLngNear()` starts from each raw longitude and repeatedly adds or subtracts
`360` in `while` loops until it is near the already-unwrapped reference.
`precomputeWrappedSegments()` feeds the preceding display longitude back as
that reference. For a valid route that repeatedly travels east around the
world, the reference grows linearly while every imported raw longitude remains
canonical in `[-180, 180]`. The number of loop iterations for point `i`
therefore grows with `i`, making the full preparation pass `O(n²)` rather than
`O(n)`.

A source-equivalent finite-input probe using the canonical repeating sequence
`[0, 120, -120]` produced:

| Points | `±360` loop iterations |
| ---: | ---: |
| 1,000 | 166,500 |
| 5,000 | 4,165,833 |
| 10,000 | 16,665,000 |
| 20,000 | 66,663,333 |
| 250,000 | 10,416,625,000 |

This does not depend on `NaN` or infinity. A flat Google location-history
array can contain distinct timed observations at those finite coordinates,
remain under the 100 MiB JSON limit, and reach the supported 250,000-point
ceiling. After parsing, `MapView` synchronously calls
`prepareTrackGeometry()` in its track effect, so the app can monopolize the
main thread before publishing the route. The shared helper is also used by
Journey Creator, although imported tracks provide the practical high-volume
path.

The existing multi-wrap test has only five points. The 250,000-point geometry
test uses monotonically increasing, already-unwrapped longitudes
(`index / 1000`), so each call needs no repeated world shift and cannot expose
the quadratic case.

**Fix:** compute the required world offset arithmetically in constant time
while preserving the current inclusive `±180` tie behavior. For example,
handle `delta > 180` and `delta < -180` with one `Math.ceil(...)` shift rather
than iterative loops. Add direct equivalence cases for both ties and very
large finite references, plus a near-limit canonical multi-wrap regression
that would fail or exceed a deliberately generous completion budget with the
iterative implementation.

**Duplicate audit:** older reports discuss shared-helper duplication and a
theoretical non-finite loop. Neither identifies this finite, reachable
quadratic path; the current finite guards do not mitigate it.

## Verification

No browser, Playwright, Chrome, dev server, deployment, commit, or push command
was run.

- `npm run test:unit` — passed, 25 files / 541 tests
- `npm run lint` — passed
- `npm run typecheck` — passed
- `node scripts/build-worker.mjs --check` — passed

The final survivor scan rejected already-recorded trim/session coupling,
prior scene-reset behavior, and the explicit process-supervisor platform
deferrals. No second new code-quality root survived source tracing and
historical duplicate suppression.
