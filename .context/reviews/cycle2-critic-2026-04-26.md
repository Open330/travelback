# Cycle 2 Critic Review — 2026-04-26

## Scope and inventory

Reviewed the repository as a skeptical critic across correctness, maintainability, UX, operational, and cross-file risks. I treated source behavior as authoritative and used comments/docs/tests only as supporting context.

Inventory built before review:

- **Tracked repository files:** 615 total.
- **Review-relevant tracked text/source/assets inventoried:** 584 total.
- **Runtime source examined:** all files under `src/app`, `src/components`, `src/lib`, `src/styles`, and `src/types.ts`.
- **Worker/public assets examined:** `public/workers/trackParser.worker.js`, `public/sample-trip.gpx`, map style JSON files, guide/SVG/font assets, and e2e fixtures.
- **Configuration/scripts examined:** `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, Playwright configs, `.github/workflows/deploy-pages.yml`, and all `scripts/*.mjs`.
- **Tests examined:** `e2e/travelback.spec.ts` and fixture corpus under `e2e/fixtures`.
- **Docs/context examined:** `README.md`, `.context/README.md`, `.context/project/*`, `.context/development/*`, current/deferred planning and review artifacts under `.context/plans`, `.context/reports`, `.context/reviews`, and `plan/*` for continuity with known deferred risks.

Validation commands run:

- `npm run lint && npm run typecheck` — passed.
- `npm run build` — passed; postbuild CSP hardening completed.
- `npm run smoke:static` — passed against local static export.
- `npm audit --audit-level=high` — passed with 0 vulnerabilities.

## Findings

### 1. Per-frame trail geometry rebuild is O(full track) and can freeze large imports

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed risk
- **Code region:** `src/components/MapView.tsx:109-170`, `src/components/MapView.tsx:890-904`, `src/lib/usePlaybackController.ts:104-154`, `src/lib/parser.ts:4`
- **Evidence:** `buildTrackGeometry()` constructs fresh GeoJSON coordinates from `track.points` on each call, including slice/wrap logic across segments. `MapView` calls it in the `progress` effect for each playback/export progress update and then calls `trailSource.setData(...)`. Playback progress is driven by `requestAnimationFrame`, while the parser allows up to `MAX_TRACK_POINTS = 250_000`.
- **Failure scenario:** A user imports a large Google history/GPX file near the 100k-250k point range and presses Play or starts export. Each animation frame allocates and transfers a new route geometry from the beginning of the current trail to the current point, creating main-thread stalls, dropped frames, or browser tab hangs. The current fixture corpus is tiny and does not exercise this path.
- **Suggested fix:** Precompute immutable per-segment coordinate arrays once per track, update the visible trail incrementally or by bounded chunks, and decimate display/export geometry separately from parsed point retention. Add a large-track performance regression fixture or synthetic test that asserts playback/export frame time stays bounded.

### 2. Video export drives React playback state and MapView effects once per encoded frame

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed risk
- **Code region:** `src/lib/videoEncoder.ts:118-158`, `src/lib/useExportController.ts:173-185`, `src/components/MapView.tsx:879-986`, `src/types.ts:86-90`
- **Evidence:** The encoder loop calls `renderFrame(progress, cameraState)` and `onProgress(progress)` for every frame. `useExportController` implements `renderFrame` by applying camera state and calling `setPlaybackProgress(nextProgress)`, then waiting for `requestAnimationFrame`. That state update flows back through `MapView` effects, marker updates, trail geometry rebuilds, and other React consumers. Export settings allow up to 180 seconds at 60 fps, or 10,800 encoded frame iterations.
- **Failure scenario:** A user chooses a long, high-fps export. The app performs thousands of React state updates and MapLibre source updates while also reading canvas frames and encoding video. On mid-range machines this can make export dramatically slower than real time or appear stuck even when encoding is technically progressing.
- **Suggested fix:** Keep export progress/camera movement on an imperative export path using refs and direct MapLibre updates. Throttle user-visible export progress to a low frequency, avoid mutating normal playback state for every encoded frame, and reset UI playback state only when export finishes or aborts. Add a bounded export performance test with a stub encoder and one real browser smoke path.

### 3. Main parser and worker parser duplicate Google parsing behavior with weak parity checks

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed maintainability risk
- **Code region:** `src/lib/parser.ts:253-574`, `public/workers/trackParser.worker.js:14-268`, `src/lib/parser.ts:598-682`, `scripts/smoke-static.mjs:223-260`
- **Evidence:** The main parser and public worker separately implement Google E7/time/timeline/semantic extraction, coordinate validation, dedupe, and output construction. The app uses the worker path for large JSON inputs and falls back to the main parser for unsupported/error cases. Static smoke only checks worker constant parity and that `parseSemanticPoint` exists; it does not run shared behavioral fixtures through both implementations.
- **Failure scenario:** A parser bug fix or Google Takeout shape update lands in `src/lib/parser.ts` but not in `public/workers/trackParser.worker.js`. Small local/manual tests pass through the fallback path, while production users with large JSON files hit the worker path and receive different point counts, timestamps, or error behavior.
- **Suggested fix:** Generate the worker from shared parser code or extract common pure parsing helpers into a module used by both contexts. At minimum, add parity tests that run the same JSON fixtures through the main parser and worker and compare success/error code, point count, first/last timestamps, and representative coordinates.

### 4. Local static security headers are stronger than deployed GitHub Pages behavior

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed operational residual risk
- **Code region:** `scripts/serve-static.mjs:151-161`, `src/app/layout.tsx:63-66`, `scripts/harden-static-export.mjs:9-14`, `.github/workflows/deploy-pages.yml:31-35`, `.context/project/01-overview.md:30-32`
- **Evidence:** The local static server sends headers such as `X-Frame-Options`, `Strict-Transport-Security`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, and `X-Content-Type-Options`. The exported app relies on a meta CSP, and the hardening script explicitly omits response-only CSP directives like `frame-ancestors`. The GitHub Pages workflow uploads the `out` directory directly and has no header-capable deployment step. Project docs acknowledge Pages cannot emit these headers and uses a JavaScript framebuster fallback.
- **Failure scenario:** Production on raw GitHub Pages has materially weaker clickjacking/isolation/permissions posture than local `npm run start` or `npm run smoke:static`. A sandboxed or delayed script execution path can bypass the JavaScript framebuster long enough for clickjacking-style UI exposure.
- **Suggested fix:** Either accept and document this as an explicit production residual risk, or deploy behind a header-capable CDN/static host and add a live-header verification checklist. Keep local smoke separate from claims about production header parity.

### 5. Critical pure logic relies almost entirely on a monolithic browser e2e suite

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed maintainability/testability risk
- **Code region:** `package.json:6-17`, `e2e/travelback.spec.ts:216-1524`, `src/lib/parser.ts:1-744`, `src/lib/camera.ts:1-436`, `src/lib/interpolate.ts:1-205`, `src/lib/videoEncoder.ts:1-250`
- **Evidence:** The package scripts expose lint, typecheck, build, static smoke, and Playwright e2e runs, but no unit or component-level test command. The single `e2e/travelback.spec.ts` file carries broad feature coverage while parser, camera, interpolation, and encoder logic have no direct deterministic tests.
- **Failure scenario:** A small change to timestamp parsing, antimeridian interpolation, scene duration normalization, camera easing, or export abort behavior regresses a pure function. The regression is either missed because no e2e path reaches the edge case, or debugging is slow because failures appear only through a browser-level scenario.
- **Suggested fix:** Add a small deterministic test layer for pure modules before deeper refactors: parser fixture tests, camera/interpolation edge cases, scene normalization, and export lifecycle tests with mocked canvas/encoder boundaries. Keep e2e for integrated user flows and split the monolithic e2e spec by feature as coverage grows.

## Non-findings and supporting evidence

- I found no high-confidence critical data-loss or remote-code-execution issue in the reviewed source. File parsing has explicit size caps, coordinate bounds, depth checks, XML entity preflight, and structured `ParseError` handling in `src/lib/parser.ts`.
- I found no dependency advisory at high severity or above: `npm audit --audit-level=high` reported 0 vulnerabilities.
- I found no current lint/type/build breakage: lint, typecheck, production build, and local static smoke all passed.
- I found no skipped runtime source file in `src`; all app, component, lib, style, and type files were read during this review.
- Locale dictionaries were checked for key-count consistency across the built-in languages; all inspected language tables expose the same number of keys.

## Final sweep

No relevant runtime/config/test file was skipped. The review covered all tracked application source files, public worker/assets, scripts, configs, workflows, e2e tests/fixtures, README/project/development docs, and active/deferred context artifacts needed to understand known cross-file risks. Historical `.context` and `plan` archives were inventoried and checked for continuity with deferred findings, but runtime behavior was validated from source code rather than historical comments. Generated/ignored build outputs such as `.next` and `out` were not treated as source-of-truth review inputs.

## Finding count summary

- Critical: 0
- High: 0
- Medium: 4
- Low: 1
- Total: 5
