# Cycle 1 Test Engineer Review — 2026-04-25

Scope reviewed: current working tree including uncommitted changes. Focus: parser, UI, export, static smoke, and Playwright coverage. I did not edit source or tests.

## Inventory

### Project rules and context
- `.context/README.md` — project purpose and context layout.
- `.context/development/01-conventions.md` — required verification: `npm run build`, `npm run lint`, Playwright E2E, manual sample files; no new dependencies without request.
- `.context/project/01-overview.md` — supported GPX/KML/Google JSON variants and build/test commands.
- `.context/project/02-architecture.md` — parser, timeline, map, playback, and export data flow.

### Test and verification surfaces
- `e2e/travelback.spec.ts` — only application behavior suite; covers landing, accessibility, imports, timeline, map, scenes, export panel, static/dev via config.
- `playwright.config.ts` and `playwright.static.config.ts` — Chromium-only, serial E2E runs with 1 retry.
- `scripts/smoke-static.mjs` — static bundle/server smoke checks.
- `scripts/run-dev-e2e.mjs`, `scripts/run-static-e2e.mjs`, `scripts/serve-static.mjs` — E2E/static server orchestration.
- `e2e/fixtures/*` — GPX/KML/Google JSON import fixtures, including new `google-revisit-segments.json`.

### Code under test / high-risk areas
- `src/lib/parser.ts` and `public/workers/trackParser.worker.js` — duplicated Google parser logic plus worker preflight/limits.
- `src/components/FileUpload.tsx` — parser error presentation and drag/drop path.
- `src/components/JourneyCreator.tsx` — click, drag, coordinate jump, route creation.
- `src/components/TimelineSelector.tsx` — drag/keyboard trimming and rAF flush behavior.
- `src/app/page.tsx` — session reset, focus/live-region announcement, export wiring.
- `src/components/ExportPanel.tsx`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts` — codec probing, export lifecycle, download path.
- `scripts/serve-static.mjs`, `scripts/smoke-static.mjs` — base-path serving, headers, cache policy, CSP/static bundle guards.

## Findings

### 1. Parser tests mostly assert “some locations”, so destructive Google/KML regressions can pass
- **Evidence:** Google/KML import tests commonly assert only a title and `/\d+ \/ \d+ locations/`: `e2e/travelback.spec.ts:1336`, `e2e/travelback.spec.ts:1344`, `e2e/travelback.spec.ts:1369`, `e2e/travelback.spec.ts:1375`, `e2e/travelback.spec.ts:1381`, `e2e/travelback.spec.ts:1387`. Parser dispatch/flattening is complex at `src/lib/parser.ts:487` and segment dedupe/sort is at `src/lib/parser.ts:422`.
- **Failure scenario:** A regression that drops 90% of points, loses timestamps, sorts segments incorrectly, or collapses segment breaks still shows “Google Location History — N / N locations” and passes as long as at least two points survive. KML point placemark or MultiLineString regressions can also pass with any nonzero count.
- **Severity:** High
- **Confidence:** High
- **Concrete fix/test:** Add exact fixture expectations for each import fixture: visible/full point count, first/last coordinates via a debug parser result or route GeoJSON, and `segmentStartIndices`/gap behavior where applicable. For example, make `imports Google Semantic Segments` assert the exact expected `N / N locations` and that repeated visits/gap-preserving segments render the expected route/trail state, not just a regex.

### 2. Main-thread parser and worker parser have no behavioral parity test despite duplicated logic
- **Evidence:** Parser logic is duplicated in `src/lib/parser.ts:253`, `src/lib/parser.ts:339`, `src/lib/parser.ts:422`, `src/lib/parser.ts:476` and `public/workers/trackParser.worker.js:45`, `public/workers/trackParser.worker.js:113`, `public/workers/trackParser.worker.js:178`, `public/workers/trackParser.worker.js:301`. Static smoke only compares selected constants/error-code strings at `scripts/smoke-static.mjs:172`.
- **Failure scenario:** A future fix lands in `src/lib/parser.ts` but not `public/workers/trackParser.worker.js` (or vice versa). Small-file fallback and large-file worker imports then disagree on accepted points, dedupe behavior, limits, or error codes. Current E2E exercises browser upload but does not deliberately force both paths over the same fixtures and compare normalized output.
- **Severity:** High
- **Confidence:** High
- **Concrete fix/test:** Add a Playwright or Node-based parity test that runs the same Google fixtures through `parseGoogleLocationHistory` and the worker script, normalizes `Date` values, and deep-compares name, points, and `segmentStartIndices`. Include the new repeated untimed visit fixture and a limit/depth error fixture.

### 3. Worker point-budget preflight is untested at the boundary and can produce false-positive rejections
- **Evidence:** Both parser paths preflight count point-like keys with `/"(?:latitudeE7|latE7|latitude|point|latLng)"\s*:/g`: `src/lib/parser.ts:476`, `public/workers/trackParser.worker.js:301`. Existing oversized test only covers XML byte size at `e2e/travelback.spec.ts:416`; there is no JSON point-budget/depth E2E.
- **Failure scenario:** A valid Google export with many duplicate/invalid/noise `point` or `latLng` keys can be rejected before the parser applies validity checks/dedupe. Conversely, a change to the regex can allow >250,000 actual points until after expensive JSON parse. Neither boundary is guarded.
- **Severity:** Medium
- **Confidence:** Medium
- **Concrete fix/test:** Add generated JSON fixtures/tests for exactly 250,000 point-like records (accepted or rejected according to product decision), 250,001 records (must show `TOO_MANY_POINTS` UI), deeply nested JSON (must show recovery parse error), and a noise-heavy fixture with non-coordinate `point` keys if those are expected to be tolerated.

### 4. Playback tests can pass even when playback does not progress
- **Evidence:** `playback controls work after importing track` clicks Play, waits `1500ms`, and only checks the camera tracking button exists: `e2e/travelback.spec.ts:500`. Full journey tests also wait and then proceed without asserting progress or Pause state: `e2e/travelback.spec.ts:1418`, `e2e/travelback.spec.ts:1455`. A stronger helper already exists at `e2e/travelback.spec.ts:178` and asserts Pause plus progress > 0.
- **Failure scenario:** `togglePlay` or the RAF loop breaks while controls still render; these tests pass because the tracking button is unrelated to playback progress.
- **Severity:** High
- **Confidence:** High
- **Concrete fix/test:** Replace ad-hoc play clicks in playback/full-journey tests with `startPlayback(page)` or assert `Playback progress` increases and the button changes to Pause. Keep one separate assertion for camera tracking visibility if needed.

### 5. Multiple Playwright tests use fixed sleeps, increasing flake and hiding readiness bugs
- **Evidence:** Fixed waits appear at `e2e/travelback.spec.ts:509`, `e2e/travelback.spec.ts:525`, `e2e/travelback.spec.ts:820`, `e2e/travelback.spec.ts:848`, `e2e/travelback.spec.ts:925`, `e2e/travelback.spec.ts:937`, `e2e/travelback.spec.ts:1020`, `e2e/travelback.spec.ts:1425`, and `e2e/travelback.spec.ts:1462`. Playwright retries are enabled at `playwright.config.ts:14` and `playwright.static.config.ts:14`, which can mask intermittent failures.
- **Failure scenario:** Slow WebGL/style load or a faster-than-expected state transition causes nondeterministic failures. Retries make the suite green without fixing the race.
- **Severity:** Medium
- **Confidence:** High
- **Concrete fix/test:** Replace sleeps with `expect.poll` on `__travelbackDebug.getMapState()`, `startPlayback(page)`, route/trail readiness, or precise UI state. Keep retries if desired for CI noise, but add a flake audit/report step or mark known-flaky tests until waits are removed.

### 6. Journey Creator drag regression is unprotected
- **Evidence:** Drag suppression was added at `src/components/JourneyCreator.tsx:347` so a waypoint drag sets `suppressNextMapClickRef`; the map click handler consumes it at `src/components/JourneyCreator.tsx:290`. Existing Journey Creator E2E only checks icons and coordinate search flows: `e2e/travelback.spec.ts:445`, `e2e/travelback.spec.ts:461`, `e2e/travelback.spec.ts:478`.
- **Failure scenario:** Dragging an existing waypoint fires a map click after mouseup/touchend, accidentally adding a duplicate point or deleting the dragged point. No current test creates a route by map clicks, drags a waypoint, and asserts the point count remains stable.
- **Severity:** Medium
- **Confidence:** High
- **Concrete fix/test:** Add a Journey Creator E2E that clicks two map positions, drags the first waypoint, releases over the map, and asserts the panel still shows exactly `2 locations` and the route can be completed.

### 7. Timeline rAF flush fix lacks a targeted “quick release” regression
- **Evidence:** The new flush path stores `lastDragClientXRef` and calls `applyDragNow` during `endDrag`: `src/components/TimelineSelector.tsx:245`, `src/components/TimelineSelector.tsx:291`. Existing timeline drag tests use multi-step mouse movement (`steps: 12` or `steps: 10`) at `e2e/travelback.spec.ts:708`, `e2e/travelback.spec.ts:725`, `e2e/travelback.spec.ts:738`, `e2e/travelback.spec.ts:1312`, which tends to allow rAF callbacks to run before mouseup.
- **Failure scenario:** A user performs a very fast drag and release before the next animation frame. Without the final flush, UI handles move but the filtered track does not update. Current tests may miss this because they do slower stepped drags.
- **Severity:** Medium
- **Confidence:** Medium
- **Concrete fix/test:** Add a timeline test that performs a single `mouse.move` immediately followed by `mouse.up` (no `steps`, no wait) and asserts the visible track count changes. Repeat for touch if mobile drag support is important.

### 8. Export success test bypasses the frame-encoding path and leaves codec-unavailable UX untested
- **Evidence:** The success E2E enables `travelback-export-test-stub` at `e2e/travelback.spec.ts:1275`. The stub path in `src/lib/useExportController.ts:161` bypasses `exportVideo(...)` at `src/lib/useExportController.ts:173`, so it does not exercise `src/lib/videoEncoder.ts:40` frame capture/finalize. The newly added codec-unavailable alert is at `src/components/ExportPanel.tsx:106` and `src/components/ExportPanel.tsx:406`, but no test asserts the disabled Start Export state or alert.
- **Failure scenario:** Real frame export can regress (camera apply, idle wait, CanvasSource.add, finalize, abort cleanup) while the stub test stays green. Separately, browsers with unsupported codecs may show a disabled button without a tested explanatory message.
- **Severity:** High for frame export coverage, Medium for codec UX
- **Confidence:** High
- **Concrete fix/test:** Keep the stub for fast smoke, but add either (a) a narrow unit/integration test around `exportVideo` with mocked mediabunny/canvas, or (b) a browser test using the smallest duration/FPS supported and asserting progress reaches done without the stub in Chromium when H.264 is available. Add a component/E2E test that selects an unsupported codec path (or mocks codec probing) and asserts `export.codecUnavailable` is visible and Start Export is disabled.

### 9. Export cancel and progress-restoration behavior has no regression coverage
- **Evidence:** Export cancellation is wired in `src/app/page.tsx:229`, `src/components/ExportPanel.tsx:308`, and `src/lib/useExportController.ts:101`; cleanup restores map size and playback progress at `src/lib/useExportController.ts:218`. Existing export E2E covers panel semantics, options, stubbed success, duration clamp, reset after track edit, and close: `e2e/travelback.spec.ts:1211` through `e2e/travelback.spec.ts:1324`.
- **Failure scenario:** Escape/cancel during export could leave `isExporting` true, fail to restore map size, lose pre-export playback progress, or show a stale done state. Current tests do not start a cancellable long export or assert cleanup.
- **Severity:** Medium
- **Confidence:** High
- **Concrete fix/test:** Add a controlled export test hook that delays the stub until cancellation, then assert Escape and the Cancel button both return to idle, restore previous playback progress, and leave no stale download link unless an older export existed.

### 10. Static smoke does not verify security headers, HEAD behavior, or base-path redirects served by `serve-static`
- **Evidence:** `serve-static` has base-path redirect/protection logic at `scripts/serve-static.mjs:70`, method handling at `scripts/serve-static.mjs:122`, and security headers at `scripts/serve-static.mjs:148`. Smoke checks selected status/cache/CSP invariants at `scripts/smoke-static.mjs:237`, but not `/ -> /travelback/`, `/travelback -> /travelback/`, HEAD responses, or headers like `X-Frame-Options`, `X-Content-Type-Options`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`.
- **Failure scenario:** A deploy preview can lose anti-framing/nosniff/isolation headers or break root/base-path redirects while smoke remains green. HEAD requests used by some CDNs/health checks could also regress unnoticed.
- **Severity:** Medium
- **Confidence:** High
- **Concrete fix/test:** Extend `scripts/smoke-static.mjs` with `assertHeader` and `assertRedirect` helpers for root/base path, `HEAD /travelback/`, expected security headers, and traversal/encoded traversal rejection.

### 11. FileUpload unsupported drag/drop path is not covered and now diverges from input-upload error UX
- **Evidence:** Input parser errors get recovery hints at `src/components/FileUpload.tsx:80`, but drag/drop extension rejection directly sets `fileUpload.unsupportedFormat` without that hint at `src/components/FileUpload.tsx:101`. The only unsupported-format E2E uses `input.setInputFiles`: `e2e/travelback.spec.ts:1400`.
- **Failure scenario:** Dragging a ZIP/TXT file gives less actionable guidance than choosing the same file through the picker. The current regression test passes because it exercises only the picker path.
- **Severity:** Low
- **Confidence:** High
- **Concrete fix/test:** Add a drag/drop unsupported-file test and assert the same recovery hint appears as in the picker path. Consider extracting error formatting so both paths share it.

### 12. Accessibility focus regression after track load is not tested
- **Evidence:** The previous focus target was removed from `src/app/page.tsx` in the working tree; current live region is non-focusable at `src/app/page.tsx:504`. The upload helper only waits for `load-new-file-button`: `e2e/travelback.spec.ts:152`. No test asserts focus lands on a useful workspace control/status after loading a file.
- **Failure scenario:** Keyboard and screen-reader users upload a file and remain focused on the hidden file input or an obsolete landing control, missing that the workspace loaded. The live region may announce text, but focus order/location is unguarded.
- **Severity:** Medium
- **Confidence:** Medium
- **Concrete fix/test:** Add an E2E that uploads a fixture via keyboard/file input and asserts either focus moves to a visible workspace landmark/control or that a named live-region announcement is exposed and the next Tab reaches the loaded-track toolbar predictably.

## Coverage gap summary by requested area

- **Parser:** Missing exact fixture assertions, worker/main parity, JSON depth/point-limit boundary tests, and detailed segment/order checks.
- **UI:** Missing Journey Creator drag, FileUpload drag/drop error parity, post-upload focus, and targeted timeline quick-release coverage.
- **Export:** Stubbed success is useful but insufficient; missing real encoder/frame-loop, codec-unavailable, cancellation, and cleanup/progress restoration coverage.
- **Static smoke:** Good CSP/cache baseline, but missing security headers, redirect/HEAD behavior, and traversal/base-path edge cases.
- **Playwright flows:** Broad coverage exists, but several tests use fixed sleeps and weak assertions that can pass without the behavior under test.

## Recommended next test work order

1. Harden parser tests first: exact counts/order/segments plus worker/main parity.
2. Replace weak playback assertions and fixed sleeps with state-based polling.
3. Add targeted Journey Creator drag and Timeline quick-release regressions.
4. Add export cancellation/codec-unavailable tests and at least one non-stub export-path integration.
5. Extend static smoke for headers, redirects, HEAD, and path traversal.
