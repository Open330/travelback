# Cycle 10 Implementation Plan — 2026-04-23

Derived from `.context/reviews/_aggregate.md` (cycle 10).

## Active findings to address this cycle

### 1. C10-F8 — MEDIUM — Controls progress bar missing `aria-valuetext`

**Files:** `src/components/Controls.tsx:55-73`, `src/lib/i18n.ts`

**Issue:** The progress range input has `aria-label` but no `aria-valuetext`. Screen reader users hear only a raw 0-1 decimal for the value.

**Implementation steps:**
1. Add i18n key `controls.progressValueText` with template `{traveled} / {total}, {percent}%` in all 5 locales
2. In Controls.tsx, add `aria-valuetext` to the progress range input using the new i18n key, populated with `formatDistance(traveled, units)`, `formatDistance(total, units)`, and `Math.round(progress * 100)`
3. The `formatDistance` helper and `traveled`/`total`/`progress` variables are already available in the component

**Verification:** `tsc --noEmit`, `eslint`, `next build`

**Status:** TODO

---

### 2. C10-F4 — LOW — Toast `role="log"` with redundant `aria-live`

**Files:** `src/components/Toast.tsx:68`

**Issue:** `role="log"` already implies `aria-live="polite"`. The dynamic switching between assertive/polite is valid, but combining `role="log"` with `aria-live="assertive"` is semantically unusual and may cause double announcements.

**Implementation steps:**
1. Change `role="log"` to just a `div` (remove the role)
2. Keep the dynamic `aria-live` attribute (assertive for errors, polite otherwise)
3. Add `aria-atomic="false"` to preserve incremental announcements (log-like behavior)

**Verification:** `tsc --noEmit`, `eslint`, `next build`

**Status:** TODO

---

### 3. C10-F11 — LOW — ExportPanel bitrate input conflicting `readOnly` + `aria-disabled`

**Files:** `src/components/ExportPanel.tsx:341`

**Issue:** `readOnly` and `aria-disabled="true"` are semantically conflicting. `readOnly` means focusable but not editable; `aria-disabled` suggests not interactable.

**Implementation steps:**
1. Remove `aria-disabled="true"` from the bitrate input at line 341
2. Keep `readOnly` and the existing `opacity-60 cursor-not-allowed` CSS classes for visual indication

**Verification:** `tsc --noEmit`, `eslint`, `next build`

**Status:** TODO

---

### 4. C10-F12 — LOW — SceneRangeEditor missing `userSelect:'none'` for drag

**Files:** `src/components/SceneEditor.tsx:140`

**Issue:** During drag, mouse-based text selection can occur in the scene editor. The TimelineSelector handles this with `userSelect: 'none'` but SceneRangeEditor doesn't.

**Implementation steps:**
1. Add `userSelect: 'none'` to the style object on the SceneRangeEditor outer container div (line 140, the one with `ref={containerRef}`)

**Verification:** `tsc --noEmit`, `eslint`, `next build`

**Status:** TODO

---

### 5. C10-F10 — LOW — TimelineSelector duplicated `ratioToIndex` logic

**Files:** `src/components/TimelineSelector.tsx:106-123, 167-183`

**Issue:** The binary search logic is duplicated between `resolveRangeIndexes` and `resolveIndexesForRatios`. Any bug fix must be applied in two places.

**Implementation steps:**
1. Extract the binary search into a module-level helper function `ratioToIndex(ratio, edge, cumulDist, lastIndex)` that accepts all needed parameters
2. Refactor `resolveRangeIndexes` to call the shared helper
3. Refactor `resolveIndexesForRatios` to call the shared helper
4. Remove the duplicated inner `ratioToIndex` functions from both callbacks

**Verification:** `tsc --noEmit`, `eslint`, `next build`

**Status:** TODO

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

New deferrals from cycle 10: none — all findings are scheduled this cycle.
