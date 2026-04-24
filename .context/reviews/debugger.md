# Debugger Review — latent failure modes

Reviewed surface:

- Context docs: `.context/README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/development/01-conventions.md`, `.context/plans/README.md`, current cycle review artifacts under `.context/reviews/`
- App shell/runtime: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Core logic: `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/lib/i18n.ts`, `src/types.ts`
- User-facing components: `src/components/FileUpload.tsx`, `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`, `src/components/TimelineSelector.tsx`, `src/components/SceneEditor.tsx`, `src/components/ExportPanel.tsx`, `src/components/Controls.tsx`, `src/components/TrackWorkspace.tsx`, `src/components/TrackToolbar.tsx`, `src/components/GlobalToolbar.tsx`, `src/components/ThemeToggle.tsx`, `src/components/ModalDialog.tsx`, `src/components/Toast.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/GoogleGuide.tsx`, `src/components/KeyboardHelp.tsx`, `src/components/ElevationProfile.tsx`
- Static/runtime scripts and tests: `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs`, `scripts/serve-static.mjs`, `scripts/fetch-map-styles.mjs`, `e2e/travelback.spec.ts`, `e2e/fixtures/*`

## Findings

### 1) LOW, HIGH CONFIDENCE, CONFIRMED - Toast enter animation can set state after unmount
**Region:** `src/components/Toast.tsx:25-35`

`ToastItem` schedules `requestAnimationFrame(() => setVisible(true))` but never stores or cancels that frame in cleanup. The timeout cleanup handles the 5-second dismiss timer, but the initial animation-frame callback is still live if the toast unmounts before the next paint.

**Failure scenario:** a toast is added and then dismissed immediately, or the app clears toasts during a track/session reset. The queued rAF runs after unmount and calls `setVisible(true)` on an unmounted component, which produces the usual React "state update on an unmounted component" warning and leaves the toast animation lifecycle nondeterministic.

**Why this matters:** this is a real race, not just a cosmetic nit. The component already uses a ref for the dismiss callback, so it is clearly expected to survive lifecycle churn; the missing rAF cleanup is the one unguarded async callback in the toast path.

**Suggested fix:** capture the animation-frame id and cancel it in cleanup, or gate the callback with a mounted ref the same way other async paths in this repo do.

### 2) MEDIUM, HIGH CONFIDENCE, CONFIRMED - Closing the completed export panel destroys the exported video state
**Regions:** `src/app/page.tsx:300-305`, `src/components/ExportPanel.tsx:201-247`

`handleCloseExport()` calls `resetExportSession()` whenever `exportState === 'done'`, and `resetExportSession()` revokes the object URL and clears `exportedVideoBlob`. That makes the panel close button/backdrop act like a destructive "discard" action after export, even though the UI already has a separate `Export Again` control for that purpose.

**Failure scenario:** a user finishes an export, cancels the native save picker, sees the preview state, and closes the panel to inspect the map. When they reopen export, the rendered MP4 is gone and the app forces a full re-render. The same happens if they simply close the panel by mistake before using Share.

**Why this matters:** the exported blob is the only copy of the expensive render until the user saves or shares it. The current close path silently discards it, which is a state-loss hazard rather than a normal modal-dismiss action.

**Suggested fix:** make close non-destructive and reserve `resetExportSession()` for the explicit `Export Again` path or another clearly labeled discard action.

### 3) LOW, MEDIUM CONFIDENCE, LIKELY RISK - Map-style explicitness can be misclassified for older persisted state
**Regions:** `src/app/page.tsx:44-56, 327-339`

`readInitialExplicitMapStyleChoice()` only knows about explicit intent when `travelback-mapstyle-explicit` is present. If that key is missing, it infers explicitness by comparing the saved style to the current theme default. That works for the current session flow, but it can misclassify older persisted state or partially migrated storage where the user had manually chosen the theme-default map style.

**Failure scenario:** a user upgrades from an older session that only saved `travelback-mapstyle`, or localStorage is partially restored without the explicit flag. On the next theme toggle, the app treats the restored map style as implicit and rewrites it to the theme default, even though the user had already chosen it intentionally.

**Why this is a risk:** the current E2E coverage proves the happy path for an explicit choice made in the same session and across a reload, but it does not cover the older-storage/migration path. The code path is still live, so this is a persistence-boundary regression risk rather than a hypothetical style issue.

**Suggested fix:** persist explicitness unconditionally, or derive it from the presence of a valid saved map-style key instead of comparing against the theme default.

## Final Sweep

I reviewed the current source tree plus the active `.context` docs and the static/E2E surfaces listed above. I did not skip any application source files, worker files, or build/runtime scripts. I did skip generated artifacts such as `.next/`, `out/`, and `node_modules/` as they are build outputs rather than source, and I did not modify any file except this review note.

No additional confirmed correctness crashes or data-loss regressions were found beyond the three items above.
