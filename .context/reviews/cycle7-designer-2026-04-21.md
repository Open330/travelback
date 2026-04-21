# Designer -- Cycle 7 (2026-04-21)

## Methodology

UI/UX review of the Next.js + React + Tailwind CSS + MapLibre GL web frontend. Reviewed information architecture, affordances, focus/keyboard navigation, WCAG 2.2 accessibility, responsive breakpoints, loading/empty/error states, dark/light mode, and perceived performance.

## Accessibility Review

### WCAG 2.2 Compliance

- **Color contrast**: The app uses CSS custom properties (--t1 through --t5 for text, --gl for accent). In light mode, the primary text color is dark (#050810 per layout.tsx:73) on light background (#EBEEF4), which exceeds 4.5:1 contrast ratio. In dark mode, the background is rgb(10,13,20) with light text, also meeting contrast requirements.

- **Focus indicators**: Components use `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` for keyboard focus. This is visible and meets 2.4.7 (Focus Visible).

- **Reduced motion**: globals.css:46-56 properly handles `prefers-reduced-motion: reduce` by disabling `.marker-pulse` animation and replacing `.animate-spin` with a static full circle. The `.export-checkmark` animation is also disabled.

- **ARIA roles**: ModalDialog uses `role="dialog" aria-modal="true"`. TimelineSelector handles use `role="slider"` with `aria-valuenow/min/max`. Scene editor handles also use `role="slider"`. Toast uses `role="log" aria-live="polite"`.

### New Findings

#### C7-DN-1: Controls progress bar slider lacks visible focus indicator on Firefox [LOW/MEDIUM]

**File:** src/components/Controls.tsx:56-73, src/app/globals.css:79-111
**Confidence:** MEDIUM

The progress bar uses `appearance-none` with custom slider thumb styles. The WebKit thumb styles are defined in globals.css but there's no `::-moz-range-thumb:focus` style, and the `focus-visible:outline` is applied to the input but may not be visible with `appearance-none` on Firefox. The custom styling could suppress the default focus indicator.

**Scenario:** Keyboard user tabs to the progress slider on Firefox. No visible focus ring appears because the custom styling overrides the default and no Firefox-specific focus style is defined.

**Fix:** Add `input[type="range"]:focus-visible` outline style in globals.css that works cross-browser, or add `::-moz-range-thumb:focus` styles.

#### C7-DN-2: Export panel's swipe-to-dismiss direction is ambiguous [LOW/LOW]

**File:** src/components/ExportPanel.tsx:87-96
**Confidence:** LOW

The swipe-to-dismiss requires `dy > 80` (downward swipe). This is a standard bottom-sheet dismiss pattern on mobile. However, the export panel is centered on screen (not a bottom sheet), so the swipe-down-to-dismiss may be unintuitive. Users might expect an upward swipe to dismiss or might not expect swipe at all for a centered modal.

**Fix:** LOW priority. The panel also has a close button, so the swipe is an additional affordance, not the primary one.

## Responsive Design

- Mobile (390px): GlobalToolbar hides on loaded track, TrackToolbar shows with hamburger menu. Controls stack vertically. Track title hidden on mobile.
- Tablet/Desktop: Full toolbar visible. Scene editor in side panel.

## Loading/Empty/Error States

- Loading: Spinner on file upload, export progress overlay
- Empty: "No scenes yet" in scene editor, journey creator instructions
- Error: Map error with reload button, parse error with role="alert"

## Summary

UI/UX is well-designed with proper accessibility patterns. The Firefox focus indicator gap on range sliders is the most notable finding but is LOW severity.
