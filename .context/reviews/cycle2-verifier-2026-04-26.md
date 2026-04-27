# Cycle 2 Verifier Review — 2026-04-26

**Reviewer:** verifier
**Scope:** Entire Travelback repository, with emphasis on behavior claims in `README.md` and `.context/**` versus current code, tests, scripts, and build/deploy config.
**Method:** Evidence-first source review. I inspected runtime code, configs, scripts, E2E tests/fixtures, public assets, and current docs/context before forming conclusions. I did not modify code or run destructive commands.

## Review Inventory

I built the inventory from `git ls-files` and then inspected the files that can affect current behavior.

### Runtime source and UI surface
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/app/favicon.ico`
- Components: `src/components/Controls.tsx`, `ElevationProfile.tsx`, `ErrorBoundary.tsx`, `ExportPanel.tsx`, `FileUpload.tsx`, `GlobalToolbar.tsx`, `GoogleGuide.tsx`, `JourneyCreator.tsx`, `KeyboardHelp.tsx`, `MapView.tsx`, `ModalDialog.tsx`, `SceneEditor.tsx`, `ThemeToggle.tsx`, `TimelineSelector.tsx`, `Toast.tsx`, `TrackToolbar.tsx`, `TrackWorkspace.tsx`
- Libraries/types/styles: `src/lib/camera.ts`, `env.ts`, `i18n.ts`, `interpolate.ts`, `parser.ts`, `useExportController.ts`, `usePlaybackController.ts`, `videoEncoder.ts`, `src/types.ts`, `src/styles/vitro-base.css`

### Public runtime assets
- `public/workers/trackParser.worker.js`
- `public/map-styles/{voyager,positron,dark,liberty,bright}.json`
- `public/sample-trip.gpx` and other shipped public assets used by the app/static export

### Build, deploy, and scripts
- `package.json`, `package-lock.json`
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`
- `playwright.config.ts`, `playwright.static.config.ts`
- `scripts/fetch-map-styles.mjs`, `scripts/harden-static-export.mjs`, `scripts/run-dev-e2e.mjs`, `scripts/run-static-e2e.mjs`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`
- `.github/workflows/deploy-pages.yml`

### Tests and fixtures
- `e2e/travelback.spec.ts`
- All files under `e2e/fixtures/`

### Docs / active context
- `README.md`
- `.context/README.md`
- `.context/agents/non-tech-traveler-reviewer.md`
- `.context/development/01-conventions.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `.context/plans/README.md`
- Top-level `plan/` index/current/deferred docs
- Existing review artifacts in `.context/reviews/` were used only as cross-reference context, not as proof of runtime behavior

## Findings

### 1) Export frame capture can resolve before the post-camera frame is actually painted
- **Files / region:** `src/components/MapView.tsx:475-568`, `src/lib/useExportController.ts:173-183`, `src/lib/videoEncoder.ts:131-155`
- **Severity:** Medium
- **Confidence:** High
- **Status:** likely
- **What happens:** `applyCameraState()` uses `map.jumpTo(...)`, then export waits one `requestAnimationFrame`, then `waitForIdle()`. But `waitForIdle()` has a fast path that returns immediately when `!map.isMoving()` and `map.areTilesLoaded()` are true. For the shipped local styles, tile loading is already complete, so the check can succeed without waiting for the next rendered frame after the camera jump.
- **Failure scenario:** an export can capture a stale frame right after a scene/camera change, producing duplicate or one-frame-late video output. The timing risk is highest on the static/local styles used by this repo because they have no remote tiles to keep `waitForIdle()` busy.
- **Suggested fix:** make the export path wait for a render boundary that is guaranteed to occur after the camera mutation, e.g. wait for the next `render`/`idle` event after `jumpTo`, or explicitly await a post-jump double-rAF before capture. Do not rely on the `areTilesLoaded()` fast path as proof of a fresh frame.

### 2) Trail geometry is rebuilt from scratch on every playback/export frame
- **Files / region:** `src/components/MapView.tsx:109-170`, `src/components/MapView.tsx:879-904`, `src/lib/usePlaybackController.ts:122-145`, `src/lib/videoEncoder.ts:123-157`, `src/lib/parser.ts:685-706`
- **Severity:** Medium
- **Confidence:** High
- **Status:** risk
- **What happens:** the trail line is recomputed with `buildTrackGeometry(...)` and pushed to MapLibre with `trailSource.setData(...)` on every progress update. Progress itself advances every animation frame during playback and every encoded frame during export. The parser allows tracks up to `MAX_TRACK_POINTS = 250_000`, so the hot path can repeatedly re-slice and re-wrap a very large coordinate set.
- **Failure scenario:** large but valid imports can trigger severe jank, dropped frames, or export timeouts because each frame reallocates and reserializes the whole traveled path geometry. That can turn supported inputs into unusable playback/export sessions even though parsing succeeded.
- **Suggested fix:** cache and incrementally extend the trail geometry, or render a cheaper representation during playback/export. At minimum, avoid full `slice`/`wrap`/`setData` work on every frame for large tracks.

### 3) The “successful export” E2E path is stubbed and does not exercise the real encoder/camera pipeline
- **Files / region:** `src/lib/useExportController.ts:161-172`, `e2e/travelback.spec.ts:1299-1328`
- **Severity:** Medium
- **Confidence:** High
- **Status:** confirmed
- **What happens:** when `localStorage['travelback-export-test-stub'] === '1'`, `useExportController` returns a fake MP4 buffer after a single `requestAnimationFrame` instead of invoking `exportVideo()`. The E2E tests that claim to validate export success set that stub before starting export, so CI verifies only the stubbed fast path.
- **Failure scenario:** `npm run test:e2e:static:ci` can stay green while the actual export path is broken by the camera/timing issue above, a frame-capture regression, or a `videoEncoder` integration bug. The tests do not prove that the real encoder path still works.
- **Suggested fix:** add at least one deterministic test that exercises the real export pipeline, or split the current stubbed test into a separate “UI only” check and a CI-covered smoke that reaches `exportVideo()` with controlled timing/mocks.

## Cross-file interaction notes

- The export path is the only place where `MapView.applyCameraState()`, `MapView.waitForIdle()`, `useExportController`, and `videoEncoder` all compose into a single correctness boundary. That makes the idle fast path especially important.
- Playback and export both drive `progress` through `usePlaybackController`, so the trail geometry rebuild cost is paid during interactive playback and during MP4 generation.
- The current E2E suite gives good UI coverage, but the export success tests intentionally bypass the real export path, so they cannot catch regressions in the most timing-sensitive code.

## Final sweep / skipped-file confirmation

I reviewed the files that define current behavior: runtime source, public assets, build/deploy scripts, Playwright config, E2E tests/fixtures, root docs, and the active `.context` project/development/plan context. I also checked the top-level `plan/` docs because they contain repo-facing behavioral claims and review history.

No runtime-relevant file in those categories was skipped. Historical review artifacts and generated outputs were treated as context only, not as proof of current behavior. I did not edit any file other than this review artifact.
