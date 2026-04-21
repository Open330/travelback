# Cycle 6 Performance Review -- 2026-04-21

**Reviewer:** perf-reviewer
**Scope:** All source files, with focus on hot paths, animation loops, and export pipeline

---

## Review Summary

Performance review of the codebase. The accumulator-based playback fix from cycle 5 eliminates the frame-rate dependency issue. No new performance issues found this cycle.

---

## New Findings

None.

---

## Performance Verification

**Cycle 5 fix verification:**
- **C5-A2** (rAF accumulator): VERIFIED -- `usePlaybackController.ts:82-93` now uses `startTimestampRef` and `startProgressRef` with `performance.now()`-based elapsed time. This eliminates both floating-point accumulation error and frame-rate dependency.

**Hot path review:**
- MapView animation effect: Uses refs for all mutable state, only triggers on `progress`/`track`/`followCamera`/`seekNonce` changes. Progress changes every rAF frame during playback, which is expected and unavoidable for smooth animation.
- Camera smoothing: Efficient angle math without trig in the hot loop (modulo arithmetic for shortest-path interpolation).
- Track geometry: `buildTrackGeometry` is called on every progress update but operates on pre-sliced point arrays. For very large tracks (>10k points), this could be optimized with incremental updates, but the current approach is acceptable.
- Export pipeline: `waitForIdle` with 5-second timeout is reasonable. Consecutive timeout tracking (2 max) prevents infinite loops.

**Previously reported -- still valid:**
- DF-C2-002: Playback progress drives whole-app rerenders (HIGH/HIGH, deferred)
- C4-A5: `buildReferenceGridData` not memoized (LOW risk, infrequent calls)
