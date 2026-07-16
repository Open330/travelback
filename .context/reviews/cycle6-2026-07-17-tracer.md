# Cycle 6 Tracer — 2026-07-17

Reviewed revision `1d2755c`. Three current user-visible flows terminate in the wrong state.

## Findings

### TRACE6-01 — Follow-off Retry Map trace ends at the constructor camera

- Severity: Medium
- Confidence: High
- Classification: Confirmed deterministic trace
- File/region: `src/components/MapView.tsx:435,843-885,896-914,1023,1055-1083,1195-1203`
- Trace: first track hydration sets `fitTrackOnReadyRef=track` → hydration consumes it → user disables follow → style error sets `mapError` → Retry increments `mapRetryNonce` → effect creates a map at `[0,20]`/zoom 2 → track effect sees `preparedTrackRef.current === track` and does not re-arm fit → hydration skips automatic camera because follow is false and skips fit because the ref is null.
- Failure scenario: a traveler recovers successfully but sees a world map with the route offscreen and assumes the trip disappeared.
- Fix: carry an outgoing manual camera snapshot across the retry generation, with a route-fit fallback, and trace it in an E2E assertion.

### TRACE6-02 — Reset click is routed into ElevationProfile

- Severity: Medium
- Confidence: High
- Classification: Confirmed current-browser trace
- File/region: `src/components/TrackWorkspace.tsx:142-159`; `src/components/TimelineSelector.tsx:683-700`; `src/components/ElevationProfile.tsx:64-72,91-105`
- Trace: independent absolute bottom wrappers overlap → Reset is painted within the later elevation SVG's hit region → pointer targeting resolves to an SVG path/line → the event bubbles to `ElevationProfile.handleClick` → `onSeek(clickFraction)` runs → `TimelineSelector.commitRatios(0,1)` never runs.
- Failure scenario: clicking the reset icon changes the orange playback location while the trimmed count and Reset icon remain.
- Fix: establish a single bottom-stack ownership model, enlarge Reset, and pin hit ownership plus resulting state in E2E.

### TRACE6-03 — Localized scene edit flows through hardcoded boundary text

- Severity: Low
- Confidence: High
- Classification: Confirmed static/reachable trace
- File/region: `src/components/SceneEditor.tsx:346-385,501-554,626-631`
- Trace: range edit → `commitScenes` → `normalizeScenes` changes a boundary → string template inserts literal `start:`/`end:` → same string renders visibly and in the polite live region. Locale selection never participates in those tokens.
- Failure scenario: a Korean screen reader announces a mixed-language correction exactly when the user needs to understand why their scene moved.
- Fix: build the entire adjustment sentence from locale templates and test visible plus live-region output.

## Rejected trace and carryovers

A late superseded style request was traced through MapLibre 5.24 and rejected as actionable: `_diffStyle` aborts the old controller and suppresses abort errors; bundled styles have no later asset requests. B01-B04 and D01-D04 were also excluded as established carryovers.

## Sweep and skipped accounting

The final trace sweep covered import/worker, map generation/style, trim/seek, scene normalization/live status, playback/export cleanup, and static build/server flows. All executable files were reviewed directly or systematically scanned. Generated/static assets and historical context were handled through parity/build/provenance checks as documented in the security report.
