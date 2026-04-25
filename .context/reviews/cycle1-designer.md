# Travelback UI/UX Review — Cycle 1

## Scope reviewed

I inspected the UI-relevant surface area of the app:

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/components/Controls.tsx`
- `src/components/ElevationProfile.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/components/ExportPanel.tsx`
- `src/components/FileUpload.tsx`
- `src/components/GlobalToolbar.tsx`
- `src/components/GoogleGuide.tsx`
- `src/components/JourneyCreator.tsx`
- `src/components/KeyboardHelp.tsx`
- `src/components/MapView.tsx`
- `src/components/ModalDialog.tsx`
- `src/components/SceneEditor.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/TimelineSelector.tsx`
- `src/components/Toast.tsx`
- `src/components/TrackToolbar.tsx`
- `src/components/TrackWorkspace.tsx`
- `src/lib/camera.ts`
- `src/lib/env.ts`
- `src/lib/i18n.ts`
- `src/lib/usePlaybackController.ts`
- `src/lib/videoEncoder.ts`
- `src/styles/vitro-base.css`
- `src/types.ts`
- `public/fonts/pretendard.css`
- `public/landing-preview.svg`
- `public/guide/google-maps-phone-export.svg`
- `public/guide/google-takeout-export.svg`
- `public/map-styles/*.json`
- `e2e/travelback.spec.ts`

Browser validation was run against the local static app at `http://localhost:3005/`.

## Live validation evidence

Landing-page accessibility snapshot (`main#app`):

- `button "Browse files to upload"`
- `button "Choose File"`
- `button "Draw a route on the map"`
- `button "Need help finding your file?"`

Keyboard focus order on the landing page also reached an `input[type=file]` after the custom browse button.

Computed styles for that file input showed:

- `display: inline-block`
- `width: 253px`
- `height: 21px`

In the Korean locale (`KO` selected in the language combobox), the same control still surfaced in the accessibility tree as `button "Choose File"`.

## Findings

### 1) Raw file input leaks into the first-run UI and tab order

- **File / region:** `src/components/FileUpload.tsx:250-256` (`input[type="file"]` under the landing upload card)
- **Selector:** `input[type="file"]` inside the upload overlay
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed
- **Issue:** The custom upload CTA is followed by a separate native file control that is not actually hidden in the live app. It shows up as a second focus stop and leaks the browser’s default English file-picker chrome (`Choose File`) into the visual and accessibility tree.
- **Concrete user failure scenario:** A keyboard user tabs from the main upload button into a raw native file input that is not part of the intended design. A Korean/Japanese/Spanish user still hears/reads English browser UI on the same screen, which makes the first-run experience feel broken and inconsistent.
- **Suggested fix:** Keep the file input out of the tab order and out of the rendered UI. Use the custom button to trigger the picker programmatically, and either move the input offscreen with a proper SR-only pattern plus `tabIndex={-1}` / `aria-hidden="true"`, or replace the structure with a correctly labeled `<label>`/input pairing that is intentionally styled instead of leaked.
- **Notes:** The same root pattern also appears in the loaded-track branch of `FileUpload`, so the fix should cover both states.

### 2) Mobile “More controls” sheet is too semantically generic for assistive tech

- **File / region:** `src/components/TrackToolbar.tsx:145-170, 172-257`
- **Selectors:** `button[aria-label="More controls"]`, `[data-testid="track-toolbar-mobile-menu"]`
- **Severity:** Low–Medium
- **Confidence:** Likely
- **Status:** Manual-validation / source-backed
- **Issue:** On small viewports, the overflow panel is exposed as `role="group"` and the trigger only uses `aria-expanded`/`aria-controls`. There is no popup semantic (`aria-haspopup`) and no dialog/menu role on the opened surface, so AT users get a generic container instead of a clear transient action surface.
- **Concrete user failure scenario:** A screen-reader user opens the mobile overflow control and lands in a generic group with no popup cue, making it harder to understand that a temporary controls sheet opened and how it should be dismissed.
- **Suggested fix:** Decide whether this is a menu or a dialog-like sheet, then match the semantics: add `aria-haspopup`, give the panel a matching role/label, and keep keyboard behavior aligned with that model (menu items if it is a menu; dialog semantics if it is a sheet).

## Missed-issue sweep

I rechecked the app for the requested categories: information architecture, affordances, focus/keyboard navigation, WCAG 2.2 accessibility, responsive breakpoints, loading/empty/error states, form-validation UX, dark/light mode, i18n/RTL, and perceived performance.

- Dark/light mode: no blocking issues found in live checks.
- Loading / empty / error states: no blocking UI regressions found beyond the file-input issue above.
- Responsive breakpoints: the desktop/mobile layouts already have targeted coverage in the e2e suite, and I did not find a new blocking layout issue in the inspected screens.
- i18n: locale switching works, but the native file control leak causes an English UI string to appear even in localized sessions.
- RTL: no RTL locales are currently shipped, and I did not find `dir` plumbing in the locale system. I did not report this as a user-facing defect because the app does not currently expose an RTL locale.

## Skipped-file confirmation

- I intentionally skipped generated/vendor build output and dependency trees (`node_modules`, `.next`, `out`, cache/build artifacts).
- I inspected the UI-relevant source files listed above plus the referenced public assets and the Playwright UI tests.
- No unrelated files were modified.
