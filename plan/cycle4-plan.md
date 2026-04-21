# Cycle 4 Implementation Plan -- 2026-04-21

## Review Summary

Deep review across 11 agents. **25 new findings** identified, 2 HIGH severity. All cycle 3 fixes confirmed applied. See `.context/reviews/cycle4-composite-2026-04-21.md` and `.context/reviews/_aggregate.md`.

## Active Implementation Items

### TASK-1: Add E2E test for theme toggle persistence [C4-A1] -- HIGH/HIGH
- **Source:** verifier, test-engineer
- **Root Cause:** The most critical user-facing feature (theme persistence across reloads) has no E2E regression test. The cycle 3 bug (theme broken on initial load) would not be caught automatically if it regressed.
- **Files:** `e2e/travelback.spec.ts`
- **Fix:** Add an E2E test that: (1) loads the app, (2) verifies `data-mode="light"` on html, (3) clicks the theme toggle, (4) verifies `data-mode="dark"`, (5) reloads the page, (6) verifies `data-mode="dark"` persists after reload. This is a regression guard for the TASK-1 fix from cycle 3.
- **Status:** TODO

### TASK-2: Add E2E test for map load error handling [C4-A9] -- MEDIUM/MEDIUM
- **Source:** test-engineer
- **Root Cause:** TASK-5 from cycle 3 added `map.on('error', onMapError)` but there's no test verifying the error UI is shown when the map fails to load.
- **Files:** `e2e/travelback.spec.ts`
- **Fix:** Add an E2E test that intercepts the map style JSON request and returns an error (or blocks it), then verifies the map error UI appears (`data-testid="map-error"`). This is a regression guard for TASK-5 from cycle 3.
- **Status:** TODO

### TASK-3: Guard map resize reset in export controller [C4-A11] -- MEDIUM/MEDIUM
- **Source:** debugger
- **Root Cause:** If `resetSize()` throws during export cleanup (e.g., map already removed), the map container could be left at the export resolution. The empty catch on line 184 silently swallows the error.
- **Files:** `src/lib/useExportController.ts` lines 177-187
- **Fix:** Wrap the `resetSize()` call in a try/catch that explicitly logs the error and forces a container style reset as a fallback. This ensures the map always returns to its original size even if `map.resize()` fails.
- **Status:** TODO

### TASK-4: Remove redundant useEffect for DOM attribute application [C4-A16] -- LOW/MEDIUM
- **Source:** tracer
- **Root Cause:** `handleModeChange` already calls `applyDocumentMode(mode)` and `applyDocumentMapStyle(key)`. Then the `useEffect` on lines 304-307 re-applies both. Every mode change writes to DOM attributes twice. The `useEffect` was originally needed to ensure the DOM stays in sync, but now that `handleModeChange` always applies both, the useEffect is redundant.
- **Files:** `src/app/page.tsx` lines 304-307
- **Fix:** Remove the `useEffect` that re-applies `applyDocumentMode` and `applyDocumentMapStyle`. The `handleModeChange` and `cycleStyle` callbacks already handle DOM updates. The initial mount is handled by the bootstrap script and the `data-mode`/`data-mapstyle` attributes on the `<html>` element.
- **Status:** TODO

## Deferred Items

### New Deferred Findings from This Cycle

- DF-C4-001: HomeInner god component -- extract to React Context providers (C4-A2, C4-A7, C4-A24) -- re-open in dedicated refactoring cycle
- DF-C4-002: Module-level mutable state in ExportPanel/ModalDialog (C4-A3, C4-A4) -- safe in practice for single-page app; re-open if multi-tree rendering is needed
- DF-C4-003: buildReferenceGridData not memoized (C4-A5) -- infrequent calls; re-open if style cycling becomes animated
- DF-C4-004: showSaveFilePicker double cast (C4-A6) -- add type declaration file; re-open when TypeScript strictness is increased
- DF-C4-005: No persistent storage for scenes/export settings (C4-A10) -- re-open in UX-focused cycle
- DF-C4-006: Export time estimate accuracy (C4-A22, C12-008) -- re-open when export UX is improved
- DF-C4-007: Duplicate theme initialization (C4-A23) -- low risk; re-open if a fourth initialization path is added
- DF-C4-008: Deferred items triage process (C4-A8) -- process concern; address in next planning cycle
- DF-C4-009: generateId() fallback uses Math.random() (C4-A12) -- acceptable for UI keys; re-open if used for security-sensitive purposes
- DF-C4-010: isTouchDevice detection runs once on mount (C4-A13) -- only affects iOS tip hint; re-open if touch detection is used for more features
- DF-C4-011: Multiple eslint-disable comments (C4-A15) -- documented justifications; re-open during lint config audit
- DF-C4-012: fullTrack and track set to same value initially (C4-A17) -- works correctly; re-open during state management refactor
- DF-C4-013: Export progress floating-point edge case (C4-A18) -- rounds correctly in display; re-open if progress is used for control flow
- DF-C4-014: localStorage write failure silently ignored (C4-A19) -- expected behavior; re-open if persistence guarantee is needed
- DF-C4-015: Bootstrap script minified with no source reference (C4-A20) -- stable; re-open when script is next modified
- DF-C4-016: eslint-disable comments lack consistent format (C4-A21) -- minor; re-open during lint config audit
- DF-C4-017: No unit test for parser error code mapping (C4-A25) -- fallback catches unmapped codes; re-open when parser error codes are added

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
- DF-C4-001 (old): `preserveDrawingBuffer: true` always on
- DF-C5-001: TrackToolbar mobile menu focus trapping
- C11-007 (LOW): ElevationProfile RTL click handling
- C11-009 (LOW): Controls elapsed floating point wobble
- C11-005 (LOW): TrackWorkspace title overlap with scene editor
- C12-005 (LOW): TimelineSelector reset button bypasses resolveRangeIndexes
- C12-008 (LOW): ExportPanel file size estimate accuracy
