# Cycle 4 Composite Review -- 2026-04-21

## Review Agents
code-reviewer, perf-reviewer, security-reviewer, critic, verifier, test-engineer, tracer, architect, debugger, document-specialist, designer

## New Findings This Cycle

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
| C4-A16 | Redundant DOM attribute application | tracer | src/app/page.tsx:267-307 |
| C4-A17 | fullTrack and track set to same value initially | tracer | src/app/page.tsx:147-148 |
| C4-A18 | Export progress floating-point edge case | debugger | src/lib/videoEncoder.ts:98 |
| C4-A19 | localStorage write failure silently ignored | debugger | src/app/page.tsx:278 |
| C4-A20 | Bootstrap script minified with no source reference | document-specialist | src/app/layout.tsx:49 |
| C4-A21 | eslint-disable comments lack consistent format | document-specialist | Multiple |
| C4-A22 | Export time estimate misleading for fast exports | designer | src/components/ExportPanel.tsx:105 |
| C4-A23 | Duplicate theme initialization logic (3 places) | critic | layout.tsx, page.tsx, ThemeToggle.tsx |
| C4-A24 | Inconsistent prop threading for locale/mode | critic | src/app/page.tsx |
| C4-A25 | No unit test for parser error code mapping | verifier | FileUpload.tsx, parser.ts |

## Carried-Forward Deferred Items (25+)

All previously deferred findings remain open. Key HIGH-severity items:
- DF-C2-002: Playback progress drives whole-app rerenders (HIGH/HIGH)
- DF-C2-003: Large GPX/KML imports parse on main thread (HIGH/HIGH)
- DF-C2-005: Export settings permit browser-hostile combinations (HIGH/HIGH)
- DF-C2-009: Residual CSP allows inline styles (HIGH/HIGH)
- DF-C3-002: Mobile users lose theme/locale access when track loaded (MEDIUM/MEDIUM)

## Actionable Items for This Cycle

Based on severity and fix complexity, the following items are candidates for immediate implementation:

1. **C4-A1** (HIGH): Add E2E test for theme persistence -- prevents regression of cycle 3 fix
2. **C4-A11** (MEDIUM): Guard map resize reset in export controller -- defensive improvement
3. **C4-A16** (LOW): Remove redundant useEffect for DOM attribute application -- code cleanup

Items that are architectural in nature (C4-A2, C4-A7, C4-A8, C4-A10) are deferred to a dedicated refactoring cycle.
