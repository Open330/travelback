# Designer Review, Cycle 2

## Inventory
- Shell and app frame: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Core input and navigation surfaces: `src/components/FileUpload.tsx`, `src/components/TrackToolbar.tsx`, `src/components/GlobalToolbar.tsx`, `src/components/KeyboardHelp.tsx`
- Playback and editing surfaces: `src/components/Controls.tsx`, `src/components/TimelineSelector.tsx`, `src/components/SceneEditor.tsx`, `src/components/JourneyCreator.tsx`
- Modal and guidance surfaces: `src/components/ModalDialog.tsx`, `src/components/GoogleGuide.tsx`, `src/components/ExportPanel.tsx`, `src/components/Toast.tsx`
- Map and runtime state: `src/components/MapView.tsx`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`
- Verification: Next build succeeded; browser inspection was run at desktop and mobile widths against the static preview.

## Findings

1. **Medium | High confidence**
   **Primary file replacement action collapses to an icon-only control on mobile**
   - Evidence: `src/components/FileUpload.tsx:130-143`
   - Browser evidence: `button[data-testid="load-new-file-button"]` at `390x844` had empty visible text and only `aria-label="Load a new track file"`.
   - Failure scenario: after loading a track on a phone, the only persistent way to replace the file is a 44px folder icon in the top-left corner. Sighted users have to guess what it does, so re-import becomes hard to discover.
   - Suggested fix: keep a short visible label on small screens, or move the action into the mobile toolbar so the primary replacement action stays legible without relying on hover text or icon inference.

2. **Medium | High confidence**
   **Map failure path hard-stops the workspace with only a reload CTA**
   - Evidence: `src/components/MapView.tsx:945-954`
   - Browser evidence: the error state rendered a blocking `Reload Page` button in the map area during browser verification.
   - Failure scenario: if WebGL/context creation fails or MapLibre errors after a track is loaded, the user is told to reload the page. That discards in-memory route edits and offers no retry or degraded fallback path.
   - Suggested fix: add an in-app retry/reinitialize action, keep import/guide controls usable, and consider preserving the loaded track/session so the user can recover without losing work.

3. **Low | High confidence**
   **RTL assumptions are not wired through the document or keyboard model**
   - Evidence: `src/app/layout.tsx:50-53` sets `lang` but never sets `dir`; directional keyboard logic in `src/components/GoogleGuide.tsx:289-310`, `src/components/TimelineSelector.tsx:396-415`, `src/components/SceneEditor.tsx:186-229`, and absolute positioning in `src/components/TrackWorkspace.tsx:122-166` all assume LTR geometry.
   - Failure scenario: if Arabic or Hebrew is added later, left/right arrows will still mean physical left/right and the layout will not mirror. Tabs, sliders, and corner controls will feel backwards and some affordances may overlap.
   - Suggested fix: derive `dir` from locale in the root bootstrap, switch to logical CSS where practical, and invert horizontal key handling when `document.documentElement.dir === 'rtl'`.

## Final Sweep
- Reviewed landing/import state, loaded-track workspace, mobile and desktop toolbar behavior, playback controls, timeline range selection, scene editing, journey creation, Google guide modal, export modal, map empty/error states, toast notifications, and shared modal focus handling.
- No other relevant UI/UX surface was skipped in this pass.

# Designer Review, Cycle 3

## Inventory
- Shell and app frame: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Core input and navigation surfaces: `src/components/FileUpload.tsx`, `src/components/TrackToolbar.tsx`, `src/components/GlobalToolbar.tsx`, `src/components/KeyboardHelp.tsx`
- Playback and editing surfaces: `src/components/Controls.tsx`, `src/components/TimelineSelector.tsx`, `src/components/SceneEditor.tsx`, `src/components/JourneyCreator.tsx`
- Modal and guidance surfaces: `src/components/ModalDialog.tsx`, `src/components/GoogleGuide.tsx`, `src/components/ExportPanel.tsx`, `src/components/Toast.tsx`
- Map and runtime state: `src/components/MapView.tsx`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`
- Verification: `npm run build` succeeded; browser inspection was run against the static preview at desktop and mobile widths; computed-style and keyboard-tab evidence were collected.

## Findings

1. **High | High confidence**
   **Landing map error is visually buried behind the file-upload overlay and comes first in tab order**
   - Evidence: `src/components/MapView.tsx:947-975`, `src/components/FileUpload.tsx:155-172`
   - Browser evidence: on the landing page, `#map-error` was mounted and visible in the DOM, but the upload card covered it in screenshots. Tab order on mobile hit the `CANVAS` map, then the hidden `summary`, then `Reload Page` and `Retry map` before reaching the visible upload CTA.
   - Failure scenario: if MapLibre fails on first load, the user gets a dead landing screen with invisible retry controls underneath the upload card. Keyboard users can land on controls they cannot see, and sighted users get no explanation for why the page is blocked.
   - Suggested fix: raise the map error panel above the upload overlay with a higher stacking context, or hoist the error state into a page-level overlay that replaces the landing card while the map is broken. If the error is shown, keep the visible upload affordance and the retry action in the same accessible layer.

2. **High | High confidence**
   **Primary action styling uses white text on a teal fill that fails WCAG contrast**
   - Evidence: `src/app/globals.css:127-132`, `src/components/FileUpload.tsx:231-239`, `src/components/Controls.tsx:80-87`, `src/components/GlobalToolbar.tsx:27-42`
   - Browser evidence: live contrast checks measured `Browse Files` at `2.15:1` and the active `km/mi` pill at `2.15:1` against the rendered background.
   - Failure scenario: the most important actions in the app read as primary, but the text is not legible enough for normal-size copy/icons on light cards and the top toolbar. This affects file import, playback, and unit switching.
   - Suggested fix: darken the brand fill until white text clears 4.5:1, or switch primary buttons to dark text on a lighter fill. Recheck the rendered buttons against the blended glass backgrounds, not just the raw accent color.

3. **Medium | High confidence**
   **Secondary helper text and guide CTAs on the landing card are too low-contrast**
   - Evidence: `src/components/FileUpload.tsx:225-229`, `src/components/FileUpload.tsx:265-286`
   - Browser evidence: the `formatHint` text measured `3.25:1` after opacity was applied, and the `Need help finding your file?` CTA measured `2.43:1` on the rendered card.
   - Failure scenario: the explanatory copy is hard to read, and the import-guide affordance looks like a link but is not readable enough for small-screen or low-vision users. That weakens the only on-ramp for users who do not already know where their GPX/KML/JSON file lives.
   - Suggested fix: remove the `0.7` opacity from the format hint, use a darker neutral text token for helper copy, and render the guide CTA with a contrast-safe label color or a filled button style instead of teal text on a translucent glass background.

## Final Sweep
- Reviewed landing/import state, loaded-track workspace, mobile and desktop toolbar behavior, playback controls, timeline range selection, scene editing, journey creation, Google guide modal, export modal, map empty/error states, toast notifications, and shared modal focus handling.
- No other confirmed UI/UX issues were found in this pass beyond the findings above.
