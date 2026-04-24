# Designer — Cycle C2 (2026-04-24)

## Methodology

Reviewed the current Travelback repo from a UI/UX + accessibility perspective with a mix of code inspection and live browser/DOM probing.

### Scope checked
- IA / landing onboarding flow
- Focus order and keyboard affordances
- WCAG 2.2 basics: landmarks, slider semantics, dialog/button affordances, touch targets
- Responsive behavior at 320 / 375 / 768 / 1440 widths
- Loading / empty / error states
- Dark / light mode and reduced-motion handling
- i18n / locale behavior

### Files inspected
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- `src/components/FileUpload.tsx`, `GlobalToolbar.tsx`, `JourneyCreator.tsx`, `KeyboardHelp.tsx`, `MapView.tsx`, `ModalDialog.tsx`, `SceneEditor.tsx`, `ThemeToggle.tsx`, `TimelineSelector.tsx`, `TrackToolbar.tsx`, `TrackWorkspace.tsx`
- `src/components/Controls.tsx`, `ElevationProfile.tsx`, `ExportPanel.tsx`, `GoogleGuide.tsx`, `Toast.tsx`, `ErrorBoundary.tsx`
- `src/lib/camera.ts`, `src/lib/i18n.ts`, `src/lib/interpolate.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`
- `e2e/travelback.spec.ts`

### Live browser checks
- Landing page focus order on a real Chromium probe with WebGL available
- Responsive overflow checks at 320 / 375 / 768 / 1440 widths
- Sample-track workspace tab flow and ARIA inspection
- Journey creator search interaction after enabling coordinate search
- Timeline handle ARIA inspection after loading a sample trip

## Verified healthy areas
- `<main id="app">` landmark is present on the page root.
- Landing and track views do not horizontally overflow at the tested widths.
- Dark/light theming and reduced-motion handling are already in place.
- Error-state buttons now meet the 44px target and have visible focus styling.

## Findings

### 1) JourneyCreator search results are not keyboard-navigable as a real combobox
- **Severity:** Medium
- **Confidence:** High
- **Files:** `src/components/JourneyCreator.tsx:428-463, 568-620`
- **Issue:** The coordinate search uses `role="combobox"` and renders a `role="listbox"`, but keyboard handling only listens for Enter. There is no `aria-activedescendant`, no ArrowUp/ArrowDown/Home/End handling, and the result items are plain buttons inside the listbox. In a live browser probe, after submitting a valid coordinate query, pressing ArrowDown left focus on the input and `aria-activedescendant` remained `null`.
- **Why it matters:** Keyboard-only users can submit with Enter, but they cannot use standard combobox navigation to discover or move through the result row. The ARIA pattern is incomplete, so assistive tech has no active option to announce.
- **Fix:** Track an active option index, wire ArrowUp/ArrowDown/Home/End/Escape, and set `aria-activedescendant` on the input. If the control stays single-result only, consider simplifying it to a button-like helper instead of a faux combobox.

### 2) Timeline range handles expose raw numbers without `aria-valuetext`
- **Severity:** Low
- **Confidence:** High
- **Files:** `src/components/TimelineSelector.tsx:371-436`
- **Issue:** The start/end handles implement slider behavior correctly, but they only expose `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`. In the browser probe, both handles had `aria-valuetext=null`.
- **Why it matters:** Screen readers announce the numeric position but not the meaning of that position, so users hear "0" or "100" instead of a human-readable description of where the trim point sits in the track. The control is usable, but less clear than the rest of the app’s accessibility layer.
- **Fix:** Add localized `aria-valuetext` for both handles, e.g. `"{percent}% start of track"` / `"{percent}% end of track"`, or a similarly concise description that keeps the value meaningful.

### 3) Default scene preset names remain English-only in localized UI
- **Severity:** Low
- **Confidence:** High
- **Files:** `src/lib/camera.ts:210-334`, `src/components/SceneEditor.tsx:371-387, 439-465`
- **Issue:** The preset generators in `src/lib/camera.ts` create default scene names with hard-coded English strings such as `Opening Overview`, `Bird's Eye`, `Flyover`, and `Closing Overview`. The Scene Editor renders those names directly when a preset is committed.
- **Why it matters:** The rest of the UI is localized, but the default scene list still switches back to English in ko/ja/zh/es sessions. That makes the scene editor feel inconsistent and undermines the i18n polish elsewhere.
- **Fix:** Move these names behind translation keys or otherwise generate locale-aware defaults when the preset is created. If the names are intentionally product terms, treat them consistently as branded labels and document that choice.

## Summary

- **Findings:** 3
- **Medium:** 1
- **Low:** 2
- **Overall:** The repo is in strong shape on landmarks, focus rings, responsiveness, dark mode, and motion reduction. The remaining issues are mostly accessibility polish and localization consistency, with the combobox keyboard model being the clearest functional gap.
