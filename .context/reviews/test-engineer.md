# Test Engineer Review — review-plan-fix cycle 1/100 — Prompt 1

Date: 2026-04-24
Repo: `/Users/hletrd/flash-shared/Travelback`
Role focus: test coverage, test quality, flaky-test risk, static-export gates, TDD opportunities.
Source-modification policy: review artifact only; no source/test files changed.

## Inventory

### Production files examined
- App shell: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/favicon.ico`.
- Components: `src/components/Controls.tsx`, `ElevationProfile.tsx`, `ErrorBoundary.tsx`, `ExportPanel.tsx`, `FileUpload.tsx`, `GlobalToolbar.tsx`, `GoogleGuide.tsx`, `JourneyCreator.tsx`, `KeyboardHelp.tsx`, `MapView.tsx`, `ModalDialog.tsx`, `SceneEditor.tsx`, `ThemeToggle.tsx`, `TimelineSelector.tsx`, `Toast.tsx`, `TrackToolbar.tsx`, `TrackWorkspace.tsx`.
- Libraries/types: `src/lib/camera.ts`, `env.ts`, `i18n.ts`, `interpolate.ts`, `parser.ts`, `useExportController.ts`, `usePlaybackController.ts`, `videoEncoder.ts`, `src/types.ts`.
- Public runtime assets relevant to tests: `public/workers/trackParser.worker.js`, `public/sample-trip.gpx`, `public/map-styles/*.json`, guide SVGs, app icons, font CSS/WOFF2.

### Scripts/config files examined
- Scripts: `scripts/fetch-map-styles.mjs`, `harden-static-export.mjs`, `serve-static.mjs`, `smoke-static.mjs`.
- Test/build config: `package.json`, `playwright.config.ts`, `playwright.static.config.ts`, `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`.

### E2E files/fixtures examined
- E2E spec: `e2e/travelback.spec.ts` (54 Playwright tests).
- Fixtures: `google-records.json`, `google-semantic-location.json`, `google-semantic-segments.json`, `google-timeline-edits.json`, `invalid-elevation.gpx`, `korea-japan.gpx/json/kml`, `point-placemarks.kml`, `sample.gpx`, `segmented-city-hop.gpx`, `single-quote-attrs.gpx`, `tiny-trim.gpx`.

## Overall test posture

Current suite is E2E-heavy. `package.json:7-15` exposes lint/typecheck/e2e/static-smoke commands, but no unit or component test script. The only in-repo executable tests outside scripts are `e2e/travelback.spec.ts:225-1133`. That gives useful browser coverage for happy-path imports, layout, map style cycling, camera stability, and modal a11y, but leaves core parser/export/playback/map algorithms without deterministic tests.

## Findings

### TE-001 — Core parser behavior and worker parity are not locked by deterministic tests
- Severity: High
- Confidence: High
- File/line regions:
  - Main parser dispatch and segment remap: `src/lib/parser.ts:346-430`.
  - File-level validation/error codes: `src/lib/parser.ts:516-567`.
  - Duplicate worker parser: `public/workers/trackParser.worker.js:137-204`, validation/message handling at `public/workers/trackParser.worker.js:247-279`.
  - Existing E2E import checks only assert display-level success: `e2e/travelback.spec.ts:1019-1056`.
- Failure scenario: A change to one parser copy but not the other can alter ordering, `segmentStartIndices`, depth/file-size errors, or Google JSON shape handling while all current E2E tests still pass because they only verify that a track title and a generic location count are visible. There is already a subtle parity risk: the main parser deduplicates adjusted segment starts with `new Set` at `src/lib/parser.ts:428`, while the worker returns `adjustedSegStarts` directly at `public/workers/trackParser.worker.js:204`.
- Concrete fix: Add a unit test layer for `src/lib/parser.ts` plus a worker-parity test harness that feeds the same JSON fixtures through the main parser and `public/workers/trackParser.worker.js`, asserting exact `points`, `time` conversion, `segmentStartIndices`, error codes (`INVALID_GOOGLE_JSON`, `JSON_DEPTH_EXCEEDED`, `UNSUPPORTED_GOOGLE_FORMAT`, `TOO_FEW_POINTS`, `TOO_MANY_POINTS`, `FILE_TOO_LARGE`), and malformed coordinate rejection. TDD first target: a fixture with duplicate/remapped segment boundaries should fail until main/worker outputs match exactly.

### TE-002 — Export state machine is essentially untested beyond opening the panel
- Severity: High
- Confidence: High
- File/line regions:
  - Encoding loop, abort, clamping, filename sanitization: `src/lib/videoEncoder.ts:40-159`.
  - Download branches: `src/lib/videoEncoder.ts:171-201`.
  - Export controller resize/idle/cancel/error cleanup: `src/lib/useExportController.ts:84-207`.
  - Export panel gates and codec probing: `src/components/ExportPanel.tsx:106-137`, done/share UI at `src/components/ExportPanel.tsx:202-244`, controls at `src/components/ExportPanel.tsx:270-361`.
  - Current E2E coverage stops before actual export: `e2e/travelback.spec.ts:968-1005`, `1078-1110`, `1115-1132`.
- Failure scenario: A regression could leave the map container stuck at 3840×2160 after an export error, corrupt output by finalizing after abort, fail to revoke previous object URLs, disable Start Export forever when codec probing rejects, or break the File System Access fallback. Current tests would still pass because they never click `Start Export`, never mock `mediabunny`, never cancel during export, and never assert post-export map reset/toast/result state.
- Concrete fix: Add component/hook-level tests for `useExportController` with a fake `MapViewHandle`, mocked `exportVideo`, mocked `downloadVideo`, and controllable `AbortController` paths. Add `videoEncoder` unit tests with a mocked `mediabunny` module to assert config clamping, progress callbacks, abort behavior before/after `renderFrame`, filename sanitization, and no-finalize-on-abort. Add one browser smoke test that starts a tiny low-FPS export under a mocked encoder path and asserts the overlay, cancel, toast, and map-size cleanup.

### TE-003 — Playback/camera/map geometry coverage relies on timing-heavy E2E instead of pure function tests
- Severity: Medium-High
- Confidence: High
- File/line regions:
  - Distance/bearing/interpolation/unit formatting: `src/lib/interpolate.ts:18-185`.
  - Scene normalization and camera interpolation: `src/lib/camera.ts:19-44`, `102-205`, `341-435`.
  - Map geometry/antimeridian/segments: `src/components/MapView.tsx:90-167`, fit bounds at `169-204`, camera application at `824-932`.
  - Current camera/playback tests use wall-clock waits: `e2e/travelback.spec.ts:455-468`, `800-835`.
- Failure scenario: Antimeridian tracks, zero-distance tracks, segment gaps, duplicate points, out-of-order scenes, transition boundaries, or imperial/metric formatting can regress without a deterministic failure. The camera stability tests sample rendered map state after `waitForTimeout` (`e2e/travelback.spec.ts:804`, `819`), so they are better at catching gross visual jitter than exact math/edge-case regressions.
- Concrete fix: Add unit tests for `computeCumulativeDistances`, `totalDistance`, `interpolateAlongTrack`, `computeBearing`, `formatDistance`, `normalizeScenes`, `lerpCamera`, and `computeCameraForProgress`. Include antimeridian crossings, segment breaks, repeated points, empty/single-point safeguards, clamped progress, and scene gaps/overlaps. If private `MapView` geometry helpers remain private, either extract them to `src/lib/mapGeometry.ts` or test through a thin public adapter before modifying behavior.

### TE-004 — Journey-creator UX is only smoke-tested; map interactions and discard/complete flows lack coverage
- Severity: Medium-High
- Confidence: High
- File/line regions:
  - Coordinate parsing and validation: `src/components/JourneyCreator.tsx:75-111`.
  - Add/delete/drag waypoint map handlers: `src/components/JourneyCreator.tsx:257-398`.
  - Search/select handling: `src/components/JourneyCreator.tsx:446-502`.
  - Completion/cancel confirmation: `src/components/JourneyCreator.tsx:516-528`, UI starts at `536`.
  - Existing E2E checks icons and one coordinate search result only: `e2e/travelback.spec.ts:425-452`; artifact cleanup test starts new route but does not create/complete a journey: `e2e/travelback.spec.ts:725-759`.
- Failure scenario: Users could be unable to add points by clicking the map, drag/delete waypoints, prevent accidental duplicate points, discard with confirmation, or complete a manually-created route. These are core UX flows, but current tests would not catch broken MapLibre event binding, stale cleanup after style reload, or malformed coordinate URL parsing except for one simple pasted coordinate.
- Concrete fix: Add Playwright tests that activate Journey Creator, click the map canvas to add two waypoints, assert point count/distance, drag or delete a waypoint, complete the route, and confirm a playable track appears. Add parser-style unit tests for coordinate inputs (`geo:`, `@lat,lng`, `?q=`, `#map=`), invalid lat/lng bounds, and URL-encoded coordinates. Expose a test-only debug getter for journey source features if DOM-only assertions are insufficient.

### TE-005 — Static export gates exist but are not part of the main static E2E command
- Severity: Medium
- Confidence: High
- File/line regions:
  - `package.json:7-15` separates `test:e2e:static`, `test:e2e:static:ci`, and `smoke:static`.
  - Static Playwright server only serves `out`: `playwright.static.config.ts:40-45`.
  - Hardened CSP rewrite: `scripts/harden-static-export.mjs:14-29`, `57-103`.
  - Static smoke assertions for CSP/cache/base-path/tool residue/local map styles: `scripts/smoke-static.mjs:76-179`.
  - Static server headers/base-path/path traversal: `scripts/serve-static.mjs:69-158`.
- Failure scenario: CI or a local agent can run `npm run test:e2e:static:ci` against an existing `out` directory and get green browser tests while CSP hardening, cache headers, static server path traversal behavior, local-only map-style constraints, or forbidden tool-state residue checks are broken or stale. The smoke gate is useful but optional.
- Concrete fix: Add a single canonical CI gate, for example `test:static:ci = npm run build && npm run smoke:static && playwright test -c playwright.static.config.ts`, or require the review/fix pipeline to run `npm run smoke:static` alongside static Playwright. Add script-level tests for `serve-static.mjs` path traversal, invalid percent encoding, HEAD/405 behavior, and base-path redirects using a temporary `out` fixture.

### TE-006 — Fixed sleeps and retries hide flaky-test root causes
- Severity: Medium
- Confidence: High
- File/line regions:
  - Polling helpers with hard sleeps: `e2e/travelback.spec.ts:69-83`.
  - App-load blanket settle: `e2e/travelback.spec.ts:134-145`.
  - Playback/map sleeps: `e2e/travelback.spec.ts:464`, `480`, `699`, `727`, `804`, `819`, `1085`, `1122`.
  - Playwright retries enabled globally: `playwright.config.ts:7-11`, `playwright.static.config.ts:7-11`.
- Failure scenario: A slow GPU/WebGL startup, delayed style load, or throttled `requestAnimationFrame` can make a test pass locally and fail in CI, while `retries: 1` masks the first failure and preserves flakiness. The long sleeps also increase suite duration and can still be too short under load.
- Concrete fix: Replace fixed waits with event-driven assertions: `expect.poll` on `window.__travelbackDebug.getMapState()`, `map.areTilesLoaded()`, visible playback stat deltas, route/trail source presence, or a dedicated app-ready marker. Prefer zero retries for the main lane once sleeps are removed, or reserve retries only for quarantine. Convert camera tests to deterministic fake-clock or debug-progress stepping where possible.

### TE-007 — Timeline trimming is under-specified for uneven distances, segments, and stale drag closures
- Severity: Medium
- Confidence: Medium-High
- File/line regions:
  - Distance-ratio index mapping: `src/components/TimelineSelector.tsx:25-48`.
  - Live range updates and drag throttling: `src/components/TimelineSelector.tsx:143-148`, `182-260`.
  - Global drag listeners: `src/components/TimelineSelector.tsx:263-284`.
  - Track slicing and segment remap: `src/app/page.tsx:185-206`.
  - Current E2E only guards a tiny trim from collapsing to one point: `e2e/travelback.spec.ts:651-667`.
- Failure scenario: On real tracks with uneven point spacing or segment breaks, the trim handles can select unexpected indices, preserve a stale range after a new track loads, or remap segment starts incorrectly, causing playback stats/map gaps to diverge from the selected visible range. The current tiny 3-point E2E cannot catch distance-weighted binning errors or segment-remap edge cases.
- Concrete fix: Add component tests for `TimelineSelector` with synthetic uneven-distance and segmented tracks, asserting exact `onRangeChange(startIdx,endIdx)` during start/end/region drags and after track replacement. Add unit coverage for `handleRangeChange`-equivalent segment remapping, especially trimming across a segment boundary.

## TDD opportunities by priority

1. Parser/worker parity tests first (`src/lib/parser.ts` + `public/workers/trackParser.worker.js`) because failures are deterministic, high value, and currently hidden by display-only E2E.
2. Export controller/encoder tests with mocks before any export UX fixes; codify RED cases for abort cleanup, map reset, codec support, and download fallback.
3. Pure math tests for playback/camera/interpolation before changing camera smoothing or scene presets.
4. Journey Creator map-interaction E2E before refactoring map event binding or search handling.
5. Static-export smoke gate in a canonical CI script before altering CSP/server/static asset behavior.

## Verification performed for this review

- Inventory commands over `src`, `scripts`, `public/workers`, `e2e`, and config files.
- Line-level inspection of parser, worker parser, export controller/encoder/panel, playback, interpolation, camera, map view, journey creator, timeline selector, static scripts, Playwright configs, and current E2E spec.
- No source or test files modified; only this review artifact was written.
