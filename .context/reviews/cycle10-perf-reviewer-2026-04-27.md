# Cycle 10 Performance Review — 2026-04-27

## Review Scope
Full source tree with focus on rendering paths, animation loops, export pipeline, and data processing.

## Findings

### C10-P-01 — LOW-MEDIUM — Export progress throttling uses absolute delta, not time-based

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:202-204`
- **Detail:** The export playback progress update is throttled when `nextProgress - exportProgressRef.current >= 0.02`. Since export progress is linear in frames, this means the throttle fires more frequently for short exports (fewer frames for the same 2% delta) and less frequently for long exports. A time-based throttle (e.g. `performance.now() - lastUpdateTime >= 100ms`) would provide consistent 10 Hz UI updates regardless of export duration.
- **Failure scenario:** Short 5-second export at 60fps = 300 frames; 2% delta = ~6 updates. Long 180-second export = 10,800 frames; 2% delta = ~50 updates (still fine). The current approach works adequately but is frame-rate-dependent.
- **Fix:** Replace absolute-delta throttle with `performance.now()` based interval (100ms = 10 Hz).

### C10-P-02 — LOW — `computeCumulativeDistances` called redundantly for trimmed tracks

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:158-168`
- **Detail:** The `cumulativeDistances` useMemo already has the optimization to reuse `fullTrackCumulativeDistances` when `track === fullTrack`. However, when a track is trimmed (track !== fullTrack), it recomputes from scratch. For large tracks, trimming often preserves most points, but the haversine computation is O(n) regardless.
- **Failure scenario:** Trimming a 250K-point track to 249K points recomputes all 249K cumulative distances unnecessarily. Minor since trim is user-initiated.
- **Fix:** Consider slice-based reuse: if the trim starts at index 0, offset the full distances; if it ends at the last point, take a prefix. Full optimization requires more complex offset math and may not be worth the code complexity.

## Summary

| Severity | Count |
|----------|-------|
| LOW-MEDIUM | 1 |
| LOW | 1 |
