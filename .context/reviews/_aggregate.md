# Aggregate Review — Travelback (2026-05-04, Cycle 5)

## Overview

Deep review completed across all 11 agent perspectives. All quality gates pass clean (lint=0, typecheck=clean, test=219/219, audit=0 vulns, build=clean). The codebase remains in excellent condition after cycles 1-4. This cycle found one actionable code quality issue and minor style inconsistencies.

## Deduplicated Findings (ordered by severity/confidence)

### LOW PRIORITY — ACTIONABLE

#### C5-F1. Dead code: `isMapRenderExportError` uses fragile substring matching
**Severity**: Low (code quality / fragility) | **Confidence**: High
**File**: `src/lib/useExportController.ts:24-27`
**Issue**: `isMapRenderExportError` checks `error.message.includes('Map did not finish rendering')` to classify export errors. However, `ExportError` instances from `waitForStableMap` (lines 177, 189) already carry codes `'EXPORT_MAP_RENDER'` and `'EXPORT_MAP_IDLE'`, which are mapped in `EXPORT_ERROR_I18N` (lines 17-22). The catch block at line 267 checks `error instanceof ExportError && EXPORT_ERROR_I18N[error.code]` before the substring fallback, making `isMapRenderExportError` dead code. If someone changes the error message text, the function would silently break.
**Fix**: Remove `isMapRenderExportError` function and the substring check in the catch block. Rely solely on `ExportError.code` for classification.
**Agent agreement**: code-reviewer (C5-F1), critic (C5-C2), verifier (V6), debugger (C5-DB1).

### LOW PRIORITY — STYLE

#### C5-F2. Inconsistent indentation in MapView progress effect
**Severity**: Low (style) | **Confidence**: High
**File**: `src/components/MapView.tsx:1064-1067`
**Issue**: 6-space indentation instead of surrounding 4-space. Carried from C4-F1.
**Fix**: Re-indent to 4 spaces.

#### C5-F3. Inconsistent indentation in SceneEditor scenes list
**Severity**: Low (style) | **Confidence**: High
**File**: `src/components/SceneEditor.tsx:568`
**Issue**: 8-space indentation (extra 4 spaces) at the scenes list rendering block.
**Fix**: Dedent by 4 spaces.

### CARRIED DEFERRED ITEMS (from cycles 1-4)

#### DEF-01. MapView.tsx monolith (1200 lines, 7+ concerns)
**Severity**: Low (architecture) | **Confidence**: High
**File**: `src/components/MapView.tsx`
**Original**: C3-F1. Extract pure functions to src/lib/mapUtils.ts.
**Status**: Deferred. Requires significant refactoring effort. Not blocking.

#### DEF-02. No tests for MapView pure utility functions
**Severity**: Low (test gap) | **Confidence**: High
**Original**: C3-TE1, C5-TE1.
**Status**: Deferred. Blocked by DEF-01 (extraction).

#### DEF-03. No tests for export controller state machine
**Severity**: Low (test gap) | **Confidence**: High
**Original**: C5-TE2.
**Status**: Deferred. Complex async testing setup required.

#### DEF-04. No tests for JourneyCreator parseCoordinateQuery
**Severity**: Low (test gap) | **Confidence**: High
**Original**: C5-TE3.
**Status**: Deferred. Easy to implement, low priority.

#### DEF-05. mediabunny Output has no explicit cleanup API on abort
**Severity**: Info | **Confidence**: Medium
**File**: `src/lib/videoEncoder.ts:168-173`
**Original**: C3-F4, C4-I3.
**Status**: Deferred. Library limitation, not a code defect.

#### DEF-06. `waitForIdle` type mismatch (Promise<boolean> vs Promise<void>)
**Severity**: Info | **Confidence**: High
**Files**: `src/components/MapView.tsx:35` vs `src/lib/videoEncoder.ts:83`
**Original**: C4-I1.
**Status**: Deferred. TypeScript variance allows this. No runtime impact.

### VERIFIED FIXES FROM CYCLES 1-4 (all intact)

- C4-F2 `hasTime` memoization: VERIFIED (TimelineSelector.tsx:363)
- C3-F2 camera smoothing consolidation: VERIFIED (MapView.tsx:77-79)
- C3-F3 referenceGridData dependency: VERIFIED (MapView.tsx:866)
- C3-P1 fallback timer optimization: VERIFIED (usePlaybackController.ts:117)
- C2-DB-01 export progress restoration: VERIFIED (useExportController.ts:311)
- C2-DB-04 resetSize cleanup: VERIFIED (MapView.tsx:685-702)
- All cycle 1 fixes: VERIFIED (no regressions)

## AGENT FAILURES

None. All 11 agent perspectives completed successfully.

## Cross-Agent Agreement Summary

All agents agree the codebase is in excellent condition. The only actionable finding (C5-F1) is agreed upon by 4 agents (code-reviewer, critic, verifier, debugger). All other findings are style/informational.