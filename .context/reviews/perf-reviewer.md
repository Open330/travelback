# Performance Reviewer — Cycle 3 (2026-05-04)

## Scope
Full codebase performance review.

## Findings

### C3-P1. Playback animation fallback timer wastes allocation during normal playback
**Severity**: Low | **Confidence**: Medium
**File**: `src/lib/usePlaybackController.ts:115`
**Issue**: The fallback setTimeout(animate, 250) runs alongside every requestAnimationFrame. In foreground, rAF always wins, making the setTimeout wasted allocation (~60/sec). Only needed for background tabs.
**Fix**: Only schedule fallback when document.visibilityState === 'hidden'.
**Effort**: Small

### C3-P2. Export progress callbacks allocate closures every frame (not worth fixing)
**Severity**: Low | **Confidence**: Medium
**File**: `src/lib/useExportController.ts:213-237`
**Issue**: Arrow function closures allocated per-frame during export. Standard React pattern, negligible impact.

### C3-P3. buildReferenceGridData iterates track points twice
**Severity**: Low | **Confidence**: High
**File**: `src/components/MapView.tsx:303-412`
**Issue**: Two separate loops over all points for bounds and antimeridian check. Could be one pass. Already memoized.
**Effort**: Trivial

### C3-P4. Export throttle at ~10Hz verified correct
**Severity**: N/A | **Confidence**: High

### C3-P5. precomputeWrappedSegments avoids per-frame rebuild verified
**Severity**: N/A | **Confidence**: High

## Summary
No significant performance issues. Good characteristics: memoization, throttled updates, precomputed geometry, accumulator-based timing.
