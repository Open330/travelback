# Cycle 4 Designer / UI-UX Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Methodology
Reviewed UI/UX covering information architecture, affordances, focus/keyboard navigation, WCAG 2.2 accessibility, responsive breakpoints, loading/empty/error states, form validation UX, and dark/light mode. This is a web frontend project with React/Next.js components.

## Findings

### C4-UX01 — Scene editor range sliders: keyboard navigation works but `aria-valuetext` uses percentages only
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/SceneEditor.tsx:188`
- **Detail:** The `aria-valuetext` is `${Math.round(value * 100)}% ${t('scenes.rangeStart')}`. This is accessible but doesn't convey the camera mode or scene name. A screen reader user navigating between scene sliders would hear "45% Range Start" without knowing which scene. The `aria-label` on the slider includes the scene name, so context is available on focus, but the valuetext itself is minimal.
- **Suggested fix:** Consider including the scene name in `aria-valuetext` for richer feedback.

### C4-UX02 — Mobile "more controls" panel in TrackToolbar uses `role="dialog"` but is not truly modal
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/TrackToolbar.tsx`
- **Detail:** Already noted as C3-11 (deferred). The panel is marked as a dialog but keyboard focus can escape to page content behind it. Screen readers announce it as a dialog but it doesn't trap focus.
- **Suggested fix:** Reuse `ModalDialog` component or downgrade to correct `role="menu"` or `role="region"` semantics.

### C4-UX03 — Export panel swipe-to-dismiss may conflict with vertical scrolling in export settings
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/ExportPanel.tsx`
- **Detail:** Already resolved as N35/C3-35 (vertical-dominant swipe required). The fix requires a dominant vertical component for dismiss. This is now working correctly.
- **Suggested fix:** No fix needed — already resolved.

### C4-UX04 — No focus-visible indicators on map controls (MapLibre built-in controls)
- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:709`
- **Detail:** `map.addControl(new maplibregl.NavigationControl(), 'top-left')` adds zoom/compass buttons. These use MapLibre's default styling which may not match the app's `focus-visible:outline-[rgb(var(--gl))]` pattern. When a keyboard user tabs to these controls, the focus indicator may not be visible in dark mode.
- **Suggested fix:** Add CSS overrides for `.maplibregl-ctrl button:focus-visible` in `globals.css`.

### C4-UX05 — Dark/light mode toggle only available in GlobalToolbar, not easily discoverable
- **Severity:** LOW
- **Confidence:** Low
- **Files:** `src/components/GlobalToolbar.tsx`, `src/app/page.tsx:417-456`
- **Detail:** The theme toggle is in the GlobalToolbar (top-right corner). Users who prefer reduced motion or specific themes may not discover this. The app also follows system preference by default, which is correct. The `prefers-color-scheme: dark` media query listener is properly set up.
- **Suggested fix:** No fix needed — system preference following is the correct default behavior.

### C4-UX06 — `prefers-reduced-motion: reduce` disables mesh animation but doesn't reduce camera movement
- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx`, `src/app/globals.css`
- **Detail:** The reduced-motion media query disables the pulsing marker animation. However, it doesn't reduce camera smoothing during playback or scene transitions. The `SCENE_CAMERA_SMOOTHING` (0.7) and `CAMERA_SMOOTHING` (0.1) constants control camera interpolation speed. For users who prefer reduced motion, the camera transitions should be more direct (higher smoothing factor or jump-to instead of smooth interpolation).
- **Suggested fix:** Check `prefers-reduced-motion` and increase smoothing factors or use `jumpTo` instead of smooth camera transitions.

### C4-UX07 — Error boundary has no visual recovery mechanism beyond page reload
- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/ErrorBoundary.tsx`
- **Detail:** The ErrorBoundary component catches React rendering errors and displays a fallback UI. However, it only offers a page reload as recovery. If the error is in a non-critical component (e.g., scene editor), the user loses their entire track session.
- **Suggested fix:** Consider adding a "Try Again" button that resets the error boundary's state without a full page reload.

## Summary
| Severity | Count |
|----------|-------|
| HIGH | 0 |
| MEDIUM | 1 |
| LOW | 6 |
| **Total** | **7** |
