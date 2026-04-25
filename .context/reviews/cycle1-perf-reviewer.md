# Cycle 1 Performance Review — perf-reviewer substitute

Repository: `/Users/hletrd/flash-shared/Travelback`  
Date: 2026-04-25  
Scope: performance, concurrency, CPU/memory, UI responsiveness, mobile/browser constraints, worker usage, export memory pressure, map rendering costs, parsing DoS/perf, and E2E runtime flake/perf.

## Review inventory

Reviewed relevant non-generated files:

- App/runtime: `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/styles/vitro-base.css`, `src/types.ts`.
- Components: `Controls.tsx`, `ElevationProfile.tsx`, `ErrorBoundary.tsx`, `ExportPanel.tsx`, `FileUpload.tsx`, `GlobalToolbar.tsx`, `GoogleGuide.tsx`, `JourneyCreator.tsx`, `KeyboardHelp.tsx`, `MapView.tsx`, `ModalDialog.tsx`, `SceneEditor.tsx`, `ThemeToggle.tsx`, `TimelineSelector.tsx`, `Toast.tsx`, `TrackToolbar.tsx`, `TrackWorkspace.tsx`.
- Libraries: `camera.ts`, `env.ts`, `i18n.ts`, `interpolate.ts`, `parser.ts`, `useExportController.ts`, `usePlaybackController.ts`, `videoEncoder.ts`.
- Worker/static runtime: `public/workers/trackParser.worker.js`, bundled `public/map-styles/*.json`, public sample/guide/icon/font assets by size/role.
- Test/build harness: `e2e/travelback.spec.ts`, `e2e/fixtures/*`, `package.json`, `next.config.ts`, `playwright.config.ts`, `playwright.static.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `scripts/*.mjs`.
- Docs/plans were skimmed for declared performance constraints and historical deferrals: `README.md`, `plan/*.md`, `plan/archive/*.md`, `.context/project/*.md` where present.

Generated/vendor/output directories were excluded: `node_modules/`, `.next/`, `out/`, `test-results/`, `playwright-report/`, `.git/`, lock/build caches such as `tsconfig.tsbuildinfo`. Existing `.context/reviews/*` artifacts and unrelated temp scratch files were not treated as product code.

## Findings

### HIGH

#### 1. Per-frame trail rendering rebuilds and re-sends a growing GeoJSON line

- **Location:** `src/components/MapView.tsx:109-170`, especially `points.slice(...)` at `138-141`; frame update at `886-900`.
- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed by static inspection; large-track impact needs browser profiling.
- **Failure scenario:** Playback and export update `progress` every frame. For each frame, `MapView` interpolates the point, builds a fresh trail geometry from the start of the track through `segmentIndex`, wraps coordinates, allocates arrays, and calls `GeoJSONSource#setData`. On a 250,000-point import, later frames copy/serialize most of the track at 30-60 Hz. This can monopolize the main thread, churn memory, overload MapLibre's worker serialization, and make playback/export appear frozen or cause export idle timeouts.
- **Suggested fix:** Do not rebuild the trail geometry per frame. Prefer one full route source with `lineMetrics: true` and a `line-gradient`/paint expression or feature-state progress value. If segmented gaps make that hard, pre-split/downsample once and update only a small marker/progress scalar. During export, avoid React-driven trail updates unless the trail must appear in the encoded output; update the map imperatively with minimal source changes.

#### 2. Real export drives React playback state every encoded frame, triggering the expensive map update path

- **Location:** `src/lib/useExportController.ts:173-186`, especially `setPlaybackProgress(nextProgress)` at `177-180`; `src/lib/videoEncoder.ts:103-143`; `src/components/MapView.tsx:876-985`.
- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed by static inspection; manual validation needed with a real non-stub export.
- **Failure scenario:** `exportVideo()` calls `renderFrame()` for every frame. The callback jumps the camera and then calls `setPlaybackProgress`, causing React to re-render and `MapView` to update marker/trail sources before each capture. A 180s/60fps export creates 10,800 React progress updates and 10,800 map source mutations in addition to WebCodecs encoding. On lower-end laptops/mobile browsers this can turn a local export into a long-running or failing task.
- **Suggested fix:** Split export progress from interactive playback progress. For export, update the camera and any capture-required marker/trail imperatively through `MapViewHandle`, and throttle React UI progress updates to ~4-10 Hz. If the exported trail must advance, provide a dedicated `setExportProgressOnMap(progress)` method that uses the cheap rendering strategy from finding 1.

#### 3. In-memory MP4 export can exceed practical browser/mobile memory even below the 256 MiB guard

- **Location:** `src/lib/videoEncoder.ts:7`, `70-87`, `152-168`; `src/lib/useExportController.ts:188-198`; presets in `src/types.ts:99-106`.
- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed architecture; exact breakpoints require device testing.
- **Failure scenario:** The encoder uses `BufferTarget` plus `Mp4OutputFormat({ fastStart: 'in-memory' })`, then returns the full `ArrayBuffer`, wraps it in a `Blob`, creates an object URL, and previews/downloads it. The 256 MiB encoded-size cap does not include encoder queues, MP4 fast-start buffering, 4K WebGL canvas/GPU surfaces, Blob/object URL retention, or browser overhead. A 180s export at 8 Mbps is ~180 MB before those extra allocations; a 4K canvas adds substantial GPU/CPU memory pressure. Mobile Safari/Chrome can kill the tab despite passing the app's size guard.
- **Suggested fix:** Add a streaming export path where available: File System Access API writable, OPFS, or a streaming target instead of `BufferTarget`. Lower/default caps based on `navigator.deviceMemory`, resolution, and browser family; gate 4K/60fps behind explicit warning. Revoke/release buffers as soon as save succeeds, and consider disabling preview for very large outputs.

### MEDIUM

#### 4. Overview scene camera recomputes full-track bounds every frame

- **Location:** `src/lib/camera.ts:141-144`, `379-391`, `408-424`; default overview scenes at `208-258`.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed by static inspection.
- **Failure scenario:** Every `overview` scene frame calls `computeBoundingBox(track.points)`, scanning the full track. Default export scenes include opening and closing overview segments, and transition blending can compute adjacent scene cameras too. For a 250,000-point track, a few seconds of overview at 30-60fps means tens to hundreds of millions of point visits before encoding cost is considered.
- **Suggested fix:** Precompute track camera metadata once per `track.points` identity: bounding box, center, overview zoom, and antimeridian-shifted bounds. Pass that cache into `computeCameraForProgress()`/`computeCameraForScene()`, or create a `createCameraComputer(track, cumulDist, scenes)` helper used by playback and export.

#### 5. Follow-camera look-ahead uses a linear scan on every frame

- **Location:** `src/components/MapView.tsx:912-917`.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed by static inspection.
- **Failure scenario:** Non-scene follow mode finds a look-ahead point by incrementing `lookAheadIdx` until cumulative distance reaches `distanceTraveled + 600m`. Dense city traces, stationary duplicate clusters, or very high-frequency GPS points can require thousands of loop iterations per frame. Combined with the trail source update, this makes playback CPU cost scale with point density rather than frame count.
- **Suggested fix:** Use a lower-bound binary search over `cumulDistRef.current` for the target distance. Handle flat duplicate-distance runs by advancing to the next distinct coordinate with a bounded helper or precomputed next-distinct index table.

#### 6. Elevation profile renders one SVG path vertex per track point

- **Location:** `src/components/ElevationProfile.tsx:20-60`, rendered at `118-125`.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed by static inspection; impact depends on elevation-bearing large tracks.
- **Failure scenario:** A large GPX/KML/Google track with elevation data creates `points` strings and two path data strings containing every point. At 250,000 points this becomes multi-megabyte SVG path data, expensive string allocation, expensive React prop diffing, and a heavy browser SVG parse/render step. Trimming or changing units can repeat the work.
- **Suggested fix:** Downsample for display. Bucket by pixel column or a fixed cap (for example 1,000-2,000 samples) and preserve min/max per bucket so spikes remain visible. Consider canvas for very large profiles.

#### 7. Timeline drag renders scan the full track to detect time data

- **Location:** `src/components/TimelineSelector.tsx:211-276`, `304-319`, and `354-355`.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed by static inspection.
- **Failure scenario:** Dragging updates local ratio state via rAF. Each render recomputes `const hasTime = points.some((p) => p.time)` over the full `fullTrack`. On 100k-250k point Google histories, the drag loop does an avoidable full-array scan every frame, causing handle lag on mobile/low-power devices.
- **Suggested fix:** Memoize `hasTime` with `useMemo(() => points.some(...), [points])`, or store `hasTime` as parser/track metadata. Keep per-drag rendering O(1) plus the existing small 60-bucket histogram.

#### 8. JSON worker path avoids main-thread parsing but still has high peak memory and clone cost

- **Location:** Main parser `src/lib/parser.ts:557-641`, especially transfer at `640` and main-thread Date rehydration at `616-621`; worker `public/workers/trackParser.worker.js:328-335`; file read at `src/lib/parser.ts:670-673`.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed architecture; manual validation needed with near-limit Google exports.
- **Failure scenario:** For up to 100 MB JSON, the browser reads an `ArrayBuffer`, transfers it, the worker decodes a full UTF-8 string, `JSON.parse()` creates the complete object graph, parser code creates TrackPoint objects, and `postMessage({ track })` structured-clones the resulting object graph back to the main thread. The main thread then loops over every point to rehydrate dates. The UI stays more responsive than main-thread parsing, but peak memory can still be several times file size and crash mobile tabs.
- **Suggested fix:** Move toward streaming/chunked parsing for Google Records/Timeline formats or lower the JSON cap by device memory. For the worker response, send compact typed arrays or chunked batches with transferable buffers, then build the minimum Track representation on the main thread. At minimum, add stress tests/telemetry for near-limit imports and document device-specific safe limits.

#### 9. GPX/KML parsing remains synchronous DOM work on the main thread

- **Location:** `src/lib/parser.ts:151-209`, `541-543`, `678-699`.
- **Severity:** Medium
- **Confidence:** Medium
- **Status:** Likely issue; manual validation needed with dense 3-4 MB XML files.
- **Failure scenario:** XML files are capped at 4 MB, but the browser still reads text, strips entities with regex copies, `DOMParser` builds a full DOM, and GPX/KML extraction/togeojson traversal runs synchronously on the main thread. A dense GPX/KML below 4 MB can contain enough nodes to freeze the UI before the loading spinner visibly updates, especially on mobile.
- **Suggested fix:** Reuse the worker path for XML, or introduce a bounded streaming/SAX parser for GPX. If keeping DOMParser, insert a paint yield before parsing, lower the XML cap based on benchmarked worst-case node counts, and reject pathological node counts early during extraction rather than only at final validation.

#### 10. `preserveDrawingBuffer` is enabled for the interactive map at all times

- **Location:** `src/components/MapView.tsx:577-588`.
- **Severity:** Medium
- **Confidence:** Medium
- **Status:** Likely runtime cost; needs browser/GPU profiling.
- **Failure scenario:** `canvasContextAttributes: { preserveDrawingBuffer: true }` is required for export capture, but it is active during all normal map interaction and playback. Preserved WebGL buffers can reduce GPU throughput and increase memory bandwidth on mobile/low-end GPUs. Users who never export still pay the cost.
- **Suggested fix:** Consider a separate export-only MapLibre instance/canvas configured with `preserveDrawingBuffer`, while the interactive map uses the default fast path. If that is too large a change, gate export capture behind explicit performance warnings and measure the actual FPS/memory impact on target mobile browsers.

#### 11. The Playwright suite is serialized and sleep-heavy, making CI slow and flake-prone

- **Location:** `playwright.config.ts:11-15`, `playwright.static.config.ts:11-15`; global setup in `e2e/travelback.spec.ts:216-223`; fixed waits/sampling at `46-87`, `529`, `545`, `840`, `868`, `945`, `957`, `1040`, `1475`, `1512`.
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed by static inspection; repository plans also record long E2E runtimes.
- **Failure scenario:** Both dev and static Playwright configs force `fullyParallel: false` and `workers: 1` across 74 tests, with retries enabled. Several tests re-run `page.goto('/')` after the shared `beforeEach`, and fixed waits/camera sampling add seconds regardless of app readiness. CI runtime grows linearly, retries double expensive paths, and fixed sleeps can be both too long on fast machines and too short on slow ones.
- **Suggested fix:** Split the suite into parallel-safe projects/files: parser/import, i18n/theme, layout/mobile, map-camera, export-stub. Keep only truly shared WebGL/debug tests serial. Replace fixed waits with debug readiness signals (`__travelbackDebug` layer/source state, map idle, app events). Avoid duplicate navigation in tests that need a mobile viewport by moving viewport into test fixtures before `goto`.

### LOW

#### 12. Glass/mesh effects add persistent GPU/compositing cost under the WebGL map

- **Location:** `src/app/layout.tsx:80-81`; `src/styles/vitro-base.css:408-434`, `455-518`, `551-581`; `src/app/globals.css:145-170`.
- **Severity:** Low
- **Confidence:** Medium
- **Status:** Likely issue; manual mobile profiling needed.
- **Failure scenario:** The app always renders a fixed animated mesh/noise background, and most controls use large `backdrop-filter` blurs. Over a full-screen WebGL map, these layers can increase compositing cost and battery drain on mobile GPUs. The code has `data-motion=lite/off` styles, but no automatic low-power/mobile activation was found.
- **Suggested fix:** Disable or simplify the animated mesh once a track/map is active, and auto-select `data-motion="lite"` or `off` for low-memory/mobile/reduced-motion users. Reduce blur radii for persistent controls and reserve heavy glass for modal surfaces.

## Missed-issue sweep

- Searched for hot-path indicators: `setData`, `requestAnimationFrame`, `setTimeout`, `JSON.parse`, `DOMParser`, `FileReader`, `arrayBuffer`, `BufferTarget`, `preserveDrawingBuffer`, `slice`, `sort`, and Playwright waits/timeouts.
- Cross-checked parser limits between `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, and `scripts/smoke-static.mjs`.
- Checked bundled map styles: all five are local-only, one-layer styles with no remote sources/glyphs/sprites, so remote tile/glyph latency is not a current map-rendering concern.
- Checked fixture sizes: current E2E fixtures are small; they do not stress near-limit parser/export performance. Add synthetic stress fixtures/tests separately if performance budgets become release gates.
- No unrelated files were modified. Only this review artifact was written.

## Skipped-file confirmation

Skipped by design: generated/vendor/output/caches (`node_modules/`, `.next/`, `out/`, `test-results/`, `playwright-report/`, `.git/`, `tsconfig.tsbuildinfo`, `package-lock.json`) and existing review/plan artifacts not needed to assess runtime code. No source, config, script, worker, style, public runtime asset, or E2E spec file relevant to performance was intentionally skipped.
