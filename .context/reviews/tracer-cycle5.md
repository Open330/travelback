# Tracer - Cycle 5 Review Lane

Date: 2026-04-25
Repo: `/Users/hletrd/flash-shared/Travelback`
Mode: review only; no fixes implemented; no commit made.

## Provenance

Existing `.context/reviews/tracer-cycle5.md` was present. It recorded three prior traces:

- File upload -> parse -> track loading was previously judged correct.
- Scene editor -> camera -> map rendering was previously judged functionally correct, with a C5-F1 accessibility/i18n note.
- Export -> video encoding -> download was previously judged robust.

Current inspection updates that provenance: the prior SceneEditor aria-valuetext concern appears resolved in the current tree because range and camera sliders now use localized `t(...)` values in `src/components/SceneEditor.tsx:175-177`, `src/components/SceneEditor.tsx:585-586`, `src/components/SceneEditor.tsx:601-602`, `src/components/SceneEditor.tsx:620-621`, and `src/components/SceneEditor.tsx:636-637`. The export verdict is revised below after tracing the rendered marker through the encoder boundary.

## Relevant File Inventory Examined

Import/parser:
- `src/components/FileUpload.tsx`
- `src/lib/parser.ts`
- `public/workers/trackParser.worker.js`
- `src/lib/env.ts`
- `src/types.ts`
- Import fixtures in `e2e/fixtures/*.gpx`, `*.kml`, and `*.json`

State/controllers/playback/map:
- `src/app/page.tsx`
- `src/lib/usePlaybackController.ts`
- `src/lib/interpolate.ts`
- `src/lib/camera.ts`
- `src/components/TrackWorkspace.tsx`
- `src/components/TimelineSelector.tsx`
- `src/components/Controls.tsx`
- `src/components/ElevationProfile.tsx`
- `src/components/TrackToolbar.tsx`
- `src/components/SceneEditor.tsx`
- `src/components/JourneyCreator.tsx`
- `src/components/MapView.tsx`

Export/video/static/tests:
- `src/components/ExportPanel.tsx`
- `src/lib/useExportController.ts`
- `src/lib/videoEncoder.ts`
- `scripts/harden-static-export.mjs`
- `scripts/smoke-static.mjs`
- `scripts/serve-static.mjs`
- `scripts/run-static-e2e.mjs`
- `scripts/run-dev-e2e.mjs`
- `scripts/fetch-map-styles.mjs`
- `package.json`
- `next.config.ts`
- `playwright.config.ts`
- `playwright.static.config.ts`
- `e2e/travelback.spec.ts`

## Trace Summary

File import path:
`FileUpload.handleFile` reads a selected file and calls `parseTrackFile` (`src/components/FileUpload.tsx:52-60`). GPX/KML stay on the main thread (`src/lib/parser.ts:653-673`); JSON goes through `file.arrayBuffer()` and `parseGoogleLocationHistoryInWorkerBuffer` (`src/lib/parser.ts:645-649`). The worker URL is base-path aware (`src/lib/parser.ts:549-550`), transfers the buffer (`src/lib/parser.ts:619`), decodes/checks/parses in `public/workers/trackParser.worker.js:289-321`, and restores `Date` objects after structured clone (`src/lib/parser.ts:595-600`). `Home.loadTrackIntoSession` resets dependent state and clears old map artifacts before installing the new track (`src/app/page.tsx:209-219`).

State -> map playback path:
`usePlaybackController` owns progress/speed/duration and rAF playback (`src/lib/usePlaybackController.ts:17-153`). `Home` passes progress, scenes, and cumulative distances to `MapView` (`src/app/page.tsx:385-398`). `MapView` computes/interpolates progress, updates route/trail GeoJSON, moves the marker, and applies camera state (`src/components/MapView.tsx:838-946`). Scene edits normalize into app state (`src/components/SceneEditor.tsx:254-278`) and map/export camera calculation uses the same camera helpers (`src/lib/camera.ts:339-428`).

Export path:
`ExportPanel` calls `onExport` with resolution/codec/fps/duration/bitrate (`src/components/ExportPanel.tsx:142-146`, `src/components/ExportPanel.tsx:397-399`). `useExportController.exportTrack` obtains the map canvas (`src/lib/useExportController.ts:94-100`), resizes the map, waits for idle, then calls `exportVideo` with a render callback that applies camera state and updates playback progress (`src/lib/useExportController.ts:125-163`). `exportVideo` wraps the canvas in Mediabunny `CanvasSource` and captures frames with `videoSource.add` (`src/lib/videoEncoder.ts:80-85`, `src/lib/videoEncoder.ts:128-130`), then `downloadVideo` handles picker/fallback download (`src/lib/videoEncoder.ts:171-212`).

Competing hypotheses checked:
- Hypothesis A: imported data corruption causes playback/export divergence. Evidence did not support this: parser validates size, point count, lat/lng bounds, JSON depth, segment gaps, and Date restoration across worker clone (`src/lib/parser.ts:521-640`, `public/workers/trackParser.worker.js:250-321`).
- Hypothesis B: scene/controller state divergence corrupts camera playback. Evidence did not support this for core playback: scene normalization and camera computation are shared by playback and export (`src/components/SceneEditor.tsx:254-278`, `src/lib/camera.ts:339-428`, `src/lib/videoEncoder.ts:101-104`).
- Hypothesis C: export captures a different visual surface than playback. Evidence supports this: route/trail are canvas layers, but the moving marker is a DOM marker outside the captured canvas.

## Findings

### C5-TR-1 - Exported videos omit the visible moving position marker

Severity: MEDIUM
Confidence: High

Exact file/line/region:
- `src/components/MapView.tsx:746-767` creates the moving marker with `document.createElement(...)` and `new maplibregl.Marker({ element: markerEl.current })`.
- `src/components/MapView.tsx:849-853` computes playback progress and updates that DOM marker with `markerRef.current?.setLngLat(...)`.
- `src/lib/useExportController.ts:94-100` obtains only `mapHandle.getCanvas()` for export.
- `src/lib/useExportController.ts:150-163` passes that canvas into `exportVideo`.
- `src/lib/videoEncoder.ts:80-85` constructs `new CanvasSource(canvas, ...)`.
- `src/lib/videoEncoder.ts:128-130` captures frames from that canvas only.
- `e2e/travelback.spec.ts:815-840` verifies the interactive map has a marker, but export tests at `e2e/travelback.spec.ts:1139-1203` and `e2e/travelback.spec.ts:1292-1347` only open the panel / assert the button and do not validate encoded output.

Causal chain:
1. Track import or sample load calls `loadTrackIntoSession`, which installs the `track` state (`src/app/page.tsx:209-219`).
2. `MapView` creates route/trail as MapLibre GeoJSON layers, which render into the WebGL canvas (`src/components/MapView.tsx:683-744`).
3. `MapView` creates the moving position indicator as a DOM `maplibregl.Marker`, not as a MapLibre layer (`src/components/MapView.tsx:746-767`).
4. During playback/export progress changes, route/trail and marker all update visually in the browser (`src/components/MapView.tsx:849-861`).
5. Export captures only `map.getCanvas()` through Mediabunny `CanvasSource` (`src/lib/useExportController.ts:94-100`, `src/lib/videoEncoder.ts:80-85`, `src/lib/videoEncoder.ts:128-130`).
6. DOM overlays are outside the WebGL canvas, so the marker visible during playback is absent from the MP4 frames.

Failure scenario:
A user loads a GPX/JSON track, sees the red moving marker during playback, exports an MP4, and the resulting video contains the route/trail/camera motion but not the moving current-position marker. This is especially visible on long static or slow camera shots where the trail alone does not communicate current position.

Concrete fix:
Render the moving marker into the same export surface as the route. Prefer replacing the DOM marker with a MapLibre GeoJSON point source/layer (for example a circle layer plus pulse-compatible styling) that updates alongside the trail source, so it is naturally captured by `CanvasSource`. If the DOM marker must stay for interactive UI, add a separate export-rendered point layer and hide/sync it during normal playback; do not rely on DOM overlays for exported visuals.

### C5-TR-2 - Tests stop before the encoder/download path, so export regressions are not caught

Severity: MEDIUM
Confidence: High

Exact file/line/region:
- `e2e/travelback.spec.ts:1139-1153` checks export dialog semantics only.
- `e2e/travelback.spec.ts:1155-1178` checks options and `Start Export` visibility only.
- `e2e/travelback.spec.ts:1180-1203` checks default/changed resolution and close behavior only.
- `e2e/travelback.spec.ts:1292-1324` and `e2e/travelback.spec.ts:1329-1346` call these "full journey" tests but still stop at `Start Export` visibility.
- `src/lib/useExportController.ts:150-178` and `src/lib/videoEncoder.ts:40-159` contain the unexercised encode path.

Causal chain:
1. The tested user journey reaches the export panel and sees `Start Export`.
2. No e2e test clicks `Start Export` or stubs/asserts `exportVideo`.
3. The controller/encoder path that resizes the map, waits for idle, captures frames, creates the blob URL, and downloads is not exercised.
4. Visual export mismatches such as C5-TR-1, abort/finalize regressions, CSP/dynamic import failures, and download fallback regressions can pass CI as long as the panel renders.

Failure scenario:
A change breaks Mediabunny import, `CanvasSource.add`, map resize cleanup, download fallback, or exported frame composition. The current e2e suite can still pass because it only checks that export controls are visible.

Concrete fix:
Add one minimal export-path test. Keep it bounded by using the smallest practical fixture and export settings, then click `Start Export` and assert the UI reaches the done/preview state with an MP4 blob URL. For deterministic coverage without making Playwright slow, introduce a test-only encoder seam in `useExportController`/`videoEncoder` that preserves the same controller flow but returns a tiny valid MP4/blob in debug mode; then add a separate visual/export smoke that verifies the export-rendered marker/layers when running a real encoder locally or in a nightly job.

## Non-Finding Notes

- Worker fallback asymmetry still appears intentional: worker creation/crash falls back only for bounded small JSON buffers, while worker parse errors reject with worker error codes (`src/lib/parser.ts:541-620`).
- Static base-path handling is covered consistently in production config and scripts: `next.config.ts:3-10`, `src/lib/env.ts:1`, worker construction in `src/lib/parser.ts:549-550`, and static server base-path routing in `scripts/serve-static.mjs:69-84`.
- Static smoke checks CSP hardening, local-only map styles, cache headers, hidden tool residue, and `/travelback/sample-trip.gpx` reachability (`scripts/smoke-static.mjs:100-203`).
- The previous C5-F1 SceneEditor aria-valuetext note is not reproducible in the current inspected code; the relevant slider value text is localized as cited in the Provenance section.

## Verification Performed

Review-only verification:
- Read prior `.context/reviews/tracer-cycle5.md`.
- Inventoried and examined the import/parser/state/playback/map/export/static/test files listed above.
- Traced marker, route/trail, camera, export canvas, and test assertions by exact file/line evidence.

Not run:
- No lint/typecheck/e2e execution. This lane was requested as review/report only, with no implementation.
