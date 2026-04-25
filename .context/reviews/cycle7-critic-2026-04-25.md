# Cycle 7 Critic Review — 2026-04-25

## Scope and method
- Examined the active runtime surface end-to-end: `src/app/*`, `src/components/*`, `src/lib/*`, `src/types.ts`, `public/workers/trackParser.worker.js`, `public/map-styles/*.json`, `scripts/*`, `package.json`, `next.config.ts`, Playwright config, workflow config, and `.context/project/*` / `.context/development/*` guidance.
- Excluded historical plan/review archives under `.context/plans/archive`, `.context/reviews/*`, and `plan/*` from finding generation because they are trace artifacts, not live product/runtime code.
- Verification run: `npm run lint`, `npm run typecheck`, and `npm run build` all passed on 2026-04-25.

## Findings

### 1. MEDIUM — Product/docs promise five map styles and an “interactive map”, but the shipped styles are only flat background colors plus a synthetic grid
- Evidence:
  - `.context/project/01-overview.md:11`, `.context/project/01-overview.md:14`, `.context/project/01-overview.md:80`, `.context/project/01-overview.md:91` describe an “interactive map” with five bundled “map styles”.
  - `public/map-styles/voyager.json:4`, `public/map-styles/voyager.json:16`, `public/map-styles/dark.json:4`, `public/map-styles/dark.json:16` show each bundled style has no sources and only a single `background` layer.
  - `src/components/MapView.tsx:240` and `src/components/MapView.tsx:351` add a generated latitude/longitude reference grid, which is the only geographic context beyond the route itself.
  - `scripts/fetch-map-styles.mjs:18` and `scripts/fetch-map-styles.mjs:35` explicitly generate “Minimal bundled base style with no remote tiles, glyphs, or sprites.”
- Scenario:
  - A user picks “Voyager”, “Liberty”, or “Bright” expecting different basemap content for orientation and exports, but the actual output only changes the background tint and grid color. The product copy currently reads more like a real basemap feature than a privacy-first abstract canvas.
- Why this matters:
  - This is a documentation/product-behavior mismatch, not just wording polish. It affects first-use trust and the user’s mental model for exports.
- Confidence: high
- Fix:
  - Either ship real local basemap assets that justify the current wording, or rewrite the docs/UI copy to describe these as backdrop themes / route canvases rather than map styles.
  - Rename the style labels or add explicit copy in the UI and docs that these themes are privacy-safe abstract backgrounds.

### 2. MEDIUM — Timeline trimming can drop the user’s final drag position because pointer-up cancels the pending rAF update instead of flushing it
- Evidence:
  - `src/components/TimelineSelector.tsx:201` schedules drag updates inside `requestAnimationFrame`.
  - `src/components/TimelineSelector.tsx:288` cancels any pending frame in `endDrag()` before resolving the final range from React state.
  - `src/components/TimelineSelector.tsx:294` then recomputes indexes from `startRatio` / `endRatio`, which may still reflect the previous frame if the last `mousemove`/`touchmove` happened just before release.
- Scenario:
  - A user drags a handle quickly and releases. If the final pointer move is still queued in `rafRef`, `endDrag()` cancels it and commits the previous ratio instead. The visible selection can snap slightly backward from where the pointer was released.
- Why this matters:
  - The trim interaction is a core product control. Losing the final pointer position makes the UI feel imprecise and is exactly the kind of bug that survives happy-path tests but frustrates real users.
- Confidence: medium-high
- Fix:
  - Persist the latest pointer X in a ref and flush one final synchronous `applyDrag` on pointer-up before clearing drag state, or let the pending frame complete and only finish after it runs.
  - Add a regression test that simulates a fast drag-and-release and asserts the handle ends at the last pointer position, not the previous frame.

### 3. MEDIUM — CI never exercises the real WebCodecs / mediabunny export path; it only validates the test stub path
- Evidence:
  - `src/lib/useExportController.ts:161` switches to a local stub when `travelback-export-test-stub=1` is present.
  - The real export path lives in `src/lib/useExportController.ts:173` and `src/lib/videoEncoder.ts:40`, including the `waitForIdle`, `CanvasSource.add`, `Output.finalize`, and download flows.
  - The export tests in `e2e/travelback.spec.ts:1274` and `e2e/travelback.spec.ts:1295` explicitly enable `travelback-export-test-stub` before asserting export success.
- Scenario:
  - A CSP regression, mediabunny import breakage, codec probe regression, `showSaveFilePicker` issue, or `CanvasSource.add()` behavior change can ship even while CI stays green, because the suite never hits the actual encoder path.
- Why this matters:
  - Export is the product’s payoff feature. The current coverage proves the export UI state machine, but not the real browser capabilities the user depends on.
- Confidence: high
- Fix:
  - Keep the stubbed E2E as a fast smoke test, but add at least one real-path integration test behind feature detection using a tiny fixture and a very short duration.
  - If browser CI remains too flaky for full encode coverage, add lower-level tests around `videoEncoder.ts` and explicitly gate the real-path smoke under an environment matrix where WebCodecs is known-good.

### 4. MEDIUM — The Playwright suite is tightly coupled to English marketing/copy strings, which makes harmless copy or localization changes look like product regressions
- Evidence:
  - Representative examples: `e2e/travelback.spec.ts:240`, `e2e/travelback.spec.ts:384`, `e2e/travelback.spec.ts:795`, `e2e/travelback.spec.ts:1212`, `e2e/travelback.spec.ts:1235`, `e2e/travelback.spec.ts:1440`.
  - Many assertions use exact English UI labels like `Travelback`, `Try with a sample trip`, `Camera`, `Export`, `Export Video`, `Start Export`, `Play`, and `Pause` instead of stable test IDs or locale-aware selectors.
- Scenario:
  - A non-functional copy update, a localization-driven wording change, or even a small button-label cleanup will fail dozens of tests unrelated to the underlying behavior.
- Why this matters:
  - The suite becomes noisy and expensive to maintain. That reduces confidence in red builds and discourages benign product copy improvements.
- Confidence: high
- Fix:
  - Prefer `data-testid` or semantic structure assertions for stable product actions.
  - Where copy is the thing under test, isolate that to dedicated localization tests instead of reusing text selectors across unrelated workflows.
  - Build shared helper selectors for core actions (`openExportPanel`, `openSceneEditor`, `startPlayback`) so label changes do not require repo-wide test edits.

## Final sweep
- I did not find a current compile-time or build-time failure: `lint`, `typecheck`, and `build` all passed.
- I did not find a high-confidence security issue in the active app surface.
- The strongest remaining concerns are behavioral precision in timeline trimming, export-path test blind spots, and the mismatch between the shipped abstract map canvas and the product/docs framing.
