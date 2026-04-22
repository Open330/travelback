# Performance Reviewer — Cycle 2 (2026-04-23)

## Verified Cycle 1 Fixes

- F10 (TimelineSelector fires onRangeChange during drag): Fixed — throttled by rAF
- F14 (MapView re-renders every progress change): Deferred (DF-C17-005)

## New Findings

### N1. buildReferenceGridData recomputes on every MapView animation frame (not memoized)
- **Severity**: Low | **Confidence**: High
- **File**: `src/components/MapView.tsx:228-328`
- **Issue**: `buildReferenceGridData(track)` is called inside `addReferenceGridLayers` which runs on style load and track changes. It is NOT called on every progress change. It only runs when the style or track changes, so the performance impact is limited. The function iterates over all track points to compute bounds and grid lines, which is O(n) but happens infrequently. Confirming this is acceptable.

### N2. computeCameraForScene recalculates bounding box on every call for overview mode
- **Severity**: Low | **Confidence**: Medium
- **File**: `src/lib/camera.ts:153-162`
- **Issue**: The `overview` camera mode calls `computeBoundingBox(track.points)` on every frame. The bounding box for a track never changes during playback. This is O(n) per frame for overview scenes. With large tracks (100k+ points), this adds unnecessary per-frame cost.
- **Fix**: Cache the bounding box in a ref or precompute it when the track loads, then pass it to computeCameraForScene. However, the existing smoothing thresholds (MIN_CAMERA_MOVE_METERS etc.) in MapView already prevent excessive DOM updates, so the practical impact is limited.

## Summary

No critical performance regressions. The deferred items (MapView re-renders, video export waitForIdle) remain the most impactful performance issues but are architectural changes requiring dedicated passes.
