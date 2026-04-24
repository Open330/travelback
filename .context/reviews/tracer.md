# Tracer Review - review-plan-fix cycle 1/100

Scope: causal tracing of upload/parse -> track state -> playback -> map camera -> scene editing -> export -> static hardening/test flows. Review only; no source fixes.

Context read: `.context/README.md`, `.context/development/01-conventions.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/plans/README.md`, `.context/plans/user-injected/pending-next-cycle.md`, current and historical tracer review notes.

## Findings

### T1. A single custom scene freezes the camera for the rest of playback/export after that scene ends

- Severity: High
- Confidence: High
- Status: Confirmed by code trace
- Exact regions:
  - `src/components/SceneEditor.tsx:298-312` creates a newly-added scene as only a 15% slice (`start = last.endPercent || 0`, `end = start + 0.15`).
  - `src/lib/camera.ts:350-390` resolves `sceneIdx === -1`; when progress is after the final scene, it assigns `sceneIdx = prevIdx`.
  - `src/lib/camera.ts:398-404` clamps the last scene's local progress to `1`, so the camera state stays at that scene endpoint for all later progress.
  - `src/components/MapView.tsx:849-857` switches to scene-based camera whenever any scenes exist.
  - `src/lib/useExportController.ts:106-116` exports with user scenes whenever the scene list is non-empty.
- Causal chain: User clicks Camera -> Add -> one scene covers `0..0.15` -> playback/export sees `scenes.length > 0` -> for `globalProgress > 0.15`, `computeCameraForProgress` selects the previous scene and computes it at local progress `1` -> marker/trail continue moving but camera center/bearing stay pinned at the 15% endpoint.
- Concrete failure scenario: A user adds one Flyover scene to customize the opening and immediately exports. The first 15% renders normally; the remaining 85% of the video keeps looking at the same point while the route trail advances off-screen or out of frame.
- Suggested fix: Enforce full scene coverage before scene-based playback/export, or synthesize fallback camera segments for uncovered tails. Conservative options: make the first added scene cover `0..1`, add explicit coverage-fill scenes on export/playback, or make the after-last branch fall back to the normal follow camera instead of freezing at the last scene endpoint. Add an e2e regression that adds one scene, seeks to 50%, and verifies the debug camera center continues near the interpolated track point.

### T2. Invalid scene range edits can silently delete the scene being edited

- Severity: Medium-High
- Confidence: High
- Status: Confirmed by code trace
- Exact regions:
  - `src/components/SceneEditor.tsx:250-273` records warnings for invalid raw ranges, then immediately calls `normalizeScenes(nextScenes)` and persists the normalized result.
  - `src/lib/camera.ts:19-44` normalizes scenes and filters out scenes whose normalized `endPercent` is not greater than `startPercent`.
  - `src/components/SceneEditor.tsx:524-543` number inputs commit each start/end edit independently on every `onChange`.
- Causal chain: User edits a scene's start/end number field -> `updateScene` builds a raw scene where `startPercent >= endPercent` during the intermediate edit -> `commitScenes` detects a warning but still normalizes -> `normalizeScenes` collapses the scene to zero span and filters it out -> parent `scenes` state loses the scene.
- Concrete failure scenario: Starting from the default added scene (`0%..15%`), a user types `80` in the start field before updating the end field. The scene is removed immediately, with no delete action and no undo banner, because the delete flow in `removeScene()` was not used.
- Suggested fix: Do not persist normalized output when raw validation fails. Keep raw scene state visible with validation, clamp paired start/end edits to preserve `MIN_SCENE_SPAN`, or apply a two-field commit model where invalid intermediate input is allowed locally but not written into the exported scene list. Add a regression that types a start value above the current end and asserts the scene remains editable.

### T3. Global playback hotkeys leak into custom keyboard controls outside dialogs

- Severity: Medium
- Confidence: High
- Status: Confirmed by code trace
- Exact regions:
  - `src/lib/usePlaybackController.ts:156-185` handles global ArrowLeft/ArrowRight unless the target is an input/select/textarea or matches a small interactive selector.
  - `src/lib/usePlaybackController.ts:159-164` does not suppress targets with `role="slider"` or the scene editor region.
  - `src/components/SceneEditor.tsx:186-224` scene range sliders call `preventDefault()` for arrow keys but do not call `stopPropagation()`.
  - `src/components/ElevationProfile.tsx:74-83` also handles arrow keys locally without stopping propagation.
- Causal chain: User focuses a custom non-input control -> component handles ArrowLeft/ArrowRight -> event bubbles to `window` -> global playback hotkey handler also runs -> playback progress changes while the user is editing a scene range, or elevation keyboard seeking applies an extra global seek step.
- Concrete failure scenario: While the Camera panel is open, a keyboard user focuses a scene range handle and presses ArrowRight to adjust the scene boundary. The scene boundary changes, and the route playback also seeks forward by `0.02`, moving marker/camera state under the editor. On the elevation profile, the same key can apply both the profile seek and the global seek, producing a larger-than-advertised jump.
- Suggested fix: Add `event.stopPropagation()` to custom key handlers that intentionally consume playback keys, and/or broaden the global hotkey suppression selector to include `[role="slider"]`, `[role="spinbutton"]`, and the scene editor panel via `data-disable-playback-hotkeys`. Add e2e coverage similar to the timeline keyboard test, focused on SceneRangeEditor and ElevationProfile.

### T4. KML MultiGeometry / GeometryCollection routes are ignored by the parser

- Severity: Medium
- Confidence: Medium-High
- Status: Likely, based on code path and the installed KML converter behavior
- Exact regions:
  - `src/lib/parser.ts:43-107` extracts only `LineString`, `MultiLineString`, and `Point` geometries from converted GeoJSON.
  - `src/lib/parser.ts:164-168` sends all KML through `@tmcw/togeojson` and then through that limited extractor.
  - `src/lib/parser.ts:576-627` finalizes the parsed track and rejects tracks with fewer than two points.
- Causal chain: A KML Placemark can contain multiple geometries in a KML `MultiGeometry`; the converter represents that as a GeoJSON `GeometryCollection`. The project extractor has no `GeometryCollection` branch, so it skips every nested LineString/Point. The final parser then either imports an incomplete route or rejects the file as too few points.
- Concrete failure scenario: A Google Earth/My Maps export stores one Placemark with a `MultiGeometry` containing the actual route LineString plus markers. Uploading that KML yields "too few points" or loses the route, even though the nested LineString is valid.
- Suggested fix: Make `extractPointsFromGeoJSON` recursive over `GeometryCollection`, and consider handling `MultiPoint` consistently with point placemarks. Preserve `coordinateProperties.times` where available. Add a fixture with KML `MultiGeometry` containing a LineString and assert the route imports.

### T5. Fallback export download is treated as saved even when the browser only received a delayed synthetic click

- Severity: Medium-Low
- Confidence: Medium
- Status: Likely browser-dependent
- Exact regions:
  - `src/lib/useExportController.ts:158-170` creates the blob URL, calls `downloadVideo`, then marks export done and stores `downloadMethod` from the result.
  - `src/lib/videoEncoder.ts:171-189` only uses `showSaveFilePicker` when transient user activation is still active; after a long encode this is normally false, so the picker path is skipped.
  - `src/lib/videoEncoder.ts:191-211` falls back to creating an `<a download>` element, calling `a.click()`, and returning `{ saved: true, method: 'fallback' }` without confirmation.
  - `src/components/ExportPanel.tsx:207-214` reports the fallback as "download started"; there is no explicit post-render download button in the done state.
- Causal chain: User clicks Start Export -> encoding runs asynchronously for seconds/minutes -> transient activation is gone -> fallback synthetic anchor click is attempted -> `downloadVideo` reports saved immediately -> UI marks success. Browsers/webviews that block delayed programmatic downloads can leave the user with no file even though the app says the download started.
- Concrete failure scenario: On a restrictive mobile WebView or Safari-like environment, a long 4K export completes, the delayed `a.click()` is ignored, and the user sees the success state without a reliable way to trigger the download from a fresh user gesture.
- Suggested fix: Keep the rendered blob URL but expose a real "Download video" button in the done state for fallback/ready cases. Prefer requesting a file handle synchronously from the Start Export click when File System Access is available, then write after encoding. Track "download initiated" separately from "saved".

## Flow Notes

- Upload/parse -> track state: JSON worker fallback now avoids the older eager full-text main-thread clone for large JSON files (`src/lib/parser.ts:493-573`). Current parsing concern is KML geometry coverage, not JSON worker memory.
- Track state -> timeline -> playback/export: the earlier full-track/current-track distance mismatch is remediated by separate `cumulativeDistances` and `fullTrackCumulativeDistances` in `src/app/page.tsx:122-131` and `src/components/TrackWorkspace.tsx:135-142`. Timeline keyboard trimming now commits via `commitRatios` in `src/components/TimelineSelector.tsx:234-242`.
- Map camera -> scene editing -> export: scene coverage and invalid normalization are the active suspicious flows. They affect both live playback (`MapView`) and export (`useExportController`/`videoEncoder`).
- Static hardening/test flows: CSP hardening, local map-style assertions, hidden tool residue checks, and base-path static serving are covered by `scripts/harden-static-export.mjs:14-103`, `scripts/smoke-static.mjs:76-180`, and `scripts/serve-static.mjs:69-178`. No confirmed static hardening defect found in this pass.

## Final Sweep Note

Read-only sweep covered `src/app`, `src/components`, `src/lib`, `public/workers`, `scripts`, `e2e`, config files, and relevant `.context` docs. Existing dirty review files from other lanes were not touched. This file is the only intended modification. No tests were run for this tracer lane; findings are from source-level causal tracing.
