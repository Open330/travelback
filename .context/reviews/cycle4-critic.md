# Cycle 4 Critic Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Methodology
Multi-perspective critique challenging assumptions, finding blind spots, and questioning design decisions across the entire change surface.

## Findings

### C4-CT01 — The "client-side only" architecture limits mobile export capability
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** Architecture: entire export pipeline
- **Detail:** The app is client-side only, which is a key design decision. However, this means video export on mobile devices is limited by browser memory and WebCodecs support. The `estimateExportMemoryBytes` guard (256MB in-memory limit) will reject many 4K exports on mobile. The worker fallback has a 16MB limit. This creates a significant UX gap between desktop and mobile users.
- **Suggested fix:** Consider adding a warning in the ExportPanel when 4K presets are selected on mobile viewports. The architecture doc should acknowledge this trade-off.

### C4-CT02 — Scene editor's `commitScenes` always normalizes, destroying user intent
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/SceneEditor.tsx:265-281`
- **Detail:** Already noted as C3-06 (deferred). Every scene edit passes through `normalizeScenes`, which sorts, clamps, and merges overlapping ranges. The user's raw input is never preserved. If a user creates two overlapping scenes, the normalization silently picks one. The "undo" feature only works for deleted scenes, not for normalization-induced changes.
- **Suggested fix:** Store raw authored scenes in UI state. Derive normalized scenes for playback/export only.

### C4-CT03 — The `isExporting` boolean flag pattern is fragile
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:1000`, `src/lib/useExportController.ts`
- **Detail:** Already noted as C3-14 (deferred). The `isExporting` boolean guards the progress update effect in MapView. Future effects added to MapView must also check this flag. There's no type-level or lint-level enforcement. A state machine (`idle | playback | export`) would be more robust.
- **Suggested fix:** Consider a MapView internal state machine.

### C4-CT04 — GPX parsing relies on `@tmcw/togeojson` fallback but only when no `trkseg` elements found
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/parser.ts:197-236`
- **Detail:** `parseGPX` first tries to extract track segments directly from `trkseg`/`trkpt` elements. Only if no segments are found does it fall back to `gpx(doc)` via `@tmcw/togeojson`. This means waypoints (`wpt` elements) and routes (`rte` elements) are silently ignored if any track segments exist. A GPX file with only waypoints and no tracks would be parsed via the togeojson fallback, but a file with both tracks and waypoints would lose the waypoints.
- **Suggested fix:** Document this behavior or offer to include waypoints as additional segments.

### C4-CT05 — The track session lifecycle depends on correct call ordering
- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/app/page.tsx:266-286`
- **Detail:** `loadTrackIntoSession` calls `resetTrackWorkspace()` then `setFullTrack()` then `setTrack()` then `resetPlaybackSession()`. If React batches these updates differently, there could be intermediate states where `track` is set but `fullTrack` isn't. Currently React 18+ batches all setState calls in event handlers and effects, so this ordering is safe. But the coupling between these atoms is fragile — adding a new piece of session state requires remembering to reset it in both `loadTrackIntoSession` and `startFreshJourneySession`.
- **Suggested fix:** Already noted as C3-08 (deferred). Extract a `useTrackSessionController` reducer.

### C4-CT06 — The reference grid is not updated when the map style changes
- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:797-820`
- **Detail:** When the map style changes (line 797), `addReferenceGridLayers` is called inside the `style.load` handler with `referenceGridData` from the closure. Since `referenceGridData` is memoized on `track`, and `addReferenceGridLayers` updates the source data, this should work correctly. However, the grid colors are determined by `GRID_PAINT_BY_STYLE[mapStyleKey]` but only applied when layers are first created. If layers already exist (because the grid was added with a previous style), the paint properties are not updated.
- **Suggested fix:** Update grid layer paint properties on style change, not just source data.

## Summary
| Severity | Count |
|----------|-------|
| HIGH | 0 |
| MEDIUM | 3 |
| LOW | 3 |
| **Total** | **6** |
