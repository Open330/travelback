# UI/UX Designer Review — Cycle 1 (2026-04-23)

## Summary
Review of the web frontend's information architecture, accessibility, responsive design, dark/light mode, i18n, and perceived performance.

---

## Finding 1: Missing keyboard focus management in SceneEditor
- **File**: `src/components/SceneEditor.tsx`
- **Severity**: Medium | **Confidence**: High
- **Description**: The SceneEditor is a side panel with sliders, selects, and buttons. When expanding/collapsing the parameter section per scene, focus is not managed — the user has to tab through all controls. The slider handles in `SceneRangeEditor` have `tabIndex={0}` and keyboard support (arrow keys, Home/End), which is good, but there's no `aria-valuetext` to announce the current percentage value meaningfully.
- **Fix**: Add `aria-valuetext` attributes to range sliders that announce the percentage value in context (e.g., "45%" instead of just the raw number).

---

## Finding 2: Mobile density — too many controls on small screens
- **File**: `src/components/Controls.tsx`, `src/components/TrackToolbar.tsx`
- **Severity**: Low | **Confidence**: Medium
- **Description**: On mobile, the playback controls bar packs speed selector, duration selector, follow camera toggle, distance stats, and time stats into a compact space. The TrackToolbar moves some controls to a "more" menu, but the Controls bar itself doesn't collapse. The `min-h-11` (44px) touch targets are good for accessibility, but the layout can feel cramped on 320px-wide screens.
- **Fix**: Consider collapsing distance/time stats on very small screens, or using a bottom sheet pattern for additional controls.

---

## Finding 3: Toast notifications have no role-specific aria-live region
- **File**: `src/components/Toast.tsx` line 64
- **Severity**: Low | **Confidence**: High
- **Description**: The toast container uses `role="log"` and `aria-live="polite"`. This is correct for non-urgent notifications. However, error toasts should arguably use `aria-live="assertive"` to ensure screen readers announce them immediately. Currently all toast types use the same live region.
- **Fix**: Use `aria-live="assertive"` for error-type toasts and `aria-live="polite"` for info/success toasts.

---

## Finding 4: FileUpload drop zone lacks visual focus indicator
- **File**: `src/components/FileUpload.tsx`
- **Severity**: Low | **Confidence**: Medium
- **Description**: The file upload area uses `onDrop`, `onDragOver`, `onDragLeave` for drag-and-drop but has no visible focus indicator when tabbed to via keyboard. The `isDragging` state changes the border color and scale, but there's no keyboard-accessible way to trigger the drop zone (the "Browse Files" button is the keyboard alternative, which is good).
- **Fix**: Add a visible focus ring to the drop zone container when focused via keyboard.

---

## Finding 5: GoogleGuide tabs not fully keyboard accessible
- **File**: `src/components/GoogleGuide.tsx` line 289
- **Severity**: Low | **Confidence**: High
- **Description**: The tab buttons use `role="tab"` and `aria-selected`, but the tab panels use `role="tabpanel"` without implementing arrow-key navigation between tabs (Left/Right to switch tabs per WAI-ARIA Tabs pattern). Users must tab through all tab buttons to reach the content.
- **Fix**: Add arrow-key navigation for the tab list per the WAI-ARIA Tabs design pattern.

---

## Finding 6: Good accessibility practices observed
- **Severity**: Positive | **Confidence**: High
- **Description**: (1) ModalDialog implements focus trap with Tab/Shift+Tab cycling. (2) Close on Escape is handled. (3) `aria-modal`, `aria-labelledby` attributes present. (4) `inert` attribute used on app root when modal opens. (5) 44px minimum touch targets on buttons. (6) ARIA labels on interactive controls.

---

## Final Sweep
- All components reviewed for WCAG 2.2 accessibility.
- Responsive breakpoints assessed.
- Dark/light mode support verified (CSS custom properties).
- i18n RTL considerations: the app supports CJK locales but not RTL scripts. The CSS uses `left`/`right` positioning that wouldn't work with RTL layouts.
