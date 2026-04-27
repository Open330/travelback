# Architect — Cycle 1 (2026-04-27)

Reviewer: architect
Repository: `/Users/hletrd/flash-shared/Travelback`
Scope: Full codebase including uncommitted changes, focus on component boundaries, state architecture, and coupling

## Findings

### ARCH-01 — Map layer ownership is split across MapView, JourneyCreator, and the export controller

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:26-34`, `src/components/JourneyCreator.tsx:203-476`, `src/lib/useExportController.ts`
- **Detail:** Multiple components independently mutate the same MapLibre instance. `MapView` manages route/trail/marker layers. `JourneyCreator` adds its own point/line layers and event handlers directly on the map. The export controller calls `mapHandle.resize()`, `mapHandle.renderFrameAndWait()`, and `mapHandle.resetSize()`. Style reload, export resize, or mode transition can leave stale listeners, remove layers out of order, or re-add feature layers at wrong times. The `JourneyCreator` cleanup function is complex (45+ lines) because it must manually reverse every listener and state mutation.
- **Suggested fix:** Replace `getMap()` feature access with explicit overlay registration/update APIs. Make MapView the sole MapLibre mutator with declarative overlay props or narrow overlay methods. JourneyCreator should request overlay additions through MapView's imperative handle rather than reaching into the map directly.

### ARCH-02 — Track session state is spread across 12+ independent state atoms in page.tsx

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/app/page.tsx:61-112`, `src/app/page.tsx:258-315`
- **Detail:** `HomeInner` manages: `fullTrack`, `track`, `colorMode`, `hasExplicitThemeChoice`, `hasExplicitMapStyleChoice`, `mapStyleKey`, `showExport`, `isCreatingJourney`, `showGoogleGuide`, `scenes`, `showSceneEditor`, `transitionDuration`, `showKeyboardHelp`, `trackSessionKey`, `units`, `workspaceAnnouncement`, `pendingWorkspaceFocus`. A future feature that edits track/session state but forgets one coupled reset path will cause stale export, scenes from old full track, or focus target not updated. The `loadTrackIntoSession` and `startFreshJourneySession` functions try to centralize reset paths but must manually enumerate every atom.
- **Suggested fix:** Extract a `useTrackSessionController` reducer for session-level transitions: `loadTrack`, `startJourney`, `trimRange`, `editScenes`, `resetExport`, `resetPlayback`. This would make it impossible to forget a reset step.

### ARCH-03 — Export and playback state are entangled through `setPlaybackProgress`

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:179-184`, `src/app/page.tsx:160-182`, `src/components/MapView.tsx:914-1020`
- **Detail:** During export, `setPlaybackProgress(nextProgress)` is called (throttled to ~10Hz in the uncommitted diff) through the same React state atom used by normal playback. This triggers the MapView `useEffect([progress])` which updates marker, trail, and camera — all unnecessary during export. The export only needs to update the camera and capture frames. The current throttle reduces but does not eliminate this entanglement.
- **Suggested fix:** Add an `isExporting` prop to MapView that disables the `useEffect([progress])` for trail/marker/camera updates. During export, camera updates go through the imperative `renderFrameAndWait` path only. At export completion, sync playback progress to the final value and re-enable the effect.

### ARCH-04 — Google JSON parser logic is duplicated in worker vs main thread

- **Severity:** MEDIUM-HIGH
- **Confidence:** High
- **Files:** `src/lib/parser.ts:253-539` (main), `public/workers/trackParser.worker.js` (worker)
- **Detail:** The Google JSON parsing logic exists in two runtimes: the main thread (`src/lib/parser.ts`) and the Web Worker (`public/workers/trackParser.worker.js`). A fix for one Google export shape must land in both files. The worker file is plain JavaScript (not TypeScript), so it does not benefit from type checking. There are no behavioral parity tests running the same JSON through both paths. This is the same F03 finding from cycle 2.
- **Suggested fix:** Extract shared Google parsing logic into one module consumed by both contexts. At minimum, add behavioral parity tests running every JSON fixture through both paths and deep-comparing normalized results.

### ARCH-05 — `normalizeScenes` mutates stored state, losing raw authoring intent

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/camera.ts:19-43`, `src/components/SceneEditor.tsx:265-281`
- **Detail:** `commitScenes` in SceneEditor normalizes scenes before passing to `onChange`, so the parent only ever sees normalized scenes. If a user creates overlapping scenes and the normalization clamps them, the user cannot see or restore their original values. Future features like undo or timeline-snapping would be harder to implement because raw intent is lost.
- **Suggested fix:** Store raw authored scenes in UI state. Derive normalized scenes only for playback/export. Show warnings against raw values.

### ARCH-06 — `buildTrackGeometry` is called from three distinct code paths with different performance profiles

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:738-739` (addTrackLayers — one-time), `src/components/MapView.tsx:934-938` (animation — every frame), `src/lib/useExportController.ts` -> MapView.renderFrameAndWait (export — every frame)
- **Detail:** `buildTrackGeometry` is a pure function called in: (1) `addTrackLayers` at track load (once, acceptable), (2) the animation effect on every progress change (hot path), (3) indirectly through the export pipeline (now bypassed by `renderFrameAndWait` in uncommitted diff). The function slices, wraps, and copies coordinate arrays. The animation path (2) is the performance bottleneck for large tracks during playback. The export path (3) is now addressed by the uncommitted changes.
- **Suggested fix:** Cache segment coordinate arrays at track load. During playback, only update the affected segment rather than rebuilding from scratch.

## Summary

| Severity | Count |
|----------|-------|
| MEDIUM-HIGH | 1     |
| MEDIUM | 4     |
| LOW-MEDIUM | 1     |
| **Total** | **6** |
