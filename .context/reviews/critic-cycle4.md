# Critic -- Cycle 4 (2026-04-21)

## Summary
The codebase shows strong engineering discipline. The main criticisms center on accumulated technical debt from deferred items and the growing complexity of HomeInner as a "god component."

## Criticisms

### CR4-001: HomeInner is a god component [MEDIUM]
- **File:** `src/app/page.tsx` lines 32-442
- **Issue:** `HomeInner` manages 14 state variables, 20+ callbacks, and renders 8+ child components. It acts as the central state store and event dispatcher for the entire application. This violates the Single Responsibility Principle and makes the component difficult to reason about.
- **Impact:** Any state change in HomeInner causes all children to receive new props (even if unrelated). Adding new features requires modifying this already-complex component. Testing individual features in isolation is harder.
- **Mitigation:** The `usePlaybackController` and `useExportController` hooks already extract significant logic. Further extraction into domain-specific contexts (e.g., `TrackContext`, `ThemeContext`) would improve maintainability.

### CR4-002: Inconsistent prop threading for locale/mode [LOW]
- **File:** `src/app/page.tsx` lines 354-419
- **Issue:** `locale`, `setLocale`, `mode`, and `onModeChange` are threaded through multiple component layers: `HomeInner -> GlobalToolbar -> ThemeToggle` and `HomeInner -> TrackWorkspace -> TrackToolbar -> ThemeToggle` (conceptually). The same pattern is used for `units`/`onUnitsChange`. A context-based approach would eliminate this prop drilling.
- **Impact:** Every component in the chain must accept and forward these props, adding boilerplate and making the component API surface larger than necessary.

### CR4-003: Deferred items accumulating without triage [MEDIUM]
- **File:** `plan/cycle3-plan.md` lines 51-83
- **Issue:** There are 25+ deferred findings carried forward across cycles. Some are HIGH severity (DF-C2-002, DF-C2-003, DF-C2-005) but have been deferred for multiple cycles without progress. Without a clear triage process or deadline, these items will continue to accumulate and become harder to address.
- **Impact:** Technical debt is growing. HIGH-severity items should be addressed within a finite number of cycles.

### CR4-004: Duplicate theme initialization logic [LOW]
- **Files:** `src/app/layout.tsx` line 49, `src/app/page.tsx` lines 36-47, `src/components/ThemeToggle.tsx` lines 7-22
- **Issue:** Theme initialization logic exists in three places: (1) the bootstrap script reads localStorage + matchMedia and sets `data-mode`, (2) `HomeInner`'s `colorMode` state initializer reads the attribute and falls back to localStorage + matchMedia, (3) `ThemeToggle`'s `detectInitialMode` reads the attribute and falls back to matchMedia. While (2) and (3) now avoid DOM mutations during render, the triple redundancy is fragile.
- **Impact:** If any of these three sources diverge (e.g., a new preference is added), all three must be updated consistently. The bootstrap script is minified and inline, making it the hardest to maintain.

## Positive Observations
- Error handling is thorough and user-friendly
- i18n coverage is comprehensive with machine-readable error codes
- The modal stack system with focus trapping is well-implemented
- The export pipeline with abort support is robust
- Component composition is generally clean despite HomeInner's size
