# Document Specialist — Cycle 2 (2026-04-27)

## Re-evaluation of carried findings

| Prior | Status | Notes |
|-------|--------|-------|
| N19 (test stub documentation) | UNCHANGED | `travelback-export-test-stub` localStorage flag is undocumented. No visible console warning when active. |
| N24 (architecture doc update) | PARTIALLY RESOLVED | Architecture doc (02-architecture.md) has been updated to mention `renderFrameAndWait` and the 5-second timeout. The note at line 69 documents the per-frame capture path. However, the `isExporting` guard and precomputed segments are not documented. |

## New findings

### DS2-01 — Architecture doc does not document `isExporting` prop or precomputed segments

- **Severity:** LOW
- **Confidence:** High
- **Files:** `.context/project/02-architecture.md`
- **Detail:** The architecture doc's Export Pipeline section (lines 46-69) documents `renderFrameAndWait` but does not mention:
  1. The `isExporting` prop that suppresses React-driven effects during export
  2. The precomputed segment strategy for trail geometry updates
  3. The fact that `resetSize` clears container styles before calling `map.resize()`
- **Suggested fix:** Add notes to the Export Pipeline and Component Architecture sections documenting these patterns.

### DS2-02 — Architecture doc's "Key Design Decisions" section references cycle-specific notes without context

- **Severity:** INFO
- **Confidence:** Medium
- **Files:** `.context/project/02-architecture.md:109-122`
- **Detail:** The "Security hardening note" section references specific cycle dates (r4, r5) and specific script file names (`scripts/smoke-static.mjs`). These are implementation-specific details that may become stale. The CSP frame-ancestors explanation is clear and valuable, but the cycle references add noise.
- **Impact:** Documentation readability. The cycle references are useful for historical context but could be moved to a changelog.

### DS2-03 — Component Architecture tree does not show `isExporting` prop flow

- **Severity:** INFO
- **Confidence:** High
- **Files:** `.context/project/02-architecture.md:6-21`
- **Detail:** The component architecture tree lists `useExportController` and `MapView` but doesn't show the `isExporting` prop connection between them. This is a critical data flow path that should be documented.
- **Suggested fix:** Add an arrow or note showing `useExportController → isExporting → MapView`.

## Summary

- Carried forward: 2 findings evaluated (1 unchanged, 1 partially resolved)
- New findings: 3 (1 LOW, 2 INFO)
