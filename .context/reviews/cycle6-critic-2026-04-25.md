# Cycle 6 Critic Review — 2026-04-25

## Scope and inventory
I reviewed every runtime-relevant file in the repo rather than sampling:

- App/config entrypoints: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `playwright.config.ts`, `playwright.static.config.ts`
- App shell and styling: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/styles/vitro-base.css`, `src/types.ts`, `src/lib/env.ts`, `src/lib/i18n.ts`
- Core logic: `src/lib/parser.ts`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`
- UI/runtime components: `src/components/FileUpload.tsx`, `MapView.tsx`, `TrackWorkspace.tsx`, `Controls.tsx`, `TimelineSelector.tsx`, `JourneyCreator.tsx`, `ExportPanel.tsx`, `SceneEditor.tsx`, `GlobalToolbar.tsx`, `TrackToolbar.tsx`, `GoogleGuide.tsx`, `KeyboardHelp.tsx`, `ThemeToggle.tsx`, `ModalDialog.tsx`, `Toast.tsx`, `ErrorBoundary.tsx`, `ElevationProfile.tsx`
- Static/runtime assets with behavior impact: `public/workers/trackParser.worker.js`, `public/map-styles/*.json`, `public/fonts/pretendard.css`
- Tooling/scripts: `scripts/fetch-map-styles.mjs`, `harden-static-export.mjs`, `serve-static.mjs`, `smoke-static.mjs`, `run-dev-e2e.mjs`, `run-static-e2e.mjs`
- Test coverage: `e2e/travelback.spec.ts` plus referenced parser/export fixtures

I did not treat archived plans/reviews/screenshots under `.context/` and `plan/` as review targets because they are not part of the shipped runtime.

## Verification performed
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run smoke:static` passed.
- Production build emitted `out/`, and `out/index.html` contains the hardened static CSP meta tag.

## Confirmed issues

### 1. High — export duration UI can claim 300s while the actual export is silently clamped to 180s
- Evidence: playback allows `300` seconds in `src/components/Controls.tsx:23-24,114-128`.
- Evidence: export hard-caps duration at `180` seconds in `src/types.ts:80-84`.
- Evidence: `ExportPanel` copies the playback duration into local state on open (`src/components/ExportPanel.tsx:81,83-93`), shows that raw value in the numeric input (`src/components/ExportPanel.tsx:321-334`), but clamps the real export request through `safeDuration` (`src/components/ExportPanel.tsx:99,153-157`).
- Failure scenario: a user sets playback to `5:00`, opens Export, sees `300` in the duration field, and exports assuming the full route will be rendered. The export is actually truncated to `180` seconds with no warning, so the output length does not match the UI.
- Suggested fix: either remove `300` from playback durations, or let export support it, or visibly clamp/surface the cap when opening the export panel so the displayed value and actual request cannot diverge.
- Severity: high
- Confidence: high

### 2. Medium — the journey creator promises generic “map link” support, but only parses links with embedded coordinates
- Evidence: the UI copy explicitly says “Paste coordinates or map link” / equivalent localized variants in `src/lib/i18n.ts:250-257,598-605,1642-1649`.
- Evidence: the parser only accepts a narrow set of coordinate-bearing formats: `geo:`, `@lat,lng`, `?q=`, `?ll=`, `#map=...`, and raw `lat,lng` (`src/components/JourneyCreator.tsx:96-131`).
- Evidence: `runSearch` treats any other link as invalid (`src/components/JourneyCreator.tsx:469-489`).
- Failure scenario: a user pastes a common Google Maps share URL such as a shortlink or place URL without literal coordinates and gets a validation error, even though the UI told them “map link” was supported.
- Suggested fix: narrow the copy to “coordinates or links that include coordinates”, or expand the parser with explicit provider-specific local decoders for the links you want to support.
- Severity: medium
- Confidence: high

### 3. Low — the mobile “more controls” trigger advertises dialog semantics, but the popup is not a dialog
- Evidence: the trigger sets `aria-haspopup="dialog"` and `aria-controls="track-toolbar-mobile-menu"` in `src/components/TrackToolbar.tsx:149-153`.
- Evidence: the popup itself is rendered as `role="group"`, not a dialog or menu, in `src/components/TrackToolbar.tsx:160-168`.
- Failure scenario: assistive tech announces a dialog relationship that never materializes; keyboard and screen-reader expectations for the popup do not match the actual DOM semantics.
- Suggested fix: either implement it as a real `ModalDialog`, or change the semantics to an actual menu pattern (`aria-haspopup="menu"`, `role="menu"`, `role="menuitem"`), or drop the misleading `aria-haspopup` claim.
- Severity: low
- Confidence: high

## Likely issues / hidden coupling

### 4. High — playback/export rendering cost scales with full track length on every frame, despite a 250k-point parser ceiling
- Evidence: the parser explicitly allows tracks up to `250_000` points in `src/lib/parser.ts:4,644-645`.
- Evidence: `MapView` rebuilds full route/trail geometries from the original point array via `buildTrackGeometry(...)` (`src/components/MapView.tsx:109-170`) and refreshes the trail source every progress tick (`src/components/MapView.tsx:894-900`).
- Evidence: export reuses the same camera/map path frame-by-frame through `useExportController` and `exportVideo` (`src/lib/useExportController.ts:173-186`, `src/lib/videoEncoder.ts:93-133`).
- Failure scenario: a large Google Location History import that stays below the parser cap can still become impractical to play or export because every frame forces O(n) geometry rebuilding and GeoJSON source updates against tens or hundreds of thousands of points.
- Suggested fix: decimate render geometry for preview/export, maintain incremental trail updates instead of rebuilding from index 0 each tick, or introduce a separate visualization cap lower than the parser acceptance cap.
- Severity: high
- Confidence: high

### 5. Medium/High — the export size gate underestimates real browser memory pressure by treating the MP4 as a single buffer
- Evidence: the UI only blocks exports above `512 MB` estimated output size in `src/components/ExportPanel.tsx:29,101-105,394-408`.
- Evidence: `videoEncoder` returns the full encoded `ArrayBuffer` in memory (`src/lib/videoEncoder.ts:142-159`).
- Evidence: `useExportController` then wraps that buffer in a `Blob`, creates an object URL, and stores the blob/url in React state (`src/lib/useExportController.ts:188-198`).
- Failure scenario: a “legal” high-end export, especially 4K/high-bitrate on a memory-constrained device, can cross the UI gate but still crash the tab or fail nondeterministically because the app briefly holds multiple in-memory copies/representations of the output.
- Suggested fix: lower the cap using a multi-copy memory budget, prefer direct streaming to the File System Access API when available, or reject 4K/high-duration/high-quality combinations more aggressively on constrained browsers.
- Severity: medium/high
- Confidence: medium

## Risks needing manual validation

### 6. Medium — production deployment is path-coupled to `/travelback` across config, metadata, preview server, and tests
- Evidence: `next.config.ts:3-10` forces `basePath = '/travelback'` whenever `NODE_ENV === 'production'`.
- Evidence: metadata defaults to `https://open330.github.io` in `src/app/layout.tsx:5-7`.
- Evidence: local production preview also hardcodes `/travelback` in `package.json:8`, `playwright.static.config.ts:18,45-46`, and `scripts/serve-static.mjs` usage in tooling.
- Failure scenario: if this app is ever deployed to a different production origin/path, assets, metadata URLs, and preview/test assumptions can all break at once even though local dev still works.
- Suggested fix: treat the base path and site origin as explicit deployment inputs rather than deriving them from `NODE_ENV`, or document this GitHub Pages coupling as a hard invariant and validate it early.
- Severity: medium
- Confidence: high
- Manual validation needed: confirm whether GitHub Pages at `/travelback` is the only supported production target.

## Final sweep / commonly missed checks
- Worker/parser limits are mirrored correctly enough for current behavior: `src/lib/parser.ts` and `public/workers/trackParser.worker.js` agree on JSON depth and size ceilings.
- Static export hardening looks healthy: CSP replacement, local map-style pinning, and static smoke checks all passed.
- I did not find evidence of accidental network geocoding in the journey creator; the coordinate jump feature is genuinely local-only.
- I did not find a build-, lint-, or type-level failure in the current head.

## Bottom line
The repo is in a buildable state, but there is one clear user-visible correctness bug in export duration handling, plus two substantial hidden-coupling risks around large-track rendering and export memory usage. Those are the items I would prioritize before trusting the app with long or dense real-world travel histories.
