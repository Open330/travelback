# Cycle 2 Tracer Review — 2026-04-26

Role: `tracer` (causal tracing of suspicious flows, competing hypotheses).  
Scope: upload/parse, map render, playback, trim, scene, export, and static build/deploy flows across the whole repository.  
Edit policy followed: no source/config/test changes; this markdown file is the only artifact written.

## Inventory and examination coverage

### Runtime app code examined
- App shell/styles: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/styles/vitro-base.css`, `src/types.ts`.
- UI/flow components: `src/components/Controls.tsx`, `ElevationProfile.tsx`, `ErrorBoundary.tsx`, `ExportPanel.tsx`, `FileUpload.tsx`, `GlobalToolbar.tsx`, `GoogleGuide.tsx`, `JourneyCreator.tsx`, `KeyboardHelp.tsx`, `MapView.tsx`, `ModalDialog.tsx`, `SceneEditor.tsx`, `ThemeToggle.tsx`, `TimelineSelector.tsx`, `Toast.tsx`, `TrackToolbar.tsx`, `TrackWorkspace.tsx`.
- Runtime libraries: `src/lib/camera.ts`, `src/lib/env.ts`, `src/lib/i18n.ts`, `src/lib/interpolate.ts`, `src/lib/parser.ts`, `src/lib/useExportController.ts`, `src/lib/usePlaybackController.ts`, `src/lib/videoEncoder.ts`.
- Browser worker/assets relevant to runtime: `public/workers/trackParser.worker.js`, `public/sample-trip.gpx`, `public/map-styles/{bright,dark,liberty,positron,voyager}.json`, public SVG/font assets.

### Build/deploy/test/context files examined
- Config/build: `package.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `tsconfig.json`, `playwright.config.ts`, `playwright.static.config.ts`.
- Scripts: `scripts/fetch-map-styles.mjs`, `scripts/harden-static-export.mjs`, `scripts/run-dev-e2e.mjs`, `scripts/run-static-e2e.mjs`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`.
- E2E and fixtures: `e2e/travelback.spec.ts`, all files under `e2e/fixtures/`.
- Documentation/current context: `README.md`, `.context/README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/development/01-conventions.md`, `.context/plans/user-injected/pending-next-cycle.md`, `.omx/context/review-plan-fix-cycle2-prompt.md`, and current cycle-2 peer review artifacts for competing hypotheses only.
- Generated/static output: `out/index.html` was spot-checked only to compare static hardening hypotheses; it was not treated as source-of-truth code.

Excluded from source review as generated/cache/tool output: `node_modules/`, `.next/`, `out/` except the spot-check noted above, `playwright-report/`, `test-results/`, `tsconfig.tsbuildinfo`, `.git/`, and historical archived `.context`/`.omx` state not relevant to the current review cycle.

## End-to-end causal traces and competing hypotheses

| Flow | Trace conclusion | Primary code path examined |
| --- | --- | --- |
| Upload/parse | File extension and size gates are present, parser and worker enforce final point caps, and XML entity/doctype preflight is present. The suspicious residual is duplicated parser logic between main and worker, but no new divergence-caused runtime bug was confirmed in this pass. | `FileUpload.tsx:19-111` → `parser.ts:576-743` → `public/workers/trackParser.worker.js:270-348` |
| Map render | Track render lifecycle is source/layer driven and handles antimeridian/degenerate track geometry. The suspicious confirmed flow is per-frame trail source replacement on every playback/export progress change. | `MapView.tsx:109-170`, `MapView.tsx:703-986`, `interpolate.ts:18-162` |
| Playback | Playback state is RAF-driven and guarded during export hotkeys. It shares the same `progress` state with export frame rendering, causing export to traverse the normal playback React/MapLibre update path. | `usePlaybackController.ts:104-154`, `usePlaybackController.ts:176-250`, `useExportController.ts:173-186`, `MapView.tsx:879-986` |
| Trim | Full-track and trimmed-track state are split correctly, and scenes are cleared when trimming away the full range. The likely UX/data mismatch is end-handle distance-to-index flooring on sparse tracks. | `page.tsx:149-158`, `page.tsx:288-315`, `TrackWorkspace.tsx:138-166`, `TimelineSelector.tsx:29-52` |
| Scene | Scene normalization, preview, and export camera routing are coherent. No confirmed scene-camera correctness bug found, but scene rendering inherits the export/playback shared-progress issue. | `camera.ts:19-44`, `camera.ts:138-436`, `SceneEditor.tsx:265-368`, `page.tsx:397-414` |
| Manual journey scene/source | Manual journey creation traces directly into track session state. A likely source-geometry bug exists before there are two waypoints. | `JourneyCreator.tsx:80-101`, `JourneyCreator.tsx:192-236`, `JourneyCreator.tsx:604-611`, `page.tsx:278-286` |
| Export | Codec/memory guards exist and the encoder loop is abort-aware. The suspicious confirmed flow is that each encoded frame also mutates visible playback state and rebuilds trail GeoJSON through React. Real encoder success is not covered by current E2E because the tests intentionally enable a local stub. | `ExportPanel.tsx:100-174`, `useExportController.ts:105-244`, `videoEncoder.ts:61-184`, `e2e/travelback.spec.ts:1299-1368` |
| Static build/deploy | `next.config.ts` and scripts consistently target static export/basePath. CSP hardening works for the spot-checked current `out/index.html`, but the hardening script does not assert that the critical bootstrap rewrite actually matched future Next output. | `next.config.ts:1-16`, `layout.tsx:5-72`, `harden-static-export.mjs:60-130`, `serve-static.mjs:15-162`, `smoke-static.mjs:135-195` |

## Findings

### T-01 — Export frames drive the normal playback React path for every encoded frame

- Severity: **High**
- Confidence: **High**
- Status: **Confirmed**
- Code regions: `src/lib/useExportController.ts:173-186`, `src/lib/videoEncoder.ts:117-158`, `src/components/MapView.tsx:879-986`, `src/app/page.tsx:465-472`
- Trace: `exportTrack()` passes a `renderFrame` callback to `exportVideo()`. For every encoded frame, `renderFrame` imperatively applies the export camera and also calls `setPlaybackProgress(nextProgress)` (`useExportController.ts:173-180`). That progress state is the same state consumed by `MapView`, whose progress effect interpolates the marker, replaces the trail source data, and may update camera state (`MapView.tsx:879-986`). `page.tsx:465-472` suspends auto-camera while exporting, but marker/trail updates still run through React and MapLibre for every export frame.
- Failure scenario: A 180-second export at 60 FPS schedules 10,800 React progress updates and corresponding MapLibre source mutations while the encoder is trying to capture frames. On long tracks this can make export appear stuck, hit repeated idle timeouts, or abort with a map-render failure even though the encoder path itself is valid.
- Suggested fix: Split export frame rendering from visible playback state. Expose an imperative `MapView` export-frame method that updates camera/marker/trail without React state churn, or throttle visible playback progress updates during export while keeping encoder progress separate. Keep playback state restored once export finishes.

### T-02 — Playback/export rebuild and upload a growing trail GeoJSON on every frame

- Severity: **Medium**
- Confidence: **High**
- Status: **Confirmed**
- Code regions: `src/components/MapView.tsx:109-170`, `src/components/MapView.tsx:890-904`, `src/lib/parser.ts:4`, `src/lib/parser.ts:701-709`
- Trace: `buildTrackGeometry()` slices and maps all coordinates up to the current segment (`MapView.tsx:109-170`). The playback effect calls it and `trailSource.setData(...)` on every progress update (`MapView.tsx:890-904`). The parser allows tracks up to 250,000 points (`parser.ts:4`, `parser.ts:701-709`), so the per-frame work can grow linearly with track size and playback/export progress.
- Failure scenario: A large Google Location History import plays smoothly near the beginning but stalls later as each frame rebuilds and uploads a larger line. Export multiplies the same cost by every encoded frame and can trip the export idle-timeout path.
- Suggested fix: Precompute wrapped route coordinates once per track and update trail rendering incrementally, or render trail progress with a MapLibre expression/line-gradient/filter instead of replacing full GeoJSON each frame. If that is too invasive, downsample the trail source for interactive playback/export and update it at a lower cadence.

### T-03 — Manual journey creation publishes invalid/degenerate LineString data before two waypoints exist

- Severity: **Medium**
- Confidence: **High**
- Status: **Likely**
- Code regions: `src/components/JourneyCreator.tsx:80-101`, `src/components/JourneyCreator.tsx:192-236`, `src/components/MapView.tsx:150-152`
- Trace: `buildLineGeoJSON()` always returns a `LineString` with `coordinates` equal to the current waypoints (`JourneyCreator.tsx:80-101`). `addLayers()` initializes the `journey-line-source` with `buildLineGeoJSON([], ...)` (`JourneyCreator.tsx:203-211`), and `updateMapData()` sets the same source after every waypoint change, including the one-point state (`JourneyCreator.tsx:192-201`). The main track renderer explicitly guards the comparable one-point case by duplicating the coordinate (`MapView.tsx:150-152`), showing this edge was handled elsewhere but not in journey creation.
- Failure scenario: Opening manual journey mode or adding the first waypoint sends an empty or one-coordinate `LineString` to a line source. MapLibre may reject/log the geometry, skip the layer, or leave the route preview broken until enough valid data arrives.
- Suggested fix: Do not create/update the line source until there are at least two waypoints, or represent the pre-two-point state as an empty `FeatureCollection`. If a visible one-point line is required, duplicate the single coordinate consistently with `MapView`.

### T-04 — Static hardening can silently miss the bootstrap rewrite while still passing CSP replacement

- Severity: **Medium**
- Confidence: **Medium**
- Status: **Risk**
- Code regions: `scripts/harden-static-export.mjs:74-85`, `scripts/harden-static-export.mjs:116-130`, `src/app/layout.tsx:53-58`, `scripts/smoke-static.mjs:135-195`
- Trace: `inlineTravelbackBootstrap()` rewrites Next's queued inline script with `html.replace(...)` and returns the result (`harden-static-export.mjs:74-85`). If the regex stops matching a future Next output shape, the function returns unchanged HTML without reporting failure. The script then hashes whatever inline scripts remain and replaces/asserts CSP (`harden-static-export.mjs:116-130`). The smoke test checks CSP hash presence and absence of unsafe script policy (`smoke-static.mjs:135-195`), but it does not assert that `travelback-bootstrap` was actually converted from a queued `__next_s` payload into the intended direct bootstrap script from `layout.tsx:53-58`.
- Failure scenario: A Next upgrade changes static script serialization. `npm run build` still produces CSP-hardened HTML, but the early frame-buster/theme/map-style/language bootstrap is left in a non-executing or late-executing form. Static deploy can then regress first-paint theme/map style or frame-busting behavior without the hardening script failing.
- Suggested fix: Make `inlineTravelbackBootstrap()` return a replacement count or throw if the expected bootstrap id is not rewritten. Add a smoke assertion that `out/index.html` contains the direct `<script id="travelback-bootstrap">` form and no remaining queued payload for that id.

### T-05 — E2E export success exercises only the localhost stub, not the real encoder/capture path

- Severity: **Medium**
- Confidence: **High**
- Status: **Risk**
- Code regions: `src/lib/useExportController.ts:20-29`, `src/lib/useExportController.ts:161-172`, `src/lib/videoEncoder.ts:61-184`, `e2e/travelback.spec.ts:1299-1368`
- Trace: The export controller enables a local export stub on localhost when `localStorage.travelback-export-test-stub` is set (`useExportController.ts:20-29`). In that branch it returns a text blob and bypasses `exportVideo()` entirely (`useExportController.ts:161-172`). The E2E export test sets that stub flag before exporting (`e2e/travelback.spec.ts:1299-1308`) and validates the stubbed success path (`e2e/travelback.spec.ts:1320-1368`), leaving the real Mediabunny encoder loop, `MapView.waitForIdle()`, canvas capture, codec support, and download behavior in `videoEncoder.ts:61-184` unexercised by automated success coverage.
- Failure scenario: A regression in real frame capture, codec support probing, canvas tainting, idle waiting, or video finalization can ship while the export E2E remains green because it never leaves the stub path.
- Suggested fix: Keep the fast stub test, but add at least one small real-export smoke path with a very short duration/resolution/fps and a deterministic local map style. If runtime cost is too high for default CI, run it in a focused static-export smoke job or behind an explicit non-stub export test script.

### T-06 — Timeline end-handle mapping can under-select sparse or uneven tracks

- Severity: **Low**
- Confidence: **Medium**
- Status: **Likely**
- Code regions: `src/components/TimelineSelector.tsx:29-52`, `src/app/page.tsx:288-315`
- Trace: `ratioToIndex()` computes a distance target and binary-searches cumulative distances. For the end edge, when the target falls between `cumulDist[lo]` and `cumulDist[hi]`, the function returns `lo` unless `cumulDist[hi] <= targetDist` (`TimelineSelector.tsx:29-52`). `handleRangeChange()` then slices `fullTrack.points` through that returned end index (`page.tsx:288-315`) without interpolating an endpoint.
- Failure scenario: On sparse tracks with one very long segment, dragging the end handle to a position inside that segment trims to the prior point, so the resulting track can be visibly shorter than the selected range. Users may think trim dropped more of the trip than requested.
- Suggested fix: For the end handle, include the first point at or after the target distance, or synthesize an interpolated endpoint at the selected distance. Keep the existing minimum two-point guard.

### T-07 — A root-level temporary Playwright script is present in the working tree

- Severity: **Low**
- Confidence: **High**
- Status: **Confirmed**
- Code regions: `.tmp-travelback-mina-manual.mjs:1-128`, `package.json:6-15`, `eslint.config.mjs:1-36`
- Trace: The repository root contains `.tmp-travelback-mina-manual.mjs`, an untracked Playwright/manual script that writes `/tmp/travelback-not-a-track.txt` and assumes a dev server at `http://localhost:3099`. It is outside the named `scripts/`/`e2e/` workflow surfaced by `package.json:6-15`, and it is not documented as a supported review/development command.
- Failure scenario: Future agents or humans can mistake the temp script for supported tooling, run it against the wrong local server, or let it leak into commits. Even if ignored by the current TypeScript include patterns, it increases ambiguity around the static/e2e workflow.
- Suggested fix: Delete it if it is obsolete, or move it under an explicitly ignored scratch directory with a short README explaining that it is not part of supported verification.

## Final sweep

- Every file in the review-relevant inventory above was examined at least once, with large runtime files traced by their active data/control paths rather than sampled snippets only.
- Cross-file paths traced from entry points to effects: upload → parser/worker → app state; full track → trim → playback/elevation/scene/export; map init/style → source/layer updates; export UI → controller → encoder → map imperative handle; static build → hardening → smoke/server/deploy behavior.
- No relevant source, config, script, test fixture, or current context document identified by the inventory sweep was intentionally skipped.
- Generated/cache directories were excluded as listed in the inventory section; the only generated artifact spot-checked was `out/index.html` for the static-hardening hypothesis.

## Finding count summary

Total findings: **7** — **1 High**, **4 Medium**, **2 Low**. Status mix: **3 Confirmed**, **2 Likely**, **2 Risk**.
