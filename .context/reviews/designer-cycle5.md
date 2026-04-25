# Designer (UI/UX) — Cycle 5 (2026-04-23)

## Methodology
Reviewed all UI components for information architecture, affordances, keyboard navigation, WCAG 2.2 accessibility, responsive design, loading/empty/error states, dark/light mode, and i18n/RTL. This is a web frontend with React/Next.js and MapLibre GL.

## New Findings

### C5-D1. SceneEditor aria-valuetext uses hardcoded English (duplicates C5-F1)
- **Severity**: MEDIUM | **Confidence**: HIGH
- **File**: `src/components/SceneEditor.tsx:531, 547, 565, 581`
- **Issue**: Same as C5-F1 from code-reviewer. The `aria-valuetext` on sliders uses English words ("Zoom", "Tilt", "Direction", "Orbit speed") instead of i18n keys. Screen readers in non-English locales will announce these in English.
- **Cross-agent agreement**: code-reviewer (C5-F1)

### C5-D2. GoogleGuide tab list lacks arrow-key navigation
- **Severity**: LOW | **Confidence**: HIGH (already deferred as DF-C17-012)
- **File**: `src/components/GoogleGuide.tsx:289`
- **Issue**: The tab buttons have correct ARIA roles (`role="tab"`, `aria-selected`, `aria-controls`) but lack keyboard navigation (Left/Right arrow keys to move between tabs). Users must Tab through each tab button.
- **Status**: Already deferred as DF-C17-012.

### C5-D3. FileUpload drop zone missing focus indicator
- **Severity**: LOW | **Confidence**: MEDIUM (already deferred as DF-C17-018)
- **Issue**: The drop zone area doesn't have a visible focus ring when focused via keyboard.
- **Status**: Already deferred as DF-C17-018.

## UI/UX Positive Findings
- Dark/light theme switching is smooth with CSS custom properties
- Loading states are well-handled (spinner in FileUpload, progress in ExportPanel)
- Error states use `role="alert"` for screen reader announcement
- Modal dialogs use proper ARIA (labelledBy, overlay, closeOnBackdrop)
- Touch swipe-to-dismiss on SceneEditor and ExportPanel
- Keyboard shortcuts are comprehensive (Space, Arrow keys, F, E, ?)
- Export panel has good platform-specific tips (TikTok, Instagram, YouTube)
- Scene range editor has proper keyboard interaction (Arrow keys, Home, End)
- `inert` attribute used on map container when no track loaded
- Responsive layout adapts between mobile and desktop

## Addendum: Current Pass (2026-04-25)

### C5-D4. JourneyCreator search validation is not bound to the combobox
- **Severity**: MEDIUM | **Confidence**: HIGH
- **File**: `src/components/JourneyCreator.tsx:645-689`
- **Evidence**: In browser automation, after entering `not a location` and submitting, the combobox still had `aria-invalid=null` and `aria-describedby=null` even though the error text was rendered below it.
- **Failure scenario**: Keyboard and screen reader users get a visible validation error, but the field itself is not marked invalid and the message is not associated with the input. The error can be missed entirely when navigating by forms or landmarks.
- **Concrete fix**: Add `aria-invalid={!!searchError}` to the combobox, connect the privacy hint and error message with `aria-describedby`, and give the error a stable `id` plus `role="alert"` or `aria-live="polite"` so it is announced when validation fails.

### C5-D5. Mobile overflow menu closes without returning focus to the trigger
- **Severity**: MEDIUM | **Confidence**: HIGH
- **File**: `src/components/TrackToolbar.tsx:58-85, 137-245`
- **Evidence**: In browser automation on a mobile viewport, opening the menu moved focus to the first item (`New Route`), and pressing Escape collapsed the menu but left `document.activeElement` on `BODY` instead of the `More controls` button.
- **Failure scenario**: Keyboard users lose their place after dismissing the popup and have to tab back from the top of the page. On touch/assistive setups, that makes the toolbar feel broken or jumpy.
- **Concrete fix**: Store a ref to the trigger button, restore focus on close, and consider `aria-haspopup="menu"` plus `aria-controls` if the popup remains a menu-style surface.

### C5-D6. Unit switchers do not expose their active state to assistive tech
- **Severity**: LOW | **Confidence**: HIGH
- **Files**: `src/components/GlobalToolbar.tsx:27-47` and `src/components/TrackToolbar.tsx:197-218`
- **Evidence**: Browser DOM inspection showed the selected `km` button had a colored background, but both unit buttons reported `aria-pressed=null`. The active state is visual-only.
- **Failure scenario**: Screen reader users hear two generic buttons with no indication of which unit system is currently selected. That makes the control usable only by sight.
- **Concrete fix**: Convert the pair to a radio group or add `aria-pressed`/`aria-checked` state to the active button, plus a screen-reader-readable label that announces the current selection.

## Verification Notes
- Loaded the app in Playwright against the local dev server and exercised the upload/onboarding and loaded-track states.
- Headless Chromium in this container could not create a WebGL context, so MapLibre showed its fallback map error banner; the UI shell, toolbar, modal, and form interactions were still verifiable through DOM and keyboard automation.
