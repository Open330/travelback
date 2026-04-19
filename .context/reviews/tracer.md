# Tracer Report — Prompt 1

Scope reviewed: `.context/**`, `package.json`, root configs, `src/**`, `scripts/**`, `e2e/**`, and `public/**`.

Inventory sweep covered:
- app shell / session orchestration: `src/app/page.tsx`, `src/app/layout.tsx`
- parsing / playback / camera / export runtime: `src/lib/*`, `src/components/{MapView,Controls,TimelineSelector,SceneEditor,ExportPanel,JourneyCreator,FileUpload,TrackWorkspace}`
- build / serve / hardening scripts: `scripts/{fetch-map-styles,harden-static-export,serve-static,smoke-static}.mjs`
- verification surfaces: `e2e/travelback.spec.ts`, `playwright*.config.ts`
- shipped assets: `public/map-styles/*.json`, `public/workers/trackParser.worker.js`, `public/theme-init.js`

Static smoke was run during the sweep and failed on the shipped map styles:

`node scripts/smoke-static.mjs` → `bright.json still depends on remote sprite/glyph assets`

## Findings count: 4

| # | Status | Confidence | Area |
|---|---|---:|---|
| 1 | Confirmed | High | Static build / map-style hardening |
| 2 | Confirmed | High | Upload / parse fallback |
| 3 | Risk | Medium | Upload / parse DoS guard |
| 4 | Confirmed | High | Scene editing / normalization |

---

## 1) Shipped map styles still depend on remote sprite/glyph assets

- **File/region**
  - `scripts/fetch-map-styles.mjs:31-41,99-136`
  - `public/map-styles/voyager.json:5-20` (same pattern in `positron.json`, `dark.json`, `liberty.json`, `bright.json`)
  - `scripts/smoke-static.mjs:104-127`
  - `package.json:7-16`
  - `src/components/MapView.tsx:500-507,575-583`

- **Traced flow**
  - `npm run build` / static export → copies `public/map-styles/*.json`
  - `MapView` loads `MAP_STYLES[mapStyleKey].url`
  - style JSON still points at CARTO `sprite`, `glyphs`, and vector tile CDN endpoints
  - `scripts/smoke-static.mjs` asserts the shipped styles are locally pinned and fails immediately

- **Causal explanation**
  - The adaptation script only rewrites vector source `url` → `tiles`.
  - It does not remove or localize `sprite` and `glyphs`.
  - The build pipeline does not run a separate style-fixup step; `postbuild` only hardens CSP.

- **Failure scenario**
  - Static smoke fails on the built artifact, which is already happening.
  - A “local-only” or offline deployment still needs remote sprite/glyph fetches, so label/POI rendering can break behind restrictive firewalls or offline.
  - The docs and runtime contract disagree with the shipped assets.

- **Fix suggestion**
  - Either make `fetch-map-styles.mjs` fully emit self-contained styles, or wire a separate asset rewrite step into the build so the shipped JSON actually matches the local-only contract.
  - If remote CARTO assets are intentional, update the docs, CSP rationale, and smoke assertions to match that reality.

- **Confidence**
  - High. The mismatch is directly visible in the JSON and reproduced by the smoke script.

- **Status**
  - Confirmed

---

## 2) Large JSON worker failures reject instead of falling back to the canonical parser

- **File/region**
  - `src/lib/parser.ts:450-516`
  - `src/lib/parser.ts:521-545`
  - `src/components/FileUpload.tsx:34-47`

- **Traced flow**
  - File upload → `parseTrackFile()`
  - `.json` files route into `parseGoogleLocationHistoryInWorker()`
  - worker success resolves the track
  - worker creation / `event.data.error` / missing `track` fall back to the canonical parser
  - but `worker.onerror` rejects outright for payloads over 50MB

- **Causal explanation**
  - The app advertises 500MB JSON support (`JSON_MAX_FILE_SIZE`).
  - The canonical parser in the same file can still parse those files.
  - The worker error path adds an unrelated `text.length > 50MB` cutoff and bypasses the fallback parser.

- **Failure scenario**
  - A large but valid Google JSON export triggers a worker exception in one browser/runtime.
  - Instead of retrying with the main-thread parser, the app returns “too large to parse without Web Worker”.
  - Users lose a supported import path even though the file is within the published size cap.

- **Fix suggestion**
  - Remove the hard 50MB rejection and retry the canonical parser on all worker failures, or
  - make the worker fallback policy explicitly match the supported JSON limit and surface that tradeoff in the UI.

- **Confidence**
  - High. The rejection branch is explicit in the code path.

- **Status**
  - Confirmed

---

## 3) JSON depth guard can miss deep nesting in later file regions

- **File/region**
  - `src/lib/parser.ts:317-360,364-447`
  - `public/workers/trackParser.worker.js:200-245,125-194`

- **Traced flow**
  - Upload → Google JSON parse path
  - both main-thread and worker copies run the same `checkJsonDepth()` logic
  - the first 1MB is scanned fully, then only four 1KB sample windows are inspected

- **Causal explanation**
  - The sample scans restart at `baseDepth` instead of the true cumulative depth at each sample offset.
  - That means deep nesting outside the sampled windows can evade the guard.
  - The worker and main parser share the same algorithm, so the gap exists in both execution modes.

- **Failure scenario**
  - A deeply nested Google JSON file slips past the guard and still reaches `JSON.parse()`.
  - Very large or malicious payloads can therefore consume far more CPU/memory than intended in the browser.

- **Fix suggestion**
  - Replace the spot-check heuristic with a streaming depth counter or a proper cumulative scan.
  - If sampling must stay, compute the real depth at each sample boundary before continuing.

- **Confidence**
  - Medium to high. The algorithmic gap is clear, but the severity depends on input shape and file size.

- **Status**
  - Risk

---

## 4) Invalid scene ranges are normalized away before the warning path can fire

- **File/region**
  - `src/components/SceneEditor.tsx:201-213,271-285,420-453`
  - `src/lib/camera.ts:19-44`

- **Traced flow**
  - User edits scene start/end numbers or drag handles
  - `updateScene()` patches the scene
  - `commitScenes()` immediately calls `normalizeScenes()`
  - `normalizeScenes()` clamps, sorts, enforces monotonic ranges, and filters out zero-length scenes
  - only after that does `commitScenes()` compute `normalizationWarnings`

- **Causal explanation**
  - The warning check runs on the already-normalized output.
  - By that point, any `start >= end` scene has either been corrected or filtered out, so the warning branch is effectively dead.

- **Failure scenario**
  - A user enters a reversed or overlapping range in the numeric inputs.
  - The scene can disappear without a visible explanation instead of remaining in an invalid-but-repairable state.
  - The intended validation message never appears.

- **Fix suggestion**
  - Validate the raw edited draft before normalization, or preserve invalid scenes with an explicit inline warning until the user corrects them.

- **Confidence**
  - High. The warning computation happens after the normalization step that removes the invalid state.

- **Status**
  - Confirmed

---

## Final sweep

- Re-checked the other critical paths:
  - playback/progress
  - export lifecycle
  - serving headers
  - session reset / track clearing
- No additional confirmed runtime bug surfaced in those paths during this sweep beyond the issues above.
- Low-severity UI/a11y items already tracked in `.context/plans/deferred-findings-cycle2-2026-04-19.md` remain deferred and were not counted here.
