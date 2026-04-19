# Cycle 11 Implementation Plan

**Date:** 2026-04-19
**Source review:** `comprehensive-deep-code-review-2026-04-19-cycle11.md`

---

## Finding: NEW-C13-1 — Missing `aria-activedescendant` on JourneyCreator combobox

- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `src/components/JourneyCreator.tsx:607-616`
- **Status:** DEFERRED

### Rationale

The current search UX is functional for mouse/touch users. The search feature accepts coordinate input and produces very few results (typically 1). Full `aria-activedescendant` support would require adding active descendant index tracking state, which is a non-trivial change for minimal practical benefit. The `aria-selected={false}` attribute is already present (fixed in cycle 10).

### Exit criterion

When accessibility audit is scheduled or screen reader users report difficulty with the search feature.

---

## Finding: NEW-C13-2 — Render-phase ref assignment in JourneyCreator.tsx

- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `src/components/JourneyCreator.tsx:136-137`
- **Status:** DONE

### Problem

`selectedIconSymbolRef.current = selectedIconSymbol` is written directly in the component body (not inside a `useEffect`). This follows the same render-phase mutation pattern that was fixed in cycle 10 for Toast.tsx and ModalDialog.tsx. While ESLint does not currently flag this (it's a data ref, not a callback ref), it's inconsistent with the established pattern and theoretically risky in React concurrent mode.

### Plan

1. Wrap `selectedIconSymbolRef.current = selectedIconSymbol` in a `useEffect`
2. Run `tsc --noEmit` to confirm no type errors
3. Run `npm run lint` to confirm no new warnings
4. Run `npm run build` to confirm no build errors

### Exit criteria

- `selectedIconSymbolRef` assignment is inside a `useEffect`
- `tsc --noEmit` passes
- `npm run lint` passes
- `npm run build` passes
- Journey creator icon selection still works correctly

### Implementation

Moved `selectedIconSymbolRef.current = selectedIconSymbol` into a `useEffect` callback with descriptive comment. All exit criteria verified: tsc, lint, build pass.

---

## Deferred Findings Update

New deferred items from this cycle:
- NEW-C13-1: Missing `aria-activedescendant` on JourneyCreator combobox (LOW/HIGH)

All previously deferred findings remain unchanged as documented in `.context/plans/deferred-findings-cycle2-2026-04-19.md`.
