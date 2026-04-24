# Debugger Review - latent failure modes

Reviewed surface:

- App shell/config: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `playwright.config.ts`, `playwright.static.config.ts`
- App runtime: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/styles/vitro-base.css`
- Core logic: `src/types.ts`, `src/lib/env.ts`, `src/lib/i18n.ts`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/parser.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`
- User-facing components: `src/components/FileUpload.tsx`, `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`, `src/components/TimelineSelector.tsx`, `src/components/SceneEditor.tsx`, `src/components/ExportPanel.tsx`, `src/components/Controls.tsx`, `src/components/TrackWorkspace.tsx`, `src/components/TrackToolbar.tsx`, `src/components/GlobalToolbar.tsx`, `src/components/ThemeToggle.tsx`, `src/components/ModalDialog.tsx`, `src/components/Toast.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/GoogleGuide.tsx`, `src/components/KeyboardHelp.tsx`, `src/components/ElevationProfile.tsx`
- Runtime/build scripts and worker: `scripts/serve-static.mjs`, `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs`, `scripts/fetch-map-styles.mjs`, `public/workers/trackParser.worker.js`
- E2E coverage and fixtures: `e2e/travelback.spec.ts`, `e2e/fixtures/*`

Verification performed:

- `npm run typecheck` - passed
- `npm run lint` - passed
- `npm run build` - passed
- `npm run smoke:static` - passed

## Confirmed Findings

### 1) Medium, High confidence, Confirmed - XML entity hardening is incomplete
**Region:** `src/lib/parser.ts:145-157`

`parseXml()` tries to strip DTD/entity declarations before handing text to `DOMParser`, but the `<!ENTITY[^>]*>` pattern only matches single-line entity declarations. A multi-line `<!ENTITY ...>` block can survive the prefilter and still reach `DOMParser`, which defeats the protection the helper is supposed to provide.

Failure scenario:
- A GPX/KML file containing a multi-line entity declaration bypasses the intended sanitizer.
- The parser then sees a payload the code explicitly tried to remove, which can turn a malformed import into a parsererror or reopen entity-expansion failure modes depending on browser XML behavior.

Suggested fix:
- Strip entity declarations with a newline-safe pattern such as `<!ENTITY[\s\S]*?>`, or reject any DTD/entity block outright before parsing.

### 2) Medium, High confidence, Confirmed - Failed export attempts can destroy the previous export preview
**Region:** `src/lib/useExportController.ts:87-103, 174-186`

`exportTrack()` revokes the current exported object URL before it validates that the new export can actually start. If `track` or `canvas` is unavailable, the function returns early after showing an error toast, but the prior successful export has already been discarded.

Failure scenario:
- A user has a finished export preview open.
- They try to export again while the map canvas is temporarily unavailable or the track state is missing.
- The new export fails immediately, and the previous working preview is gone even though the retry never got past validation.

Suggested fix:
- Move `revokeExportedVideoUrl()` to after the map/canvas/track validation, or only revoke the old URL once the new export pipeline has definitely started.

### 3) Low, High confidence, Confirmed - JourneyCreator can miss initialization if it activates before the map handle exists
**Region:** `src/components/JourneyCreator.tsx:242-257, 421-433`

The JourneyCreator effect only depends on `isActive`. It reads `mapRef.current?.getMap()` once, returns immediately if the map handle is not ready, and never retries when the handle appears later because `mapRef.current` changes do not retrigger the effect.

Failure scenario:
- The user opens JourneyCreator immediately after landing, or during a map reinitialization window.
- The panel appears, but the map never gets the journey layers/listeners.
- Clicking the map does nothing until the user toggles the mode off and on again.

Suggested fix:
- Add an explicit map-ready signal to the effect dependencies, or render/enable JourneyCreator only after the MapLibre handle is available.

## Risks Needing Manual Validation

### R1) Low, Medium confidence, Risk - Large Google JSON imports still depend on Worker availability above 16MB
**Region:** `src/lib/parser.ts:529-559, 604-617`, `public/workers/trackParser.worker.js:289-322`

The main-thread fallback only decodes Google JSON up to 16MB. If Worker creation fails or the browser does not support Workers, larger JSON imports reject even though the public limit is 100MB.

Failure scenario:
- A supported-but-restricted browser or CSP configuration disables Workers.
- A user imports a valid Google export above 16MB.
- The app rejects the file with `INVALID_GOOGLE_JSON` even though the same file would work in a Worker-capable browser.

Suggested fix:
- Either document the browser limitation clearly or add a fallback path that can handle the full supported JSON size without Worker support.

### R2) Low, Medium confidence, Risk - E2E camera/layout assertions are timing-sensitive
**Region:** `e2e/travelback.spec.ts:43-87, 506-533, 666-684, 793-804, 910-945`

Several Playwright checks depend on fixed sleeps and bounding-box polling rather than explicit app readiness signals. That makes the suite vulnerable to CI timing drift, especially around camera motion and layout stabilization.

Failure scenario:
- A slower runner, throttled GPU, or browser update changes render timing.
- The app is correct, but the test samples before the camera settles or after a delayed overlay/layout update.
- The spec reports a false failure or, less commonly, misses a real regression because the timing window shifted.

Suggested fix:
- Replace arbitrary waits with explicit readiness hooks/state assertions where possible, and prefer app state or debug-state checks over geometry sampling when the behavior under test is not positional.

## Final Sweep

I reviewed the current source tree end to end across app shell, runtime, parser, camera, playback, export, map lifecycle, journey creation, static-export scripts, worker code, and the Playwright suite. I did not skip any relevant application source file. Generated outputs such as `.next/`, `out/`, and `node_modules/` were intentionally excluded as build artifacts, not source.

Current conclusion:

- Confirmed issues: 3
- Risks needing manual validation: 2
- No additional relevant source files were skipped
