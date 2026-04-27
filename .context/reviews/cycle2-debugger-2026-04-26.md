# Cycle 2 debugger review — 2026-04-26

## Scope / inventory reviewed
Reviewed the tracked repository tree by category:
- application and UI code: `src/app/*`, `src/components/*`, `src/lib/*`, `src/types.ts`, `src/styles/*`
- build/runtime scripts: `scripts/*.mjs`, `public/workers/trackParser.worker.js`
- integration and regression coverage: `e2e/travelback.spec.ts`, `e2e/fixtures/*`
- config and deployment: `package.json`, `next.config.ts`, `eslint.config.mjs`, `playwright*.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `.github/workflows/deploy-pages.yml`
- docs/context: `README.md`, `.context/*`, `plan/*`

I examined each relevant file family end-to-end and cross-checked interactions between playback, export, parsing, map rendering, and test coverage.

## Verification
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅

## Findings

### 1) Playback/export progress mutates React state every frame, forcing MapView to recompute camera and trail effects on every tick
- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed
- **Regions:** `src/lib/usePlaybackController.ts:122-145`, `src/lib/useExportController.ts:173-180`, `src/components/MapView.tsx:879-986`
- **Failure scenario:** long playback or export causes per-frame `setPlaybackProgress` updates, which retrigger the `MapView` effect keyed on `progress`. That effect also recomputes camera state and trail data, so every frame triggers React work plus MapLibre updates. On long tracks this can stutter playback and make exports appear hung.
- **Suggested fix:** keep frame stepping on imperative refs during export, throttle UI progress updates, and avoid routing every encoded frame through React state/effect re-execution.

### 2) Trail geometry is rebuilt from scratch on each progress update instead of being updated incrementally
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed
- **Regions:** `src/components/MapView.tsx:109-170`, `src/components/MapView.tsx:879-904`, `src/lib/parser.ts:701-706`
- **Failure scenario:** `buildTrackGeometry()` slices the full `points` array, rewraps longitudes, and reallocates segment coordinates for the whole visible trail on every update. For tracks near the parser limit (up to 250,000 points), this makes the cost scale with `points × frames`, which can lock the main thread during scrubbing, playback, or export.
- **Suggested fix:** precompute wrapped segment coordinates once, reuse cached segment buffers, and update only the incremental head/tail of the trail as progress changes.

### 3) The “export succeeded” E2E path does not exercise the real encoder/map-render pipeline
- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed
- **Regions:** `src/lib/useExportController.ts:20-27,161-185`, `e2e/travelback.spec.ts:1299-1308,1320-1328`
- **Failure scenario:** the export test sets `travelback-export-test-stub=1`, which bypasses `exportVideo()` and returns a fake MP4 after one animation frame. CI can therefore stay green while regressions in `waitForStableMap`, frame capture, or MP4 encoding break real exports.
- **Suggested fix:** keep the stub for UI-only smoke coverage, but add a deterministic real-export smoke that reaches `exportVideo()` with mocked timing/encoder dependencies, or split the success criteria so the stubbed path cannot satisfy the only export-complete check.

## Final sweep
Relevant file families were fully reviewed: app/layout, UI components, playback/export libs, parser/camera/interpolation code, worker and map styles, scripts, tests/fixtures, configs, deployment workflow, and context docs/plans/reviews. No relevant file family was skipped in the review pass.
