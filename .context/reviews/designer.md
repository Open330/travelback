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
