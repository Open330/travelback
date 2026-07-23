# Cycle 6 verifier review — 2026-07-24

## Scope and method

- Reviewed HEAD `099e85d` on `review-plan-fix/no-deploy-20260723`.
- Inventoried all 1,017 tracked files: 847 `.context` records (689 reviews,
  150 plans, and project/development context), 39 root `plan/` records, 67
  `src/` files (41 production and 26 tests), 21 E2E files/fixtures, 12 scripts,
  19 public assets, and the root configuration, workflow, and documentation
  files.
- Read the complete production paths and their contracts, indexed every prior
  review/plan for relevant symbols and scenarios, inspected the Cycle 1-5
  implementation history and Git diffs, and finished with a skipped-file and
  cross-file call-site sweep.
- Verification stayed within the assigned static/file-scoped boundary. No
  supervisor, E2E, Playwright, Chromium, agent-browser, server, deploy, push,
  commit, process-kill, or source/plan mutation command was attempted.

## New actionable findings

### V6-01 — an empty or wholly invalid GPX track suppresses a valid route fallback

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed
- **Causal root:** `src/lib/parser.ts:318-385` returns a non-null semantic
  result whenever it finds an owned `trkseg`, even when coordinate validation
  retains zero direct `trkpt` children. `parseGPX` then treats that empty result
  as authoritative at `src/lib/parser.ts:388-400` and never calls
  `@tmcw/togeojson`. `parseTrackFile` rejects the resulting zero-point track at
  `src/lib/parser.ts:670-702`.
- **Deterministic failure scenario:** this valid route is rejected with
  `TOO_FEW_POINTS` merely because an unusable track segment precedes it:

  ```xml
  <gpx version="1.1">
    <trk><trkseg><trkpt lat="91" lon="0"/></trkseg></trk>
    <rte>
      <rtept lat="37.4" lon="-122.1"/>
      <rtept lat="37.41" lon="-122.09"/>
    </rte>
  </gpx>
  ```

  `<trkseg/>` produces the same ownership decision. A read-only `jsdom` +
  `@tmcw/togeojson` probe confirmed that the fallback converter emits the two
  route coordinates from this exact document.
- **Regression proof:** immediately before Cycle 5 commit
  `d5d75065d76c724349b5c03cf7f89940db7d9ca4`, `parseGPX` filtered empty
  segment arrays before testing `segments.length` (`parser.ts` at the parent
  commit, lines 292-320). It therefore reached the route fallback for both an
  empty and a fully invalid `trkseg`. The Cycle 5 plan also required preserving
  fallback conversion and ordinary fallback behavior
  (`.context/plans/cycle5-implementation-2026-07-23.md:97-125`).
- **Coverage gap:** the new route test at
  `src/lib/parser.test.ts:1011-1026` covers only a route-only file. The existing
  empty-track test at `src/lib/parser.test.ts:1059-1063` has no valid route, so
  it cannot distinguish the old fallback behavior from the regression.
- **Fix:** after owned-segment validation and extraction, return `null` when
  `points.length === 0`. This restores the pre-Cycle-5 fallback without
  changing the long-standing precedence when at least one valid semantic
  `trkpt` exists. Add focused regressions for both `<trkseg/>` and a segment
  whose direct points are all invalid, each followed by two valid `rtept`
  elements.

## Deduplication

- This is not Cycle 4 critic item `C4-CT04`. That record describes the
  pre-existing policy that a **usable** semantic track takes precedence over
  routes/waypoints in a mixed GPX and proposes merging or documenting those
  data families. V6-01 is a later absence-versus-empty regression: no usable
  track point exists, the same input reached the fallback before `d5d7506`,
  and the narrow repair preserves the established usable-track precedence.
- It is not Cycle 5 `AGG5-02` itself. That finding concerned nested-segment
  multiplication, namespace/direct-child ownership, and allocation budget.
  V6-01 is a behavioral regression introduced by that fix and missing from its
  acceptance coverage.
- Searches across all prior `.context/reviews`, `.context/plans`, root `plan/`,
  parser tests, and Git history found no earlier item for an empty/invalid
  semantic segment suppressing an otherwise valid `rte` fallback.

## Final verification

- `npx vitest run src/lib/parser.test.ts` passed: 1 file, 174 tests.
- The focused suite verifies the current baseline but contains neither mixed
  empty-segment/route regression, so the passing result does not contradict
  V6-01.
- Final sweeps covered parser/worker limits and parity, session and async
  ownership, playback/interpolation/camera boundaries, scene/timeline
  normalization, map generation/style/presentation restoration, export
  settlement and URL ownership, modal/focus/listener cleanup, static
  build/base-path/CSP tooling, process-wrapper contracts, configuration,
  public assets, E2E fixtures, and user/project documentation. No second
  genuinely new actionable causal root met the deterministic-evidence bar.
