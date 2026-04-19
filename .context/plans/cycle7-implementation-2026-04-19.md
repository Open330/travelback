# Cycle 7 Implementation Plan

**Date:** 2026-04-19
**Source review:** `comprehensive-deep-code-review-2026-04-19-cycle7.md`

## Finding: NEW-C9-1 — `setExportState('idle')` in catch block not guarded by `mountedRef`

- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/lib/useExportController.ts:155`
- **Status:** DONE

### Problem

In the `exportTrack` callback's catch block, `setExportState('idle')` is called without checking `mountedRef.current`. In contrast, the finally block guards `setIsExporting` and `setExportProgress` with `if (mountedRef.current)`. This inconsistency means that if the component unmounts between catch and finally, a state update would be attempted on an unmounted component. In React 19 this is a no-op, but the inconsistency should be fixed for code hygiene.

### Plan

1. Wrap `setExportState('idle')` in the catch block with `if (mountedRef.current)` check
2. Also wrap `addToast(...)` calls in the catch block with `if (mountedRef.current)` — these also call state setters indirectly
3. Verify typecheck passes
4. Verify export functionality works (error path and success path)

### Exit criteria

- `setExportState('idle')` in catch block is guarded by `mountedRef.current`
- Toast calls in catch block are guarded by `mountedRef.current`
- `tsc --noEmit` passes
- Export error path still shows toast messages when component is mounted

### Implementation

- Wrapped entire catch block body (including both `addToast` paths and `setExportState('idle')`) in `if (mountedRef.current)` guard
- This is consistent with the `mountedRef` guard already used in the finally block for `setIsExporting` and `setExportProgress`
- `tsc --noEmit` passes clean
- LSP diagnostics show 0 errors

---

## Finding: NEW-C9-2 — SceneEditor undo supports only single-delete undo

- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `src/components/SceneEditor.tsx:193,253-258`
- **Status:** NO FIX NEEDED

### Rationale

This is a UX limitation, not a bug. The undo banner provides a 5-second window for the most recent deletion. A full undo stack would be a feature enhancement beyond the scope of this review cycle. Noting for future consideration.

---

## Finding: NEW-C9-3 — Redundant `computeCumulativeDistances` across components

- **Severity:** INFO
- **Confidence:** LOW
- **Files:** Multiple
- **Status:** NO FIX NEEDED

### Rationale

The redundant computation is mitigated by `useMemo` in each component. For typical track sizes, the performance impact is negligible. A shared context would require significant refactoring of the component tree. Noting for awareness only.

---

## Finding: NEW-C9-4 — Theoretical hotkey race window at export start

- **Severity:** INFO
- **Confidence:** LOW
- **Files:** `src/app/page.tsx:87-90`, `src/lib/usePlaybackController.ts:129-201`
- **Status:** NO FIX NEEDED

### Rationale

The race window is extremely short (< 16ms) and the `data-disable-playback-hotkeys` attribute on the export panel provides primary protection. The `isExporting` early-return provides defense-in-depth. The scenario is practically unreachable.

---

## Deferred Findings Update

No new deferred items from this cycle. All previously deferred findings remain unchanged as documented in `.context/plans/deferred-findings-cycle2-2026-04-19.md`.
