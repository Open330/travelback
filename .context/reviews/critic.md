# Prompt 1 skeptical whole-repo critique

Date: 2026-04-19
Scope: inventory first, then `.context/**`, root configs, `package.json`, `src/**`, `scripts/**`, `e2e/**`, `public/**`.

## Inventory

- `.context/`: 140 files (reviewed key project/docs directly; searched the rest for contradictions, stale assumptions, and verification drift)
- Root configs reviewed: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `playwright.config.ts`, `playwright.static.config.ts`, `postcss.config.mjs`
- `src/`: 31 files
- `scripts/`: 4 files
- `e2e/`: 14 files
- `public/`: 21 files

## Highest-signal findings

### 1) Product/docs still promise fully local/offline maps, but runtime still depends on CARTO network assets
- **File/region:** `.context/project/01-overview.md:14`; `.context/project/02-architecture.md:98-103`; `scripts/fetch-map-styles.mjs:2-10,24-39`; `public/map-styles/voyager.json:5-20` (same pattern in all style JSONs); `src/app/layout.tsx:57-60`
- **Problem:** The docs say runtime map display is fully local and no longer depends on third-party tiles/glyphs/sprites, but the shipped style JSONs still reference remote CARTO vector tiles, sprites, and glyphs, and the CSP explicitly allows that CDN.
- **Failure scenario:** Privacy/offline expectations are false. A user who opens the app with spotty/no network gets a blank/partial map or export idle timeouts even though the docs say the app works offline after initial load.
- **Suggested fix:** Pick one truth and enforce it everywhere:
  1. **Preferred:** self-host tiles/sprites/glyphs (or switch to a genuinely local/offline style stack), then remove the CARTO allowlist.
  2. **Fallback:** rewrite the docs/product copy/architecture notes to state that basemap rendering still depends on CARTO network assets and is not offline-safe.
- **Confidence:** High
- **Status:** **Confirmed**

### 2) The static smoke test is red by design against the current repository state
- **File/region:** `scripts/smoke-static.mjs:104-126`; `public/map-styles/*.json`
- **Problem:** `smoke-static` asserts that exported styles contain no `sprite`, no `glyphs`, no external sources, and no symbol layers, but every shipped style file still has remote glyph/sprite/source references.
- **Failure scenario:** Static verification is permanently broken, so either CI blocks or the team learns to ignore the smoke test entirely.
- **Evidence:** `npm run smoke:static` currently fails with `bright.json still depends on remote sprite/glyph assets`.
- **Suggested fix:** Align the verification with the actual product direction:
  1. make styles truly local so the smoke test passes, or
  2. relax/rename the smoke assertion so it validates the real contract instead of an aspirational one.
- **Confidence:** High
- **Status:** **Confirmed**

### 3) Static Playwright coverage depends on a dev-only debug hook that production builds do not ship
- **File/region:** `src/components/MapView.tsx:513-541`; `e2e/travelback.spec.ts:42-66`; `e2e/travelback.spec.ts:561-692`; `e2e/travelback.spec.ts:734-757`; `package.json:14-15`; `playwright.static.config.ts:5-20`
- **Problem:** Multiple E2E tests poll `window.__travelbackDebug`, but `MapView` only installs that object when `process.env.NODE_ENV === 'development'`. The static suite runs against the exported/served app, not `next dev`.
- **Failure scenario:** `npm run test:e2e:static*` cannot reliably validate route/trail attachment, camera motion, or style readiness in the production artifact. Coverage silently collapses or tests fail/hang waiting for a hook that does not exist.
- **Evidence:** `rg "__travelbackDebug" out/_next out -g '*.js' -g '*.html'` returns no matches in the built output.
- **Suggested fix:** Replace private debug-hook assertions with user-visible/DOM-visible assertions, or expose a narrowly scoped test-only hook in static builds behind an explicit test flag.
- **Confidence:** High
- **Status:** **Confirmed**

### 4) Explicit map-style/theme choices are session-only and disappear on refresh
- **File/region:** `src/app/page.tsx:260-280`; `src/app/layout.tsx:52`
- **Problem:** `handleModeChange()` persists `travelback-theme`, but `cycleStyle()` only mutates React state + document attributes. It does not persist the derived mode or the explicit map-style choice. On reload, the bootstrap script reconstructs state from stale `travelback-theme` (or system theme), not from the user's last style selection.
- **Failure scenario:** A user cycles to `Dark`, `Liberty`, or `Bright`, refreshes, and lands back on the old theme/default style. This makes the map-style button feel flaky and undermines user trust in customization.
- **Suggested fix:** Persist explicit map style separately (for example `travelback-map-style`) and restore it on boot, or route style-cycling through a single persistence path that saves both theme mode and map style consistently.
- **Confidence:** High
- **Status:** **Confirmed**

### 5) The 500MB Google JSON path is not memory-safe in practice
- **File/region:** `src/lib/parser.ts:450-545,518-564`; `public/workers/trackParser.worker.js:196-274`
- **Problem:** The app allows JSON uploads up to 500MB, but it first reads the entire file into a main-thread string (`FileReader.readAsText`) and then posts that full string to the worker. That means the “worker path” still duplicates a massive payload in memory before parsing begins.
- **Failure scenario:** Large real-world Google exports freeze or crash memory-constrained browsers long before the parser's logical limits are reached. Mobile Safari/Chrome are the most likely casualties.
- **Suggested fix:** Lower the practical JSON limit immediately, then move to a transfer/streaming design (for example `ArrayBuffer` + worker-side decode/chunking) so the main thread never materializes multiple 500MB string copies.
- **Confidence:** High
- **Status:** **Likely**

### 6) The parser’s “depth guard” is only a spot-check for large files, so the safety claim is weaker than it looks
- **File/region:** `src/lib/parser.ts:313-357`; `public/workers/trackParser.worker.js:200-245`
- **Problem:** For large JSON, `checkJsonDepth()` scans the first 1MB and then only four 1KB sample windows. That is not a real whole-file nesting bound; it assumes malicious or pathological nesting will happen near those checkpoints.
- **Failure scenario:** A crafted JSON file can keep the first megabyte shallow, put the deep nest elsewhere, and still hit expensive `JSON.parse()` behavior despite the advertised depth protection.
- **Suggested fix:** Either perform a full streaming depth scan before parse, or downgrade the claim and treat the current logic as a heuristic, not a hard guard.
- **Confidence:** Medium
- **Status:** **Risk**

## Final sweep

The biggest repo-wide pattern is **contract drift**:
- product/context docs say “local/offline/private basemap” while runtime still depends on CARTO,
- smoke verification expects that future-state contract and currently fails,
- static E2E expects dev-only debug affordances that production builds do not include.

That combination means the code, docs, and verification layers are no longer describing the same system. Fixing that alignment will remove most of the current skepticism surface.
