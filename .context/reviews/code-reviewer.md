# Deep Whole-Repo Code Review — Code Reviewer

## Scope
Reviewed `.context/**`, `package.json`, root configs, `src/**`, `scripts/**`, `e2e/**`, and selected `public/**` runtime assets.

## File inventory
- `.context/**`: project docs, conventions, plans, historical reviews
- Root config: `package.json`, `next.config.ts`, `eslint.config.mjs`, `playwright.config.ts`, `playwright.static.config.ts`, `postcss.config.mjs`, `tsconfig.json`
- App/runtime code: `src/app/**`, `src/components/**`, `src/lib/**`, `src/types.ts`
- Scripts: `scripts/fetch-map-styles.mjs`, `scripts/harden-static-export.mjs`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`
- Tests: `e2e/travelback.spec.ts`
- Public/runtime assets reviewed: `public/map-styles/*.json`, `public/theme-init.js`, `public/workers/trackParser.worker.js`, `public/fonts/.omc/state/last-tool-error.json`

## Verification performed
- `npx tsc --noEmit --project tsconfig.json` via diagnostics: **0 TypeScript errors**
- `node scripts/smoke-static.mjs`: **FAILED** with `bright.json still depends on remote sprite/glyph assets`
- Targeted logic checks:
  - Timeline selector `ratioToIndex(1)` returns the penultimate index
  - `maplibre-gl` `LngLatBounds` over `[179, -179]` expands to west=`-179`, east=`179`
  - `centerDistanceMeters([179,0],[-179,0])` computes ~39,852,560m

## Findings summary
- HIGH: 3
- MEDIUM: 3
- LOW: 1
- Total: 7

## Findings

### 1) [HIGH] Runtime map styles still depend on third-party CARTO assets, contradicting the documented local-only/offline contract
- **Files / lines:**
  - `.context/project/01-overview.md:14`
  - `.context/project/02-architecture.md:100-103`
  - `public/map-styles/bright.json:5-20` (same pattern in the other shipped styles)
  - `scripts/smoke-static.mjs:112-125`
- **Why this is a problem:** The repo documentation says runtime map display no longer depends on external tiles, glyphs, or sprites, but the shipped style JSONs still include remote vector tiles, remote sprites, and remote glyphs. The repo’s own smoke test asserts those dependencies must not exist.
- **Concrete failure scenario:** A user opens the exported app offline or behind a restrictive firewall/CSP. The map cannot fully render because `public/map-styles/*.json` still points at `tiles*.basemaps.cartocdn.com` and remote glyph/sprite endpoints. This is already observable: `node scripts/smoke-static.mjs` fails immediately with `bright.json still depends on remote sprite/glyph assets`.
- **Suggested fix:** Either (a) restore truly local styles/assets and make `scripts/fetch-map-styles.mjs` emit that contract, or (b) update the product docs, CSP, and smoke assertions to match an intentionally remote-basemap design. Right now the code, docs, and verification disagree.
- **Confidence:** High
- **Status:** Confirmed

### 2) [HIGH] Default timeline selection drops the final point of every non-empty track
- **Files / lines:**
  - `src/components/TimelineSelector.tsx:107-138`
  - `src/app/page.tsx:144-165`
- **Why this is a problem:** `ratioToIndex()` always returns the lower bound (`lo`). When `endRatio === 1`, it resolves to the penultimate point instead of the last point. The mount effect immediately emits that trimmed range, and `page.tsx` slices the active track to `endIdx + 1`, permanently removing the final point from the working track.
- **Concrete failure scenario:** A user uploads a route and never touches the timeline selector. The app still trims away the trip’s actual endpoint on mount, so playback/export end early and the UI can show fewer active points than the source file.
- **Suggested fix:** Use asymmetric mapping: keep floor/lower-bound behavior for `startRatio`, but use upper-bound/ceil behavior for `endRatio` (or explicitly return `lastIndex` when `ratio >= 1`). Add a regression test that the default mounted selection remains `0 .. lastIndex`.
- **Confidence:** High
- **Status:** Confirmed

### 3) [HIGH] The advertised 500MB Google JSON path is not memory-safe and can still crash the tab
- **Files / lines:**
  - `src/lib/parser.ts:519-545`
  - `public/workers/trackParser.worker.js:196-267`
- **Why this is a problem:** The app accepts JSON uploads up to 500MB, but it first reads the full file into a main-thread string and then posts that full string to the worker. That duplicates the payload before parsing even begins, and JSON parsing itself allocates more memory again.
- **Concrete failure scenario:** A user imports a 350-500MB Google Location History export on a typical laptop. `FileReader.readAsText()` allocates hundreds of MB on the main thread, `postMessage()` clones it into the worker, then `JSON.parse()` allocates again; the tab can freeze or OOM even though the nominal size limit says the file is supported.
- **Suggested fix:** Lower the practical JSON limit immediately, then redesign the worker path so the main thread does not materialize multiple large string copies (for example `ArrayBuffer` transfer + worker-side decode/chunking/streaming).
- **Confidence:** High
- **Status:** Likely

### 4) [MEDIUM] Cancelling the native save dialog is reported as a successful export
- **Files / lines:**
  - `src/lib/videoEncoder.ts:154-169`
  - `src/lib/useExportController.ts:138-147`
- **Why this is a problem:** `downloadVideo()` returns normally when `showSaveFilePicker()` throws `AbortError`. The caller then treats the export as saved, stores the blob URL, sets `exportState` to `done`, and shows the success toast.
- **Concrete failure scenario:** In Chrome/Edge, a user exports a video, the native save picker appears, and they hit Cancel. The app still says “Video saved!” even though nothing was written to disk.
- **Suggested fix:** Propagate cancellation to the caller (rethrow `AbortError` or return an explicit `{ saved: false }` result) and let `useExportController` show the existing cancelled path instead of the success path.
- **Confidence:** High
- **Status:** Confirmed

### 5) [MEDIUM] Antimeridian handling is incomplete in `MapView`, so dateline-crossing routes still jump or zoom incorrectly
- **Files / lines:**
  - `src/components/MapView.tsx:69-74`
  - `src/components/MapView.tsx:711-716`
- **Why this is a problem:** `camera.ts` already contains dedicated antimeridian-aware logic, but `MapView` still computes longitude deltas and initial bounds in plain `[-180, 180]` space. That treats a 179°E → 179°W route as a 358° span instead of a short Pacific crossing.
- **Concrete failure scenario:** A Japan↔Alaska or Fiji↔Samoa track initially fits to almost the whole world, and follow-camera smoothing/snap logic interprets tiny dateline crossings as ~39,852km jumps, producing sudden camera snaps.
- **Suggested fix:** Reuse the shifted-longitude/antimeridian helpers already present in `camera.ts` for both initial bounds fitting and `centerDistanceMeters()` calculations, and add a regression test with a dateline-crossing fixture.
- **Confidence:** High
- **Status:** Confirmed

### 6) [MEDIUM] Internal tool-state JSON is being published as a web asset
- **Files / lines:**
  - `public/fonts/.omc/state/last-tool-error.json:1-6`
- **Why this is a problem:** Anything under `public/` is deployable static content. This file is a local tool artifact, not an app asset, and it exposes internal tooling metadata plus a request preview.
- **Concrete failure scenario:** A production deploy serves `/fonts/.omc/state/last-tool-error.json`, leaking internal workflow noise and normalizing accidental artifact publication inside user-facing static assets.
- **Suggested fix:** Remove `.omc` state from `public/`, add ignore/cleanup rules so generated tool state cannot land under deployable asset trees, and consider a CI guard that rejects dot-directories beneath `public/` unless explicitly allowlisted.
- **Confidence:** High
- **Status:** Confirmed

### 7) [LOW] The Playwright suite still relies on fixed sleeps in critical flows, which will stay flaky under variable CI timing
- **Files / lines:**
  - `e2e/travelback.spec.ts:111-116`
  - `e2e/travelback.spec.ts:326-344`
  - `e2e/travelback.spec.ts:561-563`
  - `e2e/travelback.spec.ts:662-681`
- **Why this is a problem:** The suite mixes solid `expect.poll()` checks with unconditional `waitForTimeout()` delays. Those sleeps encode machine-specific timing assumptions rather than waiting for actual app state.
- **Concrete failure scenario:** CI runs on a slower worker or after a browser/toolchain upgrade. A hard-coded 750ms/1500ms/2000ms sleep becomes insufficient, and tests start failing intermittently even though the app behavior is unchanged.
- **Suggested fix:** Replace fixed sleeps with explicit readiness signals (`expect.poll`, DOM state checks, debug state checks, or map-idle hooks) so tests wait on observable behavior rather than elapsed wall time.
- **Confidence:** High
- **Status:** Confirmed

## Missed-issues sweep
A final sweep across configs/scripts/public artifacts did not reveal additional blocking TypeScript errors, but it reinforced two broader patterns:
1. **Contract drift** between docs, smoke checks, and shipped map-style assets.
2. **Edge-case regressions** around boundaries (timeline upper bound, save-dialog cancellation, antimeridian routes, very large JSON imports).

## Recommendation
**REQUEST CHANGES**

Stage 1 (spec/compliance) does not pass because the repository currently ships remote-dependent map styles despite documenting and testing a local-only contract. The three HIGH findings should be addressed before treating this branch as review-clean.
