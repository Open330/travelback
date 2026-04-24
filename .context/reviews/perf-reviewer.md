# Performance / Concurrency / UI Responsiveness Review

Reviewer: perf-reviewer specialist
Scope: review-plan-fix cycle 1/100, Prompt 1
Repo: `/Users/hletrd/flash-shared/Travelback`
Source changes: none (review artifact only)

## Inventory of relevant files examined

### Parsing / worker / file ingestion
- `src/lib/parser.ts` — GPX/KML/Google JSON parser, file-size limits, Worker handoff and fallback.
- `public/workers/trackParser.worker.js` — Google JSON Worker parser and structured-clone return path.
- `src/components/FileUpload.tsx` — parse invocation, loading/error state, large-file user path.
- `src/app/page.tsx` — sample-file loading path and track-session state updates.

### Playback, map rendering, camera, export loop
- `src/components/MapView.tsx` — MapLibre lifecycle, sources/layers, per-progress trail/camera updates, export resize/idle handle.
- `src/lib/usePlaybackController.ts` — `requestAnimationFrame` playback loop and progress state updates.
- `src/lib/useExportController.ts` — export orchestration, map resize, per-frame render callback, progress/download state.
- `src/lib/videoEncoder.ts` — mediabunny output target, frame loop, canvas capture, codec support.
- `src/lib/camera.ts` — per-frame scene camera computation, overview bounding boxes.
- `src/lib/interpolate.ts` — cumulative distance computation and progress interpolation.
- `src/types.ts` — export limits and resolution presets.

### React UI render paths
- `src/app/page.tsx` — top-level state fanout into map/workspace/export.
- `src/components/TrackWorkspace.tsx` — playback-dependent controls/elevation/timeline composition.
- `src/components/Controls.tsx` — progress controls and per-frame display.
- `src/components/ElevationProfile.tsx` — SVG elevation path generation and progress cursor.
- `src/components/TimelineSelector.tsx` — range drag loop and parent `onRangeChange` cadence.
- `src/components/SceneEditor.tsx` — scene edits and live preview path.
- `src/components/ExportPanel.tsx` — codec probing, export progress UI, share/download affordances.
- `src/components/JourneyCreator.tsx` — MapLibre editing layers and drag updates.
- `src/components/TrackToolbar.tsx`, `src/components/ModalDialog.tsx`, `src/components/Toast.tsx`, `src/components/ThemeToggle.tsx` — event/timer/rAF/UI overhead check.

### Static/build scripts
- `scripts/fetch-map-styles.mjs` — bundled style generation.
- `scripts/harden-static-export.mjs` — postbuild HTML CSP rewrite.
- `scripts/serve-static.mjs` — static preview server request path.
- `scripts/smoke-static.mjs` — static smoke server/test loop.
- `next.config.ts`, `package.json`, `playwright*.config.ts`, `e2e/travelback.spec.ts` — build/runtime/test wiring check.

## Findings

### PERF-01 — Google JSON Worker path still decodes and retains a full main-thread copy before transfer

- Severity: High
- Confidence: High
- Regions:
  - `src/lib/parser.ts:439-512` (`parseGoogleLocationHistoryInWorkerBuffer` decodes `textCopy`, creates Worker, transfers buffer, and falls back to main thread on Worker errors)
  - `src/lib/parser.ts:538-542` (`file.arrayBuffer()` starts the JSON path)
  - `public/workers/trackParser.worker.js:247-272` (Worker decodes the transferred buffer, parses JSON, posts `track` back)
- Failure scenario: Importing a 100 MB Google Takeout JSON on a memory-constrained laptop/mobile device still runs `TextDecoder.decode(buffer)` on the main thread at `src/lib/parser.ts:449` before the Worker starts. At peak, the app can hold the original `ArrayBuffer`, the main-thread decoded string, the Worker decoded string, the parsed JSON graph, the output `TrackPoint[]`, and then a structured-cloned copy of the track returned by `postMessage`. The main thread can visibly freeze before the loading spinner gets a paint opportunity, and if the Worker crashes from memory pressure, `worker.onerror` falls back to `parseGoogleLocationHistory(textCopy)` on the main thread (`src/lib/parser.ts:500-507`), producing the worst possible recovery path.
- Concrete fix: Transfer the `ArrayBuffer` immediately and remove the eager `textCopy`. Only decode on the main thread when Worker construction is unavailable before transfer. Treat Worker runtime failures as import failures rather than retrying the same large parse on the UI thread. If fallback is required, reacquire data via `file.stream()`/`file.text()` outside the transferred-buffer function and gate it behind a much smaller size limit. Longer-term, parse Google JSON incrementally inside the Worker and post progress/summary data instead of structured-cloning a large object graph back to the main thread.

### PERF-02 — GPX/KML imports up to 200 MB parse synchronously on the main thread and enforce point limits only after full materialization

- Severity: High
- Confidence: High
- Regions:
  - `src/lib/parser.ts:102-152` (`DOMParser`, GPX/KML extraction, `@tmcw/togeojson` conversion)
  - `src/lib/parser.ts:516-566` (`parseTrackFile`, 200 MB non-JSON limit, `FileReader.readAsText`)
  - `src/lib/parser.ts:528-534` (too-few/too-many point validation after parser completion)
  - `src/components/FileUpload.tsx:52-60` (UI path invokes parser directly after setting loading state)
- Failure scenario: A 150-200 MB GPX or KML file can allocate one full file string, a full XML DOM, intermediate arrays from `Array.from(...).map(...).filter(...)`, possible GeoJSON from `togeojson`, and finally the `TrackPoint[]` — all on the UI thread. A file with far more than 250,000 points is still fully parsed before `TOO_MANY_POINTS` is thrown, so the user gets seconds/minutes of tab unresponsiveness before rejection.
- Concrete fix: Move GPX/KML parsing into a Worker too, or lower the main-thread XML size cap sharply. Prefer a streaming/SAX-style XML parser in the Worker so points can be counted and rejected once `MAX_TRACK_POINTS + 1` is reached. Avoid building segment arrays and GeoJSON for GPX when the direct `<trkpt>` path is enough. Ensure the loading state can paint before expensive work starts (for example, `await new Promise(requestAnimationFrame)` before Worker startup if needed).

### PERF-03 — Playback and export rebuild/upload a growing trail GeoJSON on every progress frame

- Severity: High
- Confidence: High
- Regions:
  - `src/lib/usePlaybackController.ts:86-117` (rAF loop updates React `progress` every frame)
  - `src/components/MapView.tsx:106-167` (`buildTrackGeometry` slices/wraps coordinates into new arrays)
  - `src/components/MapView.tsx:824-847` (every `progress` update calls `trailSource.setData(...)` with newly built geometry)
  - `src/lib/videoEncoder.ts:93-132` and `src/lib/useExportController.ts:137-148` (export frame loop also drives the same progress/trail path)
- Failure scenario: On a 250,000-point track at 50% progress, a single frame builds and uploads roughly 125,000 coordinate pairs; during normal playback this repeats at rAF cadence, and during export it repeats for every encoded frame. `GeoJSONSource#setData` also sends the new GeoJSON to MapLibre's worker side, so CPU, GC, and worker serialization all scale with elapsed route length. The UI will jank or stall on long tracks, and high-FPS exports can become dominated by trail reconstruction rather than encoding.
- Concrete fix: Stop using per-frame growing GeoJSON as the trail representation. Precompute wrapped coordinates once per track and render progress with a cheap style update: e.g. a route source with `lineMetrics: true` plus a `line-gradient`/step expression, or a fixed segmented source with cumulative-distance properties and an updated paint/filter threshold. If geometry mutation remains necessary, update only when the segment index changes and use a decimated display geometry. Keep the playback loop inside an imperative MapView method so the whole React tree is not invalidated for every visual frame.

### PERF-04 — Export frame synchronization relies on async React state, so capture can race the trail update while causing app-wide per-frame re-renders

- Severity: High
- Confidence: Medium-High
- Regions:
  - `src/lib/videoEncoder.ts:106-130` (compute camera, call `renderFrame`, wait for idle, capture canvas)
  - `src/lib/useExportController.ts:141-146` (`renderFrame` calls `mapHandle.applyCameraState(...)` then `setPlaybackProgress(nextProgress)`)
  - `src/components/MapView.tsx:486-538` (`waitForIdle` can resolve immediately when the map is not moving and tiles are loaded)
  - `src/components/MapView.tsx:824-847` (trail/marker update happens later in a React effect from the state change)
  - `src/app/page.tsx:331-342` (`suspendAutoCamera` disables auto camera during export, but `progress` still feeds MapView)
- Failure scenario: During export, `applyCameraState` is synchronous, but `setPlaybackProgress` schedules a React render/effect for the trail. `waitForIdle` can resolve immediately after `jumpTo` if MapLibre reports no movement and loaded tiles, allowing `videoSource.add(...)` to capture the previous frame's trail/marker state. Even when the timing happens to work, every export frame triggers top-level React state updates, `TrackWorkspace` rendering, `Controls`/`ElevationProfile` updates, export progress updates, and the `MapView` trail effect.
- Concrete fix: Add an imperative `MapViewHandle.renderFrame(progress, cameraState)` (or similar) that updates camera, marker, and trail source synchronously in one place and returns a promise resolved after a real map render/double-rAF. Use that for export instead of `setPlaybackProgress` as a synchronization primitive. Throttle user-visible export progress (time- or percent-based) and update playback UI only after export completes/cancels.

### PERF-05 — Overview scene camera computation scans the full track on repeated frames

- Severity: High
- Confidence: High
- Regions:
  - `src/lib/camera.ts:53-94` (`computeBoundingBox`, `overviewZoomFromBox`)
  - `src/lib/camera.ts:137-163` (`computeCameraForScene`, `overview` case calls `computeBoundingBox(track.points)`)
  - `src/lib/camera.ts:341-436` (`computeCameraForProgress` calls `computeCameraForScene` per playback/export frame, and can call it multiple times during blends/gaps)
  - `src/components/MapView.tsx:853-857` (playback scene camera path)
  - `src/lib/videoEncoder.ts:101-104` (export scene camera path)
- Failure scenario: The default cinematic sequence includes overview scenes. For a 250,000-point track, every overview frame scans all points to recompute the same bounding box and zoom. A long export can call this thousands of times; transitions can compute previous/main/next cameras in the same frame. This creates avoidable O(points × frames) work in both playback and export.
- Concrete fix: Precompute track metrics once per track: bounding box, overview center/zoom, cumulative distances, and any antimeridian-adjusted values. Pass those metrics into `computeCameraForProgress`, or cache them in a `WeakMap<Track | TrackPoint[], Metrics>` keyed by the stable `track.points` array. Ensure transition code reuses those metrics when computing adjacent scene cameras.

### PERF-06 — Export limits allow outputs far larger than the in-memory MP4 pipeline can safely hold

- Severity: High
- Confidence: High
- Regions:
  - `src/types.ts:80-106` (duration up to 600s, fps up to 120, bitrate up to 50 Mbps, 4K presets)
  - `src/lib/videoEncoder.ts:73-86` (`BufferTarget`, `Mp4OutputFormat({ fastStart: 'in-memory' })`, `CanvasSource`)
  - `src/lib/videoEncoder.ts:142-158` (returns full `ArrayBuffer` after finalize)
  - `src/lib/useExportController.ts:151-156` (wraps result in a `Blob` and creates an object URL)
  - `src/components/ExportPanel.tsx:348-351` (UI estimates size but does not enforce a memory budget)
- Failure scenario: A 600s export at 20 Mbps is approximately 1.5 GB before container overhead; at the declared 50 Mbps max it is approximately 3.75 GB. The current pipeline stores the complete MP4 in `BufferTarget`, then creates a `Blob` from the full buffer and may keep an object URL/preview alive. Mobile Safari/Chrome and many desktops will run out of memory or kill the tab long before completion.
- Concrete fix: Put a hard memory-budget guard in `ExportPanel`/`exportTrack` before starting (estimated bytes from bitrate × duration plus a resolution/fps multiplier). For large exports, use mediabunny's stream-capable output target with File System Access (`StreamTarget`/writable stream with backpressure) and a non-monolithic MP4 mode such as fragmented/reserved fast-start, then only fall back to `BufferTarget` for small exports. Disable or lower unsupported combinations (for example 4K + long duration + high fps/bitrate) instead of relying on runtime failure.

### PERF-07 — ElevationProfile creates unbounded SVG path strings from every point

- Severity: Medium
- Confidence: High
- Regions:
  - `src/components/ElevationProfile.tsx:20-60` (maps every point to elevation and builds `pathD`/`areaD` string from all samples)
  - `src/components/ElevationProfile.tsx:111-118` (renders the full path twice and a clipped full area path)
  - `src/components/TrackWorkspace.tsx:136-139` (profile is mounted in the playback UI)
- Failure scenario: A 250,000-point track builds hundreds of thousands of SVG commands and renders the large path twice. The memoization prevents recomputation on each `progress` frame, but initial load/range changes still pay a large CPU/string/DOM cost, and the giant `d` props remain in the React tree during playback.
- Concrete fix: Downsample the elevation profile to the display resolution before building SVG. For example, bucket by horizontal pixel column and keep min/max/last elevation per bucket so the chart is bounded to ~500-2,000 vertices regardless of track size. Alternatively render the static profile to a canvas and keep SVG only for the progress cursor/accessibility shell.

### PERF-08 — Timeline live-drag path slices tracks and reloads MapLibre sources at pointer-frame cadence

- Severity: Medium-High
- Confidence: High
- Regions:
  - `src/components/TimelineSelector.tsx:182-226` (rAF-throttled drag calls `onRangeChange` continuously)
  - `src/app/page.tsx:185-205` (`handleRangeChange` slices `fullTrack.points`, rebuilds segment starts, sets `track`, resets playback)
  - `src/app/page.tsx:97-100` (track changes recompute cumulative distances)
  - `src/components/MapView.tsx:756-816` (track changes rebuild route/trail sources, reference grid, bounds, marker, and call `fitBounds`)
- Failure scenario: Dragging the range selector over a large full track triggers array slicing, cumulative-distance recomputation, MapLibre `setData` for full route/trail, and `fitBounds` as often as once per animation frame. This can lock the UI while the user is actively dragging, exactly when responsiveness matters most.
- Concrete fix: Separate preview from commit. During drag, keep just `[startIdx,endIdx]` preview state and update lightweight handle/label UI; commit the sliced track only on pointer-up or after a coarse debounce. If live map preview is required, pass the selected range to MapView and render a decimated preview layer without replacing the canonical `track` object or calling `fitBounds` every frame. Also ensure `TimelineSelector` receives cumulative distances for the same `fullTrack` it renders.

### PERF-09 — Static preview server buffers every requested file, including HEAD requests

- Severity: Low-Medium
- Confidence: High
- Regions:
  - `scripts/serve-static.mjs:121-165` (request handler resolves file, `await readFile(...)`, writes response; `HEAD` returns after body has already been read)
  - `scripts/smoke-static.mjs:168-175` (smoke test exercises static asset paths but not streaming/HEAD memory behavior)
- Failure scenario: The preview server reads an entire asset into memory for every request. Concurrent requests for large JS chunks, fonts, maps, or sample/import files multiply memory usage; `HEAD` requests still pay the full disk read and allocation even though no body is sent.
- Concrete fix: Use `stat` for `Content-Length`, return headers immediately for `HEAD`, and stream `GET` bodies with `createReadStream`/`pipeline`. Add basic conditional request support (`ETag` or `Last-Modified`) so repeated smoke/browser requests can get `304` without file reads.

## Examined with no additional actionable performance findings

- `src/components/Controls.tsx`: per-frame rerenders are a consequence of top-level `progress` state; no standalone expensive work beyond formatting and inline style updates.
- `src/components/ExportPanel.tsx`: codec probing is parallelized and only runs when opened; main issue is lack of export memory gating (covered in PERF-06) and per-frame progress cadence (covered in PERF-04).
- `src/components/SceneEditor.tsx`: pointer range edits are not rAF-throttled, but scene counts are small; no major issue unless future UX allows large scene lists.
- `src/components/JourneyCreator.tsx`: `setData`/`totalDistance` on waypoint drag are O(waypoints), but manual waypoint counts are expected to be small.
- `scripts/fetch-map-styles.mjs`, `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs`: build/smoke work is sequential and bounded for current artifact sizes; no urgent performance issue beyond static-server buffering in PERF-09.
