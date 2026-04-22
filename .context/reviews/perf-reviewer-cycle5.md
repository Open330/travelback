# Performance Reviewer — Cycle 5 (2026-04-23)

## Methodology
Reviewed all source files for performance concerns: unnecessary re-renders, memory leaks, expensive computations, inefficient data structures, and UI responsiveness issues.

## New Findings

### C5-P1. MapView progress effect creates new GeoJSON on every frame during playback
- **Severity**: MEDIUM | **Confidence**: HIGH (already deferred as DF-C17-005)
- **File**: `src/components/MapView.tsx:846-851`
- **Issue**: The `useEffect` on `progress` runs on every progress change during playback. It calls `buildTrackGeometry()` which allocates a new GeoJSON Feature object and calls `trailSource.setData()`. This creates garbage on every frame. Additionally, `interpolateAlongTrack()` is called on every progress change.
- **Status**: Already deferred as DF-C17-005. No new information to add.

### C5-P2. i18n translations object is ~1680 lines, loaded inline on every page
- **Severity**: LOW | **Confidence**: HIGH (already deferred as DF-C17-016)
- **File**: `src/lib/i18n.ts`
- **Issue**: All 5 locale translations (~1680 lines) are bundled in a single file that's imported on every page. For a static-export site with only 5 locales, the impact is minimal — the gzipped size is small.
- **Status**: Already deferred as DF-C17-016.

## Performance Posture Summary
- Playback uses accumulator-based progress (not accumulating dt) — eliminates float drift
- `useMemo` for `cumulativeDistances` with correct deps — avoids O(n) recomputation
- `normalizeScenes` is called with stable `useCallback` references
- Export controller uses `mountedRef` to avoid state updates after unmount
- `usePlaybackController` stores refs for rAF-critical values to avoid stale closure issues
- Worker parsing offloads CPU-intensive JSON parsing from main thread
- `checkJsonDepth` scans text character-by-character for depth limits — O(n) but necessary for safety
- Deduplication uses `Set<string>` with composite keys — efficient for typical track sizes

## Previously Deferred (Carried Forward)
- DF-C17-004: Video export sequential waitForIdle performance
- DF-C17-005: MapView re-renders every progress change
