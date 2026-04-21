# Aggregate Review -- 2026-04-21

**Date:** 2026-04-21
**Source reviews:** `cycle3-composite-2026-04-21.md`, `cycle4-composite-2026-04-21.md`

---

## Summary

Deep review across 11 agents (code-reviewer, perf-reviewer, security-reviewer, critic, verifier, test-engineer, tracer, architect, debugger, document-specialist, designer). All cycle 3 fixes confirmed applied. **25 new findings** identified this cycle, 2 HIGH severity.

---

## Cycle 3 Findings (All Resolved)

| ID | Finding | Status |
|----|---------|--------|
| U1-1 | React hydration strips data-mode from html | DONE (015d528) |
| U1-2 | Body style has no CSS fallback values | DONE (015d528) |
| U2-2 | ThemeToggle DOM mutation during render | DONE (015d528) |
| U3-1 | GlobalToolbar hidden behind FileUpload overlay | DONE (cd1430c) |
| U4-1 | MapLibre error event not listened to | DONE (bc5e338) |

---

## Cycle 4 New Findings

### HIGH Severity

| ID | Finding | Source | Files |
|----|---------|--------|-------|
| C4-A1 | No E2E test for theme toggle persistence | verifier, test-engineer | e2e/ |
| C4-A2 | Centralized state in HomeInner limits scalability | architect | src/app/page.tsx |

### MEDIUM Severity

| ID | Finding | Source | Files |
|----|---------|--------|-------|
| C4-A3 | Module-level mutable state in ExportPanel | code-reviewer | src/components/ExportPanel.tsx:31 |
| C4-A4 | Module-level mutable state in ModalDialog | code-reviewer | src/components/ModalDialog.tsx:31-32 |
| C4-A5 | buildReferenceGridData not memoized | perf-reviewer | src/components/MapView.tsx:228-328 |
| C4-A6 | showSaveFilePicker typed via double cast | security-reviewer | src/lib/videoEncoder.ts:175-181 |
| C4-A7 | HomeInner is a god component | critic | src/app/page.tsx:32-442 |
| C4-A8 | Deferred items accumulating without triage | critic | plan/cycle3-plan.md |
| C4-A9 | No E2E test for map load error handling | test-engineer | e2e/ |
| C4-A10 | No persistent storage layer beyond localStorage | architect | src/app/page.tsx |
| C4-A11 | Map resize on export failure could leave wrong size | debugger | src/lib/useExportController.ts |

### LOW Severity

| ID | Finding | Source | Files |
|----|---------|--------|-------|
| C4-A12 | generateId() fallback uses Math.random() | code-reviewer | src/types.ts:1-6 |
| C4-A13 | isTouchDevice detection runs once on mount | code-reviewer | src/components/FileUpload.tsx:29-32 |
| C4-A14 | next/image for static SVG adds complexity | code-reviewer | src/components/FileUpload.tsx:163-168 |
| C4-A15 | Multiple eslint-disable comments | code-reviewer | Multiple |
| C4-A16 | Redundant DOM attribute application in useEffect | tracer | src/app/page.tsx:267-307 |
| C4-A17 | fullTrack and track set to same value initially | tracer | src/app/page.tsx:147-148 |
| C4-A18 | Export progress floating-point edge case | debugger | src/lib/videoEncoder.ts:98 |
| C4-A19 | localStorage write failure silently ignored | debugger | src/app/page.tsx:278 |
| C4-A20 | Bootstrap script minified with no source reference | document-specialist | src/app/layout.tsx:49 |
| C4-A21 | eslint-disable comments lack consistent format | document-specialist | Multiple |
| C4-A22 | Export time estimate misleading for fast exports | designer | src/components/ExportPanel.tsx:105 |
| C4-A23 | Duplicate theme initialization logic (3 places) | critic | layout.tsx, page.tsx, ThemeToggle.tsx |
| C4-A24 | Inconsistent prop threading for locale/mode | critic | src/app/page.tsx |
| C4-A25 | No unit test for parser error code mapping | verifier | FileUpload.tsx, parser.ts |

---

## Cross-Finding Analysis

**C4-A2 + C4-A7 + C4-A24 are the same architectural concern:** HomeInner is a god component managing all state. The fix is extracting state into React Context providers, which addresses all three findings simultaneously.

**C4-A3 + C4-A4 are the same pattern:** Module-level mutable state in component modules. Both are safe in practice (single-page app, single React tree) but violate React's single-direction data flow.

**C4-A1 + C4-A9 are the same concern:** Missing E2E regression tests for recently-fixed features. Both cycle 3 user-facing fixes (theme, map error) lack automated regression guards.

---

## Deferred Findings (Carried Forward)

### New Deferred Items from This Cycle

- DF-C4-001: HomeInner god component -- extract to React Context providers (C4-A2, C4-A7, C4-A24) -- re-open in dedicated refactoring cycle
- DF-C4-002: Module-level mutable state in ExportPanel/ModalDialog (C4-A3, C4-A4) -- safe in practice; re-open if multi-tree rendering is needed
- DF-C4-003: buildReferenceGridData not memoized (C4-A5) -- infrequent calls; re-open if style cycling becomes animated
- DF-C4-004: showSaveFilePicker double cast (C4-A6) -- add type declaration file; re-open when TypeScript strictness is increased
- DF-C4-005: No persistent storage for scenes/export settings (C4-A10) -- re-open in UX-focused cycle
- DF-C4-006: Export time estimate accuracy (C4-A22, C12-008) -- re-open when export UX is improved
- DF-C4-007: Duplicate theme initialization (C4-A23) -- low risk; re-open if a fourth initialization path is added
- DF-C4-008: Deferred items triage process (C4-A8) -- process concern; address in next planning cycle

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
