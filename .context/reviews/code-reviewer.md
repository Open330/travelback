# Code Reviewer — Cycle 3 (2026-05-04)

## Scope
Full codebase review. Cycle 2 aggregate findings (C2-F1 through C2-F6) verified as resolved.

## Findings

### C3-F1. MapView.tsx is a 1214-line monolith violating Single Responsibility
**Severity**: Medium | **Confidence**: High
**File**: `src/components/MapView.tsx` (all 1214 lines)
**Issue**: MapView.tsx combines at least 7 distinct concerns: map initialization/cleanup, track geometry building, camera interpolation and smoothing, reference grid computation, marker management, export frame rendering, and debug state exposure. This makes the component hard to test, hard to review, and a high-conflict zone for concurrent changes.
**Fix**: Extract pure functions (geometry builders, grid computation, camera smoothing) into a `src/lib/mapUtils.ts` module. Consider extracting the imperative handle implementation into a custom hook.
**Effort**: Large

### C3-F2. Duplicated camera smoothing logic between MapView and camera.ts
**Severity**: Low | **Confidence**: High
**File**: `src/components/MapView.tsx:66-93` vs `src/lib/camera.ts:120-138`
**Issue**: `smoothCameraState()` in MapView duplicates the camera interpolation logic in `lerpCamera()` from camera.ts. Both use `shortestLngDelta` for antimeridian-safe longitude interpolation and linear lerp for zoom/pitch. The MapView version lacks smoothstep easing (uses raw factor), creating inconsistent smoothing between export and playback.
**Fix**: Replace `smoothCameraState` with a call to a shared interpolation function from camera.ts.
**Effort**: Small

### C3-F3. useEffect missing referenceGridData dependency in style-change effect
**Severity**: Low | **Confidence**: Medium
**File**: `src/components/MapView.tsx:857-880`
**Issue**: The style-change effect reads `referenceGridData` from the closure but its dependency array only contains `[mapStyleKey]`. While `referenceGridData` is memoized on `track`, if it changed while the style was also changing, stale grid data would be rendered.
**Fix**: Add `referenceGridData` to the dependency array.
**Effort**: Trivial

### C3-F4. exportVideo does not explicitly close Output on abort
**Severity**: Low | **Confidence**: Medium
**File**: `src/lib/videoEncoder.ts:130-173`
**Issue**: When export is aborted, `output.finalize()` is skipped but the Output object may hold WebCodecs encoder resources. If mediabunny doesn't clean up on GC, this could leak.
**Fix**: Add explicit cleanup in the finally block when !completed, or document the assumption.
**Effort**: Small

### C3-F5. Verified: C2-F1 export progress restoration is FIXED
**Severity**: N/A | **Confidence**: High
**File**: `src/lib/useExportController.ts:148,252,311`
**Status**: Verified fixed.

## Summary
Codebase in excellent shape. Main actionable finding is MapView.tsx monolith (C3-F1). Duplicated camera smoothing (C3-F2) is a small consistency issue.
