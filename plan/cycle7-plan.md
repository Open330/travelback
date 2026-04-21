# Cycle 7 Implementation Plan -- 2026-04-21

## Review Summary

Deep review across 11 agents. **6 new findings** identified (after dedup), all LOW severity. All prior cycle fixes confirmed still applied. The codebase has converged. See `.context/reviews/_aggregate.md` and `.context/reviews/cycle7-*-2026-04-21.md`.

## Cycle 6 Plan Status -- All Complete

| Task | Status |
|------|--------|
| TASK-1: Fix ElevationProfile click handler to account for chart padding offset | SKIPPED -- False positive (SVG viewBox maps correctly) |
| TASK-2: Fix MapView eslint-disable comment line reference | DONE |

## Active Implementation Items

### TASK-1: Add drag-moved tracking to TimelineSelector to avoid unnecessary onRangeChange [C7-A1] -- LOW/MEDIUM

- **Source:** code-reviewer
- **Root Cause:** `endDrag` in TimelineSelector always calls `onRangeChangeRef.current(startIdx, endIdx)` when `points.length > 0`, even if the user clicked without dragging. This causes an unnecessary `handleRangeChange` callback in page.tsx, which creates a new filtered track object, resets playback, and triggers a re-render cascade.
- **Files:** `src/components/TimelineSelector.tsx:158-216`
- **Fix:** Add a `dragMovedRef` similar to JourneyCreator's pattern. Set it to `true` in `applyDrag` when the drag state is active and the cursor has moved. In `endDrag`, only call `onRangeChangeRef.current` if `dragMovedRef.current` is true. Reset `dragMovedRef.current` to false in `endDrag`.
- **Status:** PENDING

### TASK-2: Add cleanup for SceneEditor deletedScene undo timer on unmount [C7-A3] -- LOW/MEDIUM

- **Source:** code-reviewer, debugger (independent discovery)
- **Root Cause:** The `deletedScene` effect in SceneEditor sets a 5-second timeout for auto-clearing the undo banner. If the component unmounts while the timer is active, the callback fires and attempts `setDeletedScene(null)` on an unmounted component. While React 18+ silently swallows this, it's a state-update-after-unmount pattern.
- **Files:** `src/components/SceneEditor.tsx:276-282`
- **Fix:** The effect already returns a cleanup function that clears the timer: `return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }`. However, this cleanup only runs when `deletedScene` changes or the effect re-runs. The fix is to ensure the cleanup function is returned from the effect (it already is -- line 281). The real issue is that the effect's cleanup only fires when `deletedScene` changes, not on unmount. Since the dependency array includes `deletedScene`, the cleanup runs when it changes. But if the component unmounts while `deletedScene` is non-null, React will run the effect cleanup. So this is actually already handled by React's effect cleanup mechanism. Let me verify...
  
  Actually, React's cleanup for `useEffect` DOES run on unmount, even if the deps haven't changed. So the `return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }` at line 281 will execute on unmount. This means the finding is a false positive -- the timer IS cleaned up on unmount.
  
  Re-analyzing: The effect at line 276-282:
  ```typescript
  useEffect(() => {
    if (!deletedScene) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => setDeletedScene(null), 5000)
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }
  }, [deletedScene])
  ```
  
  When `deletedScene` is non-null, the effect sets a timer and returns a cleanup. If the component unmounts, React calls the cleanup, which clears the timer. This is correct.
  
  **REVISED STATUS:** FALSE POSITIVE -- React's useEffect cleanup runs on unmount. The timer is properly cleaned up.

### TASK-3: Add Firefox-compatible focus-visible styles for range input sliders [C7-A4] -- LOW/MEDIUM

- **Source:** designer
- **Root Cause:** The Controls progress bar uses `appearance-none` with custom slider thumb styles defined in globals.css. The WebKit thumb styles have custom focus appearance, but there's no explicit `input[type="range"]:focus-visible` outline style that works on Firefox. The `appearance-none` may suppress Firefox's default focus indicator.
- **Files:** `src/app/globals.css:79-111`, `src/components/Controls.tsx:56-73`
- **Fix:** Add a cross-browser focus-visible outline style for range inputs in globals.css:
  ```css
  input[type="range"]:focus-visible {
    outline: 2px solid rgb(var(--gl));
    outline-offset: 2px;
  }
  ```
- **Status:** PENDING

### TASK-4: Update architecture doc to list TrackWorkspace children and trim data flow [C7-A5] -- LOW/MEDIUM

- **Source:** document-specialist
- **Root Cause:** The architecture doc (02-architecture.md) lists the top-level component tree but omits TrackWorkspace's children (Controls, ElevationProfile, TimelineSelector, SceneEditor, TrackToolbar). The data flow diagram also omits the trim flow (TimelineSelector -> handleRangeChange -> filtered track).
- **Files:** `.context/project/02-architecture.md`
- **Fix:** Add TrackWorkspace's child components to the component tree. Add the trim data flow to the data flow diagram. Add Toast and KeyboardHelp to the project structure in 01-overview.md.
- **Status:** PENDING

### TASK-5: Add qualifier to export time estimate text [C7-A6] -- LOW/MEDIUM

- **Source:** critic
- **Root Cause:** The export time estimate formula `duration * 0.5 * resScale * codecScale` doesn't account for per-frame idle wait time, which dominates actual export duration for 4K+ exports. The displayed "estimated time" can be significantly lower than actual time.
- **Files:** `src/lib/i18n.ts` (translation strings)
- **Fix:** Add a qualifier like "approximately" or "at least" to the export estimated time i18n string. This is a UI text change only, no logic change needed.
- **Status:** PENDING

## Deferred Items

### New Deferred Findings from This Cycle

- DF-C7-001: ExportPanel module-level codecSupportCache never invalidated (C7-A2) -- Practical impact is negligible. Cache provides good UX by avoiding re-probing on panel reopen. Exit criterion: if codec support becomes dynamic (e.g., browser extension adds/removes codec support at runtime), re-open this item.

### Cleaned Up Deferred Items

- None this cycle.

### Previously Deferred (Carried Forward)

- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring
- DF-C2-001: Mobile information architecture gaps
- DF-C2-002: Playback progress drives whole-app rerenders (HIGH/HIGH)
- DF-C2-003: Large GPX/KML imports parse on main thread
- DF-C2-004: Manual route dragging is O(n) on pointer move
- DF-C2-005: Export settings permit browser-hostile combinations
- DF-C2-006: Locale/help content eagerly bundled
- DF-C2-007: Large default variable font payload
- DF-C2-008: E2E suite serialized and sleep-heavy
- DF-C2-009: Residual CSP allows inline styles
- DF-C2-010: Local-only bundled styles ship without real basemap layer
- DF-C3-001: CSS layer ordering may deprioritize theme variables
- DF-C3-002: Mobile users lose theme/locale access when track loaded
- DF-C3-003: TrackToolbar/title overlap potential on large screens
- DF-C3-004: Map style URL path correctness on alternative hosting
- DF-C3-005: next/image for static SVG adds complexity
- DF-C3-006: Select dropdown doesn't match dark theme
- DF-C4-001: HomeInner god component -- extract to React Context providers
- DF-C4-002: Module-level mutable state in ExportPanel/ModalDialog
- DF-C4-003: buildReferenceGridData not memoized
- DF-C4-004: showSaveFilePicker double cast
- DF-C4-005: No persistent storage for scenes/export settings
- DF-C4-006: Export time estimate accuracy
- DF-C4-007: Duplicate theme initialization
- DF-C4-008: Deferred items triage process
- DF-C4-009: generateId() fallback uses Math.random()
- DF-C4-010: isTouchDevice detection runs once on mount
- DF-C4-011: Multiple eslint-disable comments
- DF-C4-012: fullTrack and track set to same value initially
- DF-C4-013: Export progress floating-point edge case
- DF-C4-014: localStorage write failure silently ignored
- DF-C4-015: Bootstrap script minified with no source reference
- DF-C4-016: eslint-disable comments lack consistent format
- DF-C4-017: No unit test for parser error code mapping

## Convergence Note

Cycles 5, 6, and 7 all found only LOW-severity issues. The codebase is in good shape. The remaining deferred items are architectural (god component, persistent storage) or performance-related (whole-app rerenders, main-thread parsing) that require larger refactoring efforts beyond the scope of incremental fix cycles.
