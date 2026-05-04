# Aggregate Review — Travelback (2026-05-04, Cycle 3)

## Overview

10 review agents completed. No agent failures. The codebase is in excellent condition after cycles 1-2 fixes. All quality gates pass clean (lint=0, typecheck=clean, test=219/219, audit=0 vulns). The cycle 2 export progress bug (C2-F1) is verified fixed. The main actionable finding is MapView.tsx being a 1214-line monolith.

## Deduplicated Findings (ordered by severity/confidence)

### MEDIUM PRIORITY

#### C3-F1. MapView.tsx is a 1214-line monolith violating Single Responsibility
**Severity**: Medium | **Confidence**: High
**Agents**: code-reviewer, critic, architect, test-engineer
**File**: `src/components/MapView.tsx` (all 1214 lines)
**Issue**: Combines 7+ concerns: map init/cleanup, track geometry building, camera interpolation/smoothing, reference grid computation, marker management, export frame rendering, debug state exposure. Hard to test, review, and maintain. Pure utility functions inside the component (buildTrackGeometry, buildFitBounds, precomputeWrappedSegments, buildTrailGeoJSONFromSegments, buildReferenceGridData, chooseReferenceGridStep, smoothCameraState) have no test coverage.
**Fix**: Extract pure functions to `src/lib/mapUtils.ts`. Add unit tests for extracted functions.

#### C3-C1. Deferred findings list needs cleanup
**Severity**: Medium | **Confidence**: High
**Agents**: critic
**Files**: `.context/plans/deferred-findings-*.md`
**Issue**: 14+ deferred findings carried forward across multiple cycles without re-validation. Some may no longer be accurate (e.g., N01 "Per-frame trail rebuild" was addressed by precomputed segments). N10 "Scene normalization mutates intent" was corrected — current code does NOT mutate originals.
**Fix**: Re-validate and archive stale findings.

### LOW PRIORITY

#### C3-F2. Duplicated camera smoothing logic
**Severity**: Low | **Confidence**: High
**Agents**: code-reviewer, architect
**Files**: `src/components/MapView.tsx:66-93` vs `src/lib/camera.ts:120-138`
**Issue**: `smoothCameraState()` in MapView duplicates `lerpCamera()` from camera.ts. MapView version lacks smoothstep easing, creating inconsistent smoothing between export and playback.
**Fix**: Consolidate into shared function from camera.ts.

#### C3-F3. useEffect missing referenceGridData dependency
**Severity**: Low | **Confidence**: Medium
**Agents**: code-reviewer
**File**: `src/components/MapView.tsx:857-880`
**Issue**: Style-change effect reads referenceGridData but only depends on [mapStyleKey].
**Fix**: Add referenceGridData to dependency array.

#### C3-F4. exportVideo does not explicitly clean up on abort
**Severity**: Low | **Confidence**: Medium
**Agents**: code-reviewer
**File**: `src/lib/videoEncoder.ts:130-173`
**Issue**: Output object may hold encoder resources after abort. GC should handle it but explicit cleanup is safer.
**Fix**: Add cleanup call in finally block when !completed.

#### C3-P1. Playback fallback timer wasted during normal playback
**Severity**: Low | **Confidence**: Medium
**Agents**: perf-reviewer
**File**: `src/lib/usePlaybackController.ts:115`
**Issue**: setTimeout(250) runs alongside every rAF. Only needed for background tabs.
**Fix**: Only schedule when document.hidden.

#### C3-TE1. No tests for MapView pure utility functions
**Severity**: Low (testability concern) | **Confidence**: High
**Agents**: test-engineer
**File**: `src/components/MapView.tsx`
**Issue**: buildTrackGeometry, buildFitBounds, precomputeWrappedSegments, buildTrailGeoJSONFromSegments, buildReferenceGridData have zero tests despite handling edge cases.
**Fix**: Extract and test. Blocked by C3-F1.

#### C3-TE2. No tests for interpolate degenerate inputs
**Severity**: Low | **Confidence**: Medium
**Agents**: test-engineer
**File**: `src/lib/interpolate.ts:96-127`
**Issue**: 0-point, 1-point, and zero-total-distance guard paths untested.

#### C3-DS1. Architecture doc stale (C2-F6 carried)
**Severity**: Low | **Confidence**: High
**Agents**: document-specialist
**File**: `.context/project/02-architecture.md`
**Issue**: Export pipeline section outdated. Already planned as P17.

## VERIFIED FIXES FROM CYCLES 1-2

- **C2-F1 Export progress restoration**: VERIFIED FIXED (exportSucceeded guard)
- **C2-F5 Marker pulse reduced motion**: VERIFIED FIXED (globals.css covers all animations)
- **C2-F2 Test stub in production**: VERIFIED non-issue (localhost-gated)
- **Cycle 1 ErrorBoundary**: Verified
- **Cycle 1 prefers-reduced-motion**: Verified (comprehensive coverage)
- **Cycle 1 i18n key parity**: Verified (compile-time enforcement)
- **Cycle 1 Camera blending tests**: Verified
- **Cycle 1 wrapLngNear guard**: Verified
- **Cycle 1 Scene editor ARIA**: Verified
- **Cycle 1 Trim confirmation**: Verified
- **Cycle 1 resetSize cleanup**: Verified
- **Cycle 1 isExporting gating**: Verified

## CORRECTIONS TO PRIOR FINDINGS

- **N10 Scene normalization mutates intent**: CORRECTED — current normalizeScenes does NOT mutate originals (creates new objects via spread). The concern was about visual reordering, not mutation. Still a valid product-level concern but not a code bug.
- **N01 Per-frame trail rebuild**: ADDRESSED — precomputeWrappedSegments + segment-change check eliminates redundant rebuilds.

## AGENT FAILURES

None. All 10 agents completed successfully.

## Cross-Agent Agreement Summary

| Finding | Agents Agreeing | Signal Strength |
|---------|----------------|-----------------|
| C3-F1 MapView monolith | code-reviewer, critic, architect, test-engineer | Very High |
| C3-C1 Stale deferred findings | critic | Medium |
| C3-F2 Duplicated camera smoothing | code-reviewer, architect | High |
| C3-F3 Missing useEffect dep | code-reviewer | Low |
| C3-P1 Fallback timer waste | perf-reviewer | Low |
