# Cycle 16 Implementation Plan — 2026-04-27

## Review Summary

Deep review across the full codebase with context from 6 prior aggregate reviews (50+ findings).
**7 new findings** after dedup (2 LOW-MEDIUM, 5 LOW).
4 findings resolved since cycle 15.

See `.context/reviews/_aggregate.md` for full details.

## Cycle 15 Plan Status

| Task | Status |
|------|--------|
| C15-F01 (JourneyCreator cleanup ref array) | COMPLETED |
| C15-F05 (resetSize mountedRef guard) | COMPLETED |
| C15-F04 (checkJsonDepth for...of) | COMPLETED |
| C15-F08 (antimeridian degenerate padding) | COMPLETED |

## Findings Disposition

### Scheduled for Implementation

| ID | Severity | Description | Approach |
|----|----------|-------------|----------|
| C16-F01 | LOW-MEDIUM | MediaQuery deprecated addListener/removeListener fallback | Remove fallback, keep only addEventListener/removeEventListener |
| C16-F07 | LOW-MEDIUM | usePlaybackController fallback timer fires after unmount | Move mountedRef.current = false into animation effect cleanup |
| C16-F03 | LOW | TimelineSelector startDrag captures stale startRatio/endRatio | Read from ratioRef.current at drag start |
| C16-F04 | LOW | Download anchor element leak on rapid click | Track previous anchor in module-level variable, remove before creating new |
| C16-F05 | LOW | SceneRangeEditor startDrag captures stale startPercent/endPercent | Use refs for current values, read at drag start |

### Deferred

| ID | Severity | Reason |
|----|----------|--------|
| C16-F02 | LOW | ErrorBoundary locale reset — correct behavior, no functional defect. Exit criterion: reopen if error boundary UX requirements change. |
| C16-F06 | LOW | ExportPanel codec cache — preserving codec support across panel opens is desirable UX. Stale cache after browser update requires page refresh anyway. Exit criterion: reopen if codec hot-reload is supported. |
| C16-F08 | LOW | Worker buffer double-allocation at boundary — 16 MB file causing ~32 MB spike is an edge case with negligible impact. Exit criterion: reopen if memory profiling shows this is measurable. |

Deferred item details:

- **C16-F02** (ErrorBoundary locale): The error boundary correctly preserves error state across prop changes. The `resetKey` mechanism gives users explicit control to dismiss. No change needed.
- **C16-F06** (ExportPanel codec cache): Codec support is stable within a single page load. The `initialCodecSupport` object is used only as initial state, not as a cache. The actual state is preserved across panel opens, which is correct. No change needed.
- **C16-F08** (Worker buffer boundary): The 16 MB threshold double-allocation is a brief spike. The fallback buffer is necessary for the main-thread fallback path. Lowering the threshold would reduce the spike but is not warranted given the low probability of files at exactly the boundary size. No change needed.

## Active Implementation Items

### C16-TASK-1: Remove deprecated MediaQuery addListener/removeListener (C16-F01)

- **File:** `src/app/page.tsx`
- **Change:** Remove the `if (typeof media.addEventListener === 'function')` guard and the deprecated `addListener`/`removeListener` fallback. Replace with direct `addEventListener`/`removeEventListener` calls. Add a comment noting minimum browser support (Safari 14+, Chrome 80+, Firefox 65+).

### C16-TASK-2: Fix usePlaybackController fallback timer unmount race (C16-F07)

- **File:** `src/lib/usePlaybackController.ts`
- **Change:** Move `mountedRef.current = false` from the separate unmount effect into the animation effect's cleanup function. This ensures that when the animation cleanup runs (clearing timers and RAF), the mountedRef is already false before any pending timer callback can execute. Remove the separate unmount effect entirely.

### C16-TASK-3: Use ratioRef.current in TimelineSelector startDrag (C16-F03)

- **File:** `src/components/TimelineSelector.tsx`
- **Change:** In `startDrag`, read `ratioRef.current.start` and `ratioRef.current.end` instead of `startRatio` and `endRatio` from the closure. Remove `startRatio` and `endRatio` from the function's dependency on closure-captured state.

### C16-TASK-4: Guard against duplicate download anchor elements (C16-F04)

- **File:** `src/lib/videoEncoder.ts`
- **Change:** Add a module-level `let prevAnchor: HTMLAnchorElement | null = null` variable. Before creating a new anchor element, check and remove the previous one. This prevents DOM accumulation on rapid clicks.

### C16-TASK-5: Use refs for SceneRangeEditor drag origin values (C16-F05)

- **File:** `src/components/SceneEditor.tsx`
- **Change:** Add `startPercentRef` and `endPercentRef` refs in `SceneRangeEditor`, kept in sync via `useEffect`. In `startDrag`, read from these refs instead of the closure-captured props. This removes `startPercent` and `endPercent` from the `useCallback` dependency array.
