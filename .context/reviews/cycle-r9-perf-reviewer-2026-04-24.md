# Performance Reviewer — Cycle r9 (2026-04-24)

## Inventory

All source files reviewed with focus on render performance, memory, CPU usage, and UI responsiveness.

## Findings

### C9-PR-001: `buildReferenceGridData` is called on every map style load without memoization [LOW/MEDIUM]

**File:** `src/components/MapView.tsx:326-369`

`buildReferenceGridData(track)` is called inside `addReferenceGridLayers`, which is invoked from:
1. The style-load handler (line 607)
2. The track-load effect (line 780)
3. The style-change effect (line 657)

Each call recomputes the entire grid from scratch. For a track with many points, the bounding-box scan iterates all points, then generates the grid features. The grid data itself is only dependent on the track (not on map style or camera), so it could be memoized and only recomputed when the track changes.

**Impact:** Minor. Grid computation is fast even for large tracks. The real cost is in the `setData` call and the GeoJSON source update, which is unavoidable. The computation cost is negligible compared to the WebGL rendering cost.

**Status:** Defer. Cost/benefit ratio is unfavorable for this optimization.

### C9-PR-002: Playback progress drives whole-app rerenders [HIGH/HIGH]

**File:** `src/app/page.tsx:79-95`

The `usePlaybackController` hook updates `progress` state on every animation frame (~60fps). This causes the entire `HomeInner` component to re-render on every frame, which in turn re-renders all children including `TrackWorkspace`, `Controls`, `ElevationProfile`, etc.

**Impact:** Already well-known and deferred as DF-C2-002. The current approach works because React's reconciliation is efficient enough for this component tree size, but it's a scalability concern.

**Status:** Already deferred as DF-C2-002.

## Summary

- 0 new actionable findings
- 1 new informational finding (grid data memoization — deferred, low impact)
- 1 carried-forward deferred item confirmed
