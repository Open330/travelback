# Performance Reviewer — Cycle 5 (2026-04-27)

Repository: `/Users/hletrd/flash-shared/Travelback`
Reviewer: perf-reviewer

## Findings

### P5-01 — Trail geometry sent to MapLibre on every frame even when unchanged
- **Severity:** HIGH
- **Confidence:** High
- **File:** `src/components/MapView.tsx:991-1064`
- **Description:** The `progress` effect in MapView unconditionally computes and sends trail geometry to MapLibre's `trailSource.setData()` on every progress change, even when the segment index hasn't changed (i.e., the trail is still within the same segment and no new coordinates should be visible). For tracks with 100K+ points, this means sending 100K+ coordinate GeoJSON objects at ~60fps during playback, even when only a fractional interpolation point changes.
- **Failure scenario:** Playing back a 250K-point track on a mid-range phone. Each frame constructs and sends a GeoJSON with up to 250K coordinates to MapLibre. Main thread jank makes the animation stutter visibly. Battery drains quickly.
- **Suggested fix:** Only update trail geometry when the segment index changes. Between segment index changes, only update the marker position (which is a single point feature — cheap). Consider throttling trail updates to ~10 Hz during playback.

---

### P5-02 — ElevationProfile recomputes min/max/path on every render despite stable track data
- **Severity:** MEDIUM
- **Confidence:** High
- **File:** `src/components/ElevationProfile.tsx:20-60`
- **Description:** The `useMemo` for `elevations`, `hasElevation`, and `{ minEle, maxEle, pathD, areaD }` all depend on `track.points` and `cumulDist` as inputs. However, `track` is a new object reference on every range trim (even if the points haven't changed), so the memo is invalidated. The SVG path computation iterates all points and is O(n) per recalculation. For large tracks, this creates unnecessary work on range changes.
- **Failure scenario:** User trims the timeline range. Even when the visible range hasn't changed much, the full SVG path is recomputed from all points. On 100K+ point tracks, this causes a noticeable pause.
- **Suggested fix:** Use `track.points.length` or a hash of the points array as the memo key instead of the full reference. Alternatively, cache the SVG path computation at a higher level.

---

### P5-03 — `computeCumulativeDistances` called twice for the same track+range
- **Severity:** MEDIUM
- **Confidence:** High
- **File:** `src/app/page.tsx:149-158`
- **Description:** Both `cumulativeDistances` and `fullTrackCumulativeDistances` are computed independently via `useMemo`. When `track === fullTrack` (no trimming), both compute identical values. For large tracks, this means two O(n) haversine scans producing the same array.
- **Failure scenario:** On initial track load (no trimming), two identical 100K-point haversine scans run. The computation is duplicated for no benefit.
- **Suggested fix:** When `track === fullTrack` (no trim applied), reuse the same cumulative distances array. Add a fast-path check: `const cumulativeDistances = useMemo(() => track === fullTrack ? fullTrackCumDist : computeCumulativeDistances(track.points, track.segmentStartIndices), [...])`.

---

### P5-04 — Animated mesh CSS animation runs during export with `preserveDrawingBuffer: true`
- **Severity:** MEDIUM
- **Confidence:** Medium
- **File:** `src/styles/vitro-base.css:389-435`, `src/app/layout.tsx:80-81`
- **Description:** The decorative animated mesh background runs a continuous CSS animation (`@keyframes mesh-drift`) at `0.01ms` period. During video export, this animation competes with the WebGL map canvas for GPU time. Combined with `preserveDrawingBuffer: true` (which forces the GPU to finish painting before each buffer readback), this creates frame-to-frame rendering variability.
- **Failure scenario:** During export of a 180-second video, the mesh animation runs in the background, occasionally causing MapLibre's `render` event to fire late. This results in export timeouts or duplicate frames.
- **Suggested fix:** Pause the mesh animation during export. Add a CSS class like `data-exporting="true"` that sets `animation-play-state: paused` on the mesh, or reduce animation to `none` during export.

---

### P5-05 — `referenceGridData` recomputed on track reference change even when track hasn't moved
- **Severity:** LOW
- **Confidence:** High
- **File:** `src/components/MapView.tsx:468`
- **Description:** `useMemo(() => buildReferenceGridData(track), [track])` recomputes whenever the `track` object reference changes. During range trimming, a new track object is created even when the spatial extent hasn't changed significantly. `buildReferenceGridData` iterates all track points to compute bounds and generates grid features — this is O(n) work that produces identical output when the track's bounding box hasn't changed.
- **Failure scenario:** User adjusts the timeline range slightly. The grid is recomputed even though the visible map area hasn't changed. On large tracks, this causes a small but unnecessary pause.
- **Suggested fix:** Memoize on track bounds rather than track reference. Compute and compare the bounding box before regenerating grid features.

---

## Summary

| ID | Severity | Confidence | File |
|----|----------|------------|------|
| P5-01 | HIGH | High | MapView.tsx |
| P5-02 | MEDIUM | High | ElevationProfile.tsx |
| P5-03 | MEDIUM | High | page.tsx |
| P5-04 | MEDIUM | Medium | vitro-base.css / layout.tsx |
| P5-05 | LOW | High | MapView.tsx |
