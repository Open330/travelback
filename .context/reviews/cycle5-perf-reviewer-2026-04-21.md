# Cycle 5 Performance Review -- 2026-04-21

**Reviewer:** perf-reviewer
**Scope:** All source files, with focus on hot paths, animation loops, and export pipeline

---

## Review Summary

The codebase demonstrates good performance awareness with proper use of requestAnimationFrame for animation, Web Workers for heavy parsing, and ref-based patterns to avoid render-phase side effects. Found 1 new performance issue.

---

## New Findings

### C5-PR1: Playback animation loop recalculates progress from ref on every frame instead of using an accumulator

**Severity:** LOW
**Confidence:** MEDIUM
**File:** `src/lib/usePlaybackController.ts:83-99`

The animation loop computes `nextProgress = progressRef.current + increment` on each frame. This means floating-point accumulation errors can compound over long playback sessions (600s max duration * 120fps = 72,000 frames). While the practical impact is negligible (drift would be sub-millisecond), an accumulator-based approach would be more precise.

**Impact:** Negligible practical impact; theoretical floating-point drift over very long animations.
**Fix:** Use `targetDist` (based on absolute elapsed time) instead of incremental addition: `const elapsed = startProgress * durationRef.current + totalElapsedSec; const nextProgress = elapsed / durationRef.current;`. This eliminates accumulation error entirely.

---

## Performance Assessment

**Positive observations:**
- requestAnimationFrame with proper cleanup (cancelAnimationFrame in useEffect return)
- Web Worker for JSON parsing with Transferable ArrayBuffer (zero-copy)
- `computeCumulativeDistances` memoized with correct dependency tracking
- MapLibre `jumpTo` used for camera updates (no animation interpolation overhead)
- Camera smoothing uses efficient angle math without trig in the hot loop
- Binary search for track interpolation (`interpolateAlongTrack`) is O(log n) per call
- `normalizeScenes` called once before export loop, not per-frame
- `mountedRef` pattern prevents state updates after unmount in export controller

**Previously reported -- still valid:**
- C4-A5: `buildReferenceGridData` not memoized (LOW risk, infrequent calls)
- DF-C2-002: Playback progress drives whole-app rerenders (HIGH/HIGH, deferred)
