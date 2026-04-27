# Designer / UI-UX Review — Cycle 5 (2026-04-27)

Repository: `/Users/hletrd/flash-shared/Travelback`
Reviewer: designer

## Findings

### D5-01 — Export progress bar uses `width` transition which causes visual lag behind actual progress
- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **File:** `src/components/ExportPanel.tsx:296`
- **Description:** The export progress bar uses `style={{ width: `${exportProgress * 100}%`, transition: 'width .3s linear' }}`. The 0.3s CSS transition means the visual bar lags behind the actual progress value. For fast exports (short duration, low fps), the progress jumps significantly between frames and the 0.3s transition creates a noticeable delay. For slow exports, the transition is smooth but the bar appears to "chase" the actual value.
- **Failure scenario:** User sees the progress bar at 80% when the export is actually at 95%. When the export completes suddenly, the bar animates from 80% to 100% over 0.3s, creating a "rubber band" effect.
- **Suggested fix:** Use `transition: none` during active export and only animate the final transition to 100%. Or use a much shorter transition (50ms) that's imperceptible but smooths jitter.

---

### D5-02 — Mobile "more controls" menu lacks focus trap — keyboard users escape into the page
- **Severity:** MEDIUM
- **Confidence:** High
- **File:** `src/components/TrackToolbar.tsx:145-259`
- **Description:** The mobile "more controls" dropdown is marked with `role="dialog"` and `aria-haspopup="dialog"`, but it does NOT implement a focus trap. When the menu is open, pressing Tab moves focus out of the menu and into the page content behind it. This violates WCAG 2.2 SC 2.4.3 (Focus Order) and SC 4.1.2 (Name, Role, Value) — the dialog role implies modal behavior that isn't implemented.
- **Failure scenario:** A keyboard user opens the "more controls" menu. Pressing Tab moves focus to the map or other controls behind the menu. The user can't navigate back to the menu without closing and reopening it. Screen reader users hear "dialog" but can interact with content behind it.
- **Suggested fix:** Implement a focus trap using the same pattern as `ModalDialog` (which already handles this correctly). Or, if the menu shouldn't be modal, downgrade from `role="dialog"` to `role="menu"` with proper `aria-orientation` and roving tabindex.

---

### D5-03 — Elevation profile SVG has `preserveAspectRatio="none"` which distorts on very wide or very tall containers
- **Severity:** LOW
- **Confidence:** Medium
- **File:** `src/components/ElevationProfile.tsx:99`
- **Description:** The SVG uses `preserveAspectRatio="none"` with a `viewBox="0 0 100 100"`. This stretches the elevation profile non-uniformly to fit the container. On very wide containers, the profile appears horizontally stretched (mountains look wider than they should). On narrow containers, features appear compressed. While this is intentional to fill the available width, it means the visual shape of the elevation profile doesn't correspond to the actual steepness of the terrain.
- **Failure scenario:** On a wide desktop monitor, a steep cliff appears as a gentle slope because the x-axis is stretched. The visual representation misleads the user about terrain difficulty.
- **Suggested fix:** Consider using `preserveAspectRatio="xMidYMid slice"` or adding x/y axis labels to make the non-uniform scaling clear. At minimum, document that the profile is a schematic visualization, not a to-scale cross-section.

---

### D5-04 — Toast notifications can overlap with bottom controls on small viewports
- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **File:** `src/components/Toast.tsx`, `src/components/Controls.tsx:52`
- **Description:** The Toast component typically renders at the bottom-center of the screen. The Controls component also renders at the bottom. On small viewports (< 400px height), toast messages (especially multi-line ones like export success messages) can overlap with the playback controls, making both the toast and the controls difficult to interact with.
- **Failure scenario:** An export completes while the user is adjusting playback speed. The "Export complete" toast appears over the speed selector. The user can't change speed until the toast auto-dismisses.
- **Suggested fix:** Position toasts above the controls area (e.g., `bottom: 12rem` instead of `bottom: 1rem` when a track is loaded). Or make the controls area a CSS stacking context that toasts can't overlap.

---

## Summary

| ID | Severity | Confidence | File |
|----|----------|------------|------|
| D5-01 | LOW-MEDIUM | High | ExportPanel.tsx |
| D5-02 | MEDIUM | High | TrackToolbar.tsx |
| D5-03 | LOW | Medium | ElevationProfile.tsx |
| D5-04 | LOW-MEDIUM | High | Toast.tsx / Controls.tsx |
