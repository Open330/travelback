# Cycle 6 Performance Review — 2026-07-24

Reviewed revision: `099e85d8860456dea5e59cfa293a12defb27bd99`
Branch: `review-plan-fix/no-deploy-20260723`
Role: performance reviewer
Outcome: **one genuinely new actionable performance root**

## Scope and method

I inventoried the complete tracked tree and reviewed the current application,
component, hook, parser/worker, geometry, camera, playback, export, static
delivery, configuration, test, and documentation paths relevant to runtime
CPU, allocation, retention, and responsiveness. The final sweep specifically
revisited maximum-size imports, track preparation, MapLibre source
publication, per-frame playback/export work, gesture batching, asynchronous
ownership, encoder backpressure, and cleanup.

The result was deduplicated against the Cycle 1–5 aggregates and plans, older
performance reports, and the explicit process-platform exclusions. In
particular, I did not reopen root-level playback publication,
session-wide `preserveDrawingBuffer`, generic main-thread XML cost, export
memory-estimate policy, finalizing encoder limitations, or any supervisor
boundary.

No browser, Chrome, Playwright, E2E suite, server, build, full test suite,
supervisor file, process fixture, deployment, or process-cleanup command was
used. This finding is established by current-source ownership and reference
tracing; no executable validation was necessary.

## Finding

### PERF6-01 — Prepared tracks retain the obsolete pre-renderer coordinate graph for their full lifetime

- Severity: **Medium**
- Confidence: **High**
- Status: **Confirmed by source and reference trace**
- Cross-role deduplication: **same root as TRACE6-01; count once**
- Regions:
  - `src/lib/map-geometry.ts:202-211,274-360,489-506`
  - `src/components/MapView.tsx:296,338-361,558-687,740-835,999-1023`
  - `src/lib/map-geometry.test.ts:243-244,273-280,345,459,491`

`prepareTrackGeometry()` first allocates `wrappedSegments`, containing one
fresh two-number tuple for every accepted track point. Cycle 4 then added
`buildRendererSegments(wrappedSegments)`, which allocates a separate bounded
renderer graph: every output edge or singleton receives new coordinate
tuples and copied range objects.

All live prepared outputs now derive from that second graph:

- `displayBounds` scans renderer segments;
- `routeGeometry` retains renderer-segment coordinate arrays;
- `trailChunks` and `trailChunkCollection` retain renderer coordinates;
- the active trail head is derived from `trailChunks`.

Despite that ownership change, `prepareTrackGeometry()` still returns the
original `wrappedSegments` graph. `MapView` stores the whole result in
`preparedTrackRef` and keeps it until track removal or replacement. A
repository-wide member-access trace found no production read of
`geometry.wrappedSegments`; every external read is in
`map-geometry.test.ts`. Thus this is not a short preparation-time peak. The
now-unused graph remains strongly reachable throughout playback, editing,
style changes, and export.

At the supported 250,000-point limit, this retains exactly 250,000 otherwise
unneeded coordinate tuple arrays, plus their containing segment arrays and
range objects, alongside the renderer graph, canonical `Track`, MapLibre
source data, and renderer indexes. On memory-constrained/mobile browsers the
extra long-lived object population increases heap pressure and garbage
collection cost for the entire loaded session.

The competing “shared tuple” explanation does not hold:
`buildRendererSegments()` creates coordinates with literals such as
`[longitude - shift, latitude]`, `[start[0] - shift, start[1]]`, and
`[end[0] - shift, end[1]]`; it does not reuse the tuples in
`wrappedSegments`. Nor is the original graph needed for chronology or
interpolation, which continue to use the canonical `Track` and cumulative
distance metadata.

**Repair boundary:** remove `wrappedSegments` from
`PreparedTrackGeometry` and from the returned object so the temporary
pre-renderer graph becomes collectible immediately after renderer
preparation. Keep tests of ordered unwrapping against the already-exported
`precomputeWrappedSegments()` helper rather than requiring production state
to retain test-only observability. If peak preparation memory also proves
material, follow up by rebasing/moving one graph in place; that is not
required to eliminate the confirmed lifetime retention.

Add a structural regression asserting that prepared production output exposes
only renderer-consumed fields, while the pure unwrapping tests continue to
cover antimeridian, disconnected-segment, and multi-wrap behavior. A
maximum-point browser heap profile is useful as validation, but should not be
the sole regression because absolute heap thresholds are engine-dependent.

## Historical deduplication

The April ledger's `C4-L06` classified
`precomputedWrappedSegments` memory as an intentional trade-off while that
graph was the rendering cache. This finding does not relitigate that trade-off.
Commit `0d3d433` later introduced a distinct renderer graph and moved bounds,
route, and trail consumers to it, but retained the old field in the prepared
contract. The old graph therefore changed from necessary cached data to
unread lifetime retention after the historical disposition was made.

Cycle 5's performance review covered degenerate per-frame interpolation and
nested GPX allocation; it did not identify this post-rebase ownership leak.
No Cycle 1–5 aggregate or active deferral records the current unused-graph
state.

## Final missed-issue sweep

Prepared trail publication remains chunk-bounded per frame, the repaired
degenerate interpolation metadata remains bounded, parser point/size/depth
budgets remain enforced, export progress remains throttled with encoder
backpressure, and gesture paths batch high-frequency updates. Other
performance candidates were either bounded, unreachable at an interactive
frequency, dependent on uncollected browser profiling, or already present in
the historical ledger. No second new root met the reporting threshold.
