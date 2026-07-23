# Performance Reviewer — Repository-Wide Review (Cycle 3, 2026-07-23)

Reviewed revision: `7f013a207e64ca54c0864edc5aaf061ebfb36bdf`
Branch: `review-plan-fix/no-deploy-20260723`

## Result

Two genuinely new, independently actionable performance roots survived
provenance checking and the final sweep:

| ID | Severity | Confidence | Status |
|---|---|---:|---|
| PERF3-01 | High | High | Confirmed by source trace and bounded arithmetic diagnostic |
| PERF3-02 | High | High | Confirmed by source trace and exact allocation-count diagnostic |

Both are exposed by one deterministic, parser-valid route, but they occur in
different stages and require separate fixes. Optimizing the longitude
adjustment alone still reaches the reference-grid allocation failure.

No browser, Playwright, E2E, dev server, static server, build, deployment, or
test suite was started. The only executable diagnostic was a pure Node
calculation that counted loop iterations and grid features algebraically; it
did not construct the large route or allocate the resulting GeoJSON.

## Coverage and provenance

I inventoried the complete current tree and reviewed every
performance-relevant production, test, script, configuration, and current
documentation surface:

- `src/app`, every component under `src/components`, every runtime helper and
  hook under `src/lib`, the parser worker entry, generated worker ownership,
  and the shared type/style surfaces;
- all component/lib/worker unit tests, the 18 E2E fixtures,
  `e2e/travelback.spec.ts`, and `e2e/mp4-validation.ts`;
- all scripts, including worker build parity, static hardening/serving/smoke,
  both E2E wrappers, the POSIX/Windows process supervisor, its fixtures, and
  its complete test file;
- `package.json`, `package-lock.json`, Next, Playwright, TypeScript, ESLint,
  Vitest, PostCSS, Pages workflow, local public assets/map styles, and README;
- the authoritative `.context` conventions/architecture/planning documents,
  Cycle 2 reviews/aggregate/implementation record, and the three explicit P01
  platform-boundary deferrals.

Cross-file traces covered import limits and worker transfer, route preparation,
MapLibre publication, camera/playback, gesture scheduling, elevation
decimation, video export/backpressure/finalization, object URLs, static
hardening, CI, and browser-process ownership. Cycle 2 fixes were re-traced but
not re-counted. The root-state playback publication, session-wide
`preserveDrawingBuffer`, offline geographic context, Mediabunny finalization
limitation, and three process-platform deferrals remain excluded.

## Shared deterministic counterexample

A flat Google JSON array with 200,000 records is valid and well below both
enforced limits:

```text
record i = {
  latitude: 0,
  longitude: normalizeLng(i * 179)
}, i = 0..199999
```

The raw longitude of every record remains in `[-180, 180)`. The JSON parser
accepts these numeric fields (`src/lib/googleJsonParser.ts:66-83`), retains
every untimed observation (`src/lib/googleJsonParser.ts:244-276`), and allows
up to 250,000 points in a 100 MiB JSON file
(`src/lib/parse-utils.ts:6-30`; `src/lib/parser.ts:492-524`). Each consecutive
shortest-path move is +179 degrees, so route-ordered preparation produces the
exact display longitude `i * 179` and a final span of 35,799,821 degrees.

## Findings

### PERF3-01 — Repeated world wrapping makes route preparation quadratic

Severity: **High**
Confidence: **High**
Status: **Confirmed by source trace and bounded arithmetic diagnostic**

Exact regions:

- `src/lib/interpolate.ts:11-19`
- `src/lib/map-geometry.ts:103-124,253-269,283-317`
- `src/components/MapView.tsx:1061-1085`
- `src/lib/map-geometry.test.ts:26-100,270-293`

Evidence:

- `wrapLngNear()` adjusts one world at a time with two `while` loops. Its work
  is proportional to the number of 360-degree copies between `nextLng` and an
  already-unwrapped reference (`interpolate.ts:13-18`).
- `precomputeWrappedSegments()` feeds each returned display longitude back as
  the next reference (`map-geometry.ts:103-124`). Route preparation invokes it
  synchronously in the track effect before MapLibre hydration
  (`MapView.tsx:1061-1085`).
- For the valid route above, the number of loop-body executions for point `i`
  grows approximately as `i * 179 / 360`. The exact total is
  **9,944,394,996 adjustments** for 200,000 points. Even 10,000 points require
  24,858,628 adjustments.
- The same helper is used in animated active-trail construction
  (`map-geometry.ts:283-317`), so a late multi-wrap frame can also perform tens
  of thousands of redundant adjustments after import.
- Existing tests prove small antimeridian/multi-wrap correctness and bound the
  number of published trail coordinates. The 250,000-point test uses steadily
  increasing, already-near references and therefore does not exercise this
  complexity. There is no far-reference complexity regression for
  `wrapLngNear`.

Concrete failure scenario:

A traveler imports the valid array above. Parsing succeeds in the worker, but
the main thread then enters roughly ten billion loop iterations while preparing
the route. The application becomes unresponsive before the map or an error
state can appear. A smaller crafted route can still produce a long visible
stall.

Root cause:

The wrapping algorithm is iterative even though selecting an equivalent
longitude is a constant-time quotient/remainder operation. Route-ordered
unwrapping lets the reference grow by arbitrarily many world copies.

Recommended fix:

Replace the loops with constant-time arithmetic while preserving the current
inclusive `±180` tie behavior. One safe shape is to compute the delta and use
`ceil((abs(delta) - 180) / 360)` only when `abs(delta) > 180`, applying the
result with the delta's sign. Add direct tests for exact `±180` ties,
non-finite inputs, references millions of degrees away, the 10,000-point
parser-valid sequence, and active-trail late-frame wrapping. The regression
should assert bounded call work, not a fragile wall-clock threshold.

### PERF3-02 — Route-sized grid generation can allocate more than 14 million GeoJSON features

Severity: **High**
Confidence: **High**
Status: **Confirmed by source trace and exact allocation-count diagnostic**

Exact regions:

- `src/components/MapView.tsx:173-278,1061-1085`
- `src/lib/map-geometry.ts:103-153,253-269`
- `src/lib/map-geometry.test.ts:26-100`
- `src/lib/parse-utils.ts:6-30`

Evidence:

- Cycle 2 correctly made display bounds route-ordered and permits a legitimate
  multi-wrap span; the unit contract explicitly expects a five-point route to
  occupy 480 degrees (`map-geometry.test.ts:65-79`).
- `buildReferenceGridData()` chooses a maximum step of only 10 degrees,
  regardless of span (`MapView.tsx:173-181`). It then adds a 1.5-times-span
  margin to both sides and allocates one object-rich GeoJSON feature per grid
  line (`MapView.tsx:222-277`).
- For the shared 35,799,821-degree bounds, longitude margin is
  53,699,731.5 degrees and expanded width is 143,199,284 degrees. The current
  count formula yields exactly **14,319,930 longitude features**, before the
  latitude features, GeoJSON serialization, or MapLibre worker copies.
- This runs synchronously immediately after `prepareTrackGeometry()`
  (`MapView.tsx:1074-1085`). The former sign-based bounds clamped the grid to a
  single `[-180, 180]` or `[0, 360]` window; the route-ordered Cycle 2 repair
  removed that accidental allocation bound without adding an explicit budget.
- The function is private to `MapView` and has no unit test asserting a maximum
  feature count.

Concrete failure scenario:

After PERF3-01 is made constant-time, the same accepted file attempts to create
well over 14 million nested feature/geometry/coordinate objects on the main
thread. The renderer is likely to exhaust memory or freeze before MapLibre can
display the route. Thus this is not merely a second symptom that disappears
with the first fix.

Root cause:

Reference-grid density is capped in degrees rather than in output work.
Unbounded route-world span is multiplied by fixed margins and divided by a
fixed maximum step.

Recommended fix:

Give each grid axis a hard feature budget (for example, 64–128 lines) and
derive a “nice” step from `expandedSpan / budget`; validate/cap the calculated
count before entering either allocation loop. If the intended visual model is
viewport-local, publish only a bounded set of relevant world copies instead of
materializing the route's complete unwrapped span. Extract the pure grid
builder from `MapView` and test ordinary, antimeridian, 480-degree, and
35,799,821-degree bounds, asserting the hard feature limit and finite
coordinates.

## Final missed-issue sweep

- Parser size, point, nesting, XML tag/depth, and worker-timeout limits are
  enforced; the findings above operate within those limits rather than bypass
  them.
- Elevation geometry remains bounded to 2,048 selected coordinates, trail
  publication to 512-coordinate chunks, gesture publication to animation
  frames, and export progress to time-based updates.
- Playback scheduling, listener/timer cleanup, object-URL revocation,
  exact-size export staging, encoder backpressure, static serving, and
  workflow execution exposed no additional fresh performance root.
- The repaired process supervisor now uses adaptive sparse observation rather
  than the Cycle 2 100 ms full-host steady-state scan. No new P01 process issue
  met the required evidence gate; the native/host-boundary deferrals were not
  relitigated.

No other new performance issue met the actionable evidence threshold.
