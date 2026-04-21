# Performance Reviewer -- Cycle 4 (2026-04-21)

## Summary
Performance is generally good for the app's complexity. The main concern areas remain the deferred items from prior cycles (main-thread parsing, playback rerenders). Found 3 new findings.

## Findings

### P4-001: Playback progress drives whole-app rerenders via `progress` state [HIGH] (Carried: DF-C2-002)
- **File:** `src/app/page.tsx` line 74, `src/lib/usePlaybackController.ts` line 19
- **Issue:** Every animation frame (`requestAnimationFrame`) calls `setPlaybackProgress(nextProgress)` which sets React state in `HomeInner`. This triggers a rerender of the entire component tree including MapView, Controls, GlobalToolbar, TrackWorkspace, etc. on every frame (~60fps).
- **Impact:** The MapView animation effect is guarded by its own progress dependency, so the actual map updates are efficient. But all child components receive new props on every frame, causing unnecessary reconciliation work. The Controls component re-renders its entire DOM on every frame.
- **Mitigation in place:** MapView uses `jumpTo` (synchronous, no animation queue) which is efficient. The `progress` state is the correct source of truth. The real fix would be `useSyncExternalStore` or a context-based approach with `useMemo` boundaries.
- **Status:** Already deferred as DF-C2-002.

### P4-002: Large GPX/KML parsing on main thread [HIGH] (Carried: DF-C2-003)
- **File:** `src/lib/parser.ts` lines 543-564
- **Issue:** GPX and KML files are parsed synchronously on the main thread via `FileReader.readAsText` + DOMParser. Only Google JSON files get worker thread treatment. For large GPX files (up to 200MB), this blocks the UI for potentially seconds.
- **Impact:** User sees a frozen UI during parsing of large files. The file size limit (200MB) makes this a real risk.
- **Status:** Already deferred as DF-C2-003.

### P4-003: `buildReferenceGridData` called on every track/style change [MEDIUM]
- **File:** `src/components/MapView.tsx` lines 228-328
- **Issue:** `buildReferenceGridData` creates a new GeoJSON FeatureCollection on every call. It's called from `addReferenceGridLayers`, which is called on style load, track change, and scene changes. For large tracks, the grid computation iterates all track points to find bounds, then generates hundreds of line features. The result is not memoized.
- **Impact:** Each call allocates a new FeatureCollection with hundreds of features. If the map style changes frequently (e.g., during style cycling), this creates GC pressure. In practice, style changes are infrequent user actions so impact is limited.

### P4-004: Eager i18n bundle includes all 5 locales [MEDIUM] (Carried: DF-C2-006)
- **File:** `src/lib/i18n.ts` (~1765 lines)
- **Issue:** All 5 locale translations are bundled into the main chunk. The file is ~1765 lines, meaning ~1400 lines of translations are unnecessary for any single user session.
- **Impact:** Adds ~40KB (uncompressed) to the initial bundle. Not critical for a single-page app, but unnecessary for a static export where code splitting could easily load only the needed locale.
- **Status:** Already deferred as DF-C2-006.

### P4-005: Variable font payload [LOW] (Carried: DF-C2-007)
- **File:** `src/app/layout.tsx` line 67
- **Issue:** `pretendard.css` loads a variable font. Variable fonts contain all weights in a single file, which is larger than a single-weight file.
- **Impact:** Moderate font payload on first load. Already deferred as DF-C2-007.

## Positive Observations
- `computeCumulativeDistances` is memoized with `useMemo` with correct dependency keys
- Worker thread usage for large Google JSON files is well-implemented with graceful fallback
- MapLibre `jumpTo` is used instead of `easeTo`/`flyTo` during animation (avoids animation queue buildup)
- Camera smoothing uses efficient exponential interpolation
- `preserveDrawingBuffer: true` is correctly documented with trade-off justification
- Codec probing in ExportPanel is parallelized with `Promise.all` and cached
