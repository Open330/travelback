# Cycle 11 Implementation Plan — 2026-04-23

Derived from `.context/reviews/_aggregate.md` (cycle 11).

## Active findings to address this cycle

### 1. C11-F1 — LOW — ElevationProfile SVG children missing `aria-hidden`

**Files:** `src/components/ElevationProfile.tsx:94-125`

**Issue:** The SVG root has `role="img"` and `aria-label`, but inner `<defs>`, `<path>`, and `<line>` elements lack `aria-hidden="true"`. Some screen readers may announce individual SVG child elements in addition to the parent label.

**Implementation steps:**
1. Add `aria-hidden="true"` to the `<defs>` element (line 104)
2. Add `aria-hidden="true"` to each `<path>` element (lines 111, 113, 118)
3. Add `aria-hidden="true"` to the `<line>` element (line 120)
4. This ensures the parent `aria-label` is the sole announcement

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

From cycle 9:
- DF-C9-001: JourneyCreator search regex robustness note (LOW/HIGH)
- DF-C9-002: usePlaybackController does not defensively reset on track change (LOW/MEDIUM)
- DF-C9-003: i18n translations bundled inline (LOW/HIGH)

New deferrals from cycle 11: none — all findings are scheduled this cycle.
