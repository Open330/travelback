# Performance Reviewer — Repository-Wide Review (Cycle 1, 2026-07-23)

Reviewed revision: `994820a`

## Result

**Six actionable performance findings:** two root render-amplification paths, two supported-input/pointer-scale CPU and memory paths, one duplicate large-track preparation, and one always-on WebGL validation risk. No Playwright, browser, Chrome, dev server, or static server was started for this review.

## Coverage

I inventoried the complete tracked repository and reviewed all application source, workers, unit tests, the full E2E specification and fixtures, scripts, framework/test/build configuration, local map styles and other public assets, README, and current `.context` architecture/convention material. The focused performance traces covered parsing limits, worker transfer, cumulative-distance reuse, geometry construction, React render ownership, all animation-frame sites, MapLibre source mutations, scene/camera interpolation, Journey Creator gestures, export frame capture/backpressure/finalization, object lifetimes, static serving, and repeated-test process ownership.

`npm run check:worker` passed. Static and Node-only inspection avoided adding a browser tree to the concurrently running review cycle.

## Findings

### PERF-01 — Playback commits root-owned React state on every animation frame

Severity: **High**
Confidence: **High**
Status: **Confirmed architecture cost; representative-device magnitude is not measured**

Evidence:

- The foreground animation loop calls `setPlaybackProgress` for the first frame and every subsequent `requestAnimationFrame` (`src/lib/usePlaybackController.ts:110-167`).
- That setter commits React state, not only the hot ref (`src/lib/usePlaybackController.ts:51-54`).
- `progress` is owned by the page and passed into both `MapView` and the non-memoized `TrackWorkspace` (`src/app/page.tsx:176-194,592-610,651-696`).
- Each commit therefore reevaluates the page tree, `TrackWorkspace`, toolbar/title/bottom-stack composition, `ElevationProfile`, and `Controls`; only selected children such as `TimelineSelector` and `SceneEditor` are memoized (`src/components/TrackWorkspace.tsx:55-180`).

Concrete scenario: normal 60 Hz playback on a large track asks React to reconcile the application shell at the same cadence as MapLibre camera/trail work. On a low-power phone or when the elevation SVG is large, main-thread work competes with map paint and produces dropped or delayed frames.

Suggested fix: keep authoritative animation progress in an imperative/external-store boundary consumed by MapView and the minimal progress UI. Publish a lower-frequency React snapshot for textual controls/accessibility, while preserving synchronous seek, end-of-playback, scenes, export suspension, and visibility fallback behavior. Profile p50/p95 frame time before and after on representative desktop and mobile hardware.

### PERF-02 — Elevation geometry expands every accepted point into large duplicate SVG strings

Severity: **High**
Confidence: **High**
Status: **Confirmed CPU/memory scaling defect at supported input sizes**

Evidence:

- The parser explicitly accepts up to 250,000 track points (`src/lib/parse-utils.ts:7`; `src/lib/parser.ts:518-523`).
- `buildElevationGeometry` performs full-array validation with a slice, allocates an object for every valid elevation, converts every point to fixed-precision text once for `pathD` and again for `areaD`, and retains both full strings (`src/components/ElevationProfile.tsx:23-91`).
- Rendering sends `areaD` to two SVG paths and `pathD` to a third, so the browser parses the full area coordinate stream twice (`src/components/ElevationProfile.tsx:145-173`).
- Memoization prevents rebuilding when only progress changes, but it does not reduce the one-time import/trim cost or the retained strings (`src/components/ElevationProfile.tsx:98-107`).

Concrete scenario: a valid GPX near the documented point ceiling with elevations creates hundreds of thousands of temporary coordinate objects and multi-megabyte path strings on the main thread just as the map and timeline are initializing. The page can pause, allocate heavily, and make subsequent SVG paint/reconciliation expensive even though the chart is only a few hundred CSS pixels wide.

Suggested fix: downsample in distance space to a viewport-aware fixed budget before string construction, preserving segment gaps, endpoints, and bucket minima/maxima so peaks are not lost. Build the shared coordinate representation once, avoid `slice()` validation and repeated string conversion, and keep full-resolution data only for map/interpolation semantics. Add a 250,000-point performance regression fixture with explicit build-time and retained-size budgets plus visual tests for extrema and gaps.

### PERF-03 — Every Journey Creator drag event republishes the entire route and recomputes total distance

Severity: **Medium**
Confidence: **High**
Status: **Confirmed pointer-hot-path scaling defect**

Evidence:

- A drag move clones the complete waypoint array, replaces one point, then calls both `updateMapData` and `syncUI` (`src/components/JourneyCreator.tsx:375-387`).
- `updateMapData` rebuilds and publishes both point and line GeoJSON for every waypoint (`src/components/JourneyCreator.tsx:70-119,216-226`).
- `syncUI` then runs `totalDistance` across the complete route, including trigonometric haversine work for every segment, and commits React state (`src/components/JourneyCreator.tsx:198-202`; `src/lib/interpolate.ts:21-29,44-51`).
- Pointer movement is not coalesced or animation-frame throttled.

Concrete scenario: after creating a detailed remembered route, dragging one waypoint at mouse/touch event frequency repeatedly allocates two full GeoJSON representations, serializes them into MapLibre, scans every segment, and schedules UI state. Drag responsiveness declines with route size even though only two adjacent distances and one point changed.

Suggested fix: coalesce drag preview updates to one animation frame, update only the visual data needed for that frame, and maintain total distance incrementally from the moved point’s two adjacent segments. Reconcile the exact full GeoJSON/distance once on the terminal event. Add a route-size target and a pointer-burst test that bounds publishes and verifies exact terminal distance.

### PERF-04 — Export readback forces preserved WebGL buffers during the entire application session

Severity: **Medium**
Confidence: **Medium**
Status: **Confirmed always-on GPU policy; material device-level impact requires manual profiling**

Evidence:

- The sole MapLibre instance is always constructed with `canvasContextAttributes: { preserveDrawingBuffer: true }` (`src/components/MapView.tsx:885-903`).
- The setting exists for later export capture, but it applies during ordinary pan, zoom, playback, editing, and idle map use, even for travelers who never export.
- The source comment itself acknowledges that the GPU must preserve completed frames and incurs a cost, but declares the impact negligible without a hardware/profile gate (`src/components/MapView.tsx:897-901`).

Concrete scenario: a mobile traveler previews a route for minutes without exporting, yet every WebGL frame uses the export-oriented buffer policy. On bandwidth-, memory-, or thermal-constrained GPUs this can reduce frame throughput and increase power/memory pressure.

Suggested fix: first measure playback/pan p50/p95 frame time, GPU/main memory, and thermal/battery behavior with the option on and off on representative low-end/mobile devices. If material, isolate export readback behind a dedicated export map/context or another capture path that does not impose preservation on interactive rendering. Do not toggle the attribute in-place: WebGL context attributes are fixed at context creation, so the ownership transition needs an explicit design and export regression coverage.

### PERF-05 — Large-track hydration builds the wrapped coordinate graph twice

Severity: **Medium**
Confidence: **High**
Status: **Confirmed duplicate O(n) CPU/memory work**

Evidence:

- The track effect calls `precomputeWrappedSegments` to build trail chunks (`src/components/MapView.tsx:1045-1070`).
- Style hydration then calls `buildTrackGeometry` for the same track (`src/components/MapView.tsx:615-617`).
- `buildTrackGeometry` independently calls `precomputeWrappedSegments` again and maps the second coordinate graph into route geometry (`src/lib/map-geometry.ts:101-125`).
- A single local Node/esbuild diagnostic with a synthetic 250,000-point track measured 20.7 ms and about 20.7 MiB for the first preparation, followed by another 7.3 ms and about 21.6 MiB retained for the redundant wrapped graph before MapLibre serialization. These figures establish duplication on this host, not a cross-device latency budget.

Concrete scenario: loading a supported large track, retrying the map, or hydrating a new style constructs a second array-of-coordinate-arrays immediately alongside trail preparation. This raises import/hydration latency and peak memory before MapLibre copies or serializes the GeoJSON.

Suggested fix: prepare one track-identity object containing wrapped segments, route geometry, and trail chunks, then reuse it across style generations. Cache only by the current track identity/generation and release the prior prepared object on replacement. Add a ceiling-size unit/performance test that counts wrapping passes and verifies segmented/antimeridian geometry remains identical.

### PERF-06 — Scene gestures publish root state and reset export state at native input frequency

Severity: **Medium**
Confidence: **High**
Status: **Confirmed input-hot-path render amplification**

Evidence:

- The scene range editor forwards every uncoalesced `pointermove` through `onChangeRef` (`src/components/SceneEditor.tsx:240-285`).
- Active range drags map the full scene array and immediately call the parent `onChange` (`src/components/SceneEditor.tsx:549-572,790-797`).
- Camera parameter range inputs call `updateScene` on every input change; that maps/normalizes the full list, publishes it, commits camera state, and invokes live preview (`src/components/SceneEditor.tsx:412-464,519-547,799-870`).
- The page-level change handler calls `resetExportSession` before every scene-state commit (`src/app/page.tsx:487-490`), and that reset schedules export state/progress/download/result updates (`src/lib/useExportController.ts:109-125`).

Concrete scenario: dragging a scene boundary, zoom, pitch, bearing, or rotation slider on a lower-power device repeatedly rebuilds scene arrays, reconciles the root workspace, clears already-idle export state, and may also update the MapLibre camera. Native pointer/input frequency can outpace paint and make the editor feel sticky.

Suggested fix: keep transient gesture values local to SceneEditor, coalesce visual/camera preview to one animation frame, and publish normalized root scene state plus export invalidation once at the terminal event. Preserve keyboard input semantics and cancellation rollback. Add a pointer-burst test that bounds parent publications/resets while asserting exact committed scenes and preview pose.

## Cross-review process hygiene

The E2E wrappers’ missing signal supervision can leave Chromium and server descendants consuming CPU/memory after an interrupted run. That is independently traced as `TRACE-01` in `.context/reviews/tracer.md`; it is not counted again here.

## Closed hypotheses and final missed-issue sweep

- Parser work is moved to a worker, transfer/generation guards are bounded, and source/generated-worker parity passed.
- Cumulative track distances are reused through page, map, timeline, and export paths rather than recomputed per playback frame.
- Trail updates use prebuilt chunks plus one active head instead of rebuilding the complete traveled line each frame.
- Export reuses one staging canvas, closes captured frames/samples in `finally`, observes encoder backpressure, and throttles visible React progress to roughly 10 Hz.
- The post-render `waitForIdle` call is potentially redundant, but its loaded-local-style fast path and correctness role mean source inspection alone does not establish a material regression; it remains a profiling hypothesis, not a finding.
- A degenerate 250,000-identical-point camera trace is structurally linear, but a local diagnostic completed a full camera call in about 0.356 ms on this desktop; without representative-device evidence it does not meet the material-finding threshold.
- Local map styles avoid an unbounded runtime tile/network fan-out, and no new unbounded loop or asset-growth path was found.

The final sweep rechecked all loops, array/string construction, event hot paths, effects/listeners, worker boundaries, export resources, scripts, and supported-size ceilings. No additional performance issue met the evidence threshold.
