# Performance Reviewer - Cycle 5

Date: 2026-04-25
Lane: performance / concurrency / UI responsiveness
Scope: entire repository, with emphasis on large-file parsing/export, worker boundaries, React render churn, MapLibre animation/camera work, e2e/build runtime, and concurrency hazards.

## Inventory

Reviewed:
- App shell and state flow: `src/app/page.tsx`, `src/app/layout.tsx`, `src/types.ts`.
- Map/render/playback/export hot paths: `src/components/MapView.tsx`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/lib/camera.ts`, `src/lib/interpolate.ts`.
- Large-file import paths: `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `src/components/FileUpload.tsx`.
- Track editing/rendering UI: `src/components/TrackWorkspace.tsx`, `src/components/TimelineSelector.tsx`, `src/components/ElevationProfile.tsx`, `src/components/Controls.tsx`, `src/components/SceneEditor.tsx`, `src/components/JourneyCreator.tsx`, `src/components/TrackToolbar.tsx`, `src/components/ExportPanel.tsx`.
- Supporting UI/context: `src/lib/i18n.ts`, `src/components/GoogleGuide.tsx`, `src/components/ModalDialog.tsx`, `src/components/ThemeToggle.tsx`, `src/components/Toast.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/GlobalToolbar.tsx`, `src/components/KeyboardHelp.tsx`.
- Build/test/static scripts: `package.json`, `next.config.ts`, `playwright.config.ts`, `playwright.static.config.ts`, `scripts/*.mjs`, `e2e/travelback.spec.ts`.

Existing provenance read and preserved:
- Prior `.context/reviews/perf-reviewer-cycle5.md` listed C5-P1 / DF-C17-005: per-frame MapView GeoJSON regeneration.
- Prior `.context/reviews/perf-reviewer-cycle5.md` listed C5-P2 / DF-C17-016: inline i18n translation bundle.
- Prior `.context/reviews/perf-reviewer-cycle5.md` carried DF-C17-004: sequential export `waitForIdle` cost.

## Findings

### C5-P1 / DF-C17-005 - Playback rebuilds and uploads traveled GeoJSON every animation frame

- Severity: P1-HIGH
- Confidence: HIGH
- File/region: `src/components/MapView.tsx:839-861`, with allocation source at `src/components/MapView.tsx:107-168`
- Provenance: carried from previous cycle 5 report as C5-P1 / DF-C17-005; severity raised because the current code path copies up to the traveled prefix on every frame for tracks capped at 250,000 points.
- Issue: Every `progress` state update enters the MapView effect, calls `interpolateAlongTrack`, then calls `trailSource.setData({ geometry: buildTrackGeometry(...) })`. `buildTrackGeometry` slices point ranges and rebuilds wrapped coordinate arrays before MapLibre receives a fresh GeoJSON object.
- Failure scenario: A 100k-250k point route playing at 60fps allocates and uploads increasingly large coordinate arrays as progress approaches the end. The main thread spends the frame budget copying coordinates and garbage collecting, causing visible playback jank and delayed input.
- Concrete fix: Stop regenerating prefix GeoJSON per frame. Keep the full route geometry static and render progress with a MapLibre line-gradient / line-trim style expression if available, or precompute immutable segment coordinate arrays once and update only a small marker/progress scalar. If a dynamic trail source remains necessary, cache wrapped coordinates per segment and build only from cached slices, with update throttling below rAF when the segment index has not changed materially.

### C5-P2 - Timeline drag commits full track slices and map rebuilds on every rAF

- Severity: P1-HIGH
- Confidence: HIGH
- File/region: `src/components/TimelineSelector.tsx:182-226`, `src/app/page.tsx:231-257`, `src/app/page.tsx:125-134`, `src/components/MapView.tsx:770-830`
- Issue: `TimelineSelector.applyDrag` calls `onRangeChange` inside `requestAnimationFrame` during pointer movement. The parent immediately copies `fullTrack.points.slice(startIdx, endIdx + 1)`, constructs a new `Track`, resets playback, recomputes cumulative distances through `useMemo`, and MapView treats the new object as a fresh track, rebuilding reference grid data, route/trail GeoJSON, marker state, and `fitBounds`.
- Failure scenario: Dragging the timeline on a 250,000 point Google export can perform tens of full-array copies and MapLibre source uploads per second. The selector itself is throttled, but the downstream work is O(n) per drag frame and will lock the UI on large tracks.
- Concrete fix: Split live drag preview from committed track mutation. During drag, update only local ratios/labels and perhaps a lightweight overlay; commit the sliced track on pointer up or after a debounce. Better: keep `fullTrack` immutable and store `{startIdx,endIdx}` as view state, deriving display/progress from index bounds without copying points until export/load confirmation. If live map preview is required, throttle to a much lower cadence and avoid `fitBounds`/source rebuilds until commit.

### C5-P3 - GPX/KML imports still parse large files on the main thread

- Severity: P1-HIGH
- Confidence: HIGH
- File/region: `src/lib/parser.ts:521-523`, `src/lib/parser.ts:152-203`, `src/lib/parser.ts:653-673`
- Issue: JSON imports are transferred to `public/workers/trackParser.worker.js`, but GPX/KML still use `FileReader.readAsText`, `DOMParser`, and `@tmcw/togeojson` on the main thread. The accepted non-JSON limit is 200MB.
- Failure scenario: A 100-200MB GPX/KML file blocks the UI while the browser decodes text, builds a full XML DOM, converts to GeoJSON, then extracts points. On mobile this can show as a frozen tab or an OS-level reload under memory pressure.
- Concrete fix: Move GPX/KML parsing behind the same worker boundary as JSON by transferring an `ArrayBuffer` to a worker and returning a bounded `Track`. For large XML, prefer a streaming/SAX-style parser or lower the accepted limit until a worker parser exists. Keep the main-thread fallback only for small files, mirroring the current 16MB JSON fallback policy.

### C5-P4 - Google JSON worker can exceed memory before enforcing the point cap

- Severity: P1-HIGH
- Confidence: MEDIUM-HIGH
- File/region: `public/workers/trackParser.worker.js:207-241`, `public/workers/trackParser.worker.js:307-312`; equivalent main parser logic at `src/lib/parser.ts:465-519`
- Issue: The worker decodes the full transferred buffer to a string, runs a full depth scan, then `JSON.parse`s the entire file and flattens/deduplicates all candidate points. The 250,000 point cap is checked only after `parseGoogleLocationHistory` returns.
- Failure scenario: A valid under-100MB Google export with far more than 250,000 raw points can allocate the decoded string, parsed object graph, intermediate segment arrays, dedupe `Set`, and final point list before being rejected. The UI thread is isolated, but the worker can be killed by memory pressure and the import fails late after substantial CPU and RAM churn.
- Concrete fix: Enforce the point budget during extraction, not after extraction. Pass a bounded collector/counter through `parseRecords`, `parseTimelineObjects`, `parseTimelineEdits`, and `parseSemanticSegments`, throwing `TOO_MANY_POINTS` once the cap is exceeded. For the real fix, replace whole-file `JSON.parse` on large Google files with a streaming format-specific parser so unsupported/oversized exports fail without materializing the entire object graph.

### C5-P5 / DF-C17-004 - Video export serializes every frame through MapLibre idle

- Severity: P2-MEDIUM
- Confidence: HIGH
- File/region: `src/lib/videoEncoder.ts:93-130`, `src/lib/useExportController.ts:125-163`, `src/components/MapView.tsx:500-552`
- Provenance: carried from previous cycle 5 report as DF-C17-004.
- Issue: Export renders frames in a strictly sequential loop. For each frame it computes camera state, calls `map.jumpTo` through `renderFrame`, waits one rAF, then waits for `MapView.waitForIdle`; two consecutive idle timeouts fail the export. This is conservative, but it makes export throughput depend on full MapLibre render/idle latency per frame.
- Failure scenario: A 60s/60fps export needs 3,600 serialized map renders before encoding overhead. If tiles/style work or WebGL scheduling delays `idle`, exports take far longer than the panel estimate and can fail after two 5s idle misses despite the map being visually usable.
- Concrete fix: Use a render-completion signal closer to the needed artifact, such as waiting for the next `render`/`frameReady` after `jumpTo` when no remote tiles are involved, and reserve full `idle` waits for style changes or missing source/layer recovery. Consider a dedicated export renderer with preloaded local style/resources and a bounded frame pipeline so camera computation and encoding can overlap where WebCodecs allows it.

### C5-P6 - `preserveDrawingBuffer` taxes all interactive map rendering for an export-only need

- Severity: P2-MEDIUM
- Confidence: MEDIUM-HIGH
- File/region: `src/components/MapView.tsx:562-573`, export canvas dependency at `src/lib/useExportController.ts:94-100`
- Issue: MapLibre is initialized with `canvasContextAttributes: { preserveDrawingBuffer: true }` so export can read the WebGL canvas. That setting applies to normal browsing/playback too, forcing the browser to preserve the back buffer instead of using the faster default swap behavior.
- Failure scenario: Users who never export still pay the GPU synchronization/memory-bandwidth cost during every pan, zoom, playback tick, and camera-follow update. On integrated GPUs and mobile browsers this reduces headroom exactly where the app needs smooth 60fps rendering.
- Concrete fix: Keep the interactive map on the default WebGL context and create a separate export-only map/canvas with `preserveDrawingBuffer` when export starts, or use a capture path that does not require preserving the interactive back buffer. If a second MapLibre instance is too expensive, gate high-resolution export behind creating/reusing a hidden export renderer and tear it down after the Blob is produced.

### C5-P7 - E2E suite burns wall-clock on serial execution and fixed sleeps

- Severity: P3-LOW
- Confidence: HIGH
- File/region: `playwright.config.ts:10-12`, `playwright.static.config.ts:10-12`, fixed waits in `e2e/travelback.spec.ts:147`, `e2e/travelback.spec.ts:507`, `e2e/travelback.spec.ts:523`, `e2e/travelback.spec.ts:817`, `e2e/travelback.spec.ts:845`, `e2e/travelback.spec.ts:922`, `e2e/travelback.spec.ts:937`, `e2e/travelback.spec.ts:1299`, `e2e/travelback.spec.ts:1336`
- Issue: Both Playwright configs force `fullyParallel: false` and `workers: 1`, and several tests wait with fixed timeouts instead of app/map readiness conditions.
- Failure scenario: As the suite grows, CI runtime scales linearly and local review cycles stay slow even when most tests are independent. Fixed waits also make fast machines wait unnecessarily while still being flaky on slow machines.
- Concrete fix: Split tests into serial MapLibre/camera groups and parallel-safe import/UI groups. Replace fixed sleeps with `expect.poll` on `__travelbackDebug.getMapState()`, visible UI state, or a dedicated app-ready signal. Keep video/trace retention on failure, but use a lighter reporter for non-interactive CI lanes if HTML output is not consumed.

## Carried Low-Risk Performance Note

### C5-P8 / DF-C17-016 - i18n bundle is loaded inline for all locales

- Severity: P3-LOW
- Confidence: HIGH
- File/region: `src/lib/i18n.ts:11-1829`
- Provenance: carried from previous cycle 5 report as C5-P2 / DF-C17-016.
- Issue: All five locale dictionaries live in one client module, so every page load pays for every locale.
- Failure scenario: Initial JS grows as languages/strings grow. Current impact is modest because there are only five locales and no network locale fetch path.
- Concrete fix: Keep as deferred unless locale count or translation size grows. If it does, split dictionaries into dynamic imports by locale and cache the active locale module after first load.

## Positive Observations

- JSON imports use transferable `ArrayBuffer` worker parsing for the normal path (`src/lib/parser.ts:536-620`).
- Main-thread JSON fallback is bounded to 16MB (`src/lib/parser.ts:523-533`).
- Playback progress is accumulator-based rather than frame-delta accumulating (`src/lib/usePlaybackController.ts:95-130`).
- Cumulative distances are memoized from point/segment references (`src/app/page.tsx:125-134`).
- Timeline pointer movement itself is rAF-throttled and stores drag state in refs (`src/components/TimelineSelector.tsx:88-95`, `src/components/TimelineSelector.tsx:182-230`); the issue is downstream full-track commit work.
- Export controller revokes old object URLs and guards state updates after unmount (`src/lib/useExportController.ts:57-80`, `src/lib/useExportController.ts:165-181`).

## Summary Table

| Severity | Count | Categories |
| --- | ---: | --- |
| P0 | 0 | None found |
| P1 | 4 | Per-frame map data rebuild, live timeline O(n) commits, main-thread XML parsing, late JSON worker cap |
| P2 | 2 | Sequential export render/idle loop, export-only WebGL context cost paid during interactive rendering |
| P3 | 2 | Serial/fixed-wait e2e runtime, deferred i18n bundle split |

## Verdict

FIX AND SHIP. The app has good worker and memoization foundations, but large tracks still have multiple O(n)-per-interaction paths. Prioritize C5-P1 and C5-P2 first because they directly affect normal playback and timeline responsiveness; then move GPX/KML behind a worker boundary.
