# Cycle 12 Designer Review — 2026-04-27

Reviewer: designer
Scope: UI/UX review — web frontend with React/MapLibre

## UI/UX presence confirmed

This is a web frontend application with:
- React components (JSX/TSX)
- CSS custom properties for theming (`var(--t1)`, `var(--gl)`, etc.)
- MapLibre GL map integration
- Modal dialogs, sliders, progress bars
- Touch/keyboard interaction support
- Dark/light mode theming

## Findings

### C12-D-01 — `downloadVideo` user activation guard degrades export save UX

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:206-207`, `src/components/ExportPanel.tsx`
- **Detail:** After a long export, users lose the ability to choose where to save their video. The `ExportPanel` shows "Video saved" or "Saved to downloads" but the user had no opportunity to pick a save location. This breaks the expected affordance: after investing time in an export, users expect a save dialog.
- **UX impact:** Loss of agency. The user's mental model is "I made something, I should choose where to keep it." Auto-downloading to a default location feels like the app decided for them.
- **Suggested fix:** Remove the `hasUserActivation` guard so `showSaveFilePicker` is always attempted. If the browser rejects it, fall back gracefully.

### C12-D-02 — ExportPanel progress bar lacks smooth transition during export

- **Severity:** LOW
- **Confidence:** Low
- **Files:** `src/components/ExportPanel.tsx:297`
- **Detail:** The progress bar width updates discretely on each frame. Adding a CSS transition (e.g., `transition: width 0.1s linear`) would smooth the visual update between frames. Currently, the bar jumps in small increments that can appear janky, especially at lower frame rates.
- **Suggested fix:** Add `transition: width 100ms linear` to the progress bar inner div.

## Positive observations

- **Accessibility:** TimelineSelector has proper ARIA slider roles with keyboard navigation. ExportPanel has `role="progressbar"` with `aria-valuenow`. SceneEditor has `aria-expanded` for collapsible sections.
- **Touch targets:** Minimum 44px touch targets on interactive elements (handles, buttons).
- **Dark/light mode:** Properly themed with CSS custom properties. The `data-mode` attribute drives theming.
- **Responsive design:** Multiple responsive breakpoints (`sm:`, `lg:` classes used throughout).
- **Focus management:** `focus-visible` outlines on interactive elements. JourneyCreator focuses the cancel button on mount.
