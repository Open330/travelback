# Performance Review — Travelback (Cycle 1, 2026-05-04)

**Reviewer**: perf-reviewer
**Scope**: CPU efficiency, memory usage, UI responsiveness, hot paths

## Summary

The app is generally well-optimized for its use case. The playback loop uses accumulator-based progress to avoid floating-point drift, trail updates skip redundant GeoJSON rebuilds, and export frame capture throttles UI updates to 10Hz. A few areas could be improved.

## Findings

### PR-01: Trail GeoJSON rebuild on every segment change
**Severity**: P2-MEDIUM
**File**: `src/components/MapView.tsx:1088-1094`
**Description**: When `segmentIndex` changes, `buildTrailGeoJSONFromSegments` is called which iterates all precomputed segments. For tracks with many segments, this is O(segments) per segment change. With the precomputed segments optimization, fully-traversed segments are O(1) references, so the actual cost is proportional to the number of segments up to the current one.
**Impact**: Minimal for typical tracks (< 50 segments). Could be noticeable for tracks with 1000+ segments.
**Fix**: No action needed for current use cases.

### PR-02: computeCameraForProgress normalizes scenes on every call
**Severity**: P2-MEDIUM
**File**: `src/lib/camera.ts:358-359`
**Description**: Without `preNormalized=true`, `computeCameraForProgress` calls `normalizeScenes` which sorts, clamps, and filters scenes on every invocation. In the playback path (60fps), this is called on every frame.
**Impact**: Scene normalization is O(n log n) where n is scene count. For typical usage (< 20 scenes), this is negligible.
**Fix**: Already mitigated by `preNormalized` flag in MapView and videoEncoder. The flag should be the default.

### PR-03: interpolateAlongTrack binary search is efficient
**Severity**: P3-LOW
**File**: `src/lib/interpolate.ts:129-135`
**Description**: Uses binary search (O(log n)) to find the segment for a given progress. This is called on every playback frame.
**Impact**: Negligible — binary search on ~250K points is ~18 comparisons.
**Fix**: No action needed.

### PR-04: React re-render cascade risk in page.tsx
**Severity**: P2-MEDIUM
**File**: `src/app/page.tsx`
**Description**: With ~30 useState hooks, any state change triggers a re-render of HomeInner. React's concurrent rendering mitigates this, but prop drilling means child components may re-render unnecessarily.
**Impact**: On modern hardware, React re-renders are fast. But on slower devices (mobile), frequent state changes during playback could cause jank.
**Fix**: Use React.memo on expensive child components (MapView already uses forwardRef). Consider context splitting.

### PR-05: preserveDrawingBuffer: true on WebGL context
**Severity**: P2-MEDIUM
**File**: `src/components/MapView.tsx:775`
**Description**: `preserveDrawingBuffer: true` is required for export frame capture but adds a performance cost on every rendered frame (GPU must finish painting before buffer is preserved).
**Impact**: Negligible on modern devices. Well-documented tradeoff in the code comment.
**Fix**: No action needed — this is a required tradeoff for export functionality.

### PR-06: Export progress throttle at 10Hz
**Severity**: P3-LOW
**File**: `src/lib/useExportController.ts:218-234`
**Description**: Both playback and export progress updates are throttled to ~10Hz using `performance.now()` timestamps. This prevents React re-render storms during export.
**Impact**: Good optimization already in place.
**Fix**: No action needed.

### PR-07: Cumulative distances memoization could be more precise
**Severity**: P3-LOW
**File**: `src/app/page.tsx:177-192`
**Description**: `cumulativeDistances` useMemo depends on `track` (object reference) plus `track?.points` and `track?.segmentStartIndices`. The `track` dependency is intentionally included (with eslint-disable) to catch track identity changes.
**Impact**: When no trimming is applied, the `track === fullTrack` check reuses full-track distances (line 187), avoiding redundant computation.
**Fix**: No action needed — optimization is already in place.

## Summary

| Severity | Count |
|----------|-------|
| P0       | 0     |
| P1       | 0     |
| P2       | 4     |
| P3       | 3     |

## Verdict: **SHIP IT**
