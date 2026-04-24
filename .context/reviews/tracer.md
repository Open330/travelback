# Tracer Review — review-plan-fix cycle 1/100 prompt 1

Scope: causal tracing across upload → parser/worker → track state → timeline trim → map layers → playback → export → download; theme/locale/style bootstrap; static export serving. Review only; no source files modified.

## Relevant file inventory

- `src/app/page.tsx:32-123` — top-level client state, derived distances, playback/export wiring.
- `src/app/page.tsx:157-239` — track session reset/load/sample import and timeline range mutation.
- `src/app/page.tsx:288-321` — document theme/map-style persistence and cycling.
- `src/app/page.tsx:328-463` — composition of `MapView`, `FileUpload`, `TrackWorkspace`, `ExportPanel`.
- `src/components/FileUpload.tsx:52-109` — file acceptance, parse invocation, parser error mapping.
- `src/lib/parser.ts:41-162` — GPX/KML extraction and segment construction.
- `src/lib/parser.ts:346-430` — Google JSON parser, dedupe, chronological sort, segment-start remap.
- `src/lib/parser.ts:432-568` — size limits, worker dispatch, final validation.
- `public/workers/trackParser.worker.js:137-206` — worker-side Google parser mirror.
- `public/workers/trackParser.worker.js:247-279` — worker message validation, decode, parse, error return.
- `src/components/TrackWorkspace.tsx:88-154` — toolbar, scene editor, timeline, elevation, controls wiring.
- `src/components/TimelineSelector.tsx:25-48` — distance-ratio → index conversion.
- `src/components/TimelineSelector.tsx:125-148` — selected range resolution and initial parent notification.
- `src/components/TimelineSelector.tsx:182-260` — drag updates and parent `onRangeChange` notifications.
- `src/components/TimelineSelector.tsx:386-461` — keyboard slider updates.
- `src/lib/interpolate.ts:18-29` — cumulative distances with segment breaks.
- `src/lib/interpolate.ts:57-142` — playback/camera interpolation along a track.
- `src/lib/usePlaybackController.ts:17-135` — playback progress state machine.
- `src/lib/usePlaybackController.ts:138-210` — global hotkeys.
- `src/components/Controls.tsx:41-48` and `src/components/Controls.tsx:55-154` — seek/speed/duration/follow UI.
- `src/components/MapView.tsx:106-167` — route/trail GeoJSON construction.
- `src/components/MapView.tsx:326-369` — reference grid source/layers.
- `src/components/MapView.tsx:542-667` — map init, style load/reload.
- `src/components/MapView.tsx:669-816` — route/trail layer attach, bounds fit, marker creation.
- `src/components/MapView.tsx:824-932` — progress-driven marker/trail/camera updates.
- `src/lib/camera.ts:19-44` and `src/lib/camera.ts:341-435` — scene normalization and camera selection/blending.
- `src/components/ExportPanel.tsx:131-137` — export config submission.
- `src/lib/useExportController.ts:84-219` — export lifecycle, map resize/idle, render, download, cleanup.
- `src/lib/videoEncoder.ts:40-159` — frame loop, map-camera callback, canvas capture, MP4 output.
- `src/lib/videoEncoder.ts:171-202` — download helper.
- `src/app/layout.tsx:49-68` — first-paint theme/mapstyle/locale bootstrap, CSP placeholder, font stylesheet.
- `src/lib/i18n.ts:1713-1779` — locale detection/provider/storage.
- `src/components/GlobalToolbar.tsx:22-69`, `src/components/TrackToolbar.tsx:84-240`, `src/components/ThemeToggle.tsx:24-73` — runtime locale/theme/style controls.
- `next.config.ts:1-15` — static export and `/travelback` production base path.
- `scripts/harden-static-export.mjs:14-29` and `scripts/harden-static-export.mjs:57-103` — static CSP hash replacement.
- `scripts/serve-static.mjs:14-18`, `scripts/serve-static.mjs:69-119`, `scripts/serve-static.mjs:121-178` — local base-path static server.
- `scripts/smoke-static.mjs:76-146`, `scripts/smoke-static.mjs:167-180` — static CSP/map-style/server smoke checks.

## Flow traces and competing hypotheses

### Upload → parser/worker → track state

1. `FileUpload` accepts `.gpx/.kml/.json`, calls `parseTrackFile(file)`, and reports parser codes (`src/components/FileUpload.tsx:52-93`). Drag-and-drop rejects unsupported extensions before parsing (`src/components/FileUpload.tsx:95-109`); input selection relies on parser rejection (`src/components/FileUpload.tsx:124-128`, `src/lib/parser.ts:552-558`).
2. `parseTrackFile` enforces 200 MB for XML/KML and 100 MB for JSON (`src/lib/parser.ts:432-433`, `src/lib/parser.ts:516-525`), dispatches JSON to the worker path (`src/lib/parser.ts:538-543`), and validates 2..250,000 points before resolving (`src/lib/parser.ts:528-536`).
3. `HomeInner.handleTrackLoaded` calls `loadTrackIntoSession`, which resets workspace/export artifacts, clears map artifacts, sets both `fullTrack` and current `track`, resets playback, and increments `trackSessionKey` (`src/app/page.tsx:157-173`, `src/app/page.tsx:208-210`).
4. Competing hypothesis checked: worker path failure should still parse on main thread. This is true only for worker creation/crash paths (`src/lib/parser.ts:451-463`, `src/lib/parser.ts:500-510`), but see Finding 3 for the memory cost of keeping a fallback text copy.

### Track state → timeline trim → map/playback/export

1. `HomeInner` derives a single `cumulativeDistances` array from the current `track` (`src/app/page.tsx:97-101`). That same array is passed to `MapView`, `TrackWorkspace`, `ElevationProfile`, `Controls`, and `useExportController` (`src/app/page.tsx:113-123`, `src/app/page.tsx:331-343`, `src/app/page.tsx:410-446`).
2. `TrackWorkspace` renders `TimelineSelector` with `track={fullTrack}` but passes the same current-track `cumulativeDistances` (`src/components/TrackWorkspace.tsx:125-132`).
3. `TimelineSelector` treats `track.points` and `cumulativeDistances` as matching arrays for bucket generation and binary-search index resolution (`src/components/TimelineSelector.tsx:97-121`, `src/components/TimelineSelector.tsx:125-140`).
4. `onRangeChange` slices `fullTrack` into a new current `track` and resets playback (`src/app/page.tsx:185-206`). That makes the single derived `cumulativeDistances` switch to the trimmed track on the next render.
5. `MapView` consumes the current `track` and current distances for layer data, marker/trail interpolation, and camera follow (`src/components/MapView.tsx:771-816`, `src/components/MapView.tsx:824-932`). Export consumes the same current `track`/distance pair (`src/lib/useExportController.ts:133-149`).
6. Competing hypothesis checked: the timeline might own its own full-track distances. It does not; it receives only `cumulativeDistances` from `TrackWorkspace` (`src/components/TimelineSelector.tsx:10-14`, `src/components/TrackWorkspace.tsx:125-132`).

### Map layers → playback → export

1. `MapView` initializes MapLibre with the selected style URL and preserved drawing buffer for export (`src/components/MapView.tsx:542-558`).
2. Style load/reload paths add reference grid layers and current track layers (`src/components/MapView.tsx:605-610`, `src/components/MapView.tsx:645-667`).
3. Track changes attach/update `route` and `trail`, fit bounds, and ensure a marker (`src/components/MapView.tsx:669-816`).
4. Playback progress updates interpolate the current track, set marker lng/lat, replace trail GeoJSON through current progress, and optionally jump the camera (`src/components/MapView.tsx:824-932`).
5. Export pauses playback, resizes the map, waits for idle, renders each frame through `exportVideo`, applies per-frame camera state, mirrors export progress into playback progress, captures the canvas, then downloads the resulting blob (`src/lib/useExportController.ts:84-164`, `src/lib/videoEncoder.ts:40-159`).
6. Competing hypothesis checked: export recomputes distances independently and might avoid timeline bugs. It uses the current track/distance pair from `HomeInner` when present (`src/lib/useExportController.ts:133-149`), so export is internally consistent for the current trimmed track; the mismatch is specific to the timeline selector receiving full track + trimmed distances.

### Theme/locale/style bootstrap

1. First paint uses an inline bootstrap script to set `data-mode`, `data-mapstyle`, and `lang` from localStorage or system preferences (`src/app/layout.tsx:49-54`). CSS variables are keyed off these attributes (`src/styles/vitro-base.css:262-379`).
2. `HomeInner` initializes `colorMode` and `mapStyleKey` from the same document attributes/localStorage and writes runtime updates back to document/localStorage (`src/app/page.tsx:36-59`, `src/app/page.tsx:288-321`).
3. `LocaleProvider` initializes locale from localStorage or `navigator.language`, then keeps `<html lang>` in sync (`src/lib/i18n.ts:1713-1779`).
4. Competing hypothesis checked: saved explicit map styles should be overwritten by theme changes. Runtime uses `hasExplicitMapStyleChoice` to prevent theme toggles from overwriting a user-cycled style (`src/app/page.tsx:48`, `src/app/page.tsx:296-321`); no finding there.

### Static export serving

1. Production build uses `output: 'export'` and `/travelback` base path via `NEXT_PUBLIC_BASE_PATH` (`next.config.ts:1-15`).
2. `harden-static-export` replaces the placeholder CSP meta with script hashes for inline scripts (`scripts/harden-static-export.mjs:14-29`, `scripts/harden-static-export.mjs:57-103`).
3. `serve-static` strips `/travelback`, blocks path traversal, serves `out/`, and applies security/cache headers (`scripts/serve-static.mjs:14-18`, `scripts/serve-static.mjs:69-119`, `scripts/serve-static.mjs:121-178`).
4. `smoke-static` validates base-path routing, CSP hardening, local map styles, cache controls, and absence of hidden tool-state directories in static assets (`scripts/smoke-static.mjs:76-180`).
5. Competing hypothesis checked: bundled map styles might require remote tiles/glyphs/sprites and fail under `connect-src 'self'`. `smoke-static` asserts style files have no external sources, glyphs, sprites, or symbol layers (`scripts/smoke-static.mjs:122-146`), and `public/map-styles/*.json` describe themselves as local/no remote styles.

## Findings

### 1. Timeline trim uses full-track points with trimmed-track distances after the first trim

- Severity: High
- Confidence: High
- Exact regions:
  - `src/app/page.tsx:97-101` computes `cumulativeDistances` from current `track`.
  - `src/components/TrackWorkspace.tsx:125-132` passes `track={fullTrack}` and `cumulativeDistances={cumulativeDistances}` into `TimelineSelector`.
  - `src/components/TimelineSelector.tsx:25-48` and `src/components/TimelineSelector.tsx:125-140` assume the distance array matches `track.points`.
  - `src/app/page.tsx:185-206` replaces current `track` with a slice of `fullTrack` whenever the timeline emits a range.
- Failure scenario: Load a long trip, drag the timeline to trim it, then drag the timeline again. After the first trim, `TimelineSelector` still renders `fullTrack.points`, but its `cumulativeDistances` prop now describes the shorter sliced `track`. Histogram buckets for points beyond the slice fall back to `0`, and `ratioToIndex` binary-searches a shorter distance array while using `lastIndex = fullTrack.points.length - 1`. Subsequent trims select wrong indices, cannot reliably address the full original range, and can make the timeline count/date UI disagree with the map, playback, and export route.
- Concrete fix: Maintain two distance arrays in `HomeInner`: one for `track` consumers (`MapView`, `ElevationProfile`, `Controls`, export) and one for `fullTrack` timeline selection. Pass `fullTrackCumulativeDistances` to `TimelineSelector` while preserving current-track distances elsewhere. Add an e2e regression that trims once, then moves a handle again and asserts the resulting point count/map route changes match the second full-track range.

### 2. Keyboard timeline trimming changes local slider state but never updates the actual track

- Severity: Medium
- Confidence: High
- Exact regions:
  - `src/components/TimelineSelector.tsx:142-148` only notifies the parent on initial mount/point-count changes.
  - `src/components/TimelineSelector.tsx:221-225` and `src/components/TimelineSelector.tsx:255-258` notify during mouse/touch drag.
  - `src/components/TimelineSelector.tsx:386-405` and `src/components/TimelineSelector.tsx:442-461` keyboard handlers only call `setStartRatio`/`setEndRatio`.
  - `src/components/TimelineSelector.tsx:501-505` reset explicitly calls `onRangeChange`, showing the missing keyboard path is not intentional globally.
- Failure scenario: A keyboard or switch-control user focuses a timeline handle and presses Arrow/Home/End. The selected region, date labels, and point count inside `TimelineSelector` move because local ratios changed, but `HomeInner.handleRangeChange` is never called. The map route, elevation profile, playback, and export continue using the old `track`, so the visible trim UI lies about what will play/export.
- Concrete fix: Introduce a helper such as `commitRatios(nextStart, nextEnd)` that updates ratio state and immediately calls `onRangeChangeRef.current(...resolveIndexesForRatios(nextStart, nextEnd))`; use it for keyboard handlers and reset. Alternatively add a ratio-change effect that notifies for keyboard changes, while avoiding duplicate drag notifications. Add an accessibility e2e that tabs to a handle, presses ArrowLeft/Right, and asserts the workspace point count/map route changes.

### 3. The JSON worker path eagerly duplicates large files on the main thread before using the worker

- Severity: Medium
- Confidence: High
- Exact regions:
  - `src/lib/parser.ts:432-433` allows JSON files up to 100 MB.
  - `src/lib/parser.ts:439-454` decodes the entire `ArrayBuffer` into `textCopy` on the main thread before constructing/posting to the worker.
  - `public/workers/trackParser.worker.js:247-268` decodes the transferred buffer again inside the worker.
  - `src/components/FileUpload.tsx:52-60` performs this from the upload UI loading state.
- Failure scenario: Import an 80-100 MB Google Records/Location History JSON on a memory-constrained laptop or phone. The browser holds the file/buffer, a main-thread UTF-16 text copy, the worker's decoded text, and then parsed object graphs. The UI can freeze during `TextDecoder.decode`, and the tab can OOM even though the file is under the advertised JSON limit. The worker no longer isolates the expensive decode/parse path.
- Concrete fix: Do not create `textCopy` on the success path. Try `new Worker(...)` first and transfer the buffer directly. If worker construction fails before transfer, decode once on the main thread. If worker execution crashes after transfer, either reacquire the bytes from the original `File` (pass the `File`/a `Blob` into the helper instead of only an `ArrayBuffer`) or surface a retryable worker failure instead of keeping a full text clone for every successful import. Consider lowering the JSON limit or streaming/chunking Google records for mobile.

### 4. Save-picker download is invoked after async rendering, outside the original user activation

- Severity: Medium
- Confidence: Medium-High
- Exact regions:
  - `src/components/ExportPanel.tsx:131-137` starts export from the user's click.
  - `src/lib/useExportController.ts:137-156` awaits full video rendering before calling `downloadVideo`.
  - `src/lib/videoEncoder.ts:171-183` calls `window.showSaveFilePicker` only after rendering completes.
  - `src/lib/videoEncoder.ts:190-201` fallback auto-clicks an `<a>` and returns `saved: true` without confirmation.
- Failure scenario: On Chromium browsers with File System Access API, `showSaveFilePicker` generally requires transient user activation. Because Travelback calls it after seconds/minutes of async encoding, the picker path can reject with a security/user-activation error and silently fall through to auto-download. In browsers/webviews that block delayed programmatic downloads, the UI can still report success even though no file was saved, because the fallback returns `saved: true` immediately after `a.click()`.
- Concrete fix: Request the file handle/writable stream synchronously from the Start Export click before encoding, then write the blob after rendering. If no handle is available, complete rendering to an object URL and show an explicit user-clicked “Download video” button/link instead of relying only on delayed automatic download. Track and display whether the fallback was merely initiated versus confirmed.

### 5. Cancelling the save picker leaks the just-rendered object URL/blob until page unload

- Severity: Low
- Confidence: High
- Exact regions:
  - `src/lib/useExportController.ts:151-156` creates `blob` and `videoUrl` before download completion is known.
  - `src/lib/useExportController.ts:157-159` throws `AbortError` if `downloadVideo` reports `saved: false`.
  - `src/lib/useExportController.ts:165-174` resets state on abort/error but never revokes the local `videoUrl` that was not committed to state.
- Failure scenario: A user renders a large video, cancels the save picker, then repeats. Each cancelled render leaves a large `blob:` URL reachable until page unload because `exportedVideoUrlRef` was not set and `revokeExportedVideoUrl()` cannot see the local URL.
- Concrete fix: Keep `let videoUrl: string | null = null` around the download block and revoke it in the catch path unless it was successfully stored in state. This also pairs well with Finding 4's explicit post-render download UI.

## Verification performed

- Read-only inventory/tracing across the listed files.
- Ran targeted e2e check for manual-route cleanup: `npm run test:e2e:dev -- --grep "starting a new route clears prior trip map artifacts"` — passed (1 test, 14.4s).
- Wrote this review only: `.context/reviews/tracer.md`.
