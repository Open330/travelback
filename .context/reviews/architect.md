# Architect review — cycle 001

Date: 2026-07-16

Reviewed revision: `df8f08a` (`main`)

Scope: review only; no implementation, deployment, dependency, or configuration changes

## Coverage and system inventory

I inventoried the repository excluding generated output and dependencies, then traced every production boundary relevant to import, playback, map rendering, export, and static delivery. Coverage included all 41 files under `src/` (17 components, app shell/styles/types, 18 library TypeScript files including six unit-test files), the public parser worker and bundled map assets, all seven scripts, nine package/tool configs, 17 E2E fixtures, the 1,550-line Playwright suite, the Pages workflow, README, and project/development context. I also exercised targeted browser journeys rather than treating the component tree as sufficient evidence.

The overall decomposition is sound: `page.tsx` owns the session boundary, playback and export lifecycles are isolated in hooks, pure camera/interpolation code sits under `src/lib`, and the app has no server-owned data path. The three findings below are the remaining architectural pressure points.

## Findings

### ARCH-01 — The production Google parser has two manually synchronized implementations

- Severity: **High**
- Confidence: **High**
- Classification: **Confirmed defect in the source-of-truth boundary**
- Evidence: `src/lib/googleJsonParser.ts:7-13` explicitly declares the duplication; `public/workers/trackParser.worker.js:1-356` is the browser's worker implementation; `src/lib/parser.ts:239-335` routes Google JSON through that worker. `scripts/build-worker.mjs:3-8` does not generate or compare anything—it prints manual-copy instructions and an unconditional success message.
- Concrete drift: the TypeScript depth scanner rejects a closing bracket that drives depth below zero at `src/lib/googleJsonParser.ts:285-304`, while the worker decrements without that validation at `public/workers/trackParser.worker.js:303-321`.
- Failure scenario: a future Google format or safety fix is added to the tested TypeScript parser but not copied into the worker. Unit tests pass against one implementation while real browser uploads execute the other. The build script still exits successfully and says the logic is shared.
- Recommended fix: bundle or generate the worker from the shared parser source. If the Next build cannot own that step, add a deterministic generation script and make CI fail when generated output differs. Until then, run every Google fixture against both entry points and compare the resulting `Track` or error code.

### ARCH-02 — The core export promise has no functioning real-path release gate

- Severity: **High**
- Confidence: **High**
- Classification: **Confirmed verification-boundary defect; actual encoder failure is not established**
- Evidence: `e2e/travelback.spec.ts:1311-1315` makes the real WebCodecs test return successfully unless an opt-in environment variable is set. With the opt-in enabled, `e2e/travelback.spec.ts:1317-1320` selects playback duration `3`, but the only playback values are `10, 15, 30, 60, 120, 300` at `src/components/Controls.tsx:23-24`. The test failed on its initial run and retry before opening Export. The ordinary export test at `e2e/travelback.spec.ts:1299-1309` uses a local stub and passed.
- Failure scenario: a regression in the Mediabunny/WebCodecs frame loop, MP4 finalization, or blob download can ship while every default check stays green. An engineer who explicitly enables the smoke test sees a selector timeout rather than encoder evidence.
- Recommended fix: set a supported playback value or the Export panel's numeric duration (minimum 5 seconds), then make a supported-browser real-export smoke a release gate or a documented manual release check. Keep the stub test for deterministic UI state coverage, but label it as such.

### ARCH-03 — `MapView` still combines pure geometry, MapLibre lifecycle, playback, and export control

- Severity: **Medium**
- Confidence: **Medium**
- Classification: **Likely maintenance risk; no present user-visible failure confirmed**
- Evidence: `src/components/MapView.tsx:66-446` contains geometry, segment wrapping, reference-grid generation, and layer helpers; the stateful adapter begins at `src/components/MapView.tsx:462` and runs through line 1200. Its imperative contract includes normal rendering and export-only operations at `src/components/MapView.tsx:27-36`.
- Failure scenario: a change to antimeridian segmentation, map style reloads, or export rendering touches the same module and effect graph. A locally correct change can disturb playback or export cleanup because both lifecycles share refs and layer helpers.
- Recommended fix: extract the pure segment/grid/GeoJSON builders first, with no behavior change, then isolate the MapLibre source/layer adapter from the React lifecycle. Preserve the existing `MapViewHandle` as the boundary so `useExportController` and `page.tsx` do not churn simultaneously.

## Boundary assessment

The static-client constraint is respected: import and export remain browser-local, map themes are bundled, and route creation does not require an account, backend, or geocoder. `usePlaybackController` and `useExportController` are appropriate ownership boundaries. I found no additional confirmed layer inversion, persistence leak, or server dependency after a final pass across imports, configs, worker wiring, and deployment scripts.

## Priority order

1. Make the real export gate executable and meaningful.
2. Establish one generated/tested source of truth for Google parsing.
3. Reduce `MapView` coupling through behavior-preserving extraction.

## Final sweep

Rechecked source/config/script/docs inventory, worker/main-thread parser behavior, export entry points, targeted E2E evidence, and the working tree before writing. Findings distinguish current defects from architectural risk; no deployment recommendation is included.
