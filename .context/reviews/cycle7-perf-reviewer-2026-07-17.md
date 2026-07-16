# Cycle 7 Performance Reviewer — 2026-07-17

Reviewed revision `2df151642576b1b662e2fe7695c5723012e88747` read-only on `codex/review-plan-fix-2026-07-16`.

## Result

**No new actionable performance finding.** The current source still contains the four measured-redesign deferrals D01-D04 and evidence gate B04. This review found no new regression or new measurement that changes those dispositions.

## Review surface

The pass covered all 53 tracked `src` files and all 15 unit suites, the full 19-file E2E/fixture inventory, all seven scripts, root and Playwright/Vitest/Next/TypeScript/ESLint configuration, the deploy workflow, dependency metadata, textual public assets, generated worker parity, and the current hardened static export. Hot-path tracing focused on playback RAF ownership, React render breadth, cumulative-distance and interpolation work, wrapped trail geometry, elevation SVG creation, timeline/scene/Journey Creator drag frequency, MapLibre initialization/style retries, parser transfer/memory ceilings, frame capture, encoder backpressure, cancellation, and cleanup.

This was a source review, not a profiler run; no representative-device latency, frame-rate, GPU, or memory claim is made. Current lint, no-emit typecheck, 368 unit tests, worker parity, audit, CSP/hash parity, and diff checks passed. The full build/static/dev E2E and real-MP4 matrix recorded at the Cycle 6 functional head remains applicable because the later commits are documentation-only, but it was not rerun in this strict read-only pass.

## New findings

None.

## Existing performance ledger, deliberately not refiled

### D01 — Playback progress has broad root React ownership

- Severity / confidence: High / High
- Status: Existing measured-architecture deferral
- File/region: `src/lib/usePlaybackController.ts:98-155`; `src/app/page.tsx:173-232,577-595`
- Failure scenario: during playback, every animation frame updates root-owned progress, causing the page and broad sibling tree to reconcile at display frequency; long tracks and lower-power devices amplify main-thread contention with MapLibre rendering.
- Causal trace: RAF `animate` → `setPlaybackProgress(nextProgress)` → `Page` state changes → root JSX and consumers reconcile → `MapView` receives the new progress.
- Recommended fix: first profile representative route sizes/devices, then isolate frame-frequency progress ownership or use an imperative/external-store path while retaining lower-frequency accessible UI updates and exact seek semantics.

### D02 — Elevation profile serializes every selected point twice

- Severity / confidence: Medium / High
- Status: Existing profiling/downsampling deferral
- File/region: `src/components/ElevationProfile.tsx:20-60,91-133`
- Failure scenario: a near-limit track with elevation data creates a string entry for every point, joins the full sequence into both `pathD` and `areaD`, and asks SVG to parse/render both paths, increasing allocation, parse time, and paint cost.
- Causal trace: track selection/trim → map all elevations → loop over `n` points → build `points[]` → duplicate `points.join(...)` into line and area paths → browser parses two full geometries.
- Recommended fix: establish a visual-error/viewport target, downsample to a bounded screen-space representation, reuse the sampled geometry, and measure before/after on representative hardware.

### D03 — Journey waypoint drag recomputes total route distance on every move

- Severity / confidence: Medium / High
- Status: Existing incremental/throttled-preview deferral
- File/region: `src/components/JourneyCreator.tsx:197-201,372-381`; `src/lib/interpolate.ts:21-29,44-51`
- Failure scenario: dragging one waypoint in a large hand-built route repeatedly clones the waypoint array, refreshes map data, and scans every adjacent segment at pointer-event frequency.
- Causal trace: `mousemove`/`touchmove` → `updateDraggedPoint` → copy/replace waypoint → `updateMapData()` → `syncUI()` → `totalDistance(pts)` performs O(n) haversine work.
- Recommended fix: keep exact full recomputation on commit, while deriving preview distance from the two affected adjacent segments or throttling the preview; measure at a documented waypoint count.

### D04 — Export uses two-stage stabilization for every encoded frame

- Severity / confidence: Medium / High
- Status: Existing measurement-required deferral
- File/region: `src/lib/useExportController.ts:181-193,211-240`; `src/lib/videoEncoder.ts:223-268`; `src/components/MapView.tsx:521-548,590-643`; `src/lib/map-render.ts:20-90`
- Failure scenario: long/high-FPS exports pay first for a render event plus next RAF and then for MapLibre idle verification before every capture. If the second phase is redundant for a proven class of frames, export wall time is unnecessarily multiplied; removing it without proof could capture incomplete tiles.
- Causal trace: encoder frame loop → `renderFrame` → `MapView.renderFrameAndWait` waits render/RAF → encoder calls `waitForIdle` → controller delegates to `mapHandle.waitForIdle` → capture/encode.
- Recommended fix: instrument real exports to distinguish render and idle wait duration/hit rate, then alter the contract only if representative traces prove which idle checks can be safely coalesced or skipped.

### B04 — Preserved drawing buffers are enabled for the map's whole lifetime

- Severity / confidence: Medium / Medium
- Status: Existing representative-hardware evidence gate
- File/region: `src/components/MapView.tsx:920-930`
- Failure scenario: `preserveDrawingBuffer: true`, required by the current capture path, may impose a GPU/frame cost during ordinary interactive use even when export is inactive.
- Causal trace: every map generation → immutable WebGL context attributes enable preservation → all interactive frames retain the back buffer → possible GPU synchronization/bandwidth cost.
- Recommended fix: benchmark interactive and export workloads on representative desktop/mobile GPUs. Only then consider a separate export context or another capture design; the source comment's “negligible” assertion is not itself evidence.

## Current safeguards verified

- Export inputs and estimated in-memory use are bounded before encoder allocation; cumulative distance and normalized scenes are computed outside the frame loop.
- One staging canvas is reused, `VideoFrame` and `VideoSample` objects close in `finally`, encoder backpressure is awaited, and abort/finalize paths have deadlines.
- Trail data is precomputed/chunked and advanced incrementally rather than reconstructing the entire traveled route per frame.
- JSON parsing transfers the original buffer to a worker; the main-thread fallback copy is retained only under its documented bound. XML/JSON size, complexity, depth, and point limits remain finite.
- Event listeners, timers, RAFs, object URLs, map instances, workers, and export resources have explicit cleanup paths; no new unbounded loop, busy wait, or retained-resource path was found.

## Final missed-issue sweep and skipped accounting

The final sweep revisited maximum-size imports, disconnected segments, antimeridian routes, rapid replacement/cancellation, hidden-tab playback, high-FPS/long exports, resize/style retry, manual camera drag, scene/timeline drag, Journey Creator input modes, locale/theme changes, and generated/static execution. No new issue had both a concrete performance failure and evidence beyond B04/D01-D04.

No current authored source, test, script, configuration, textual public asset, or relevant active document was skipped. The generated worker and minified static chunks were handled by parity/source/provenance checks; the WOFF2 payload was not decoded; the lockfile was inspected structurally. Superseded historical `.context` and legacy `plan/` artifacts were searched for prior IDs and stale hypotheses rather than line-reviewed as current code.
