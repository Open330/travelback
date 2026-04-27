# Cycle 4 Architect Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Methodology
Reviewed architectural/design risks, coupling, and layering across the codebase.

## Findings

### C4-AR01 — `page.tsx` acts as a god component with 12+ state atoms and 30+ callbacks
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/app/page.tsx:61-589`
- **Detail:** `HomeInner` manages 12+ `useState` hooks, 30+ `useCallback` hooks, and passes props through to child components. This creates a "prop drilling" problem where intermediate components like `TrackWorkspace` pass through many props without using them. Already noted as C3-08 (deferred).
- **Suggested fix:** Extract state management into focused controllers (e.g., `useTrackSession`, `useThemeState`, `useMapStyleState`). Use React Context for widely-needed state like locale, units, and theme.

### C4-AR02 — Map layer ownership split across three components
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`, `src/lib/useExportController.ts`
- **Detail:** MapView owns route/trail/reference-grid layers. JourneyCreator owns journey-points/journey-line layers via direct `getMap()` access. The export controller calls `resize`/`resetSize`/`renderFrameAndWait` via the imperative handle. This split means any change to map layer management must be coordinated across three files. Already noted as C3-07 (deferred).
- **Suggested fix:** Replace `getMap()` with narrow overlay registration/update APIs on MapView. JourneyCreator should register its layers via MapView instead of directly manipulating the map.

### C4-AR03 — `wrapLngNear` is defined three times instead of being a shared utility
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:120-125, 146-151, 1030-1035`
- **Detail:** The `wrapLngNear` function (adjust longitude near a reference) is defined three times: inside `precomputeWrappedSegments`, inside `buildTrackGeometry`, and inline in the trail update effect. The `interpolate.ts` module already has `normalizeLng` and `shortestLngDelta` which handle similar concerns. `wrapLngNear` should be in the same module.
- **Suggested fix:** Extract `wrapLngNear` to `interpolate.ts` and import it where needed.

### C4-AR04 — `normalizeScenes` is called in multiple places with inconsistent pre-normalization
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/camera.ts:19-43`, `src/lib/videoEncoder.ts:111`, `src/components/MapView.tsx:482`
- **Detail:** `normalizeScenes` is called in: (1) MapView's `scenes` effect (line 482), storing the result in `normalizedScenesRef`, (2) `videoEncoder.ts` (line 111) before the frame loop, (3) `computeCameraForProgress` (line 359) with a `preNormalized` flag to skip re-normalization. The `preNormalized` flag is used correctly in the export path (videoEncoder normalizes once, then passes `preNormalized: true`). However, the MapView effect also normalizes, creating two separate normalization points for the same data.
- **Suggested fix:** This is working correctly but could be simplified. The MapView could receive pre-normalized scenes from the parent instead of normalizing itself.

### C4-AR05 — No abstraction for map source/layer lifecycle
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx`
- **Detail:** MapView manages 6 different sources and 8+ layers directly with inline `addSource`/`addLayer` calls. The `addTrackLayers` function (822) is 83 lines of layer setup. The `addReferenceGridLayers` function (382) is another 42 lines. There's no abstraction for "declare a layer and its source, ensure it exists, update its data". This leads to the pattern of checking `if (!map.getSource(id))` before every operation.
- **Suggested fix:** Create a `MapLayerManager` utility that handles source/layer declaration, creation, and updates declaratively.

## Summary
| Severity | Count |
|----------|-------|
| HIGH | 0 |
| MEDIUM | 3 |
| LOW | 2 |
| **Total** | **5** |
