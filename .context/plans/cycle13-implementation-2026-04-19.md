# Cycle 13 Implementation Plan

**Date:** 2026-04-19
**Source review:** `comprehensive-deep-code-review-2026-04-19-cycle13.md`

---

## Finding: NEW-C15-1 — JourneyCreator search result `aria-selected` always false

- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `src/components/JourneyCreator.tsx:611`
- **Status:** NOT ACTIONABLE -- DEFERRED

### Problem

The search result listbox options in JourneyCreator all have `aria-selected={false}` hardcoded. Initial review suggested removing it, but the `jsx-a11y/role-has-required-aria-props` eslint rule requires `aria-selected` on elements with `role="option"`. The ARIA spec also mandates this attribute for the option role.

### Resolution

`aria-selected={false}` is the correct value when no option is currently selected. Removing it would violate both the ARIA spec and the eslint rule. The finding is NOT ACTIONABLE as stated.

The underlying concern (no keyboard navigation of search results) overlaps with previously deferred finding NEW-C13-1 (Missing `aria-activedescendant` on JourneyCreator combobox). Full keyboard navigation with `aria-selected` tracking would address both findings but remains deferred as per NEW-C13-1.

---

## Finding: NEW-C15-2 — ExportPanel bitrate readOnly input lacks disabled semantics

- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/components/ExportPanel.tsx:310`
- **Status:** DONE

### Problem

The bitrate input in the advanced section uses `readOnly` with `opacity-60 cursor-not-allowed` but no `disabled` attribute or `aria-disabled` indication. The field appears interactive but cannot be edited. Users may be confused about why they can't type.

### Plan

1. Add `aria-disabled="true"` to the bitrate input in ExportPanel.tsx line 310
2. The `readOnly` attribute remains (needed to prevent editing) but `aria-disabled="true"` communicates the semantic to assistive technologies
3. Run `tsc --noEmit` to confirm no type errors
4. Run `npm run lint` to confirm no new warnings
5. Run `npm run build` to confirm no build errors
6. Commit with semantic message and gitmoji

### Exit criteria

- Bitrate input has `aria-disabled="true"` alongside `readOnly`
- `tsc --noEmit` passes
- `npm run lint` passes
- `npm run build` passes

### Implementation

Added `aria-disabled="true"` to the bitrate input in ExportPanel.tsx. All exit criteria verified: tsc, lint, build pass.

---

## Deferred Findings Update

No new deferred items from this cycle. NEW-C15-1 was determined to be not actionable (aria-selected is required by ARIA spec) and the underlying keyboard navigation concern is already tracked in deferred NEW-C13-1.

All previously deferred findings remain unchanged as documented in `.context/plans/deferred-findings-cycle2-2026-04-19.md`.
