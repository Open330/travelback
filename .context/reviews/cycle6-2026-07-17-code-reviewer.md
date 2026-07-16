# Code Reviewer — Cycle 6 (2026-07-17)

Reviewed revision: `1d2755c` on `codex/review-plan-fix-2026-07-16`

## Result

**One new Medium/High correctness finding.** The Cycle 5 fixes otherwise remain coherent across the map, parser, export, interaction, localization, and static-deployment paths. Review disposition: **COMMENT** until CR6-01 is fixed or explicitly accepted.

## Coverage and method

- Read every tracked implementation and test file: all 53 files under `src/` (including all 15 Vitest suites) and all 19 files under `e2e/` (the 2,624-line specification plus all 18 fixtures).
- Read all seven scripts, the Pages workflow, `package.json`, lockfile root/graph metadata, Next/TypeScript/ESLint/PostCSS/Vitest/both Playwright configurations, `.gitignore`, README, and all 19 public assets. The WOFF2 payload was treated as binary; its declaration, loading path, CSP allowance, and tracked presence were checked.
- Read the complete current project/development context, plan index, Cycle 4 and Cycle 5 implementation records, current aggregate, and all current Cycle 5 role reports needed for provenance and duplicate suppression.
- Traced state ownership and cleanup across hooks/components rather than reviewing files in isolation. No product source was changed and no test server, build, browser, deployment, CI, or production action was run.

## Finding

### CR6-01 — Retry Map resets a manually controlled camera to the constructor world view

- Severity: **Medium**
- Confidence: **High**
- Classification: **Confirmed by deterministic source flow**

Exact evidence:

- `src/components/MapView.tsx:899-914` constructs every replacement MapLibre instance at `[0, 20]`, zoom `2`.
- `src/components/MapView.tsx:1072-1077` arms `fitTrackOnReadyRef` only when the track object is new. `preparedTrackRef` survives a map-generation replacement.
- `src/components/MapView.tsx:879-885` consumes and clears that one-shot fit request during the first hydration.
- `src/components/MapView.tsx:1197-1200` implements Retry Map by changing only `mapRetryNonce`; it neither snapshots the outgoing camera nor re-arms a same-track fit.
- `src/components/MapView.tsx:868-881` reapplies an automatic camera only while follow is enabled. With follow disabled and no fit request, hydration restores route/trail/marker state but leaves the new instance at its constructor camera.
- `src/lib/usePlaybackController.ts:17-23` defaults follow to `true`, and `e2e/travelback.spec.ts:594-705` exercises retry only in that default state. It therefore passes without covering manual-camera ownership.
- `.context/plans/cycle4-implementation-2026-07-16.md:24-30` explicitly accepted that Retry Map would no longer leave the camera at the constructor world view. The implementation satisfies that only for automatic-camera ownership.

Concrete failure scenario:

1. Load a track, turn **Follow** off, and pan/zoom to a useful manual view.
2. Trigger a map-style load error and choose **Retry Map**.
3. The route, trail, and marker return, but the map remains at `[0, 20]`/zoom `2`; a regional route can be completely off-screen. With follow still off, later progress updates do not repair the camera.

Recommended fix:

- Treat camera state as part of map-generation handoff. Snapshot center, zoom, pitch, and bearing from the outgoing live instance before retry teardown and replay that snapshot after the replacement style is hydrated when automatic camera ownership is disabled.
- A smaller fallback is to re-arm a same-track fit for each new map generation, but that discards the user's authored manual view; snapshot/replay better preserves ownership semantics.
- Add an actual Retry Map E2E case that turns Follow off, sets a distinguishable camera, triggers a style failure, clicks Retry Map, and asserts the replacement camera is neither the constructor world view nor an unintended automatic-follow pose.

## Cross-file and missed-issue sweep

- Rechecked parser budgets/validation/worker fallbacks, export lease/cancellation/finalization/memory limits, object-URL cleanup, style revision ownership, map/Journey Creator listener cleanup, timeline and scene drag terminal paths, CSP/base-path hardening, locale key and placeholder parity, and static/dev runner ownership. No additional correctness defect met the evidence threshold.
- A proposed late-error race from a superseded string style was rejected: installed MapLibre 5.24 aborts the prior diff request and suppresses abort errors (`node_modules/maplibre-gl/src/ui/map.ts:2159-2179`; `node_modules/maplibre-gl/src/style/style.ts:431-450`), the shipped style JSONs have no remote source/sprite/glyph requests, and `e2e/travelback.spec.ts:632-670` releases a superseded request and verifies that it cannot surface a map error or mutate the pose.
- Existing B01-B04 and D01-D04 items were not re-reported. Cycle 5 P01-P05 remain completed except for the newly exposed manual-camera branch of the older map-generation acceptance contract.

## Explicit skipped-file accounting

- Of 721 tracked `.context/` files, 21 current/provenance files were read; 700 historical review/plan/agent artifacts were skipped after the active aggregate and Cycle 5 provenance established their superseded status.
- All 39 tracked files under legacy root `plan/` were skipped as superseded historical planning artifacts.
- The generated dependency lock was inspected through root declarations, resolved graph metadata, overrides, integrity/engine/peer-relevant entries, and installed-contract probes rather than line-by-line prose review.
- `public/fonts/PretendardVariable.woff2` was the only binary payload not decoded. No tracked source, configuration, script, textual public asset, unit test, E2E test, or fixture was skipped.
