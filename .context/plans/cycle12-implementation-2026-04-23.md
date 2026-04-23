# Cycle 12 Implementation Plan — 2026-04-23

Derived from `.context/reviews/_aggregate.md` (cycle 12).

## Active findings to address this cycle

### 1. C12-F1 — LOW — GoogleGuide illustration SVGs missing `aria-hidden`

**Files:** `src/components/GoogleGuide.tsx:10-128` (GuideIllustration component)

**Issue:** The `GuideIllustration` component renders 7 SVG elements across different `tabIndex` branches. None have `aria-hidden="true"`. These are decorative illustrations — the step content below provides the actual information. Screen readers may traverse and announce individual SVG child elements.

**Implementation steps:**
1. Add `aria-hidden="true"` to the `<svg>` element in `tabIndex === 0` branch (line ~27)
2. Add `aria-hidden="true"` to the `<svg>` element in `tabIndex === 1` branch (line ~43)
3. Add `aria-hidden="true"` to the `<svg>` element in `tabIndex === 2` branch (line ~60)
4. Add `aria-hidden="true"` to the `<svg>` element in `tabIndex === 3` branch (line ~76)
5. Add `aria-hidden="true"` to the `<svg>` element in `tabIndex === 4` branch (line ~89)
6. Add `aria-hidden="true"` to the `<svg>` element in `tabIndex === 5` branch (line ~102)
7. Add `aria-hidden="true"` to the `<svg>` element in `tabIndex === 6` branch (line ~115)
8. This ensures screen readers skip the decorative illustrations entirely

**Verification:** `tsc --noEmit`, `eslint`, `next build`

**Status:** DONE

---

## Deferred findings (not scheduled this cycle)

All prior deferred items remain deferred per their existing exit criteria.

From `.context/plans/deferred-findings-cycle17-2026-04-23.md`:
- DF-C17-001 through DF-C17-006, DF-C17-008 through DF-C17-019 (see that file for details)
- DF-C17-007: RESOLVED (aria-valuetext now present on all SceneEditor sliders)

From cycle 4:
- DF-C4-001: SceneEditor normalizes on every name keystroke (MEDIUM/MEDIUM)
- DF-C4-002: ExportPanel estimated time multiplier inaccuracy (LOW/MEDIUM)

From cycle 5:
- DF-C5-001: Worker ERROR_CODE and MAX_MESSAGE_SIZE constants not enforced (LOW/HIGH)

New deferrals from cycle 12: none — all findings are scheduled this cycle.
