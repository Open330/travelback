# Aggregate Review — Travelback (2026-05-04, Cycle 4)

## Overview

Deep review completed. All quality gates pass clean (lint=0, typecheck=clean, test=219/219, audit=0 vulns, build=clean). The codebase is in excellent condition after cycles 1-3 fixes. Previous cycles' MEDIUM findings (C3-F1 MapView monolith, C3-C1 stale deferred findings) were addressed or carried. This cycle found only minor/cosmetic issues.

## Deduplicated Findings (ordered by severity/confidence)

### LOW PRIORITY

#### C4-F1. Inconsistent indentation in MapView progress effect
**Severity**: Low (style) | **Confidence**: High
**File**: `src/components/MapView.tsx:1064-1067`
**Issue**: Lines 1064-1067 (marker position update inside the progress useEffect) use 6-space indentation instead of the surrounding 4-space indentation. This is a formatting inconsistency introduced during cycle 2 refactoring.
**Fix**: Re-indent to 4 spaces.

#### C4-F2. TimelineSelector `hasTime` not memoized
**Severity**: Low (perf) | **Confidence**: Medium
**File**: `src/components/TimelineSelector.tsx:369`
**Issue**: `hasTime` is computed via `points.some((p) => p.time)` on every render. For tracks with up to 250K points, this iterates the full array each time the component re-renders. Since `points` reference only changes on track load/trim, this should be memoized.
**Fix**: Wrap in `useMemo` keyed on `points`.

### INFORMATIONAL (no action required)

#### C4-I1. exportVideo waitForIdle signature uses `Promise<void>` but callers return `Promise<boolean>`
**Severity**: Info | **Confidence**: High
**File**: `src/lib/videoEncoder.ts:83` vs `src/components/MapView.tsx:689`
**Issue**: `exportVideo` declares `waitForIdle: () => Promise<void>` but the actual MapView implementation returns `Promise<boolean>`. TypeScript allows this (boolean return is discarded) but the API contract is slightly misleading.
**Fix**: None required — this is standard TypeScript variance behavior. Document for awareness.

#### C4-I2. `smoothCameraState` wrapper is now a trivial delegate to `lerpCamera`
**Severity**: Info | **Confidence**: High
**File**: `src/components/MapView.tsx:77-79`
**Issue**: After cycle 3's P06 consolidation, `smoothCameraState` is now a one-line wrapper calling `lerpCamera(previous, target, factor, linear, bearingFactor)`. The wrapper exists for readability (naming the concept) and is used in exactly one call site. No action needed.
**Fix**: None required.

#### C4-I3. mediabunny Output has no explicit cleanup API on abort
**Severity**: Info | **Confidence**: Medium
**File**: `src/lib/videoEncoder.ts:168-173`
**Issue**: When export is aborted, `output.finalize()` is correctly skipped (to avoid corrupt MP4), but the Output/CanvasSource/BufferTarget objects rely on GC for cleanup. mediabunny does not expose a `dispose()` or `close()` method. This was flagged in C3-F4 but is a library limitation, not a code defect.
**Fix**: None — deferred until mediabunny adds explicit cleanup API.

## VERIFIED FIXES FROM CYCLES 1-3

All prior fixes verified:
- C3-F3 referenceGridData dependency: VERIFIED (line 866 includes `referenceGridData`)
- C3-F2 camera smoothing consolidation: VERIFIED (`smoothCameraState` delegates to `lerpCamera`)
- C3-P1 fallback timer optimization: VERIFIED (line 117: `document.visibilityState === 'hidden'` guard)
- C3-C1 stale deferred findings: VERIFIED (N01 archived, N10 corrected)
- All cycle 1-2 fixes: VERIFIED (no regressions)

## AGENT FAILURES

None. Single-agent review completed.

## Cross-Agent Agreement Summary

N/A — single-agent cycle. All findings are low-informational; no prior-agency disagreement.