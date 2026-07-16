# Performance Reviewer — Cycle 2 (2026-07-16)

## Inventory and coverage

Reviewed all 110 current nonhistorical tracked paths at cc6f24f, including all 50 src files, 18 E2E files/fixtures, 19 public assets, 7 scripts, workflow/config/package files, README, and active context. Focused on parser ceilings, React render frequency, MapLibre source updates, trail geometry, camera work, worker generation, capture canvases, codec loops, static asset locality, and the cycle-1 performance deferral.

Validation: lint, typecheck, 266 unit tests, clean high-severity audit, production build, worker drift check, and static smoke passed.

## Findings

### PERF2-01 — Completed-trail updates recopy and reserialize the full prefix

Severity: High | Confidence: High | Status: Confirmed algorithmic hot path

Evidence: map-geometry.ts:78-93 calls segment.coordinates.slice(0, lastOffset + 1) for every segment reached. MapView.tsx:410-423 invokes it whenever segmentIndex changes and immediately passes the result to GeoJSONSource.setData. parse-utils.ts:6-7 permits 250,000 points; types.ts:77-80 permits 10,800 export frames. The architecture claim at .context/project/02-architecture.md:75-77 says fully traversed segments are pushed as O(1) references and only the partial segment is copied, which is not what this implementation does for the active segment prefix.

Failure scenario: on a dense single-segment route, each new vertex rebuilds an ever-larger prefix. A 180-second/60-fps export can perform up to 10,800 source updates, each copying and serializing an average large fraction of a 250k-point route. The frame-rematerialization fix does not reduce this CPU/GC/MapLibre parsing load.

Fix: benchmark representative 10k/100k/250k tracks and redesign the progress representation so the full coordinate array is immutable (for example line-progress styling/feature-state, chunked immutable segments, or a bounded append strategy). Do not label the path O(1) until measurements and implementation support it. Add an operation/allocation budget regression.

### PERF2-02 — Interactive MapLibre always pays preserveDrawingBuffer cost without the deferred measurements

Severity: Medium | Confidence: Medium | Status: Manual validation required; known cycle-1 deferral remains open

Evidence: MapView.tsx:586-591 enables preserveDrawingBuffer on the single interactive map and calls its cost “negligible.” .context/plans/cycle1-implementation-2026-07-16.md:286-288 explicitly defers P13 because representative low-end/mobile hardware was unavailable.

Failure scenario: mobile GPUs may incur extra synchronization/memory cost throughout ordinary map interaction even when export is never used.

Fix: collect p50/p95 frame time, GPU/process memory, and interaction responsiveness on representative low-end mobile and desktop devices with/without preservation. If material, isolate export capture in a dedicated map/canvas. Until measured, remove the unsupported “negligible” assertion.

## Clean performance areas

The shared parser budget is enforced before retained allocation, JSON work runs in the generated worker, codec probes run in parallel, visible export progress is throttled, completed and active trail sources are separated, and static map styles are local. No new confirmed parser amplification, React render storm, network waterfall, or asset-cache regression was found.

## Missed-issue sweep

Revisited all loops over points/frames/scenes, setData sites, memo/effect dependencies, timers, generated assets, and maximum input/export constants. Beyond PERF2-01 and the explicitly open measurement item PERF2-02, no additional performance issue met the confidence threshold.
