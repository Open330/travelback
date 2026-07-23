# Cycle 4 Tracer Review — 2026-07-23

Revision traced: `975dded34c849db4eb972221ed9483d3d64fb81d`
Branch: `review-plan-fix/no-deploy-20260723`

## Result

One genuinely new cross-file root survived provenance checking and the final
sweep:

| ID | Severity | Confidence | Status |
|---|---|---:|---|
| C4-RENDER-01 | Medium | High | Confirmed by source trace and the installed renderer's pure-Node tiler |

### C4-RENDER-01 — multi-wrap route and trail coordinates leave MapLibre's renderable GeoJSON domain

```text
parser-valid canonical longitudes in [-180, 180]
  → map-geometry.ts:265-286 carries the prior display longitude
  → repeated laps become 0, 120, 240, 360, 480, 600, 720, ...
  → prepareTrackGeometry publishes those cumulative values unchanged
  → MapView.tsx:525-653 sends them to route/trail/trail-head GeoJSON sources
  → MapLibre delegates GeoJSON sources to @maplibre/geojson-vt
  → projectX(lng) = lng / 360 + 0.5
  → wrap.ts retains only the center and immediate left/right source worlds
  → later route/trail parts are clipped away or remain beyond tile extent

in parallel:
interpolate.ts:213-215 normalizes the current point
  → marker + follow camera remain in the canonical world
  → the marker advances after the visible route/trail has disappeared
```

Status: **Confirmed**, severity Medium, confidence High.

#### Evidence

- Every parser accepts ordinary finite canonical coordinates; a seven-point
  sequence `[0, 120, -120, 0, 120, -120, 0]` is valid
  (`parser.ts:50-54,76-79,191-198,280`;
  `googleJsonParser.ts:55-83`; `parse-utils.ts:6-30`).
- `precomputeWrappedSegments()` deliberately carries its display longitude
  across points and disconnected segments, while
  `computeDisplayBoundsFromWrappedSegments()`, `routeGeometry`, trail chunks,
  and the active head all retain that coordinate space
  (`map-geometry.ts:265-315,327-430,445-480`).
- MapView publishes the unbounded geometry directly and uses the same bounds
  for the reference grid and initial fit
  (`MapView.tsx:525-653,773-777,955-979`). Playback and export independently
  publish the normalized marker and the cumulative trail head
  (`MapView.tsx:406-425,730-747,1040-1065`).
- `maplibre-gl@5.24.0` constructs GeoJSON indexes with
  `@maplibre/geojson-vt@6.1.1`
  (`maplibre-gl/src/source/geojson_worker_source.ts:5,326-332`;
  `package-lock.json:1678-1686`). The tiler projects longitude with
  `x = lng / 360 + 0.5` and wraps only the center plus one adjacent source
  world (`@maplibre/geojson-vt/src/convert.ts:193-198`;
  `src/wrap.ts:6-20`). Its defaults are extent 4096 and buffer 64
  (`src/geojsonvt.ts:9-22`), so the right retained boundary is about
  `+545.625°`; cumulative routes are allowed to grow to tens of millions of
  degrees.

A pure Node probe passed the exact route
`[0,120,240,360,480,600,720]` plus a separate `late` feature
`[600,720]` through the installed `GeoJSONVT`. Across zooms
0, 1, 2, 4, 8, and 14, every equatorial tile scan contained `route` but never
`late`. A source containing only `[720,0] → [721,0]` produced z0 tile
coordinates `[[10240,2048],[10251,2048]]`, far outside the nominal
`0..4096` extent and its 64-unit buffer. Thus both source shapes used by the
application fail: the collection clips away late chunks, while the separately
updated trail head is positioned outside the rendered tile.

#### User-visible failure

A valid repeated-circumnavigation track initially renders, but route and
completed-trail portions after roughly one and a half eastbound worlds are
missing. At late playback/export progress the canonical marker and camera keep
moving while the active trail head is invisible. Long Google histories are
also exposed because display-longitude carry crosses disconnected segments,
allowing independent visits to drift through world copies without any
connecting route edge.

The current tests validate the intermediate unwrapped representation rather
than the renderer contract: they require 480-degree and approximately
35-million-degree bounds and finite/ordered late trails
(`map-geometry.test.ts:83-98,123-172,307-385`). The browser suite has one
ordinary antimeridian fixture, and debug readiness checks source/layer
existence plus serialized source endpoints rather than rendered features
(`e2e/travelback.spec.ts:2497-2537`;
`MapView.tsx:846-887`).

#### Repair boundary

Keep canonical chronology/interpolation, but introduce a separate,
renderer-owned coordinate graph:

1. split route/trail parts at world seams and rebase every published part into
   a bounded center/adjacent-world domain;
2. preserve disconnected segments and ordinary east/west antimeridian
   continuity without drawing seam connectors;
3. map the active head into the same bounded part as its current trail chunk;
4. derive fit/overview/grid coverage from bounded geographic coverage rather
   than cumulative lap count.

Add a pure renderer-contract regression for more than 540 degrees, including
late completed chunks, the active head, disconnected-history drift, both
antimeridian directions, and marker/head geographic equivalence. Assert that
all published coordinates remain in the chosen renderer domain and that the
tiler retains every expected feature within buffered tile extent.

## Coverage, dedup, and final sweep

I inventoried the full tracked tree (821 `.context`, 66 `src`, 39 `plan`,
21 `e2e`, 19 `public`, 11 `scripts`, workflow, README, package/lockfile, and
all root configuration) and traced every current runtime/build/test file,
relevant current document/asset, and cross-file flow. Historical review
provenance was searched for renderer domains, tile extents, multi-wrap/world
copy behavior, and prior antimeridian fixes.

Cycle 3 established the unbounded intermediate graph while fixing quadratic
wrapping and grid allocation. Its alternative suggestion to publish bounded
world copies did not identify or verify downstream tiler loss; this finding is
the first renderer-contract trace and is therefore not a relabel of
`AGG3-01`/`AGG3-02`. Parser, state, camera, export, worker, static, CI, and
supervisor sweeps produced no second new cross-file survivor. The three
portable-Node supervisor deferrals were not reopened.

## Execution/process note

No browser, Chrome, Playwright, E2E suite, server, build, deployment, or full
test suite ran. The in-memory Node tiler probe exited normally and left no
process to terminate.
