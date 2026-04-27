# Designer — Cycle 1 (2026-04-27)

Reviewer: designer
Repository: `/Users/hletrd/flash-shared/Travelback`
Scope: Full codebase including uncommitted changes, focus on accessibility, interaction design, and visual consistency

## Findings

### D-01 — Scene editor range sliders have static `aria-valuemin`/`aria-valuemax` (same as CR-04)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/SceneEditor.tsx:189-190`
- **Detail:** The `SceneRangeEditor` sliders always set `aria-valuemin={0}` and `aria-valuemax={100}` regardless of the actual constrained range. When the start handle is at 40%, the end handle should have `aria-valuemin=40`, not `0`. Screen-reader users receive incorrect boundary information, violating WCAG 4.1.2 (Name, Role, Value) and 1.3.1 (Info and Relationships). The `TimelineSelector` component correctly uses dynamic bounds — the same pattern should apply here.
- **Suggested fix:** Set `aria-valuemin` on the start handle to 0, `aria-valuemax` to `Math.round(endPercent * 100)`. Set `aria-valuemin` on the end handle to `Math.round(startPercent * 100)`, `aria-valuemax` to 100.

### D-02 — Mobile "more controls" panel uses `role="dialog"` semantics but is not truly modal

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/TrackToolbar.tsx`
- **Detail:** The mobile toolbar panel presents as a dialog but keyboard users can tab into page content behind it while it is open. Screen readers announce a dialog that does not trap focus or block outside interaction. This violates WCAG 2.4.3 (Focus Order) and 4.1.2 (Name, Role, Value).
- **Suggested fix:** Reuse `ModalDialog` for the mobile panel, or downgrade to true popover/menu with correct semantics and roving focus.

### D-03 — Animated mesh background does not respect `prefers-reduced-motion`

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/app/layout.tsx:80`, `src/styles/vitro-base.css:389-435`, `src/styles/vitro-base.css:761-767`
- **Detail:** The Vitro mesh background animation runs continuously with `0.01ms !important` animation duration as a reduced-motion workaround. However, `0.01ms` is not zero — the animation loop still fires, consuming GPU resources. For users who prefer reduced motion, the animated mesh can cause discomfort and competes with map rendering during export. This is the same F13 finding from cycle 2.
- **Suggested fix:** Set `animation: none !important` for the mesh under `@media (prefers-reduced-motion: reduce)`. Consider pausing the mesh during playback/export via a CSS class or data attribute.

### D-04 — Locale handling never sets `dir` attribute (RTL unreadiness)

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/i18n.ts:1833-1838`, `src/app/page.tsx:462-498`
- **Detail:** If an RTL locale (e.g., Arabic) is added later, toolbar/overlays/controls remain visually LTR. The locale setter updates `document.documentElement.lang` but never sets `document.documentElement.dir`. This is the same F28 finding from cycle 2.
- **Suggested fix:** Set `document.documentElement.dir` from locale. Migrate highest-impact positioning to logical CSS properties (`start`/`end` instead of `left`/`right`).

## Summary

| Severity | Count |
|----------|-------|
| MEDIUM   | 3     |
| LOW      | 1     |
| **Total** | **4** |
