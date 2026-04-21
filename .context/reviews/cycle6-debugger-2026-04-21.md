# Cycle 6 Debugger Review -- 2026-04-21

**Reviewer:** debugger
**Scope:** Latent bug surface, failure modes, regressions, edge cases

---

## Review Summary

Systematic search for latent bugs, failure modes, and edge cases across all source files. The cycle 5 fix for the worker buffer transfer fallback (C5-A1) was verified correct. Found 1 new edge case issue.

---

## New Findings

### C6-DB1: ModalDialog openModalStack can leak if component unmounts during open state without cleanup

**Severity:** LOW
**Confidence:** MEDIUM
**File:** `src/components/ModalDialog.tsx:31-67`

The `openModalStack` is a module-level array. When a `ModalDialog` component unmounts, the `useEffect` cleanup calls `closeModal()`, which removes its ID from the stack and restores body overflow. This is correct for normal unmounts. However, if React's StrictMode double-invokes effects in development, the stack could temporarily have duplicate entries. The `closeModal` function uses `lastIndexOf` + `splice`, which only removes one copy, so a double-open/double-close sequence would leave a stale entry.

In practice, `openModal` has a guard: `if (!openModalStack.includes(modalId))` that prevents true duplicates. And StrictMode double-invocation first runs cleanup (which removes the entry), then re-runs the effect (which adds it back). So the sequence is: open -> cleanup (close) -> open, which is correct.

On closer inspection, this is actually fine. No issue found.

---

## Edge Case Verification

- **Empty track points:** `interpolateAlongTrack` handles 0 and 1 point cases
- **Degenerate bounds:** `buildFitBounds` expands single-point bounds with DEGENERATE_PADDING
- **Antimeridian crossing:** Longitude wrapping handled in `buildTrackGeometry`, `buildFitBounds`, `lerpCamera`
- **NaN guards:** All `parseFloat`/`parseInt` in onChange handlers checked with `Number.isFinite()`
- **Export abort:** AbortSignal checked at top of frame loop and after `renderFrame`
- **Map resize on export failure:** `useExportController.ts:176-190` has fallback reset via DOM query
- **Worker buffer transfer:** `textCopy` pre-transfer copy at parser.ts:450 correctly handles the detached-buffer issue

**Previously reported -- still valid:**
- C4-A16: Redundant DOM attribute application in useEffect
- C4-A17: fullTrack and track set to same value initially
