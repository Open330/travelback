# Comprehensive Deep Code Review — Cycle 11

**Date:** 2026-04-19
**Reviewer:** Multi-angle deep review (code quality, security, performance, accessibility, correctness, UX, architecture)
**Scope:** All 29 source files in `src/`, 4 scripts in `scripts/`, 1 E2E test file

---

## Executive Summary

After 10 previous review cycles and extensive remediation, the codebase is in excellent shape. TypeScript (`tsc --noEmit`) and ESLint both pass cleanly with zero errors. This cycle produced only **2 new actionable findings** — one LOW-severity accessibility gap and one LOW-severity code quality concern. No security vulnerabilities, data-loss risks, or correctness bugs were found. Diminishing returns from further review cycles are now very strong.

---

## NEW-C13-1: Missing `role="listbox"` ID association on JourneyCreator search results container

- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `src/components/JourneyCreator.tsx:607-616`
- **Problem:** The `role="listbox"` container has `id="journey-search-listbox"` and the combobox input uses `aria-controls="journey-search-listbox"`. However, the ID is hardcoded rather than derived from `useId()`, which creates potential ID collisions if multiple JourneyCreator instances were ever rendered simultaneously (though currently only one exists). More importantly, the `role="option"` buttons inside the listbox do have `aria-selected={false}` (fixed in cycle 10), but the listbox container does not set `aria-activedescendant` when a result is highlighted, which is the recommended ARIA pattern for combobox with listbox. Without `aria-activedescendant`, screen readers cannot announce which option is currently focused/highlighted in the list.
- **Failure scenario:** Screen reader users navigating the search results via arrow keys would not hear which result is currently active. The combobox would announce the list is present but not which item is focused.
- **Fix:** This is a minor polish item. The current implementation already works for mouse/touch users. To fully support keyboard-driven screen reader navigation of search results, add `aria-activedescendant` to the combobox input and track the active descendant index in state. Low priority because the search feature accepts coordinate input (not browseable results) and has only a few results at a time.

---

## NEW-C13-2: `JourneyCreator.tsx` ref assignment outside useEffect

- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `src/components/JourneyCreator.tsx:136-137`
- **Problem:** `selectedIconSymbolRef.current = selectedIconSymbol` is written directly in the component body (not inside a `useEffect`). This is the same `react-hooks/refs` pattern that was flagged and fixed in cycle 10 for Toast.tsx and ModalDialog.tsx. However, in this case ESLint does not flag it because the ref is not a callback ref used for stable closure — it's a data ref for the icon symbol used in map event handlers. The assignment is functionally correct, but it follows the same render-phase mutation pattern that React 19 discourages.
- **Failure scenario:** Same theoretical concurrent mode risk as NEW-C12-1 from cycle 10. In practice, no issues because the app is client-only.
- **Fix:** Wrap in `useEffect(() => { selectedIconSymbolRef.current = selectedIconSymbol }, [selectedIconSymbol])` for consistency with the pattern established in cycle 10.

---

## Verified Previously Fixed (Still Fixed)

All findings from cycles 1-10 were verified as still fixed during this review. Key previously fixed items confirmed:

| ID | Finding | Status |
|----|---------|--------|
| NEW-C12-1 | Ref updates during render (Toast.tsx, ModalDialog.tsx) | Confirmed fixed — refs moved into useEffect |
| NEW-C12-2 | setState-in-effect warnings (ExportPanel, GoogleGuide) | Confirmed fixed — eslint-disable with comments |
| NEW-C12-3 | Unused `useMemo` import in SceneEditor | Confirmed fixed — removed |
| NEW-C12-4 | Unused `computeOverviewCamera` function | Confirmed fixed — removed |
| NEW-C12-5 | Missing `aria-selected` on JourneyCreator options | Confirmed fixed — added |
| NEW-C12-6 | Missing `t` dependency in FileUpload handleDrop | Confirmed fixed — added |
| NEW-C11-1 | TimelineSelector distance-ratio mapping | Confirmed fixed — binary search |
| NEW-C11-2 | ExportPanel Share button silently fails | Confirmed fixed — canShare check |
| NEW-C8-1 | Playback hotkeys not suppressed during export | Confirmed fixed |
| NEW-C9-1 | setExportState not guarded by mountedRef | Confirmed fixed |

---

## Sweep: No Additional Files Skipped

All 29 source files in `src/` were reviewed. All 4 scripts in `scripts/` were reviewed. The E2E test file was reviewed. No relevant files were skipped.

---

## Summary of New Actionable Findings

| ID | Finding | Severity | Confidence | Fix Effort |
|----|---------|----------|------------|------------|
| NEW-C13-1 | Missing `aria-activedescendant` on JourneyCreator combobox | LOW | HIGH | Medium (or defer) |
| NEW-C13-2 | Render-phase ref assignment in JourneyCreator.tsx:136 | LOW | HIGH | Small |

---

## Deferred Findings (Carried Forward)

All 11 previously deferred findings remain deferred (F4, F5, F6, F7, F8, F9, F11, F12, F14, F16, NEW-C12-7). No changes to deferral status.
