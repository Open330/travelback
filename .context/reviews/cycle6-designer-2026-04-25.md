# Cycle 6 UI/UX Review

Reviewed the full Next frontend surface, including the shell, upload flow, map workspace, editor panels, export flow, and shared accessibility plumbing. I also loaded the app in Chromium against `npm run dev`; the shell rendered successfully, and the app's own map fallback appeared in headless mode because WebGL was unavailable in the container. I did not observe page-level JavaScript errors.

## Confirmed Issues

1. High - The coordinate search in JourneyCreator mixes combobox semantics with tabbable buttons.
Files: [src/components/JourneyCreator.tsx](/Users/hletrd/flash-shared/Travelback/src/components/JourneyCreator.tsx#L645) and [src/components/JourneyCreator.tsx](/Users/hletrd/flash-shared/Travelback/src/components/JourneyCreator.tsx#L694)
Failure scenario: A keyboard user opens the search results, but each result is rendered as a `<button role="option">`. That means Tab can jump into the list, the combobox pattern is no longer owned by the input, and screen readers may announce button behavior instead of a single autocomplete interaction.
Suggested fix: Keep focus on the input, render options as non-tabbable `role="option"` elements, and let `aria-activedescendant` drive selection entirely.
Severity: High
Confidence: High

2. Medium - The elevation profile is interactive but exposed to assistive tech as a static image.
Files: [src/components/ElevationProfile.tsx](/Users/hletrd/flash-shared/Travelback/src/components/ElevationProfile.tsx#L96) and [src/components/ElevationProfile.tsx](/Users/hletrd/flash-shared/Travelback/src/components/ElevationProfile.tsx#L74)
Failure scenario: Keyboard users can seek the timeline with arrow keys, but the control is announced as `role="img"` with no value semantics. The current progress is not exposed, so the component behaves like a slider while being read like a decorative graphic.
Suggested fix: Promote it to a real slider pattern, or synchronize it with an actual range input and expose `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
Severity: Medium
Confidence: High

3. Medium - The mobile toolbar popup advertises dialog semantics even though it behaves like a simple flyout.
Files: [src/components/TrackToolbar.tsx](/Users/hletrd/flash-shared/Travelback/src/components/TrackToolbar.tsx#L145) and [src/components/TrackToolbar.tsx](/Users/hletrd/flash-shared/Travelback/src/components/TrackToolbar.tsx#L160)
Failure scenario: The trigger says `aria-haspopup="dialog"`, but the popup is a `role="group"` panel with no dialog semantics or focus trap. Screen readers get the wrong expectation, and keyboard behavior does not match the announced role.
Suggested fix: Either make it a real dialog/menu with matching roles and focus management, or remove the dialog claim and treat it as a plain popover.
Severity: Medium
Confidence: High

4. Medium - Scene deletion and scene-range correction feedback are only rendered visually.
Files: [src/components/SceneEditor.tsx](/Users/hletrd/flash-shared/Travelback/src/components/SceneEditor.tsx#L481) and [src/components/SceneEditor.tsx](/Users/hletrd/flash-shared/Travelback/src/components/SceneEditor.tsx#L656)
Failure scenario: When a scene is deleted, the undo banner appears on screen but is not announced. The same is true for normalization warnings when ranges overlap or collapse, so screen-reader users can miss destructive edits and the available recovery action.
Suggested fix: Add a live region or status announcement for delete, undo, and normalization events, and consider moving focus to the undo action after destructive edits.
Severity: Medium
Confidence: High

## Risks / Manual Validation

1. Low - RTL is not wired into the layout system.
Files: [src/lib/i18n.ts](/Users/hletrd/flash-shared/Travelback/src/lib/i18n.ts#L1758) and [src/app/layout.tsx](/Users/hletrd/flash-shared/Travelback/src/app/layout.tsx#L56)
Note: This is not a present bug because the supported locales are currently `en`, `ko`, `ja`, `zh`, and `es`, all of which are LTR. If RTL is ever added, the hard-coded left/right positioning in the toolbars, drawers, toasts, and map overlays will need a deliberate mirroring pass.
Severity: Low
Confidence: High

2. Low - Contrast should still be validated manually on real hardware in dark mode.
Files: [src/styles/vitro-base.css](/Users/hletrd/flash-shared/Travelback/src/styles/vitro-base.css#L456) and [src/app/globals.css](/Users/hletrd/flash-shared/Travelback/src/app/globals.css#L147)
Note: I did not confirm a contrast failure in source or browser. The main risk area is the app's translucent glass surfaces combined with very small helper text and theme-variable-driven color decisions, which are the first places glassmorphism UIs tend to slip below WCAG contrast on lower-quality displays.
Severity: Low
Confidence: Medium

## Sweep Notes

- Reduced motion is mostly covered globally in [src/styles/vitro-base.css](/Users/hletrd/flash-shared/Travelback/src/styles/vitro-base.css#L761) and [src/app/globals.css](/Users/hletrd/flash-shared/Travelback/src/app/globals.css#L46); I did not confirm a motion regression.
- I did not find a confirmed loading, empty, or error-state regression in the reviewed code paths. The map error fallback and export/error handling are both explicitly surfaced in the UI.
