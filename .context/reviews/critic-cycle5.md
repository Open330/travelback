# Critic Review — Cycle 5

## Provenance
- Started from the existing partial `critic-cycle5.md` on disk.
- Re-verified the current repository instead of trusting the draft.
- Preserved the draft’s still-live findings, removed stale suspicion, and added one newly confirmed hidden-coupling issue.

## Scope and Inventory
Reviewed the active executable surface rather than sampling.

Reviewed root/config/tooling:
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next.config.ts`
- `eslint.config.mjs`
- `postcss.config.mjs`
- `playwright.config.ts`
- `playwright.static.config.ts`
- `.github/workflows/deploy-pages.yml`

Reviewed app/runtime/source:
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/styles/vitro-base.css`
- `src/types.ts`
- `src/lib/env.ts`
- `src/lib/i18n.ts`
- `src/lib/interpolate.ts`
- `src/lib/camera.ts`
- `src/lib/parser.ts`
- `src/lib/usePlaybackController.ts`
- `src/lib/useExportController.ts`
- `src/lib/videoEncoder.ts`
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
- `public/workers/trackParser.worker.js`

Reviewed product/context artifacts relevant to behavior claims:
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `.context/development/01-conventions.md`
- `.context/reviews/_aggregate.md`
- `.omx/plans/prd-review-remediation.md`
- `.omx/plans/test-spec-review-remediation.md`

Reviewed scripts/static assets/tests:
- `scripts/fetch-map-styles.mjs`
- `scripts/harden-static-export.mjs`
- `scripts/run-dev-e2e.mjs`
- `scripts/run-static-e2e.mjs`
- `scripts/serve-static.mjs`
- `scripts/smoke-static.mjs`
- `public/map-styles/*.json`
- `public/sample-trip.gpx`
- `public/guide/*.svg`
- `e2e/travelback.spec.ts`
- all fixtures under `e2e/fixtures/`

## Verification Performed
- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run build` — passed
- `npm run smoke:static` — passed
- `npm audit --audit-level=moderate` — failed with 2 moderate `postcss` vulnerabilities

## Findings

### CRIT-001 — The shipped “map” still lacks real geographic context, so the core output undershoots the product promise
- Severity: High
- Confidence: High
- Evidence:
  - `public/map-styles/voyager.json:1-29` and peer styles are background-only
  - `scripts/fetch-map-styles.mjs:6-18`, `24-36`, `48` explicitly generate “minimal bundled base style with no remote tiles, glyphs, or sprites”
  - `.context/project/01-overview.md:79-92` still markets “Interactive map” and five map styles as a feature
  - `src/lib/i18n.ts:17-20` promises users they can upload files “from Google Maps, Strava, Garmin, AllTrails, or any GPS app”
- Failure scenario: a ferry or overland route export renders as a line over a flat color plus synthetic reference grid. The viewer cannot identify coastlines, cities, roads, or landmarks, so “relive the journey” degrades into “watch a colored line move on a blank canvas.”
- Concrete fix: either ship a recognizable offline basemap stack, or reposition the product and UI copy explicitly as a privacy-first minimalist route animator instead of implying recognizable geography.

### CRIT-002 — Playback and export still do too much work on the hottest frame path
- Severity: High
- Confidence: High
- Evidence:
  - `src/app/page.tsx:105-158` keeps `progress` at the app-shell level
  - `src/components/TrackWorkspace.tsx:138-166` re-renders the loaded workspace off that state
  - `src/components/MapView.tsx:567-572` leaves `preserveDrawingBuffer` enabled for all map use, not only export
  - `src/components/MapView.tsx:683-743` and `855-861` rebuild full GeoJSON/trail data rather than updating incrementally
  - `src/lib/videoEncoder.ts:64-133` repeats the same render-wait-capture loop for every export frame
  - `src/lib/parser.ts:521-523`, `635-640` show the app still allows very large tracks before the hot path pays the cost
- Failure scenario: a traveler imports a large log or exports a long 4K video. Normal playback now spends time on top-level React churn, trail GeoJSON reconstruction, and preserved-buffer rendering overhead; export amplifies the same costs frame-by-frame and becomes the place where stutter/timeouts show up first.
- Concrete fix: move frame-loop state off the top-level React render path, update trail geometry imperatively or with decimation/caching, and only enable preserved drawing buffers during export.

### CRIT-003 — The dev E2E suite suppresses the hydration/overlay failures it should catch, and it remains timing-driven
- Severity: Medium
- Confidence: High
- Evidence:
  - `e2e/travelback.spec.ts:135-147` removes Next dev overlay portals and then sleeps
  - `e2e/travelback.spec.ts:215-237` injects a `MutationObserver` whose job is to keep deleting the overlay
  - fixed waits remain at `e2e/travelback.spec.ts:507`, `523`, `817`, `845`, `922`, `937`, `1299`, `1336`
  - `playwright.config.ts:8-39` and `playwright.static.config.ts:8-39` keep the suite serialized and retry-based rather than state-driven
- Failure scenario: a real hydration mismatch or Next runtime overlay regression lands in dev. CI still goes green because the suite removes the symptom from the DOM and advances on sleeps instead of asserting the app reached a healthy state.
- Concrete fix: fail on unexpected console/hydration errors, stop deleting the overlay as a steady-state strategy, replace sleeps with readiness/assertion conditions, and split the monolithic spec so the suite can be parallelized safely.

### CRIT-004 — The repo still ships known vulnerable `postcss` versions, and CI is configured not to fail on them
- Severity: Medium
- Confidence: High
- Evidence:
  - `package.json:24-36` depends on the current `next`/Tailwind toolchain
  - `package-lock.json:5376-5403` resolves `postcss@8.4.31`
  - `package-lock.json:5734-5762` resolves `postcss@8.5.6`
  - `.github/workflows/deploy-pages.yml:28-33` runs `npm audit --audit-level=high`, which lets current moderate findings pass
  - local verification: `npm audit --audit-level=moderate` reports the PostCSS XSS advisory for `<8.5.10`
- Failure scenario: the repository remains in a knowingly vulnerable dependency state while the deployment workflow still reports green. That weakens any claim that CI enforces the repo’s stated hardening posture.
- Concrete fix: either upgrade/override the affected consumers to `postcss >= 8.5.10`, or document an explicit exception and align CI/reporting with that decision instead of silently allowing it.

### CRIT-005 — Theme toggle semantics are inverted during the first hydrated dark-mode frame
- Severity: Low
- Confidence: High
- Evidence:
  - `src/components/ThemeToggle.tsx:27-30` forces `visualMode` to `'light'` until hydration
  - `src/components/ThemeToggle.tsx:65-78` uses `visualMode` for both icon and accessible label
- Failure scenario: on a dark-mode first render, the page is already dark but the toggle announces “Switch to dark mode” until the first animation frame. Screen-reader and keyboard users get the wrong action semantics precisely when focus first lands there.
- Concrete fix: derive the accessible label from `effectiveMode`, and only defer the icon if needed; alternatively keep the control hidden until hydration completes.

### CRIT-006 — Track-session leakage still exists: a new trip inherits playback/export state from the previous trip
- Severity: Medium
- Confidence: High
- Evidence:
  - `src/lib/usePlaybackController.ts:20-22` stores `speed`, `duration`, and `followCamera` as persistent hook state
  - `src/lib/usePlaybackController.ts:59-62` `resetPlayback()` only resets progress and play/pause
  - `src/app/page.tsx:209-229` and `255-256` call `resetPlayback()` when loading a new track, starting a fresh route, or trimming
  - `src/components/ExportPanel.tsx:70-82` seeds export duration from `playbackDuration`
  - `.omx/plans/prd-review-remediation.md:7-18` explicitly calls for track/session state leakage removal
- Failure scenario: a user turns follow-camera off and sets a long playback duration on Trip A, then loads Trip B. Trip B starts with camera follow still off and the first export modal inherits Trip A’s duration, even though the session boundary was supposed to reset cross-trip state.
- Concrete fix: decide which controls are session-scoped versus sticky preferences, then reset `speed`, `duration`, and `followCamera` on new track/session boundaries or persist them intentionally with visible user-facing preference semantics.

## Cleared / Not Repeated
- The earlier “export defaults to portrait/TikTok” concern is no longer live. `src/components/ExportPanel.tsx:67` now defaults `resolutionIdx` to `0` (YouTube / landscape).
- Earlier Journey Creator preview/search styling concerns are no longer live. Current code uses per-icon colors and existing background tokens (`src/components/JourneyCreator.tsx:52-59`, `182-241`, `520-613`).
- `JourneyCreator` map retry no longer gives up after ~3 seconds; current retry window is `120 * 100ms` (`src/components/JourneyCreator.tsx:255-263`).

## Residual Risk Notes
- I did not run the full Playwright suites; the repo currently has a very large single-spec E2E surface and the current review’s strongest test-harness objection is its own masking/flakiness strategy.
- I did not find a stronger live defect in parser worker parity, modal focus trapping, or scene-editor mechanics than the issues above; those areas remain complex, but the six findings above are the highest-signal current objections.
