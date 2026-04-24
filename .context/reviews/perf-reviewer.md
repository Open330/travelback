# Performance Reviewer - review-plan-fix cycle 1/100

Reviewer: perf-reviewer lane
Repo: `/Users/hletrd/flash-shared/Travelback`
Scope: performance, concurrency, CPU/memory/UI responsiveness, rendering hotspots, export pipeline latency/memory, unnecessary re-renders, worker/map/video costs.
Implementation changes: none. This file is the only intended modification.

## Inventory

### Project and context docs examined
- `.context/README.md` - project purpose and context layout.
- `.context/project/01-overview.md` - stack, supported formats, feature surface, build/test commands.
- `.context/project/02-architecture.md` - component tree, data flow, camera and export pipeline.
- `.context/development/01-conventions.md` - runtime, style, testing, dependency rules.
- `.context/reviews/perf-reviewer.md` and `.context/reviews/cycle-r10-perf-reviewer-2026-04-24.md` - prior perf review context only; current source was rechecked directly.

### Runtime/rendering/export files examined
- `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/styles/vitro-base.css`
- `src/components/MapView.tsx`, `Controls.tsx`, `ExportPanel.tsx`, `TrackWorkspace.tsx`, `TimelineSelector.tsx`, `ElevationProfile.tsx`, `SceneEditor.tsx`, `JourneyCreator.tsx`, `FileUpload.tsx`
- `src/components/ModalDialog.tsx`, `GlobalToolbar.tsx`, `TrackToolbar.tsx`, `KeyboardHelp.tsx`, `GoogleGuide.tsx`, `Toast.tsx`, `ThemeToggle.tsx`, `ErrorBoundary.tsx`
- `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/lib/i18n.ts`, `src/lib/env.ts`, `src/types.ts`
- `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`, `scripts/harden-static-export.mjs`, `scripts/fetch-map-styles.mjs`
- `package.json`, `next.config.ts`, `tsconfig.json`, `playwright*.config.ts`, `e2e/travelback.spec.ts`

## Findings

### PERF-01 - GPX/KML files up to 200 MB are parsed synchronously on the UI thread

- Severity: High
- Confidence: High
- Status: Confirmed issue
- Evidence:
  - `src/lib/parser.ts:124-167` parses GPX/KML with `DOMParser`, arrays, and `@tmcw/togeojson`.
  - `src/lib/parser.ts:576-627` allows non-JSON files up to `MAX_FILE_SIZE` and uses `FileReader.readAsText(file)`.
  - `src/lib/parser.ts:588-594` checks `MAX_TRACK_POINTS` only after the full parser has materialized the track.
  - `src/components/FileUpload.tsx:52-60` calls `parseTrackFile(file)` directly from the upload path after setting loading state.
- Why it is a problem: A 200 MB XML file can allocate a full file string, a full XML DOM, multiple intermediate arrays, GeoJSON conversion output for KML/fallback GPX paths, and the final `TrackPoint[]` all on the main thread. The point-count guard runs after those costs, so oversized files are rejected only after the worst work has already happened.
- Failure scenario: A user imports a large Garmin/Strava GPX with hundreds of thousands of points. The browser tab becomes unresponsive for many seconds or is killed before the spinner can meaningfully update, then the app finally throws `TOO_MANY_POINTS`.
- Suggested fix: Move GPX/KML parsing to a Worker, or lower the main-thread XML cap substantially. Prefer a streaming/SAX parser in the Worker so parsing can abort once `MAX_TRACK_POINTS + 1` is reached. Avoid constructing segment arrays and fallback GeoJSON when the direct GPX `<trkpt>` path is sufficient.

### PERF-02 - Google JSON worker still enforces expensive limits after full parse/sort/materialization

- Severity: Medium-High
- Confidence: High
- Status: Confirmed issue
- Evidence:
  - `src/lib/parser.ts:598-601` reads the whole JSON file into an `ArrayBuffer` and transfers it to the Worker.
  - `public/workers/trackParser.worker.js:307-310` decodes the entire buffer and calls `JSON.parse`.
  - `public/workers/trackParser.worker.js:151-203` sorts/deduplicates segments and materializes output arrays.
  - `public/workers/trackParser.worker.js:310-314` checks the 250,000 point limit only after `parseGoogleLocationHistory` returns a full `Track`.
- Why it is a problem: The Worker prevents direct UI-thread parsing, but it still pays whole-file decode, full JSON parse, point object allocation, sorting, dedupe, and final track materialization before rejecting oversized data. Worker memory is still tab memory, and a Worker OOM usually terminates the page process on mobile browsers.
- Failure scenario: A 90-100 MB Google Takeout `Records.json` with far more than 250,000 usable locations is accepted by the file-size gate, then the Worker builds a huge object graph before throwing `TOO_MANY_POINTS`. On memory-constrained devices this can crash the tab instead of returning a controlled error.
- Suggested fix: Count accepted points during each parser branch and abort immediately past the limit. Avoid sorting/deduping beyond the maximum useful budget. Longer-term, use an incremental JSON parser in the Worker and post structured progress/error messages rather than requiring whole-file materialization.

### PERF-03 - Playback and export rebuild/upload a growing trail GeoJSON every frame

- Severity: High
- Confidence: High
- Status: Confirmed issue
- Evidence:
  - `src/lib/usePlaybackController.ts:93-116` drives playback with `requestAnimationFrame` and updates `progress` each frame.
  - `src/components/MapView.tsx:106-167` builds a new wrapped route/trail geometry using slices and fresh coordinate arrays.
  - `src/components/MapView.tsx:824-847` calls `trailSource.setData(...)` with newly built geometry on every `progress` update.
  - `src/lib/videoEncoder.ts:93-132` and `src/lib/useExportController.ts:147-153` drive the same frame path during export.
- Why it is a problem: The work scales with elapsed route length, not with frame count alone. At 50% progress on a 250,000-point track, a single frame can rebuild and serialize roughly 125,000 coordinate pairs to MapLibre's GeoJSON worker side. Playback, seeking, and export all share this path.
- Failure scenario: A long Google timeline plays at 60 fps or exports at 60/120 fps. CPU and GC are dominated by `buildTrackGeometry` plus `GeoJSONSource#setData`, causing UI jank and very slow exports even before video encoding costs are considered.
- Suggested fix: Precompute wrapped route geometry once. Render progress with a fixed source and a cheap style/filter update, for example `lineMetrics: true` plus a `line-gradient` step expression, or pre-segmented features with cumulative-distance properties. If mutable geometry remains, update only when the segment index changes and use a decimated display geometry for preview.

### PERF-04 - Playback progress is top-level React state, causing app-wide re-renders for map-only animation

- Severity: Medium-High
- Confidence: High
- Status: Confirmed issue, with a likely export synchronization risk
- Evidence:
  - `src/lib/usePlaybackController.ts:48-51` sets React `progress` state for each frame.
  - `src/app/page.tsx:368-484` passes `progress` into `MapView`, `TrackWorkspace`, `ElevationProfile`, and `Controls`.
  - `src/components/Controls.tsx:41-74` recomputes formatted display/range styles from `progress`.
  - `src/components/ElevationProfile.tsx:85-126` re-renders the progress cursor from `progress`.
  - `src/lib/useExportController.ts:147-153` also calls `setPlaybackProgress(nextProgress)` and `setExportProgress(nextProgress)` for every export frame.
- Why it is a problem: The visual animation is mostly imperative map/canvas work, but every frame invalidates the React app shell and bottom controls. During export, this adds UI rendering to an already serialized map-render/encode loop. The export path waits one `requestAnimationFrame` after `setPlaybackProgress`, but the trail/marker update still depends on a later React effect in `MapView` (`src/components/MapView.tsx:824-847`), so frame capture timing remains coupled to React scheduling.
- Failure scenario: On a slower laptop, playback spends frame budget re-rendering controls and the elevation cursor while MapLibre is also rebuilding GeoJSON. During export, frames can be delayed by React commits, and if React/effects lag behind the one-rAF wait, a captured frame can contain the previous trail position even though the camera has advanced.
- Suggested fix: Move playback frame application behind an imperative `MapViewHandle.renderFrame(progress, cameraState)` that updates camera, marker, and trail synchronously. Keep a ref for high-frequency animation progress and update React UI at a lower cadence, such as 10-15 Hz or on seek/pause/end. For export, use the imperative frame API and throttle user-visible export progress.

### PERF-05 - Overview camera mode scans the full track on repeated playback/export frames

- Severity: High
- Confidence: High
- Status: Confirmed issue
- Evidence:
  - `src/lib/camera.ts:53-75` computes a bounding box by scanning every track point, and may scan twice for antimeridian-crossing tracks.
  - `src/lib/camera.ts:141-150` calls `computeBoundingBox(track.points)` for every overview scene camera.
  - `src/lib/camera.ts:329-423` can compute multiple scene cameras in one frame during scene gaps/blends.
  - `src/components/MapView.tsx:853-857` uses scene camera computation during playback.
  - `src/lib/videoEncoder.ts:101-104` computes scene camera state for every export frame.
- Why it is a problem: Default/preset cinematic scenes include overview segments. The route bounds do not change per frame, but they are recomputed per overview frame and sometimes multiple times per transition frame. This creates avoidable O(points x frames) CPU cost.
- Failure scenario: A 250,000-point route using the default opening/closing overview scenes scans the full point array thousands of times in a long export. On antimeridian tracks it performs a second pass per scan, making overview-heavy exports disproportionately slow.
- Suggested fix: Precompute track metrics once per track: bounding box, antimeridian-adjusted bounds, overview center/zoom, total distance, and possibly wrapped coordinates. Pass those metrics into `computeCameraForProgress`, or cache them in a `WeakMap` keyed by the stable `track.points` array.

### PERF-06 - Export settings allow files far larger than the in-memory MP4 pipeline can hold

- Severity: High
- Confidence: High
- Status: Confirmed issue
- Evidence:
  - `src/types.ts:80-106` allows duration up to 600s, fps up to 120, bitrate up to 50 Mbps, and 4K presets.
  - `src/lib/videoEncoder.ts:73-86` uses `BufferTarget` with `Mp4OutputFormat({ fastStart: 'in-memory' })`.
  - `src/lib/videoEncoder.ts:137-158` finalizes and returns a complete `ArrayBuffer`.
  - `src/lib/useExportController.ts:158-166` wraps that buffer in a `Blob`, creates an object URL, and keeps it for preview/share/download.
  - `src/components/ExportPanel.tsx:351-355` estimates output size but does not enforce a memory budget.
- Why it is a problem: The configured limits permit multi-GB outputs while the pipeline keeps the entire MP4 in memory. A 600s export at the UI's maximum quality preset of 20 Mbps is about 1.5 GB before overhead; the lower-level limit allows up to 50 Mbps, about 3.75 GB. The Blob and video preview can add additional retention.
- Failure scenario: A user selects 4K, 10 minutes, high/maximum quality, and 60 fps. Encoding runs for a long time, then the browser process runs out of memory during finalization or Blob creation, losing all progress.
- Suggested fix: Add a preflight memory budget guard using estimated bytes plus resolution/fps multipliers. For large exports, use mediabunny streaming output to a File System Access writable stream with backpressure, and use a non-monolithic MP4 mode such as fragmented or reserved fast-start. Disable or warn on combinations that cannot fit the in-memory path.

### PERF-07 - The interactive map always pays `preserveDrawingBuffer` overhead, even outside export

- Severity: Medium
- Confidence: Medium
- Status: Likely risk
- Evidence:
  - `src/components/MapView.tsx:547-558` creates the single MapLibre map with `canvasContextAttributes: { preserveDrawingBuffer: true }`.
  - `src/lib/useExportController.ts:118-155` exports from that same visible map canvas.
- Why it is a problem: `preserveDrawingBuffer` is required for reliable readback from the visible WebGL canvas, but it can reduce WebGL throughput because the browser cannot freely discard/reuse the back buffer after presentation. The cost applies during normal interactive playback, not only during export.
- Failure scenario: On integrated GPUs or mobile browsers, route playback that already rebuilds GeoJSON per frame drops frames sooner because every preview frame also runs with an export-oriented WebGL context configuration.
- Suggested fix: Keep the interactive preview map optimized without preserved buffers and create a dedicated export map/canvas only when export starts, configured with `preserveDrawingBuffer: true`. If a second MapLibre instance is too expensive, document this as a deliberate tradeoff and gate higher export presets more aggressively.

### PERF-08 - ElevationProfile builds and renders unbounded SVG path strings

- Severity: Medium
- Confidence: High
- Status: Confirmed issue
- Evidence:
  - `src/components/ElevationProfile.tsx:20-60` maps every track point and builds `pathD`/`areaD` from every sample.
  - `src/components/ElevationProfile.tsx:111-118` renders the full area path twice plus the line path.
  - `src/components/TrackWorkspace.tsx:146-149` mounts the profile in the always-visible playback UI.
- Why it is a problem: The memoization prevents per-frame path regeneration, but initial load and trim changes still create very large strings and DOM attributes. For a 250,000-point track, the chart can produce hundreds of thousands of SVG commands and keep them in the live React tree.
- Failure scenario: Importing or trimming a large track with elevation data pauses the UI while the elevation strings are generated; subsequent render/layout work must keep very large `d` attributes around even though the chart is only a few hundred CSS pixels wide.
- Suggested fix: Downsample to display resolution before building SVG. Bucket by horizontal pixel column and retain min/max/last elevation per bucket, capping output to roughly 500-2,000 vertices. A canvas-rendered static elevation bitmap with SVG only for cursor/accessibility would also bound DOM cost.

### PERF-09 - Timeline live drag rebuilds track state and MapLibre sources at pointer-frame cadence

- Severity: Medium-High
- Confidence: High
- Status: Confirmed issue
- Evidence:
  - `src/components/TimelineSelector.tsx:182-226` sends `onRangeChange` continuously during drag, throttled only by rAF.
  - `src/app/page.tsx:216-237` responds by slicing `fullTrack.points`, remapping segment starts, replacing `track`, and resetting playback.
  - `src/app/page.tsx:122-130` recomputes cumulative distances when `track.points` changes.
  - `src/components/MapView.tsx:756-816` treats the new `track` as a full reload, rebuilding grid/route/trail sources, bounds, marker, and calling `fitBounds`.
  - `src/components/MapView.tsx:224-330` and `src/components/MapView.tsx:169-203` scan/build supporting geometry for those reloads.
- Why it is a problem: rAF throttling still permits up to one full track slice, distance recompute, source rebuild, and `fitBounds` per display frame while the user is dragging. That makes the timeline least responsive on exactly the large tracks where trimming is most valuable.
- Failure scenario: A user drags a handle across a 200,000-point Google timeline. Each movement allocates a sliced `points` array and forces MapLibre source updates; the handle lags behind the pointer and the map repeatedly animates/re-fits instead of waiting for a committed range.
- Suggested fix: Separate drag preview from commit. During pointer movement, keep lightweight `[startIdx, endIdx]` or ratio preview state in the selector and update labels/handles only. Commit the sliced `track` on pointer-up or after a coarse debounce. If live map preview is required, pass a selected range to `MapView` and render a decimated preview without replacing canonical `track` or calling `fitBounds` every frame.

### PERF-10 - Static preview server buffers every file before responding, including HEAD

- Severity: Low-Medium
- Confidence: High
- Status: Confirmed issue
- Evidence:
  - `scripts/serve-static.mjs:121-165` resolves each request, calls `await readFile(resolved.absolutePath)`, then writes headers/body.
  - `scripts/serve-static.mjs:146-165` reads the body before checking `method === 'HEAD'`.
  - `scripts/smoke-static.mjs:167-179` exercises static paths but does not cover streaming or HEAD memory behavior.
- Why it is a problem: The preview server allocates a full buffer for every asset request. Concurrent requests multiply memory use, and HEAD requests pay the same disk read/allocation despite returning no body.
- Failure scenario: Local static preview under Playwright or manual testing fetches multiple chunks, fonts, and sample files concurrently. A large generated asset or future sample file causes avoidable memory spikes; CDN-like HEAD checks also allocate the whole file.
- Suggested fix: Use `stat` for `Content-Length`, return headers immediately for HEAD, and stream GET bodies with `createReadStream`/`pipeline`. Add basic `ETag` or `Last-Modified` handling so repeated requests can return `304` without file reads.

## Examined With No Additional Actionable Perf Findings

- `src/components/JourneyCreator.tsx`: map source updates and distance recomputation are O(waypoints) during manual drag, but waypoint counts are expected to be user-small. No current high-confidence issue.
- `src/components/SceneEditor.tsx`: scene overlap checks are O(scene count squared) and pointer edits are not rAF-throttled, but scene counts are small by design. No current actionable perf finding.
- `src/components/ModalDialog.tsx`, `KeyboardHelp.tsx`, `GoogleGuide.tsx`, `Toast.tsx`, `ThemeToggle.tsx`, `GlobalToolbar.tsx`, `TrackToolbar.tsx`, `ErrorBoundary.tsx`: no independent hot loop or unbounded data structure found beyond normal mount/open interactions.
- `src/lib/interpolate.ts`: cumulative distances are O(points) but memoized in `page.tsx`; per-frame interpolation uses binary search. No standalone issue beyond callers that invoke it every frame.
- `src/lib/i18n.ts`: all locale strings are bundled in the client, but current source size is modest relative to the map/video dependencies; no performance finding raised.
- `scripts/harden-static-export.mjs`, `scripts/fetch-map-styles.mjs`, `scripts/smoke-static.mjs`: bounded build/smoke work. The only script-side runtime issue found is the static server buffering in PERF-10.

## Final Sweep Note

I examined all first-party runtime source files under `src/app`, `src/components`, and `src/lib`, the parser Worker under `public/workers`, build/static scripts under `scripts`, core config files, Playwright test coverage, and the relevant `.context` project/development docs. I did not exhaustively reread every historical `.context/reviews/**` and `.context/plans/**` file because many are stale cycle artifacts; I checked the current target review and latest perf review note for context, then verified findings directly against current source. I skipped `node_modules`, `.git`, generated build output, binary/font assets, and static SVG/image contents except where they affect runtime size or worker/map behavior.
