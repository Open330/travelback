# Critic — Cycle 3 (2026-05-04)

## Scope
Multi-perspective critique of the whole change surface.

## Findings

### C3-C1. Deferred items have grown stale — no re-evaluation mechanism
**Severity**: Medium | **Confidence**: High
**Files**: `.context/plans/deferred-findings-*.md`
**Issue**: 14+ deferred findings carried forward across multiple cycles. Some (e.g., N01 "Per-frame trail rebuild during playback") may no longer be accurate. Without re-validation, the deferred list becomes misleading noise.
**Fix**: Periodically re-validate deferred findings against current code.
**Effort**: Small

### C3-C2. MapView complexity creates review blind spots
**Severity**: Medium | **Confidence**: High
**File**: `src/components/MapView.tsx`
**Issue**: At 1214 lines with 7+ concerns, reviewers tend to skim or focus only on recently-changed regions. Same as C3-F1.
**Fix**: Extract pure functions from MapView.
**Effort**: Large

### C3-C3. No regressions from cycle 1-2 fixes
**Severity**: N/A | **Confidence**: High
**Issue**: Reviewed all cycle-1 and cycle-2 commits. The exportSucceeded guard, scene tests, and other fixes are correct. No regressions.

### C3-C4. Quality gates clean
**Severity**: N/A | **Confidence**: High
**Issue**: lint=0, typecheck=clean, test=219/219, audit=0 vulns.

## Summary
Codebase in excellent condition. Main critique: deferred findings need cleanup, MapView needs decomposition. No regressions.
