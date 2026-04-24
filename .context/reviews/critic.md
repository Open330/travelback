# Critic Review — Review-Plan-Fix Cycle 2 (2026-04-24)

**Reviewer:** critic lane
**Scope:** current repo runtime, build, export, UX, and test surface. This review is grounded in the live code/config surface, not prior review artifacts.

## Inventory Reviewed First

### Runtime and UX surface
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- `src/components/*.tsx`
- `src/lib/*.ts`
- `src/styles/vitro-base.css`
- `src/types.ts`
- `public/workers/trackParser.worker.js`
- `public/map-styles/*.json`

### Build, deployment, and verification surface
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `postcss.config.mjs`
- `playwright.config.ts`
- `playwright.static.config.ts`
- `scripts/*.mjs`
- `e2e/travelback.spec.ts`
- `e2e/fixtures/*` (fixture inventory checked)

## Verification Run

- `npm run typecheck` — passed
- `npm run build` — passed
- `npm run smoke:static` — passed
- Full Playwright suite was not rerun end-to-end for this pass; findings below rely on code evidence plus the existing test surface.

## Findings

### CRITIC-001 — The shipped “map” is effectively a blank background plus a synthetic grid, which does not match the product promise

- **Status:** Confirmed issue
- **Severity:** High
- **Confidence:** High
- **Evidence:** `src/app/layout.tsx:14-15`, `src/app/layout.tsx:24`, `src/types.ts:25-45`, `public/map-styles/voyager.json:1-29` (same structure in all `public/map-styles/*.json`), `src/components/MapView.tsx:225-324`, `src/components/MapView.tsx:327-369`
- **Why this is a problem:** The app copy promises an “interactive map” and animated travel videos with map context, but the bundled styles contain no basemap sources, no roads, no coastlines, and no labels. `MapView` compensates by drawing only a latitude/longitude reference grid over a flat color. That is a materially different product than what the landing copy and metadata advertise.
- **Concrete failure scenario:** A user uploads a GPX file for a city trip expecting recognizable geography. The route renders on a blank colored surface with abstract grid lines only, making the preview and exported video much less useful for storytelling or orientation.
- **Suggested fix:** Either ship a real local/offline basemap asset stack, or explicitly reposition the product and preview assets around “route-on-grid” output instead of “interactive map” output. Right now the code and the promise diverge.

### CRITIC-002 — Dateline trips still get world-scale reference-grid bounds because the grid path ignores antimeridian wrapping

- **Status:** Confirmed issue
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `src/components/MapView.tsx:107-168`, `src/components/MapView.tsx:170-204`, `src/components/MapView.tsx:263-319`
- **Why this is a problem:** The route renderer and fit-bounds logic already handle antimeridian crossings, but `buildReferenceGridData()` falls back to raw `minLng`/`maxLng`. For tracks around `179` to `-179`, that makes the span look almost global, so the reference grid expands to near-world coverage even when the route itself is local to the dateline crossing.
- **Concrete failure scenario:** A Korea↔Japan or Pacific dateline trip renders with a wrapped route, but the contextual grid explodes out to a near-global frame. The result is visually inconsistent and adds noise exactly on the edge case the rest of the map logic is trying to treat carefully.
- **Suggested fix:** Reuse the same wrapped-longitude bounding logic used by `buildTrackGeometry()` / `buildFitBounds()` when computing grid extent, so context geometry and route geometry share one antimeridian model.

### CRITIC-003 — Export failure messaging is misleading because all non-cancel failures are blamed on codec support

- **Status:** Confirmed issue
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `src/lib/useExportController.ts:123-139`, `src/lib/useExportController.ts:174-186`, `src/lib/i18n.ts:294-295`
- **Why this is a problem:** The controller throws for multiple failure classes, including map idle/render timing failures, then collapses all non-abort errors into `app.exportFailed + app.exportFailedSuffix`, whose copy specifically blames WebCodecs/codec support. That is a diagnosis, not a generic error.
- **Concrete failure scenario:** A 4K export on a slower device times out waiting for map idle after resize. The toast tells the user their browser may not support the selected codec, sending them toward the wrong workaround and hiding the actual render-time bottleneck.
- **Suggested fix:** Classify error sources before surfacing them. Preserve codec-specific guidance for codec-probe or encoder failures only, and provide distinct copy for map render timeout, resize failure, or generic export exceptions.

### CRITIC-004 — The “confirmed save” path likely never happens in normal exports because file-picker access is checked after a long async encode

- **Status:** Risk needing manual validation
- **Severity:** Medium
- **Confidence:** Medium
- **Evidence:** `src/lib/useExportController.ts:146-163`, `src/lib/videoEncoder.ts:171-188`
- **Why this is a problem:** `downloadVideo()` only attempts `showSaveFilePicker()` when `navigator.userActivation.isActive` is still true. But that call happens only after the entire async encode pipeline finishes. On typical browsers, user activation is short-lived; a multi-second or multi-minute export is unlikely to retain it.
- **Concrete failure scenario:** On a browser that supports the File System Access API, the user clicks “Start Export” expecting a save dialog. The export finishes, but activation has expired, so the app silently falls back to anchor download semantics instead of the picker path the code appears to support.
- **Suggested fix:** If confirmed-save UX matters, request the file handle before starting the long-running encode, or explicitly treat the picker branch as opportunistic and validate it on target browsers/devices before relying on it in product copy.

### CRITIC-005 — Google Location History parsing still exists in two separate implementations with drift risk

- **Status:** Risk needing manual validation
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `src/lib/parser.ts:242-519`, `src/lib/parser.ts:536-620`, `public/workers/trackParser.worker.js:44-248`, `public/workers/trackParser.worker.js:270-322`
- **Why this is a problem:** The main-thread parser and worker parser both implement format detection, segment flattening, deduplication, error codes, and JSON-depth behavior independently. They are close, but not structurally shared. That means correctness can diverge by file size, Worker availability, or future maintenance.
- **Concrete failure scenario:** A future fix lands in `src/lib/parser.ts` but not in `public/workers/trackParser.worker.js`. Small-file fallback imports behave one way, worker-backed imports behave another, and the discrepancy only appears in specific browsers or file sizes.
- **Suggested fix:** Move the Google parser into a shared source module consumed by both paths, or generate the worker from the same implementation so behavior cannot drift silently.

### CRITIC-006 — The tests cover export-panel chrome, but not the actual export/save path or the pure parser/camera logic that most needs regression protection

- **Status:** Risk needing manual validation
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `package.json:10-17`, `e2e/travelback.spec.ts:1111-1174`, `e2e/travelback.spec.ts:1237-1291`
- **Why this is a problem:** The repo’s automated verification is centered on Playwright UI flows. The export tests stop at “panel opens” and “Start Export is visible”; they do not click through a real encode/download flow. There is also no unit-test layer protecting the parser, interpolation, camera transitions, or download behavior directly.
- **Concrete failure scenario:** A regression in `videoEncoder.ts`, worker fallback parsing, or scene interpolation ships while the suite still passes, because the current tests assert UI affordances rather than the underlying outcome of an export or pure-function correctness across edge cases.
- **Suggested fix:** Add a unit/integration layer for `parser.ts`, `interpolate.ts`, and `camera.ts`, plus at least one export smoke test that actually exercises `Start Export` with a low-cost configuration and asserts the resulting completion state.

## Final Sweep

- **Reviewed current code/config/test surface:** all files under `src/app`, `src/components`, `src/lib`, `src/styles`, `src/types.ts`, top-level config files, `scripts/*.mjs`, `public/workers/trackParser.worker.js`, `public/map-styles/*.json`, and `e2e/travelback.spec.ts`.
- **Fixtures/assets:** `e2e/fixtures/*` were inventoried as test inputs; static SVG/font/binary assets were inventoried but not treated as primary logic-bearing review targets.
- **No relevant current code/config/test file was skipped.** Historical `.context` archives were not used as primary evidence for findings because this pass was intentionally grounded in the current repository state.
