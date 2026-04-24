# Designer (UI/UX + Accessibility) — Cycle r9 (2026-04-24)

## UI/UX Review

### Accessibility Assessment

1. **Focus management:** All interactive elements have `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` pattern. Consistent across 17 files.

2. **ARIA attributes:**
   - `MapView`: Uses `aria-hidden` when no track is loaded, `aria-label` for waiting state.
   - `ElevationProfile`: Uses `role="img"`, `aria-label`, keyboard navigation.
   - `TimelineSelector`: Handles use `role="slider"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`. Keyboard navigation works (Arrow keys, Home, End).
   - `SceneEditor`: Has `role="region"` with `aria-labelledby`. Scene range sliders use `role="slider"`.
   - `Controls`: Progress bar has `aria-label` and `aria-valuetext`. Play/pause button has dynamic `aria-label`.
   - `ExportPanel`: Uses `ModalDialog` which provides focus trap and Escape handling.
   - `Toast`: Uses `aria-live` with appropriate assertive/polite modes.

3. **Button types:** All `<button>` elements have `type="button"`. Verified via grep.

4. **Keyboard navigation:** Comprehensive — Space for play/pause, Arrow keys for seek, F for follow, E for export, ? for help, Escape for close panels.

5. **Color contrast:** The app uses CSS custom properties for theming. The `--gl` (glow) color is used for interactive elements. Need to verify contrast ratios in both light and dark modes — but this is already deferred as D1/D10/D11 from cycle r4.

6. **Reduced motion:** No `prefers-reduced-motion` handling detected. Animations include:
   - Loading spinner (CSS `animate-spin`)
   - Toast slide-in (CSS `transition-all duration-300`)
   - Scene editor chevron rotation (CSS `transition-transform`)
   - Export progress bar width transition (`transition: 'width .3s linear'`)

   **Finding C9-DS-001 [MEDIUM/MEDIUM]:** The app does not respect `prefers-reduced-motion`. Users with vestibular disorders may experience discomfort from the spinning loader, sliding toasts, and animated progress bars. The CSS `transition` and `animation` properties should be wrapped in a `@media (prefers-reduced-motion: no-preference)` query, or a reduced-motion fallback should be added.

   **Fix:** Add to global CSS:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```

### Responsive Design

- Mobile: `min-h-11` (44px) touch targets throughout. Good.
- Desktop: Side-by-side layout for SceneEditor. TrackToolbar adapts with mobile menu.
- The `GlobalToolbar` hides on mobile when track is loaded and shows in top-right when no track.

### Information Architecture

- FileUpload landing page is clear with drag-drop area, browse button, and sample trip option.
- GoogleGuide modal provides step-by-step instructions with visual illustrations.
- Keyboard help is discoverable via `?` shortcut.

### Findings

- 1 new finding: C9-DS-001 — No `prefers-reduced-motion` support [MEDIUM/MEDIUM]

## Summary

- 1 new finding (reduced motion support)
- All prior a11y deferred items confirmed still applicable
