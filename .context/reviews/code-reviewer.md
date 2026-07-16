# Code Reviewer — Deep Review (2026-07-16)

## Scope and method

Reviewed the complete current implementation surface: 840 tracked paths were inventoried; all application source, configuration, scripts, tests, workflow files, and user-facing documentation were examined. Historical review/plan artifacts were inventoried but were not treated as current product code. Cross-file flows were traced through import, playback, trimming, map rendering, scene editing, export, static hardening, and CI.

Classification: Confirmed means the failure follows directly from control flow or was reproduced; Likely means the defect is strongly supported but still needs a browser/device fixture; Manual risk needs targeted measurement.

## Findings

### CR-01 — Trail geometry freezes between track vertices

Severity: High | Confidence: High | Status: Confirmed

Files: src/components/MapView.tsx:568-578 and src/components/MapView.tsx:1069-1080

The marker is updated for every interpolated progress value, but trail GeoJSON is updated only when segmentIndex changes. segmentIndex identifies the pair of route vertices, so it remains constant for every animation/export frame between two vertices. On a two-point route the visible trail remains at the first point until the final vertex; on longer routes it advances in steps instead of ending at the moving marker.

Suggested fix: cache only completed immutable segment coordinates, but rebuild the active segment endpoint for every interpolated point. Reset the cache whenever a track/style/export session is replaced. Add a source-data regression test that samples two progress values inside the same vertex pair.

### CR-02 — The static release gate is broken after parser helpers moved

Severity: High | Confidence: High | Status: Confirmed

Files: scripts/smoke-static.mjs:223-259, src/lib/parser.ts:1-11, src/lib/parse-utils.ts:6-8, src/lib/googleJsonParser.ts:138-158, .github/workflows/deploy-pages.yml:28-32

A fresh npm run build succeeds, but npm run smoke:static fails with “Worker MAX_TRACK_POINTS must match MAX_TRACK_POINTS in src/lib/parser.ts”. The values actually match: parse-utils.ts defines 250,000 and the worker defines 250000. The smoke script still searches parser.ts for the old declaration. Once that assertion is repaired, its parserSource.includes('parseSemanticPoint') check will also fail because that function moved to googleJsonParser.ts. CI invokes this smoke test before static E2E, so every release is blocked.

Suggested fix: make the parity check read the actual source modules, or preferably bundle the worker from the shared parser implementation and test behavior instead of source text. Add the worker build/parity step to the normal build.

### CR-03 — Loaded desktop sessions lose language, unit, and theme controls

Severity: Medium | Confidence: High | Status: Confirmed

Files: src/components/GlobalToolbar.tsx:23-26, src/components/TrackToolbar.tsx:162-185 and 227-280, e2e/travelback.spec.ts:274-300 and 537-590

GlobalToolbar becomes hidden whenever hasTrack is true. TrackToolbar contains replacement settings only inside a sm:hidden mobile menu, so desktop users have no visible way to change language, units, or theme after loading a route. Static Playwright reproduced this on retry: the Japanese/Spanish locale cases and both desktop-toolbar layout cases time out on the hidden toolbar.

Suggested fix: render the settings group in the desktop TrackToolbar or keep and reposition GlobalToolbar for loaded sessions. Retain the existing desktop E2E expectations as a regression guard.

### CR-04 — Export can capture a stale map frame when the camera is unchanged

Severity: High | Confidence: High | Status: Confirmed

Files: src/components/MapView.tsx:544-603 and 612-648, src/lib/videoEncoder.ts:148-164

renderFrameAndWait mutates marker/trail sources and then resolves immediately if the requested camera rounds equal to the current camera. Source setData is asynchronous with respect to WebGL painting; the immediate branch does not await a render. Overview scenes, zero-rotation scenes, duplicate points, and any stationary camera can therefore encode the previous marker/trail frame.

Suggested fix: attach the render listener before source/camera mutations, track whether any source changed, request a repaint where needed, and resolve only after the resulting render plus one animation frame. Immediate resolution is safe only when neither camera nor source state changed.

### CR-05 — Completed one-point segments create invalid line geometry

Severity: Medium | Confidence: High | Status: Confirmed

Files: src/components/MapView.tsx:102-116 and 232-264, src/lib/googleJsonParser.ts:150-190

precomputeWrappedSegments preserves one-coordinate segments. buildTrailGeoJSONFromSegments pushes completed segments without the singleton duplication used by buildTrackGeometry. Google semantic visit records intentionally form one-point segments, so playback can send a LineString or MultiLineString member containing one position, which violates line-geometry requirements and can disappear or be rejected by MapLibre.

Suggested fix: normalize completed segments to at least two identical coordinates, or omit one-point line members and represent visits separately. Test a mixed path/visit/path Google fixture.

### CR-06 — Cancelling a scene-invalidating trim leaves the timeline and track divergent

Severity: Medium | Confidence: High | Status: Confirmed

Files: src/components/TimelineSelector.tsx:96-105 and 274-322, src/app/page.tsx:319-355

TimelineSelector commits its internal handle ratios before the parent decides whether the trim is accepted. With scenes present, page.tsx records a pending range and returns. Cancel only clears pendingTrimRange; it does not restore the selector ratios. The map and active track remain untrimmed while handles, labels, and point counts continue to show the rejected range.

Suggested fix: make accepted range controlled by the parent, or store the last accepted ratios and explicitly restore them on cancellation. Cover confirm and cancel as separate E2E paths.

### CR-07 — Clicking a trimmed timeline seeks to the wrong local position

Severity: Medium | Confidence: High | Status: Confirmed

Files: src/components/TrackWorkspace.tsx:138-146, src/components/TimelineSelector.tsx:323-329

TimelineSelector renders the full track and computes an absolute full-track click ratio, then passes that ratio directly to playback. Playback operates on the filtered active track. For a selected 25–50% range, clicking its visual midpoint sends about 0.375 instead of local progress 0.5.

Suggested fix: translate the click to (clickRatio - selectedStart) / (selectedEnd - selectedStart), or pass the accepted index range to the parent and convert there.

### CR-08 — Journey deletion, undo, and clear leave a ghost route line

Severity: Medium | Confidence: High | Status: Confirmed

Files: src/components/JourneyCreator.tsx:80-89, 197-207, 328-344, and 481-493

buildLineGeoJSON already returns empty geometry for fewer than two waypoints, but updateMapData calls lineSrc.setData only when at least two points remain. Reducing a route from two points to one or zero leaves the previous line in the map source.

Suggested fix: always update the line source with buildLineGeoJSON. Test delete, undo, and clear transitions from a two-point route.

### CR-09 — Scene delete undo can discard newer edits

Severity: Medium | Confidence: High | Status: Confirmed

Files: src/components/SceneEditor.tsx:281-285 and 368-378

Deleting a scene stores the entire pre-deletion scenes array. Undo later replaces current state wholesale. Any scene add, rename, parameter edit, or reorder performed during the five-second undo window is silently lost.

Suggested fix: store the deleted scene and its former index, then reinsert it into the latest state, or invalidate the undo token on any subsequent scene mutation.

### CR-10 — Keyboard scene-range edits bypass committed normalization

Severity: Medium | Confidence: High | Status: Confirmed

Files: src/components/SceneEditor.tsx:153-164, 221-264, and 643-650

Pointer range edits call onCommit on pointer-up, but all keyboard branches call only onChangeRef. The parent wires onChange to updateSceneRaw and onCommit to normalized updateScene. Keyboard users can therefore leave overlapping/raw scene ranges in the editor while preview/export silently normalize them, so displayed timing differs from rendered timing.

Suggested fix: commit keyboard changes through the same normalized path, ideally once per key action, and add keyboard overlap tests.

### CR-11 — A slow file parse can overwrite a newer journey session

Severity: Medium | Confidence: High | Status: Confirmed

Files: src/components/FileUpload.tsx:53-95 and 263-286, src/app/page.tsx:297-317 and 540-548

handleFile has no request generation or cancellation. The draw-route action remains enabled during parsing and unmounts FileUpload. When the old parse resolves, its retained onTrackLoaded callback still loads that stale track, replacing the newly started journey.

Suggested fix: invalidate parse requests on unmount/session change, pass an AbortSignal through file/worker parsing, or disable mutually exclusive session actions until parsing settles. Test with a deferred parser promise.

### CR-12 — Failed or cancelled encoding does not release the media pipeline

Severity: Medium | Confidence: High | Status: Confirmed

Files: src/lib/videoEncoder.ts:115-173

After Output.start, the finally block finalizes only completed exports and does nothing otherwise. Mediabunny Output.cancel is the API that releases encoders and prevents additional samples, so aborts and render/codec failures can retain WebCodecs/GPU resources until garbage collection.

Suggested fix: call and await output.cancel whenever output started but did not complete, while preserving the original error. Mock Output in tests and assert finalize on success and cancel on every failure/abort path.

### CR-13 — Both advertised 4K presets can never be exported

Severity: Medium | Confidence: High | Status: Confirmed

Files: src/types.ts:77-104, src/lib/videoEncoder.ts:50-65, src/components/ExportPanel.tsx:90-108 and 408-436, README.md:90-96

The raw-frame term for either 3840×2160 preset is about 379.7 MiB before encoded output, already above the fixed 256 MiB cap. ExportPanel therefore disables Start Export for every possible 4K configuration even though README and the preset selector advertise both modes.

Suggested fix: remove or explicitly mark unsupported presets, or implement a resource model/export path that can actually satisfy them. Add a feasibility assertion for every advertised preset.

## Summary

13 findings: 3 High and 10 Medium. Eleven are confirmed directly from control flow; the smoke and desktop-toolbar regressions were also reproduced. No fixes were applied in this review phase.
