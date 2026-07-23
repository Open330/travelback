# Cycle 7 Performance Review — 2026-07-24

Reviewed revision: `216001ff2bc4ff8c31da333e50e6d0e982816b5b`
Branch: `review-plan-fix/no-deploy-20260723`
Role: performance reviewer
Outcome: **one genuinely new actionable performance root**

## Scope and method

I inventoried all 1,030 tracked paths. The runtime inventory comprised all 67
`src/` paths (including all 40 non-test source/style paths), 12 build and
process scripts, 21 E2E paths, 19 public assets, the workflow, and every root
configuration and dependency manifest. I also searched the complete 899-file
`.context/` and `plan/` review ledger, then read the current aggregates,
implementation plans, relevant historical findings, and recent git history.

The performance trace followed:

- GPX, KML, and Google JSON from byte limits through XML/JSON structure
  checks, conversion, point-budget accounting, worker transport, flattening,
  validation, and track replacement;
- track preparation through cumulative-distance indexes, renderer geometry,
  reference-grid bounds, MapLibre source publication, trail chunks, elevation,
  timeline trimming, and camera scenes;
- interactive playback, pointer/gesture batching, manual Journey editing,
  export frame production, encoder backpressure, progress publication,
  cancellation, finalization, download/share ownership, and object-URL
  cleanup;
- static build/hardening/serving, dependency metadata, CI gates, and the E2E
  supervisor's already documented resource and platform boundaries.

The result was deduplicated against the Cycle 1–6 aggregates and plans. In
particular, I did not reopen the historical root-state playback publication,
session-wide `preserveDrawingBuffer`, generic main-thread XML cost, dense-KML
pre-conversion materialization, in-memory export architecture, finalizing
encoder limitations, or process identity boundaries. I also excluded all four
Cycle 6 roots and fixes: empty semantic GPX fallback, obsolete wrapped
geometry retention, preview-camera settlement, and semantic no-op export
preservation.

No browser, Chrome, Playwright, E2E suite, server, build, supervisor fixture,
deployment, process signal, or process-management command was run. The
explicit file-scoped checks
`npx vitest run src/lib/parser.test.ts src/workers/trackParser.worker.test.ts`
passed 203 tests. Those suites use small fixtures or a custom three-point
budget and do not exercise the accepted default-budget boundary described
below. No browser process was created, so this review left no browser cleanup
state.

## Finding

### PERF7-01 — Supported-size imports are expanded into 250,000 function arguments and fail during flattening

- Severity: **High**
- Confidence: **High**
- Status: **Confirmed by source, generated-bundle, and exact-boundary trace**
- Cross-role deduplication: **same causal root as SEC7-01; count once in the aggregate**
- Regions:
  - `src/lib/parse-utils.ts:7,54-64,109-113`
  - `src/lib/googleJsonParser.ts:63-83,244-275,317-381`
  - `src/lib/parser.ts:39-67,388-415,670-703`
  - `src/workers/trackParser.worker.ts:14-45`
  - `public/workers/trackParser.worker.js:185-193,215-249,252-275`
  - `src/lib/parser.test.ts:1782-1813`
  - `src/workers/trackParser.worker.test.ts:163-323`

The import policy accepts exactly 250,000 points. Several parser paths then
use an accepted, user-sized array as a JavaScript function argument list:

```ts
points.push(...nextPoints)
segments.push(...parseTimelineObjects(root.timelineObjects, budget))
segments.push(...parseSemanticSegments(root.semanticSegments, budget))
```

`extractPointsFromGeoJSON()` has the same `points.push(...nextPoints)` path
for converted KML/GPX geometry. The checked-in worker contains the same
expressions, so moving Google JSON into a worker does not remove the defect.

A flat Google Records array provides an exact deterministic path:

1. The JSON value
   `[{"latitude":0,"longitude":0}, ...]` with 250,000 records is
   7,250,001 bytes before any optional whitespace. It is below both the
   100 MiB JSON limit and the 16 MiB bounded fallback threshold.
2. Every record is valid and untimed. `parseRecords()` consumes the shared
   budget once per record and reaches exactly 250,000, which is allowed.
3. `flattenGoogleSegments()` keeps the single segment in producer order,
   filters all 250,000 observations into `nextPoints`, and
   `assertPointBudget([], 250_000)` passes because only values greater than
   the limit are rejected.
4. `points.push(...nextPoints)` does not perform 250,000 ordinary array
   appends. It creates one call with 250,000 positional arguments. The
   current Chromium/V8 target's implementation limit is below that count, so
   the supported import throws `RangeError` instead of returning a track.
5. The worker catches that non-`ParseError` and reports
   `INVALID_GOOGLE_JSON`; `parseGoogleLocationHistoryInWorkerBuffer()` treats
   an explicit worker error as final, so even the retained small-file fallback
   is deliberately not attempted. A fallback would execute the same spread
   anyway.

KML reaches the same root without many XML elements: one `LineString` can
hold 250,000 minimal `0,0 ` coordinate tokens in roughly 1 MiB of character
data, below the 4 MiB XML cap and far below the tag/depth limits. Conversion
creates one accepted `nextPoints` array, the budget check passes at equality,
and `parser.ts:66` expands it into the same oversized call. Google
`timelineObjects` and `semanticSegments` have a second manifestation when
many valid singleton segments are expanded into the `segments.push()` call.

This is not a timing-only concern or a request for a lower product limit.
Inputs within the advertised byte, structure, coordinate, and point limits
are unusable because collection was expressed as an unbounded argument list.
The failure happens only after the parser has allocated the source object
graph, retained point objects, and a filtered copy, which also makes the
failure needlessly expensive.

**Root fix:** remove every untrusted-length spread at the four source sites.
Append points and segments with bounded iteration (ideally filtering and
deduplicating directly into the destination so `nextPoints` is not required),
while preserving segment-start indexes and the shared allocation budget.
Regenerate the checked-in worker mechanically.

Add regressions in the direct and worker parser suites that:

- accept and return an untimed flat Records input at the exact default
  250,000-point boundary;
- retain segment boundaries for a large singleton semantic-segment input
  without using a call-sized batch append;
- accept a single large KML `LineString` at the point boundary; and
- continue to reject the first observation above the budget with
  `TOO_MANY_POINTS`.

Assertions should cover returned counts and segment indexes rather than
engine-specific error text.

## Historical deduplication

This is distinct from F18 in
`.context/reviews/_aggregate-cycle2-2026-04-26.md:233-241` and its repair plan
in `.context/plans/cycle2-implementation-2026-04-26.md:126-133`. F18 moved
`assertPointBudget()` before batch pushes so an over-budget aggregate would
not be appended; it did not replace the batch spread for a value *at* the
accepted boundary. Cycle 5 explicitly described that history at
`.context/reviews/cycle5-2026-07-23-perf-reviewer.md:170-175` while fixing the
different nested-`trkseg` allocation multiplier.

The older elevation crash recorded in
`.context/plans/archive/p0-critical-crash-and-correctness-2026-04-18.md:27-52`
shows the same JavaScript argument-limit primitive in a different downstream
consumer. That fix replaced `Math.min(...valid)` / `Math.max(...valid)` in the
elevation profile; it did not cover parser collection, worker output, segment
assembly, or KML conversion. No prior aggregate or active deferral records the
current accepted-import failure.

## Final missed-issue sweep

The closing pass rechecked maximum-size imports, generated-worker parity,
prepared geometry lifetime, multi-wrap bounds, reference-grid and trail
publication bounds, degenerate interpolation indexes, elevation sampling,
timeline and scene cardinality, playback hot paths, gesture coalescing,
MapLibre lifecycle ownership, export memory estimates, encoder backpressure,
progress throttling, asynchronous cleanup, static traversal/hardening, and
process-supervisor exclusions.

All other candidates were bounded, interactive-only at unrealistic
cardinality, dependent on missing browser profiling, already repaired, or
explicitly dispositioned in the historical ledger. No second genuinely new
performance root met the reporting threshold.
