# Comprehensive Deep Code Review -- Cycle 13

**Date:** 2026-04-19
**Reviewer:** Multi-angle deep review (code quality, security, performance, accessibility, correctness, UX, architecture)
**Scope:** All 29 source files in `src/`, 4 scripts in `scripts/`, 1 E2E test file, configuration files

---

## Executive Summary

After 12 previous review cycles and extensive remediation, the codebase remains in excellent shape. TypeScript (`tsc --noEmit`) and ESLint both pass cleanly with zero errors. This cycle performed a full re-read of every source file, cross-referencing all previously deferred findings and verifying all previously fixed items. **Two new findings** were identified, both LOW severity. No security vulnerabilities, data-loss risks, or correctness bugs were found. The codebase is production-quality and has reached diminishing returns for further review.

---

## NEW-C15-1: JourneyCreator search result options always have `aria-selected="false"`

- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `src/components/JourneyCreator.tsx:611`
- **Problem:** The search result listbox options all have `aria-selected={false}` hardcoded. Per WCAG 2.2 combobox pattern, when a combobox with `aria-autocomplete="list"` shows results, at least one option (or none if no selection) should reflect the current selection state. While the current implementation does not track a "selected" result (user clicks to select), the `aria-selected` attribute should either be removed entirely (letting the browser default handle it) or track the currently highlighted/active option. Having all options always be `aria-selected="false"` is technically correct for "no selection made" but could confuse screen readers that expect a selected option when the listbox is open with items. More importantly, there is no keyboard navigation of the listbox results -- the user can only click. Adding up/down arrow key navigation with `aria-selected` tracking would improve accessibility.
- **Failure scenario:** A screen reader user opens the coordinate search, sees results, but cannot navigate between them with keyboard arrows and gets no indication of which result is active.
- **Fix:** At minimum, remove the hardcoded `aria-selected={false}` from the option elements (since none is ever selected, omitting the attribute is cleaner). For a more complete fix, add keyboard arrow navigation of search results with proper `aria-selected` tracking and `aria-activedescendant` on the combobox input (this overlaps with the previously deferred NEW-C13-1 finding).

---

## NEW-C15-2: ExportPanel bitrate input is `readOnly` with `cursor-not-allowed` but no visual disabled-state explanation

- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/components/ExportPanel.tsx:310`
- **Problem:** The bitrate input in the advanced section is `readOnly` with `opacity-60 cursor-not-allowed`, but it has no `disabled` attribute or `aria-disabled` indication. The field appears interactive (it's a number input) but cannot be edited. Users may try to click/focus it and wonder why they can't type. The `readOnly` attribute does not communicate the same semantic as `disabled` to assistive technologies. Since bitrate is derived from the quality selector, this field should either be clearly labeled as auto-calculated, or use `disabled` with `aria-disabled="true"` and a visible explanation.
- **Failure scenario:** A user sees the bitrate field, tries to type in it, and is confused when nothing happens. A screen reader user hears the field is "read only" but not why it can't be changed.
- **Fix:** Add `aria-label` or adjacent text explaining "auto-calculated from quality", or add `disabled` attribute alongside `readOnly` and an `aria-describedby` explanation. Alternatively, replace the input with a plain text display of the bitrate value.

---

## Verified Previously Fixed (Still Fixed)

All findings from cycles 1-12 were verified as still fixed during this review. Key previously fixed items confirmed:

| ID | Finding | Status |
|----|---------|--------|
| NEW-C14-1 | ElevationProfile SVG missing `role="img"` | Confirmed fixed |
| NEW-C13-2 | Render-phase ref assignment in JourneyCreator.tsx | Confirmed fixed |
| NEW-C12-1 | Ref updates during render (Toast.tsx, ModalDialog.tsx) | Confirmed fixed |
| NEW-C12-2 | setState-in-effect warnings (ExportPanel, GoogleGuide) | Confirmed fixed |
| NEW-C12-5 | Missing `aria-selected` on JourneyCreator options | Confirmed fixed (partially -- see NEW-C15-1) |
| NEW-C12-6 | Missing `t` dependency in FileUpload handleDrop | Confirmed fixed |
| NEW-C11-1 | TimelineSelector distance-ratio mapping | Confirmed fixed |
| NEW-C11-2 | ExportPanel Share button silently fails | Confirmed fixed |
| NEW-C8-1 | Playback hotkeys not suppressed during export | Confirmed fixed |
| NEW-C9-1 | setExportState not guarded by mountedRef | Confirmed fixed |

---

## Deferred Findings (Carried Forward)

All 12 previously deferred findings remain deferred (F4, F5, F6, F7, F8, F9, F11, F12, F14, F16, NEW-C12-7, NEW-C13-1). No changes to deferral status.

---

## Specialist Angle Reviews

### Code Quality & Maintainability
- Clean component decomposition with 16 well-scoped React components
- Custom hooks (`useExportController`, `usePlaybackController`) properly separate concerns
- Type safety is thorough with TypeScript strict mode
- All `eslint-disable` comments include rationale
- No code duplication concerns

### Security
- CSP is properly configured with `harden-static-export.mjs` post-processing
- No secrets or credentials in source
- No user-generated content rendered without sanitization
- File upload validates extensions and size
- No inline event handlers or `eval` patterns
- All external links use `rel="noopener noreferrer"`

### Performance
- Worker-based parsing for large JSON files
- `requestAnimationFrame` used for drag interactions
- `useMemo` for expensive computations (cumulative distances, histogram buckets)
- `useCallback` with proper dependency arrays throughout
- `memo` wrapping on TimelineSelector and SceneEditor
- No unnecessary re-renders detected

### Accessibility
- Proper ARIA roles on modals, dialogs, tabs, combobox
- Focus trap implementation in ModalDialog with tab cycling
- Keyboard shortcuts with proper suppression during input focus
- `role="img"` added to ElevationProfile SVG (cycle 12)
- `prefers-reduced-motion` media query for animations
- Min 44px touch targets throughout

### Architecture
- Clean separation: types, lib utilities, components, hooks
- i18n fully typed with TranslationKey
- Camera system well-abstracted with scene-based presets
- Map integration properly manages lifecycle and style changes

---

## Sweep: No Additional Files Skipped

All 29 source files in `src/` were reviewed. All 4 scripts in `scripts/` were reviewed. The E2E test file was reviewed. Configuration files (package.json, tsconfig.json, next.config.ts, eslint.config.mjs, playwright configs) were reviewed. No relevant files were skipped.

---

## Summary of New Actionable Findings

| ID | Finding | Severity | Confidence | Fix Effort |
|----|---------|----------|------------|------------|
| NEW-C15-1 | JourneyCreator search options always `aria-selected="false"`, no keyboard nav | LOW | HIGH | Small |
| NEW-C15-2 | ExportPanel bitrate readOnly input lacks disabled semantics | LOW | MEDIUM | Small |
