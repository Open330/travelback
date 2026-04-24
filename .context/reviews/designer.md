# Designer Review, Cycle 4

## Method
- Inspected the UI-bearing source set: `src/app`, `src/components`, `src/styles`, `src/lib`, `e2e`, `playwright.config.ts`, `playwright.static.config.ts`, `package.json`, and the review/context docs under `.context/` and `plan/`.
- Ran the Next app in browser automation against a fresh dev server on `http://localhost:3002`.
- Probed desktop `1440x1200` and mobile `390x844` viewports.
- Used Playwright DOM checks, computed-style checks, focus order checks, and keyboard interaction. The headless browser could not create a WebGL context in this environment, so the map error fallback rendered on first load.

## Inventory
- App shell and global styling: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/styles/vitro-base.css`
- Primary onboarding and workspace surfaces: `src/components/FileUpload.tsx`, `src/components/MapView.tsx`, `src/components/TrackWorkspace.tsx`, `src/components/TrackToolbar.tsx`, `src/components/GlobalToolbar.tsx`
- Playback and editing surfaces: `src/components/Controls.tsx`, `src/components/TimelineSelector.tsx`, `src/components/SceneEditor.tsx`, `src/components/JourneyCreator.tsx`, `src/components/ElevationProfile.tsx`
- Overlays, dialogs, and guidance: `src/components/ModalDialog.tsx`, `src/components/GoogleGuide.tsx`, `src/components/ExportPanel.tsx`, `src/components/KeyboardHelp.tsx`, `src/components/Toast.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/ThemeToggle.tsx`
- Supporting logic: `src/lib/i18n.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/camera.ts`, `src/lib/interpolate.ts`, `src/lib/parser.ts`, `src/lib/videoEncoder.ts`
- Tests and context: `e2e/travelback.spec.ts`, `playwright.config.ts`, `playwright.static.config.ts`, `.context/reviews/*`, `plan/*`

## Findings

### 1. High, confirmed
`MapView` fallback blocks pointer/touch access to the onboarding controls when WebGL fails

- Evidence: `src/components/MapView.tsx:948-975`, `src/app/page.tsx:371-394`
- Browser evidence:
  - On desktop `1440x1200`, clicking `button[aria-label="Try with a sample trip"]` timed out because `div[data-testid="map-error"]` intercepted pointer events.
  - On mobile `390x844`, the same sample button was visible at `308x174`, but `click()` still timed out with the same interception.
  - Keyboard activation still works, so this is a pointer/touch lockout rather than a total lockout.
- Failure scenario: if a user’s browser cannot create a WebGL context, the app lands in an error state where the upload/sample/onboarding controls are visible but cannot be clicked. That blocks the primary entry path for mouse and touch users.
- Suggested fix: keep the onboarding/upload layer above the map failure layer, or convert the map failure into a non-blocking inline banner. Do not let the map error panel cover the whole stage or intercept clicks meant for `Browse Files`, sample load, or route creation.

### 2. Medium, confirmed
Successful file/sample load does not move focus or announce the workspace transition

- Evidence: `src/app/page.tsx:197-205`, `src/app/page.tsx:253-276`
- Browser evidence:
  - After tabbing to the sample preview and pressing Enter, the track loaded (`Namsan Tower Walk — 56 / 56 locations`).
  - `document.activeElement` fell back to `body`, not to the new workspace, toolbar, or a live-region message.
- Failure scenario: keyboard and screen-reader users get no focus handoff after a successful import. They have to re-tab from the top to find the next control, and there is no explicit success announcement to explain that the workspace changed.
- Suggested fix: after `loadTrackIntoSession(nextTrack)` or a successful import, move focus to a stable landmark in the workspace, such as the track toolbar or title. Also announce success in a polite live region so the transition is detectable without hunting for the new UI.

## Manual Validation Notes
- The map canvas could not be exercised in a real WebGL state in this headless environment because Chromium/SwiftShader failed WebGL context creation. I therefore validated the fallback/error path and the rest of the onboarding interactions, but not a normal map render or export render.
- Bundled locales are all LTR (`en`, `ko`, `ja`, `zh`, `es`). I inspected RTL-sensitive code paths, but RTL is not currently shipped, so it remains a future risk rather than a current bug.
- I reviewed the previously flagged combobox, timeline slider, modal, and reduced-motion areas; I did not find new regressions there in this pass.

## Missed-Issue Sweep
- Checked landing/import, map fallback, keyboard help, global toolbar, track workspace, timeline selection, scene editing, journey creation, export modal, toasts, and shared modal focus handling.
- Checked desktop and mobile viewport behavior.
- No additional UI-bearing files were skipped; only binary/static assets in `public/` were not opened line-by-line.
