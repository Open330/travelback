# Cycle 6 Implementation Plan -- 2026-04-21

## Review Summary

Deep review across 11 agents. **2 new findings** identified (after dedup), both LOW severity. All prior cycle fixes confirmed still applied. The codebase has converged -- findings are increasingly edge-case-level. See `.context/reviews/_aggregate.md` and `.context/reviews/cycle6-*-2026-04-21.md`.

## Cycle 5 Plan Status -- All Complete

| Task | Status |
|------|--------|
| TASK-1: Fix worker buffer transfer fallback | DONE (commit 3c1125b) |
| TASK-2: Fix playback animation loop dt capping | DONE (commit f7581e3) |
| TASK-3: Add E2E test for map error reload button | DONE (commit 644b269) |

## Active Implementation Items

### TASK-1: Fix ElevationProfile click handler to account for chart padding offset [C6-A1] -- LOW/HIGH

- **Source:** code-reviewer
- **Root Cause:** The click handler in ElevationProfile computes `clickFraction = (e.clientX - rect.left) / rect.width` using the raw canvas bounding rect. However, the chart is drawn with left/right padding (y-axis labels and margin). This means clicking near the left edge maps to a slightly negative progress (clamped to 0) and clicking near the right edge maps slightly beyond 1.0 (clamped to 1). The seek accuracy is slightly off -- clicking on the first data point doesn't seek to exactly 0%.
- **Files:** `src/components/ElevationProfile.tsx:68-71`
- **Fix:** Adjust `clickFraction` by subtracting the chart's left padding and dividing by the chart's draw width rather than the full canvas width. The chart padding values are defined in the component's drawing logic and should be used consistently.
- **Status:** SKIPPED -- False positive. The ElevationProfile uses SVG (not canvas) with `viewBox="0 0 100 100"` and `preserveAspectRatio="none"`. The SVG content spans the full 0-100 x-range without internal padding, so `clickFraction = (e.clientX - rect.left) / rect.width` correctly maps to the progress value. The existing comment at line 67-70 already explains this.

### TASK-2: Fix MapView eslint-disable comment line reference [C6-A2] -- LOW/HIGH

- **Source:** document-specialist
- **Root Cause:** The eslint-disable comment at MapView.tsx:935 says "the effect already handles missing layers via the guard on line 824" but the actual guard is on line 833. Line numbers shifted due to prior edits.
- **Files:** `src/components/MapView.tsx:935`
- **Fix:** Update the comment to describe the guard generically rather than referencing a specific line number, which is fragile: "the effect already handles missing layers via the `isStyleLoaded` + layer-existence guard above".
- **Status:** DONE

## Deferred Items

### New Deferred Findings from This Cycle

None -- both findings are scheduled for implementation above.

### Cleaned Up Deferred Items

- DF-C5-001: Worker buffer transfer fallback uses detached ArrayBuffer -- REMOVED (fixed in cycle 5, commit 3c1125b)

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

Cycles 5 and 6 both found only LOW-severity issues. The codebase is in good shape. The remaining deferred items are architectural (god component, persistent storage) or performance-related (whole-app rerenders, main-thread parsing) that require larger refactoring efforts beyond the scope of incremental fix cycles.
