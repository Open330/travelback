# Cycle 5 Performance Review — 2026-07-23

Reviewed revision: `97f66a63b3df97bce3f349a05248ebb8fef7886e`
Branch: `review-plan-fix/no-deploy-20260723`
Role: performance reviewer
Outcome: **2 genuinely new actionable performance findings**

## Scope and method

I inventoried the tracked application, worker, scripts, process fixtures,
tests, workflow/configuration, public runtime assets, and current project and
development records. The performance trace covered import parsing and
allocation limits, prepared geometry and GeoJSON publication, interpolation
and camera work, playback scheduling, export frame production and
backpressure, static serving, and process supervision.

The review was deduplicated against the Cycle 1–4 aggregates, implementation
plans, older review ledger, and explicit platform deferrals. In particular, I
did not reopen bounded multi-wrap geometry, serialized import replacement,
lexical XML scanning, throwing cleanup-accessor precedence, real-Chromium
cleanup/finalization, Journey camera restoration, MP4 copy, mobile
forced-click stability, or any of the three documented process-supervisor
boundaries.

Evidence below comes from current-source inspection and in-memory Node/jsdom
probes. No browser, server, Playwright, E2E command, build, deployment, or
process-supervisor fixture was started.

## Findings

### PERF5-01 — Degenerate accepted tracks make every follow/export frame linear in the point count

- Severity: **High**
- Confidence: **High**
- Regions:
  - `src/lib/interpolate.ts:104-192,222-231`
  - `src/lib/camera.ts:62-106,353-368,505-524`
  - `src/components/MapView.tsx:426-445,708-726,1069-1098`
  - `src/lib/videoEncoder.ts:160-180,230-245`
  - `src/lib/googleJsonParser.ts:63-83,244-276`
  - `src/lib/parse-utils.ts:6-7`
  - `src/types.ts:80-84,99-104`

`interpolateAlongTrack()` ordinarily locates a distance interval by binary
search. Its endpoint/zero-total-distance path does not retain that complexity:

- `endpointResult()` linearly walks `segmentStartIndices` to find the owning
  segment.
- It then walks forward and backward through the segment looking for a
  distinct point and usable bearing.
- The ordinary plateau fallback at `:222-231` likewise walks backward across
  identical points.
- `computeSegmentLocalBearing()` performs another backward/forward search when
  its ahead point is identical to the current point.

These are per-frame paths, not one-time track preparation. A valid Records
JSON containing 250,000 untimed `{ latitude: 0, longitude: 0 }` observations
is below the 100 MiB input limit and is retained as 250,000 points:
`parseRecords()` accepts the observations and `flattenGoogleSegments()` only
deduplicates timed observations. Its cumulative distance is zero.

I wrapped the current track-points array in a numeric-index read counter and
called the actual current functions:

| Points | `computeCameraForProgress(..., scenes=[])` point reads |
|---:|---:|
| 1,000 | 2,001 |
| 10,000 | 20,001 |
| 250,000 | 500,001 |

The relation is exact for this input: interpolation reads all `n` points and
default-follow bearing resolution reads another `n + 1`. A separate
`interpolateAlongTrack()` call reads `n` points. Export performs both:
`videoEncoder.ts:239-245` computes the camera, then
`MapView.tsx:426-445` interpolates the marker/trail again. The 250,000-point
case therefore performs 750,001 numeric point-array reads per frame before
MapLibre painting or encoding.

The permitted 180-second, 60-fps export has 10,800 frames. A low-quality HD
configuration remains below the current memory estimate, so this is a
reachable configuration, not merely a clamped API value. It causes more than
8.1 billion point-array reads in the camera/marker path alone. Cancellation
is checked only between these synchronous frame stages, so it cannot be
observed while a scan is running. Ordinary Follow-on playback executes the
same interpolation plus bearing scans on every progress update.

Identical coordinates are not the only trigger. With 250,000 disconnected
singleton segments, all cumulative distances are also zero; a midpoint
interpolation walked 125,001 segment-boundary entries in a deterministic
probe. That input can arise from semantic singleton observations and shows
that coordinate deduplication alone is not a complete repair.

Existing tests establish small-input correctness for zero-distance and
duplicate endpoints (`src/lib/interpolate.test.ts:201-227,559-595` and
`src/lib/camera.test.ts:132-151,302-340`) but place no operation bound on the
accepted maximum.

**Root fix:** prepare navigation metadata once per track. Resolve segment
bounds by binary search or an index table, and cache nearest previous/next
distinct observations or segment-local bearings. Both interpolation and
default camera resolution should remain `O(log n)` or `O(1)` after
preparation, including total-distance-zero tracks, without connecting
disconnected singleton segments. Add deterministic operation-count
regressions at 250,000 all-identical points and 250,000 singleton segments;
assert that one playback/export frame and an abort request do not scale
linearly with the full track.

This is distinct from the historical main distance-interval scan, which was
replaced by binary search. The residual work is in endpoint, plateau, and
bearing fallbacks introduced or retained for segmented/duplicate correctness;
no prior aggregate records their maximum-size per-frame complexity.

### PERF5-02 — Nested `trkseg` descendants multiply GPX point construction before the budget can reject

- Severity: **High**
- Confidence: **High**
- Cross-role deduplication: **Same causal root as SEC5-01; count once in the aggregate**
- Regions:
  - `src/lib/parser.ts:33-34,215-320,597-629`
  - `src/lib/parse-utils.ts:6-25,108-113`
  - `src/lib/parser.test.ts:1416-1429,1461-1491,1556-1586`

`parseGPX()` first collects every `trkseg` descendant in the document. For
each one it calls `segment.getElementsByTagName('trkpt')`, which returns all
descendant points, not direct children. If `trkseg` elements are nested, every
physical `trkpt` is processed once for each ancestor segment.

The complete outer `.map()` runs before the later `segments.reduce()`.
Consequently, every amplified segment array and `TrackPoint` object is
materialized before `assertPointBudget()` at `parser.ts:316` gets a chance to
reject the combined count.

An actual-parser probe gave the following deterministic result with only 50
physical points placed in the innermost segment:

| Nested `trkseg` depth | Physical `trkpt` nodes | Returned points |
|---:|---:|---:|
| 1 | 50 | 50 |
| 8 | 50 | 400 |
| 32 | 50 | 1,600 |

At depth 64 with 5,000 physical points, the parser constructed/inspected
320,000 descendant matches and only then returned `TOO_MANY_POINTS`. The
supporting jsdom run took 17.3 seconds; the finding rests on the exact
allocation count and control flow rather than that environment-specific
timing.

The current lexical limits do not contain the multiplication. A well-formed
hostile document can use:

- 126 nested `trkseg` elements, giving a maximum real element depth of 128
  beneath `gpx > trk`;
- 100,000 self-closing `<trkpt lat="0" lon="0"/>` elements;
- about 2.4 MB and 100,256 counted tags.

That input is below the 4 MiB, 150,000-tag, 128-depth, and 250,000-physical-
point ceilings, yet the semantic extraction attempts to construct 12.6
million `TrackPoint` objects and retain their segment arrays before the
post-materialization reduce rejects. Smaller nesting factors are accepted and
silently duplicate the route, proving the descendant behavior is active.

**Root fix:** select schema-owned/direct children only (and reject nested
`trkseg` structures), then reserve the running point budget before each
`TrackPoint` allocation rather than after complete segment arrays exist.
Add a nested-segment regression that asserts physical points are neither
duplicated nor queried repeatedly, and an over-budget case whose allocation/
query counter remains bounded before rejection. Timing-only assertions are
not needed.

The historical F18 finding added `assertPointBudget()` before batch pushes,
and an older `getElementsByTagName()` finding changed `ele`/`time` extraction
to direct children. Neither addressed descendant `trkseg` ownership. This
structural multiplier specifically bypasses the guard credited with fixing
F18, so it is not the prior generic “XML is parsed on the main thread”
observation or the excluded Cycle 4 lexical-scanner work.

## Final missed-issue sweep

- Normal import budgets, JSON worker transfer/timeout handling, prepared
  renderer geometry, active-trail chunks, elevation sampling, scene
  normalization, encoder backpressure, and object-URL cleanup exposed no
  additional fresh root.
- Existing root-state playback publication, session-wide
  `preserveDrawingBuffer`, export buffer sizing, bundled font payload, and
  generic main-thread XML DOM cost are historical findings or accepted
  deferrals and were not relabeled.
- Dependency inspection found no duplicate production-version fault relevant
  to runtime performance. Generated-worker parity is current.
- No process-supervisor finding met the required deterministic survivor,
  listener, marker, profile, and independent cleanup evidence threshold. The
  three documented portable-platform boundaries were not reopened.
