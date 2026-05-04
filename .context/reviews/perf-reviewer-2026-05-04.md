# Performance Review — Travelback (2026-05-04)

## Summary

Performance is generally well-managed. The precomputed segment approach for trail rendering, accumulator-based playback, and throttled progress updates show deliberate optimization. Key areas for improvement are in large file handling and map rendering during export.

## Findings

### 1. Trail GeoJSON rebuild is gated by segment index change — LOW risk, HIGH confidence
**File**: `src/components/MapView.tsx:1085-1094`
**Issue**: Trail GeoJSON is only rebuilt when `segmentIndex` changes. Within a segment, only the marker position updates. This is an effective optimization — within a segment, the trail extends by one point per frame, but the rebuild is skipped until the segment boundary. However, the segment index changes only at track segment boundaries (not per GPS point), so for tracks without explicit segments, the entire trail is one segment and the GeoJSON is rebuilt on every segment index change (which is every point).
**Suggestion**: For single-segment tracks, consider batching trail updates (e.g., rebuild every N points) to reduce GeoJSON allocation pressure.

### 2. Reference grid recomputed on track change — LOW risk, HIGH confidence
**File**: `src/components/MapView.tsx:515`
**Issue**: `buildReferenceGridData(track)` is memoized via `useMemo` on `[track]`. Since track objects are recreated on trim, the grid is recomputed on every trim operation. The grid computation iterates all track points to find bounds, which is O(n).
**Suggestion**: Acceptable for typical track sizes (< 250K points). No change needed.

### 3. Export frame loop allocates per-frame — MEDIUM risk, HIGH confidence
**File**: `src/lib/videoEncoder.ts:134-166`
**Issue**: Each export frame calls `computeCameraForProgress` which internally calls `normalizeScenes` (unless `preNormalized` is true), `interpolateAlongTrack`, and `computeCameraForScene`. The `preNormalized=true` flag is correctly used to avoid redundant normalization. However, `interpolateAlongTrack` allocates a new `TrackPoint` object and `InterpolationResult` on every frame. For a 3-minute export at 30fps, that's 5,400 allocations.
**Suggestion**: Pre-allocate a reusable result object for the hot path. Low priority — modern GC handles this easily.

### 4. MapLibre style reload triggers full re-render — LOW risk, HIGH confidence
**File**: `src/components/MapView.tsx:857-880`
**Issue**: When `mapStyleKey` changes, `map.setStyle()` is called, which triggers a full style reload. After the style loads, all layers and sources are re-added. This causes a visible flash.
**Suggestion**: Acceptable UX since style changes are user-initiated and infrequent.

### 5. computeCumulativeDistances is O(n) per track load — LOW risk, HIGH confidence
**File**: `src/lib/interpolate.ts:30-41`, `src/app/page.tsx:177-192`
**Issue**: Haversine distance computation runs on every track point at load time. For the 250K point budget, this is ~250K haversine calls. The memoization in page.tsx correctly avoids recomputation when the track reference hasn't changed.
**Suggestion**: Acceptable performance for the point budget.

### 6. Large XML files blocked at 4MB — LOW risk, HIGH confidence
**File**: `src/lib/parser.ts:224`
**Issue**: XML parsing uses DOMParser which is synchronous and blocks the main thread. The 4MB cap prevents UI freezes for XML formats. JSON files use a WebWorker for parsing, avoiding main-thread blocking.
**Suggestion**: None needed — the size caps are appropriate.

### 7. Export progress updates throttled to ~10Hz — LOW risk, HIGH confidence
**File**: `src/lib/useExportController.ts:217-233`
**Issue**: Both playback progress and export progress display are throttled to 100ms intervals. This prevents excessive React re-renders during the export frame loop.
**Suggestion**: Well-implemented optimization.

### 8. MapView `smoothCameraState` is O(1) per frame — LOW risk, HIGH confidence
**File**: `src/components/MapView.tsx:82-93`
**Issue**: Camera smoothing uses simple linear interpolation with shortest-path angle handling. This is efficient and runs on every animation frame.
**Suggestion**: None needed.

### 9. precomputeWrappedSegments runs once per track load — LOW risk, HIGH confidence
**File**: `src/components/MapView.tsx:116-131,1010`
**Issue**: Antimeridian wrapping is precomputed once at track load time, avoiding per-frame wrapping during playback. This is the key optimization for smooth playback.
**Suggestion**: Well-implemented.

### 10. No lazy loading of mediabunny — LOW risk, HIGH confidence
**File**: `src/lib/videoEncoder.ts:89`
**Issue**: `mediabunny` is dynamically imported only when `exportVideo` is called, so it doesn't affect initial page load. The import happens once and is cached.
**Suggestion**: None needed — correctly implemented.