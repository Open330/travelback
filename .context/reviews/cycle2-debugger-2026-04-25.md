# Cycle 2 Debugger Review — 2026-04-25

**Reviewer:** debugger
**Scope:** latent bugs, failure modes, async/race hazards, state resets, export abort paths, parsing failures, map lifecycle, stale closures/refs
**Mode:** read-only source review; no source code modified
**Result:** 6 open defects identified (1 High, 4 Medium, 1 Low-Medium)
**Confidence:** High

## Context read first

- `.context/README.md`
- `.context/development/01-conventions.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- current review artifacts under `.context/reviews/` to avoid duplicating already-scheduled or already-fixed issues

## Inventory reviewed

Current source and supporting runtime files inspected:

- App shell/runtime: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Core logic: `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/lib/i18n.ts`, `src/types.ts`
- User-facing components: `src/components/FileUpload.tsx`, `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`, `src/components/TimelineSelector.tsx`, `src/components/SceneEditor.tsx`, `src/components/ExportPanel.tsx`, `src/components/Controls.tsx`, `src/components/TrackWorkspace.tsx`, `src/components/TrackToolbar.tsx`, `src/components/GlobalToolbar.tsx`, `src/components/ThemeToggle.tsx`, `src/components/ModalDialog.tsx`, `src/components/Toast.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/GoogleGuide.tsx`, `src/components/KeyboardHelp.tsx`, `src/components/ElevationProfile.tsx`
- Build/static scripts and tests: `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs`, `scripts/serve-static.mjs`, `scripts/fetch-map-styles.mjs`, `playwright.config.ts`, `playwright.static.config.ts`, `e2e/travelback.spec.ts`

## Verification performed

- Read-only source inspection across the high-risk runtime paths above
- Cross-checked the MapLibre and mediabunny package type/docs in `node_modules/` to confirm default pixel-ratio behavior and the existence of `Output.cancel()`
- Rechecked prior cycle findings so this report only carries forward issues that are still present in the current source

## Findings

| File:line / region | Severity | Confidence | Status | Failure scenario | Fix |
|---|---:|---:|---|---|---|
| `src/components/MapView.tsx:494-503, 577-587`; `src/lib/useExportController.ts:136-186` | High | High | Open | Export resize uses the MapLibre canvas directly, but the map is still created with MapLibre’s default device-pixel-ratio backing store. On a Retina/high-DPI screen, a requested 1920×1080 export can encode a much larger canvas (for example roughly 3840×2160 on DPR=2), so the output resolution and memory cost no longer match the preset shown to the user. | Force the map/export canvas to pixel ratio 1 during export, or render into a dedicated fixed-size export canvas instead of encoding the live MapLibre backing canvas. |
| `src/lib/videoEncoder.ts:101-150`; `src/lib/useExportController.ts:202-240` | Medium | High | Open | The success path finalizes mediabunny output, but abort/failure paths never call `output.cancel()`. That leaves encoder resources open after a canceled or failed export, which can accumulate across repeated cancel/retry cycles and makes cleanup depend on page unload instead of explicit teardown. | In the non-success path, call `await output.cancel()` before returning/throwing away the export job, and keep the existing finalize-on-success behavior. |
| `src/components/MapView.tsx:515-567`; `src/lib/useExportController.ts:138-183`; `src/lib/videoEncoder.ts:126-140` | Medium | Medium | Open | `waitForIdle()` resolves as soon as the map is not moving and tiles are loaded. On local/no-tile styles, that can become true before the camera jump has actually painted to the WebGL canvas, so export can capture a stale frame or duplicate the previous frame when the user changes scenes quickly. | Wait for a real render boundary after `applyCameraState()`/`jumpTo()` before capturing, not just an idle/tiles-loaded predicate. |
| `src/lib/parser.ts:280-302`; `public/workers/trackParser.worker.js:71-87` | Medium | High | Open | If a Google `activitySegment` contains `simplifiedRawPath.points` but the array is empty or all points are invalid, the parser never falls back to `waypointPath` or `startLocation`/`endLocation`. A valid segment can therefore parse as no movement points at all and reduce or wipe out the route. | Treat `simplifiedRawPath.points` as preferred only when it yields at least one accepted point; otherwise fall through to the waypoint/start/end fallback branches. |
| `src/components/FileUpload.tsx:52-60, 131-273`; `src/app/page.tsx:480-514` | Medium | High | Open | A slow parse can finish after the user has switched to manual journey creation. Because `handleFile()` has no session/mounted guard, `onTrackLoaded()` still fires and replaces the manual route flow with the parsed file, even though the user already changed modes. | Track an upload session id or mounted flag and ignore stale completions; also disable alternate entry actions while parsing. |
| `src/app/page.tsx:288-315`; `src/components/TimelineSelector.tsx:520-548` | Medium | Medium | Open | `handleRangeChange()` only clears scenes when the new range is *not* the full track. If the user trims the track, edits scenes against that trimmed subset, and then resets back to the full range, those scenes remain even though their percentages now map to a different portion of the trip. That is a state-reset bug: the timeline changed but dependent scene state was not invalidated. | Treat any track-range mutation as invalidating scene state, or keep raw scene intent separate from the normalized playback/export scenes. |

## Non-findings / checked-but-not-reported

- The current `TimelineSelector` no-op drag path no longer commits the old selection on mouse/touch release; the earlier regression is not present in this source snapshot.
- The current `TrackToolbar` mobile menu no longer uses the duplicate-ref pattern from earlier reviews; I rechecked it and did not carry that forward here.

## Final sweep

This pass covered runtime crashes, export abort cleanup, map capture timing, parser fallback failure modes, stale async load completion, and session-reset invalidation. The report excludes issues that are already fixed in the current snapshot and keeps only defects that are still observable in the source as of this review.
