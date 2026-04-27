# Travelback UI/UX review — cycle 2 (designer)

## Method
- Reviewed the repo’s UI surface end to end: `package.json`, `README.md`, `src/app/*`, `src/components/*`, `src/lib/*`, `src/styles/vitro-base.css`, `e2e/travelback.spec.ts`, `next.config.ts`, `playwright.config.ts`, `playwright.static.config.ts`, and `scripts/harden-static-export.mjs`.
- Used a local dev server plus a browser probe where feasible. Headless Chromium could not initialize WebGL in this environment, so map-specific runtime claims are backed by code inspection rather than screenshots.
- No code was changed; this review artifact is the only file written.

## Findings

| # | Severity | Confidence | Status | Location | Finding | Failure scenario | Suggested fix |
|---|---|---|---|---|---|---|---|
| 1 | Medium | High | Confirmed | `src/components/SceneEditor.tsx:178-190` | The scene range editor exposes both slider handles with static `aria-valuemin={0}` / `aria-valuemax={100}`. For the start handle, the accessible maximum should be the current end value; for the end handle, the accessible minimum should be the current start value. `TimelineSelector` already models the correct pattern at `src/components/TimelineSelector.tsx:425-489`. | Screen-reader users hear bounds that do not match the real constraint, so the handle can be announced as movable into impossible territory; this is a WCAG 2.2 / 4.1.2 name-role-value and 1.3.1 semantics issue. | Make the min/max dynamic per handle, matching `TimelineSelector`, and keep `aria-valuetext` aligned with the actual clamped range. |
| 2 | Medium | High | Confirmed | `src/components/TrackToolbar.tsx:10-16, 66-88, 145-258` and `src/components/ModalDialog.tsx:38-179` | The mobile “more controls” panel is marked `role="dialog"`, but it is not modal: it has no `aria-modal`, no inert background, and no focus trap. The repo already has a reusable `ModalDialog` implementation that performs those duties, but this panel bypasses it. | On small screens, a keyboard user can tab into page content behind the panel while it is open; screen readers are presented a dialog that is not actually modal, which breaks expected focus order and containment. | Reuse `ModalDialog` for the mobile panel, or downgrade it to a true popover/menu with the right semantics and roving focus. |
| 3 | Medium | Medium | Likely | `src/app/page.tsx:462-487` and `src/components/MapView.tsx:571-587` | The app eagerly mounts `MapView` on first load, and the map is created with `canvasContextAttributes: { preserveDrawingBuffer: true }` from the start to support export. That means every landing visit pays the WebGL/MapLibre setup cost before the user has imported a track or created a journey. | On slower laptops and phones, the landing screen spends CPU/GPU budget on a heavy live map that may never be used, which can hurt LCP and interaction responsiveness and drain battery/thermal headroom. | Lazy-mount the map only after it is needed, or split export rendering into a dedicated export-time map instance; if that is too large, at least defer map initialization until a track exists. |
| 4 | Low | Medium | Risk | `src/lib/i18n.ts:1833-1838` and `src/app/page.tsx:462-498` | Locale handling updates `lang` but never sets `dir`, and the chrome uses many physical `left/right/top/bottom` placements. The current locale set is LTR-only, so this is not a current defect, but it is a real RTL-readiness gap. | If an RTL locale is added later, the toolbar, overlays, and absolute-positioned controls will remain visually LTR and feel mirrored in the wrong direction. | Set `document.documentElement.dir` from locale and migrate the highest-impact positioning to logical properties or locale-aware mirroring before expanding locale coverage. |

## Final sweep
I reviewed the relevant UI/source/test/context surface end to end and did not skip any file that affects the user-facing experience:
- App shell: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Components: every file in `src/components/` (`Controls`, `ElevationProfile`, `ErrorBoundary`, `ExportPanel`, `FileUpload`, `GlobalToolbar`, `GoogleGuide`, `JourneyCreator`, `KeyboardHelp`, `MapView`, `ModalDialog`, `SceneEditor`, `ThemeToggle`, `TimelineSelector`, `Toast`, `TrackToolbar`, `TrackWorkspace`)
- Libraries: every file in `src/lib/` (`camera`, `env`, `i18n`, `interpolate`, `parser`, `useExportController`, `usePlaybackController`, `videoEncoder`)
- Styles and tests/config: `src/styles/vitro-base.css`, `e2e/travelback.spec.ts`, `next.config.ts`, `playwright.config.ts`, `playwright.static.config.ts`, `scripts/harden-static-export.mjs`, `README.md`, `package.json`
- Reference context: the existing review artifacts under `.context/reviews/` used to match the repo’s review format

No relevant UI/source/test/context file was skipped.

## Summary
4 findings total: 3 medium, 1 low; 2 confirmed, 1 likely, 1 risk.
