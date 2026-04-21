# Cycle 6 Critic Review -- 2026-04-21

**Reviewer:** critic
**Scope:** Multi-perspective critique of the whole change surface

---

## Review Summary

Multi-perspective critique examining the codebase for cross-cutting concerns, code smells, and systemic issues. The cycle 5 fixes are solid. Found 1 new cross-cutting concern.

---

## New Findings

### C6-CT1: ElevationProfile and TimelineSelector both implement seek-on-click independently with different coordinate systems

**Severity:** LOW
**Confidence:** HIGH
**Files:** `src/components/ElevationProfile.tsx:68-71`, `src/components/TimelineSelector.tsx:153-161`

Both components implement click-to-seek behavior:
- ElevationProfile: `(e.clientX - rect.left) / rect.width` -- raw canvas coordinates
- TimelineSelector: `(e.clientX - rect.left) / rect.width` -- raw div coordinates

While the implementations are consistent in their approach, they duplicate the "click position to progress" logic. If the seek coordinate system ever changes (e.g., accounting for padding, using a non-linear mapping), both components would need to be updated in lockstep. This is a minor maintainability concern, not a bug.

**Impact:** Minor duplication; both components are small and the logic is simple.
**Fix:** Extract a shared `clickPositionToProgress(event, element)` utility if the logic becomes more complex. Not worth doing now.

---

## Previously Reported -- Still Valid

- C5-CT1: Three separate localStorage read paths for theme initialization (MEDIUM/HIGH, deferred)
- C4-A7/C4-A24: HomeInner god component and prop threading (deferred)
- C4-A8: Deferred items accumulating without triage (deferred)
- C4-A23: Duplicate theme initialization logic (deferred)
