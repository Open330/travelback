# Cycle 4 Debugger Review — 2026-07-23

Reviewed exact revision `975dded34c849db4eb972221ed9483d3d64fb81d` on
`review-plan-fix/no-deploy-20260723`.

## Result

**New confirmed implementation defects: 1.**

`DB4-01` is the same root as tracer finding `C4-RENDER-01`: the application
treats an unbounded traversal-coordinate graph as though it were valid
MapLibre GeoJSON, so late multi-wrap route/trail geometry does not reach the
rendered map.

## DB4-01 — prepared-geometry coordinates violate the renderer-domain invariant

- Classification: **correctness**
- Severity / confidence: **Medium / High**
- Status: **Confirmed by source trace and deterministic pure-Node reproduction**
- Primary locations:
  `src/lib/map-geometry.ts:265-315,327-430,445-480`;
  `src/components/MapView.tsx:525-653,773-777,955-979,1040-1065`;
  `src/lib/interpolate.ts:213-215`;
  `src/lib/camera.ts:209-239,353-368`.
- Renderer boundary:
  `node_modules/maplibre-gl/src/source/geojson_worker_source.ts:5,326-332`;
  `node_modules/@maplibre/geojson-vt/src/convert.ts:193-198`;
  `node_modules/@maplibre/geojson-vt/src/wrap.ts:6-20`;
  `node_modules/@maplibre/geojson-vt/src/geojsonvt.ts:9-22`.

### Root-cause trace

1. Import validation correctly restricts each input longitude to
   `[-180,180]`, but permits repeated canonical laps and up to 250,000 points.
2. `precomputeWrappedSegments()` converts those inputs to a continuous display
   graph by choosing the nearest world copy and carrying the last display
   longitude forward, including across disconnected segments.
3. The same unbounded coordinates become `routeGeometry`, immutable completed
   trail chunks, the per-frame active trail head, display bounds, fit bounds,
   and the reference grid. There is no renderer-coordinate normalization or
   seam split before `GeoJSONSource.setData()`.
4. MapLibre indexes those sources with `@maplibre/geojson-vt`. That library
   projects longitude linearly, then clips/merges only the center and immediate
   left/right source worlds. With its 4096 extent and 64 buffer, eastbound
   data beyond approximately `545.625°` is outside the supported publication
   window.
5. A mixed collection containing early geometry therefore drops wholly late
   features during wrapping. A standalone late head avoids that collection
   clip but is transformed to coordinates far outside the tile extent, where
   it is not rendered.
6. Interpolation returns a normalized point, so HTML/GeoJSON markers and
   follow-camera centers continue in the canonical world. The visible route,
   trail, marker, and camera no longer describe the same frame.

This is an ownership mismatch: route ordering needs an unbounded internal
coordinate space, while MapLibre publication needs a bounded, seam-aware
coordinate space. One representation currently owns both contracts.

### Deterministic reproduction

The parser-valid canonical sequence
`[0,120,-120,0,120,-120,0]` prepares as
`[0,120,240,360,480,600,720]`.

Using the exact installed `@maplibre/geojson-vt@6.1.1`:

- a feature collection with the full route and a `late` line from 600° to 720°
  retained only the route at equatorial tiles for z0, z1, z2, z4, z8, and z14;
  `late` was absent at every checked zoom;
- a standalone line from 720° to 721° produced z0 geometry
  `[[10240,2048],[10251,2048]]`, versus extent 4096 plus a 64-unit buffer.

No timing assumption, browser behavior, network request, or malformed input is
needed.

### Why current coverage misses it

- `map-geometry.test.ts:83-98,123-172` explicitly enshrines 480-degree and
  approximately 35-million-degree intermediate bounds.
- `map-geometry.test.ts:307-385` checks coordinate counts, finiteness, order,
  and active-head continuity, but never submits the result to the renderer
  tiler or checks tile extent.
- `e2e/travelback.spec.ts:2497-2537` covers a single ordinary antimeridian hop,
  not repeated worlds.
- `MapView.tsx:846-887` exposes source/layer presence and serialized marker/
  trail endpoints; those values can be correct even when no tile contains the
  late geometry.

### Repair and regression boundary

Preserve the current canonical track and route-order graph as internal data,
then derive bounded renderer geometry. Split lines at world seams, rebase each
part into an explicitly supported center/adjacent domain, keep disconnected
segments disconnected, and publish the active head in the same bounded part as
its chunk. Initial fit, Overview, and the reference grid must use bounded
geographic coverage rather than total lap span.

The regression should pass a greater-than-540-degree route through the same
tiling boundary and prove:

- early and late route/trail features are retained inside buffered tile extent;
- active head and marker are geographically equivalent at late progress;
- no artificial seam or disconnected-segment connector is introduced;
- eastbound, westbound, simple antimeridian, repeated-lap, and disconnected
  cases remain correct.

## Rejected hypotheses and final sweep

- The repaired `wrapLngNear()` arithmetic and bounded reference-grid allocation
  have no remaining input-distance-dependent work; this defect is downstream
  renderer correctness, not a repeat of Cycle 3 performance findings.
- Parser budgets, segment normalization, trail chunk binary lookup, marker
  serialization, camera interpolation, export ownership, style hydration,
  worker parity, static/build scripts, and public assets exposed no second new
  implementation failure.
- The three documented portable-Node supervisor boundaries were not
  relitigated, and no new supervisor issue was reported.

I inventoried the complete tracked repository and inspected all current
runtime/build/test code, configuration, relevant current docs/assets, and
cross-file consumers. The final historical dedup sweep found prior
world-copy/bounds and allocation findings, but no prior proof that MapLibre's
tiler discards the cumulative geometry.

## Execution/process note

No browser, Chrome, Playwright, E2E suite, server, build, deployment, or full
test suite was started. The only executable probe used pure Node and the
already-installed tiler; it exited normally and required no stale-browser
cleanup.
