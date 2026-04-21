# Cycle 8 Implementation Plan -- 2026-04-21

## Review Summary

Deep review across 11 agents. **1 new finding** identified (after dedup), LOW severity. All prior cycle fixes confirmed still applied. The codebase has fully converged. See `.context/reviews/_aggregate.md` and `.context/reviews/cycle8-*-2026-04-21.md`.

## Cycle 7 Plan Status -- All Complete

| Task | Status |
|------|--------|
| TASK-1: Add drag-moved tracking to TimelineSelector | DONE |
| TASK-2: Fix MapView eslint-disable comment line reference | DONE |
| TASK-3: Add cleanup for SceneEditor deletedScene undo timer on unmount | FALSE POSITIVE -- React useEffect cleanup runs on unmount |
| TASK-4: Add Firefox-compatible focus-visible styles for range input sliders | DONE |
| TASK-5: Update architecture doc to list TrackWorkspace children and trim data flow | DONE |
| TASK-6: Add qualifier to export time estimate text | DONE |

## Active Implementation Items

### TASK-1: Remove English message text fallback from FileUpload error handler [C8-A1] -- LOW

- **Source:** code-reviewer, critic
- **Root Cause:** `src/components/FileUpload.tsx:63` uses `message.includes('File is too large')` as a fallback check alongside `code === 'FILE_TOO_LARGE'`. The code's own comment on line 49 states "Map parser error codes to i18n keys (avoids relying on English message text)", but the fallback does exactly that -- relies on English message text. The `code === 'FILE_TOO_LARGE'` check is sufficient since ParseError always sets a code.
- **Files:** `src/components/FileUpload.tsx:63`
- **Fix:** Remove the `|| message.includes('File is too large')` fallback from the `isFileTooLarge` assignment. The `code === 'FILE_TOO_LARGE'` check handles the ParseError case. Non-ParseError thrown errors (e.g. from file.size check) use their own `message` directly via `setError(message)` on line 69, so removing the fallback does not affect that path. Update the `isSafe` computation to only use `matchedKey || code === 'FILE_TOO_LARGE'`.
- **Status:** PENDING

## Deferred Items

### No New Deferred Findings This Cycle

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
- DF-C7-001: ExportPanel module-level codecSupportCache never invalidated

## Convergence Note

Cycles 5-8 all found only LOW-severity issues, with the finding count decreasing from 6 (C7) to 1 (C8). The codebase has fully converged. Remaining deferred items are architectural or performance-related and require larger refactoring efforts beyond the scope of incremental fix cycles.
