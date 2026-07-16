# Cycle 8 Performance Reviewer — 2026-07-17

Reviewed revision `81342b7fab1cc2577909b63025bb2452dcb5446b` read-only on `codex/review-plan-fix-2026-07-16`.

## Outcome

**No new actionable performance finding.** New finding count: **0**. The current source retains the four measured-redesign deferrals D01-D04 and the representative-hardware evidence gate B04. The Cycle 7 fixes add no new unbounded work, main-thread parser path, retained-resource path, or frame-frequency regression.

This was a source and provenance review, not a profiler run. No new latency, frame-rate, GPU, memory, battery, or thermal measurement is claimed. The exact-HEAD Cycle 7 completion record reports lint/typecheck, 16 unit suites / 393 tests, zero high-level audit vulnerabilities, build/static smoke, 97 dev plus 97 static E2E cases, and a real MP4 export as passing (`.context/plans/cycle7-implementation-2026-07-17.md:164-172`); those gates were not rerun by this role.

## Complete review inventory and provenance

The repository was inventoried before review. The performance pass covered every current authored runtime, test, build, delivery, and behavior-defining documentation path:

- `src` has 54 tracked paths: 53 textual paths plus binary `src/app/favicon.ico`. Runtime paths reviewed were `src/app/{globals.css,layout.tsx,page.tsx}`; every component `Controls`, `ElevationProfile`, `ErrorBoundary`, `ExportPanel`, `FileUpload`, `GlobalToolbar`, `GoogleGuide`, `JourneyCreator`, `KeyboardHelp`, `MapView`, `ModalDialog`, `SceneEditor`, `ThemeToggle`, `TimelineSelector`, `Toast`, `TrackToolbar`, and `TrackWorkspace`; libraries `camera`, `env`, `googleJsonParser`, `i18n`, `id`, `interpolate`, `map-geometry`, `map-render`, `parse-utils`, `parser`, `test-stub`, `useExportController`, `usePlaybackController`, and `videoEncoder`; plus `src/{types.ts,styles/vitro-base.css,workers/trackParser.worker.ts}`.
- All 16 unit/component/worker suites were reviewed: the six component suites for ElevationProfile, ExportPanel, FileUpload, JourneyCreator, SceneEditor, and TimelineSelector; the nine library suites for camera, env, i18n, interpolate, map-geometry, map-render, parser, useExportController, and videoEncoder; and `trackParser.worker.test.ts`.
- The full browser surface was reviewed: `e2e/travelback.spec.ts` and all 18 fixtures (`antimeridian.gpx`, the six `google-*` JSON fixtures, `invalid-elevation.gpx`, `korea-japan.{gpx,json,kml}`, `multiline-entity.gpx`, `point-placemarks.kml`, `sample.gpx`, `segmented-city-hop.gpx`, `single-quote-attrs.gpx`, `tiny-trim.gpx`, and `uneven-trim.gpx`).
- All seven scripts were reviewed: `build-worker.mjs`, `fetch-map-styles.mjs`, `harden-static-export.mjs`, `run-dev-e2e.mjs`, `run-static-e2e.mjs`, `serve-static.mjs`, and `smoke-static.mjs`.
- Delivery/configuration inventory: `.github/workflows/deploy-pages.yml`, `.gitignore`, `eslint.config.mjs`, `next.config.ts`, `package.json`, lockfile structure, both Playwright configs, PostCSS, TypeScript, and Vitest configs.
- All 19 public assets were inventoried. Textual SVGs, font CSS, five local map styles, and `sample-trip.gpx` were inspected; `public/workers/trackParser.worker.js` was checked through generated-source parity; the WOFF2 binary was checked at its declaration/load boundary rather than decoded.
- Current behavior/provenance documents reviewed were `README.md`; `.context/{README.md,project/01-overview.md,project/02-architecture.md,development/01-conventions.md}`; `.context/plans/{README.md,cycle6-implementation-2026-07-17.md,cycle7-implementation-2026-07-17.md,user-injected/pending-next-cycle.md}`; `.context/reviews/_aggregate.md`; and all twelve dated Cycle 7 role reports. Superseded `.context` reviews and legacy `plan/` files were catalogued and searched for prior IDs/hypotheses, not treated as current runtime requirements.

Hot-path tracing included import decode/parse/worker transfer, cumulative distances, segment geometry and antimeridian wrapping, map creation/style replacement/retry, playback RAF ownership, camera interpolation, trail publication, elevation/timeline/scene and waypoint interactions, export resize/render/idle/capture/encode/finalize, React update breadth, listener/timer/RAF cleanup, and object URL lifetime.

## New findings

None.

## Existing performance ledger — confirmed unchanged, not refiled

### D01 — Root-owned playback progress reconciles broad UI every frame

- Severity / confidence: **High / High**
- Status: **Confirmed existing measured-architecture deferral**
- File/region: `src/lib/usePlaybackController.ts:98-155`; `src/app/page.tsx:173-232,577-595`
- Concrete failure: foreground playback calls `setPlaybackProgress` from each RAF. Root state then reconciles the page and its consumers while MapLibre also renders; near-limit tracks or lower-power devices can miss frame budgets.
- Fix: profile representative track sizes/devices first, then isolate frame-frequency state in an imperative/external-store owner while retaining lower-frequency accessible progress, exact seeking, scenes, and export behavior.

### D02 — Elevation geometry scales linearly into multiple SVG strings

- Severity / confidence: **Medium / High**
- Status: **Confirmed existing profiling/downsampling deferral**
- File/region: `src/components/ElevationProfile.tsx:15-82,89-98,157-164`
- Concrete failure: a near-limit elevation track creates coordinate text for every valid sample, embeds it in line and area path strings, and asks SVG to parse/paint both. Cycle 7 correctly separates missing-data runs but does not bound geometry size.
- Fix: establish a viewport/error target, distance-downsample to a bounded representation that preserves endpoints/extrema/gaps, reuse sampled coordinates, and measure allocation/paint before and after.

### D03 — Waypoint drag performs an O(n) route-distance scan per move

- Severity / confidence: **Medium / High**
- Status: **Confirmed existing incremental-preview deferral**
- File/region: `src/components/JourneyCreator.tsx:197-201,371-381`; `src/lib/interpolate.ts:44-51`
- Concrete failure: every mouse/touch waypoint move copies the waypoint array, republishes map data, and calls `totalDistance` across the whole route at pointer frequency.
- Fix: calculate preview deltas from the two affected adjacent edges or throttle preview work, then perform exact full reconciliation on drag settlement; validate against a documented waypoint count.

### D04 — Export pays render/RAF and idle stabilization for every frame

- Severity / confidence: **Medium / High**
- Status: **Confirmed existing measurement-required deferral**
- File/region: `src/lib/useExportController.ts:174-240`; `src/lib/videoEncoder.ts:220-268`; `src/components/MapView.tsx:521-548,590-643`; `src/lib/map-render.ts:20-90`
- Concrete failure: each encoded frame awaits `renderFrameAndWait` and then a separate `waitForIdle`; if the second phase is redundant for locally styled frames, long/high-FPS exports multiply wall time. Removing it without evidence can capture incomplete frames.
- Fix: instrument time and outcome for both phases in real exports, then coalesce/skip only the waits proven redundant while preserving capture correctness and abort semantics.

### B04 — The interactive map always preserves its WebGL drawing buffer

- Severity / confidence: **Medium / Medium**
- Status: **Manual validation required; existing representative-hardware gate**
- File/region: `src/components/MapView.tsx:920-930`
- Concrete failure: `preserveDrawingBuffer: true` may force GPU synchronization/bandwidth during ordinary interaction even when no export is active, but emulation cannot establish its material cost.
- Fix: compare p50/p95 interactive frame time and memory, plus battery/thermal observations, on representative desktop/mobile GPUs. Isolate export capture in a separate context/design only if the measured cost is material.

## Rejected candidates and safeguards

- The Google point budget at `src/lib/parse-utils.ts:45-61` and extraction sites in `src/lib/googleJsonParser.ts:48-220` intentionally caps peak retained candidate objects before flatten/dedup. Counting duplicates is conservative resource protection, reinforced by `src/lib/parser.test.ts:1419-1449`; it is not a new performance regression.
- Timeline selected-region touch behavior lacks physical-device evidence, but that is a longstanding interaction-coverage deferral, not a performance defect introduced by Cycle 7.
- JSON remains worker-isolated with a bounded fallback copy; XML/JSON size, XML complexity, JSON depth, and accepted-point limits are finite. Trail geometry is precomputed/chunked, encoder objects close in `finally`, backpressure is awaited, and export finalization has a deadline.
- Event listeners, workers, maps, timers, RAFs, object URLs, marker DOM, and encoder samples have explicit teardown. The final sweep found no busy loop, accidental quadratic work outside the known D03 interaction, or newly unbounded allocation.

## Final missed-issue sweep

The second pass revisited maximum imports, 250,000-point routes, disconnected/singleton segments, antimeridian travel, hidden-tab playback, rapid track/style/export replacement, resize/retry, long and high-FPS export, cancellation/finalization, scene/timeline/waypoint drag, locale/theme churn, and generated/static execution. No additional candidate had both a concrete performance failure and evidence beyond D01-D04/B04.
