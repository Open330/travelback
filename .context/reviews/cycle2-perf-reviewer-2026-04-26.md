# Cycle 2 Performance Review — perf-reviewer

Repository: `/Users/hletrd/flash-shared/Travelback`  
Date: 2026-04-26  
Reviewer role: `perf-reviewer` fallback performed by Codex because the named agent type is not registered.

## Scope and method

Read-only review of performance, concurrency, CPU, memory, GPU, and UI responsiveness risks. I did not edit application code, revert changes, commit, push, or run destructive commands. Findings below are based on executable code paths and cross-file interactions, not on comments or tests as behavioral proof.

## Review-relevant inventory examined

### Runtime app code

- App shell and global styles: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/styles/vitro-base.css`, `src/app/favicon.ico`.
- Components: `src/components/Controls.tsx`, `src/components/ElevationProfile.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/ExportPanel.tsx`, `src/components/FileUpload.tsx`, `src/components/GlobalToolbar.tsx`, `src/components/GoogleGuide.tsx`, `src/components/JourneyCreator.tsx`, `src/components/KeyboardHelp.tsx`, `src/components/MapView.tsx`, `src/components/ModalDialog.tsx`, `src/components/SceneEditor.tsx`, `src/components/ThemeToggle.tsx`, `src/components/TimelineSelector.tsx`, `src/components/Toast.tsx`, `src/components/TrackToolbar.tsx`, `src/components/TrackWorkspace.tsx`.
- Libraries and types: `src/lib/camera.ts`, `src/lib/env.ts`, `src/lib/i18n.ts`, `src/lib/interpolate.ts`, `src/lib/parser.ts`, `src/lib/useExportController.ts`, `src/lib/usePlaybackController.ts`, `src/lib/videoEncoder.ts`, `src/types.ts`.
- Public runtime assets: `public/workers/trackParser.worker.js`, `public/map-styles/basic.json`, `public/map-styles/dark.json`, `public/fonts/inter.css`, `public/fonts/inter-var.woff2`, `public/fonts/poppins.css`, `public/fonts/poppins-600.woff2`, `public/fonts/poppins-800.woff2`, `public/sample-trip.gpx`, `public/guide/*.svg`, `public/*.svg`.

### Config, scripts, tests, and context

- Config/build: `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `playwright.config.ts`, `playwright.static.config.ts`.
- Scripts: `scripts/fetch-map-styles.mjs`, `scripts/harden-static-export.mjs`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`, `scripts/run-dev-e2e.mjs`, `scripts/run-static-e2e.mjs`.
- Tests/fixtures: `e2e/travelback.spec.ts`, `e2e/fixtures/sample.gpx`, `e2e/fixtures/sample.kml`, `e2e/fixtures/sample-route.json`, `e2e/fixtures/test-utils.ts`, plus the untracked manual helper `.tmp-travelback-mina-manual.mjs` as non-runtime context.
- Docs/context: `README.md`, `.context/README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/development/01-conventions.md`, active `.context/plans/**`, `.context/reports/**`, `.context/reviews/**`, `.context/tasks/**`, and top-level `plan/*.md` were inventoried for intended flows and prior review context. Runtime conclusions below are still validated from source code.
- Generated or dependency output intentionally not used as behavioral source: `.next/`, `out/`, `node_modules/`, `playwright-report/`, `test-results/`, `tsconfig.tsbuildinfo`.

## Findings

### P-01 — Per-frame trail rendering rebuilds and uploads growing O(points) GeoJSON

- Severity: High
- Confidence: High
- Status: Confirmed
- File and code regions:
  - `src/components/MapView.tsx:109-170` (`buildTrackGeometry`) slices each segment and wraps each point into new coordinate arrays.
  - `src/components/MapView.tsx:879-904` updates the trail source by calling `trailSource.setData({ ... geometry: buildTrackGeometry(...) })` whenever playback `progress` changes.
  - `src/lib/usePlaybackController.ts:104-154` drives `setPlaybackProgress(nextProgress)` from `requestAnimationFrame` during playback.
  - `src/lib/useExportController.ts:173-186` drives `setPlaybackProgress(nextProgress)` once per encoded export frame.
  - `src/lib/parser.ts:4`, `src/lib/parser.ts:576-578`, `src/lib/parser.ts:701-707` allow valid tracks up to `MAX_TRACK_POINTS = 250_000` before rejecting.
  - `src/lib/videoEncoder.ts:89-90` allows export jobs up to 10,800 frames at the current 180 second / 60 fps maxima.
- Code behavior: for every interactive playback frame and every export frame, `MapView` computes the current interpolated point and then rebuilds a GeoJSON `LineString`/`MultiLineString` for the traveled trail. Near the end of a long track this copies and wraps nearly all traveled points into fresh arrays before handing the object to MapLibre `setData`.
- Cross-file interaction: parser accepts large tracks, playback/export produce frequent progress changes, and `MapView` converts those changes into full source data replacements. `suspendAutoCamera` only suppresses automatic camera movement; it does not suppress the marker/trail work at `src/components/MapView.tsx:879-904`.
- Failure scenario: a valid 100k-250k point GPX/KML/Google timeline file plays or exports. As progress approaches the end, every frame allocates a huge GeoJSON object and sends it to MapLibre. The main thread can stutter, playback drops frames, export slows dramatically or appears hung, and memory pressure spikes.
- Suggested fix: precompute immutable per-segment coordinate arrays once per track and avoid rebuilding growing GeoJSON every frame. Prefer a constant source plus MapLibre styling/filtering such as line-progress/line-gradient, feature-state, or segment-index filters. If exact traveled geometry must be materialized, throttle updates and decimate display geometry separately from analytical track points. Add a synthetic large-track playback/export performance regression test.

### P-02 — Export loop pushes thousands of React and MapLibre updates through normal playback state

- Severity: Medium
- Confidence: High
- Status: Confirmed
- File and code regions:
  - `src/lib/videoEncoder.ts:118-158` loops over every encoded frame and invokes `renderFrame(...)`, then `videoSource.add(...)`, then `onProgress?.(progress)`.
  - `src/lib/useExportController.ts:173-186` implements `renderFrame` by imperatively applying camera state but also calling `setPlaybackProgress(nextProgress)` and waiting for `requestAnimationFrame`.
  - `src/lib/useExportController.ts:187` passes a per-frame progress callback that calls `setExportProgress(nextProgress)`.
  - `src/app/page.tsx:160-182` wires export to the same `playbackProgress` state used by the interactive map, elevation profile, controls, and timeline.
  - `src/components/MapView.tsx:879-904` reacts to export-driven progress by moving the marker and rebuilding trail data every frame.
- Code behavior: export is primarily a frame encoder, but it drives the visible application's React state for every frame. At maximum settings this means up to 10,800 `setPlaybackProgress` calls plus 10,800 `setExportProgress` calls, with `MapView` and other subscribers responding during the encode loop.
- Cross-file interaction: `useExportController` correctly uses an imperative map handle for camera state, but then re-enters the normal interactive playback pipeline through React progress state. That pulls in `MapView` source updates, `ElevationProfile` progress rendering, controls/timeline props, and export panel progress state while WebCodecs and canvas capture are also active.
- Failure scenario: exporting a 180 second, 60 fps route on a laptop or mobile browser causes the UI to re-render and MapLibre to process trail updates thousands of times in the same loop that captures and encodes frames. Export progress appears sluggish or frozen, cancellation may feel delayed, and the browser can become unresponsive before encoding completes.
- Suggested fix: separate export frame state from interactive playback state. Keep export progress in a throttled UI signal, for example 4-10 Hz, and update map camera/marker/trail through an imperative export-only path or an offscreen/hidden export renderer. Only synchronize `playbackProgress` to a final value at completion or abort. Pair this with the trail-rendering fix from P-01.

### P-03 — The MapLibre WebGL map is mounted before the user has a track and always uses `preserveDrawingBuffer`

- Severity: Medium
- Confidence: High
- Status: Confirmed
- File and code regions:
  - `src/app/page.tsx:462-478` always renders `<MapView ...>` inside the main layout, including the initial landing state before a track is loaded and before manual route creation is started.
  - `src/components/MapView.tsx:571-588` constructs `new maplibregl.Map(...)` with `canvasContextAttributes: { preserveDrawingBuffer: true }`.
  - `src/app/layout.tsx:80-82` also renders full-screen decorative layers behind the app on every visit.
- Code behavior: first page load eagerly initializes the map container, MapLibre WebGL context, style loading, controls, and canvas settings before the user has indicated they will use a map. The WebGL context is configured with `preserveDrawingBuffer: true` for all sessions, even though that setting is mainly needed for frame capture/export.
- Cross-file interaction: the landing page presents non-map entry points in `TrackWorkspace`, but `page.tsx` still mounts the full map path immediately. The same map instance is reused for export capture, which explains the preserved drawing buffer choice, but that makes normal browsing and playback pay the cost.
- Failure scenario: on first visit, low-power devices pay WebGL initialization, style fetch/parse, GPU memory, and preserved drawing buffer overhead before upload/sample/manual-route intent is known. This can hurt LCP/TTI and battery. During normal playback, preserved drawing buffers can also reduce GPU optimization opportunities and increase memory bandwidth.
- Suggested fix: lazy-mount `MapView` only after a sample/uploaded/manual track exists, or after the user enters route creation. For export, prefer a separate export-only map/canvas configured with `preserveDrawingBuffer: true`; keep the interactive map at the default when not capturing. If a separate renderer is too large a change, gate the expensive map initialization behind user intent first.

### P-04 — Full-viewport animated mesh can consume CPU/GPU continuously, and reduced-motion does not disable it

- Severity: Medium
- Confidence: Medium
- Status: Risk
- File and code regions:
  - `src/app/layout.tsx:56` sets `<html ... data-mesh="on" ...>` globally.
  - `src/app/layout.tsx:80-81` renders fixed full-screen `vitro-mesh` and `vitro-noise` elements for every route.
  - `src/styles/vitro-base.css:389-435` defines multiple gradient custom properties, the `.vitro-mesh` background, and `[data-mesh="on"] .vitro-mesh { animation: mesh-rot 22s linear infinite; }`.
  - `src/styles/vitro-base.css:761-767` handles `prefers-reduced-motion` by setting animations to `0.01ms !important` rather than disabling infinite animations.
  - `src/app/globals.css:46-56` disables only `.marker-pulse` for reduced-motion users, not the mesh.
- Code behavior: every session gets a full-viewport fixed element with layered radial/conic gradients. When mesh is on, the gradients animate indefinitely through CSS custom properties. The broad reduced-motion rule shortens animations globally but does not set `animation: none`; for an infinite animation, a near-zero duration can still create frequent invalidation.
- Cross-file interaction: this animation runs underneath MapLibre playback and WebCodecs export. Those are already GPU/main-thread sensitive paths, so the decorative layer competes with map rendering and canvas capture work.
- Failure scenario: on devices with integrated GPUs, the animated background keeps repainting while the map animates or export encodes, increasing fan/battery drain and lowering frame throughput. For reduced-motion users, the 0.01ms infinite animation path can still churn instead of becoming static.
- Suggested fix: in the reduced-motion media query, explicitly set `.vitro-mesh`, `.vitro-noise`, and other decorative infinite animations to `animation: none !important`. Consider making the mesh static by default, pausing it once a track is loaded or export starts, or moving visual interest to transform/opacity-only effects that do not require full-viewport gradient repainting.

### P-05 — In-memory video export can duplicate large buffers and exceed realistic tab memory limits

- Severity: Medium
- Confidence: Medium
- Status: Likely
- File and code regions:
  - `src/lib/videoEncoder.ts:7` sets `MAX_IN_MEMORY_EXPORT_BYTES = 256 * 1024 * 1024`.
  - `src/lib/videoEncoder.ts:99-103` uses a `BufferTarget` with `new Mp4OutputFormat({ fastStart: "in-memory" })`.
  - `src/lib/videoEncoder.ts:167-183` returns `target.buffer` after finalization.
  - `src/lib/useExportController.ts:188-198` wraps the returned `ArrayBuffer` in `new Blob([result.buffer])`, creates an object URL, and stores the blob/URL/filename in React state.
  - `src/components/ExportPanel.tsx:255-258` keeps a video preview mounted for the exported object URL.
- Code behavior: export estimates and caps the encoded video at 256 MiB, but the encode path is explicitly in-memory. After finalization, the returned `ArrayBuffer` is wrapped in a Blob and the Blob is kept for preview/download/share. Depending on browser implementation, the encoder target, final ArrayBuffer, Blob backing store, object URL, video decoder preview, and `File` wrapper for sharing can overlap in memory.
- Cross-file interaction: `videoEncoder.ts` guards only estimated output size, while `useExportController.ts` and `ExportPanel.tsx` keep the successful artifact resident for UX. This can be acceptable for small exports but risky near the configured limit.
- Failure scenario: a user exports a high-resolution or high-duration trip whose estimate is below 256 MiB. The encode succeeds after a long render, then the page temporarily holds multiple copies or decoded surfaces, causing mobile Safari/Chrome or memory-constrained desktops to kill the tab or fail the preview/download step.
- Suggested fix: lower the in-memory limit to account for duplicate residency, ideally based on `navigator.deviceMemory` where available. Prefer a streaming/file target when supported, such as File System Access API or a streaming Mediabunny target, and release the raw `ArrayBuffer` as soon as a Blob/URL is created. Provide an explicit close/delete action for the preview that revokes the URL and drops the Blob.

### P-06 — Manual route point dragging recomputes full distance on every pointer move

- Severity: Low
- Confidence: Medium
- Status: Likely
- File and code regions:
  - `src/components/JourneyCreator.tsx:174-178` defines `syncUI`, which calls `totalDistance(pts)` for the whole point array.
  - `src/components/JourneyCreator.tsx:349-358` calls `updateDraggedPoint(...)` from mouse/touch move handlers while dragging.
  - `src/components/JourneyCreator.tsx:394-421` also installs document-level move listeners for the drag lifecycle.
  - `src/lib/interpolate.ts:46-54` implements `totalDistance(points)` as an O(n) pass over every point pair.
- Code behavior: every pointer move during a drag updates the selected point and then recomputes the total route distance by scanning all route points. For typical manual routes this is small, but the code does not bound the number of manual points separately from UI responsiveness.
- Cross-file interaction: this is separate from imported track parsing; it affects manually created journeys in `JourneyCreator` and the shared distance helper in `interpolate.ts`.
- Failure scenario: a user creates or imports enough manual points for a long custom journey, then drags one point on a touch device. Pointermove frequency can be high, so repeated O(n) distance scans can make dragging laggy.
- Suggested fix: maintain incremental segment distances for manual routes, recomputing only the two adjacent segments affected by a moved point, or throttle `syncUI` during drag while applying the final exact distance on drag end.

## Evidence of areas reviewed without additional performance findings

- `src/lib/interpolate.ts` uses precomputed cumulative distances and binary search for imported-track interpolation; outside the `totalDistance` manual-route use in P-06, it is not the primary hot path.
- `src/lib/camera.ts` normalizes scenes and uses a `WeakMap` cache for overview track bounds, which is reasonable for repeated camera computations. The export loop already pre-normalizes scenes before encoding.
- `src/components/ElevationProfile.tsx` memoizes the expensive elevation SVG path on `track.points`; progress updates primarily move a marker line.
- `src/components/TimelineSelector.tsx` buckets large timelines to 60 visible bars and commits range changes on drag end rather than every pointer movement.
- `public/workers/trackParser.worker.js` keeps large Google Timeline JSON parsing off the main thread. The accepted point budget still feeds P-01, but the worker itself is not a UI-blocking parser path.
- Static serving and export hardening scripts are build/test-time paths and did not reveal runtime performance defects.

## Performance coverage notes

- The current Playwright E2E path in `e2e/travelback.spec.ts` exercises normal UI flows and stubs export in test mode, but it does not measure large-track playback, real export throughput, frame drops, or peak memory. That is acceptable for functional coverage but leaves the highest-risk performance paths unguarded.
- The configured limits permit very large point counts and long high-FPS exports, so performance tests should include synthetic tracks near those limits rather than only small fixtures.

## Final sweep: relevant files skipped?

No review-relevant source, config, script, test, public runtime asset, or docs/context category was skipped. Generated build output and installed dependencies were intentionally excluded as non-authoritative artifacts. Historical review/context files were used only for orientation; all findings above are grounded in current code regions.

## Finding count summary

Total findings: 6

- High: 1
- Medium: 4
- Low: 1
- Confirmed: 3
- Likely: 2
- Risk: 1
