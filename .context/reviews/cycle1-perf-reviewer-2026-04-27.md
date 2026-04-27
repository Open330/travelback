# Performance Reviewer — Cycle 1 (2026-04-27)

Reviewer: perf-reviewer
Repository: `/Users/hletrd/flash-shared/Travelback`
Scope: Full codebase including uncommitted changes, focus on rendering and export performance

## Findings

### P-01 — Per-frame trail geometry rebuild is O(traveled points) during playback (not just export)

- **Severity:** HIGH
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:924-938`, `src/components/MapView.tsx:110-171`
- **Detail:** The animation effect runs on every `progress` change. It calls `buildTrackGeometry(track.points, track.segmentStartIndices, segmentIndex, point)` which slices the points array, wraps longitudes, and constructs a full GeoJSON LineString/MultiLineString for the traveled portion. For a track with 100K points at 50% progress, this creates a ~50K-element coordinate array every frame. The uncommitted diff addresses the export path (F06 via `renderFrameAndWait`), but normal playback still uses this O(n) per-frame pattern. At 60fps, this is the dominant cost for large tracks.
- **Suggested fix:** Pre-compute segment coordinate arrays at track load time. During playback, only update the last segment (the one containing the current position) rather than rebuilding all segments. For the trail, consider using MapLibre's `line-gradient` with feature-state to animate progress without rebuilding geometry, or use a filter-based approach.

### P-02 — Export playback progress still routes through React state at ~10Hz

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:179-184`
- **Detail:** The uncommitted diff adds a throttle (0.02 threshold) for `setPlaybackProgress` during export. This reduces React state churn from ~60Hz to ~10Hz, which is a significant improvement. However, the throttle still routes through React's `setPlaybackProgress` -> `setProgress` -> `MapView` effect chain, which triggers marker/trail updates and re-renders of Controls, ElevationProfile, etc. during export. The export path should ideally bypass visible playback state entirely.
- **Suggested fix:** During export, add a flag that skips the MapView `useEffect([progress])` for trail/marker updates. Only update camera and capture frames. Restore full playback sync at export completion. Add `isExporting` prop to MapView that suppresses non-camera side effects.

### P-03 — Animated mesh background runs continuously even during export

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/app/layout.tsx:80`, `src/styles/vitro-base.css:389-435`, `src/styles/vitro-base.css:761-767`
- **Detail:** The `vitro-mesh` div with CSS animation runs continuously as a background layer. During export, the map canvas is captured frame-by-frame. While the mesh is below the map (z-0) and shouldn't affect the canvas directly, the CSS animation triggers compositing work every frame, competing with WebGL rendering. On low-end devices, this can cause frame drops during both playback and export. The `0.01ms !important` animation duration workaround for reduced-motion preference still runs the animation loop.
- **Suggested fix:** Add a CSS class or data attribute that pauses the mesh animation during export and during reduced-motion preference. Use `animation-play-state: paused` or conditionally render the mesh.

### P-04 — `computeCumulativeDistances` is computed in both `page.tsx` useMemo and MapView fallback

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:149-158`, `src/components/MapView.tsx:860-862`
- **Detail:** `page.tsx` computes `cumulativeDistances` via `useMemo` and passes it to `MapView`. However, `MapView` has a fallback: `cumulDistRef.current = cumulativeDistancesProp?.length ? cumulativeDistancesProp : computeCumulativeDistances(...)`. If the prop is ever empty (before the memo runs), the O(n) computation runs again inside MapView.
- **Suggested fix:** Remove the fallback `computeCumulativeDistances` call from MapView. Make `cumulativeDistances` a required prop when `track` is provided.

### P-05 — `flattenGoogleSegments` sorts and deduplicates on every parse with string keys

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/parser.ts:459-501`
- **Detail:** For large Google JSON imports (50K+ points across multiple segments), `flattenGoogleSegments` performs per-segment sort (O(n log n)), per-segment dedup via Set with string keys, cross-segment dedup, and inter-segment sort. The string-based dedup keys (`toFixed(7)` lat/lng + timestamp) create GC pressure.
- **Suggested fix:** Consider numeric dedup keys or skip dedup for known-ordered input formats.

### P-06 — `estimateExportMemoryBytes` underestimates peak memory for 4K exports

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/lib/videoEncoder.ts:36-49`
- **Detail:** Uses `rawFrameBytes * 4` as a safety factor. 4K Portrait (2160x3840) at 60fps max bitrate can exceed the estimated memory. The `BufferTarget`, `CanvasSource`, and intermediate arrays all coexist. On mobile browsers, the 256MB cap may be too close to the actual peak for 4K+long exports.
- **Suggested fix:** Increase multiplier to 8x or add resolution-dependent scaling. Add a more conservative estimate for resolutions above 1080p.

## Summary

| Severity | Count |
|----------|-------|
| HIGH     | 1     |
| MEDIUM   | 3     |
| LOW      | 2     |
| **Total** | **6** |
