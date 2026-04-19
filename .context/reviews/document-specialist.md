# Document Specialist Review — Travelback

## Inventory

### Documentation inspected
- `.context/README.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `.context/development/01-conventions.md`
- `.context/plans/README.md`
- supporting review artifacts under `.context/reviews/`

### Code/configuration inspected
- `package.json`
- `next.config.ts`, `eslint.config.mjs`, `playwright.config.ts`, `playwright.static.config.ts`, `postcss.config.mjs`
- `src/app/**`, `src/components/**`, `src/lib/**`, `src/types.ts`
- `scripts/**`
- `e2e/**`
- `public/**` including `public/map-styles/*.json` and `public/workers/trackParser.worker.js`

### Verification performed
- Read docs and implementation side by side.
- Ran `npm run smoke:static`; it failed on a remote map-style dependency, which corroborated the map-assets mismatch.

## Findings

### 1) Map assets are still remote, so the "fully local" claim is inaccurate
- **Doc file(s):** `.context/project/01-overview.md:14`, `.context/project/02-architecture.md:100-103`
- **Code/file region:** `public/map-styles/voyager.json:5-20` (same pattern in `positron.json`, `dark.json`, `liberty.json`, `bright.json`), `scripts/harden-static-export.mjs:14-27`
- **Doc claim:** Map themes are fully local and runtime map display no longer depends on external tiles, glyphs, or sprites.
- **Actual code behavior:** Each shipped style JSON still points at CARTO CDN vector tiles plus remote `sprite` and `glyphs` URLs. The static smoke test also fails with `bright.json still depends on remote sprite/glyph assets`.
- **Why the mismatch matters:** Users and reviewers will believe the app is offline/self-contained for map rendering when it still makes third-party map requests and exposes route context to CARTO.
- **Suggested fix:** Either update the docs to describe the CARTO dependency explicitly, or truly vendor/replace the map styles and update the smoke test accordingly.
- **Confidence:** High
- **Status:** Confirmed

### 2) `npm run start` is a static-export server, not a Next production server
- **Doc file:** `.context/project/01-overview.md:17-24`
- **Code/file region:** `package.json:8-9`, `scripts/serve-static.mjs:24-80`
- **Doc claim:** `npm run start` is the production server after `npm run build`.
- **Actual code behavior:** `start` runs `node scripts/serve-static.mjs --base-path /travelback`, which serves the generated `out/` directory as static files, requires a prior static build, and hardcodes a `/travelback` base path.
- **Why the mismatch matters:** Following the docs literally will mislead contributors into expecting Next.js server behavior, and deployments/tests can fail if `out/` is missing or the base path is omitted.
- **Suggested fix:** Reword the run instructions to say “static preview server” and document the `/travelback` base path, or change the script if the intent is really to run `next start`.
- **Confidence:** High
- **Status:** Confirmed

### 3) Google Location History support is under-documented in the format section
- **Doc file:** `.context/project/01-overview.md:31-35`
- **Code/file region:** `src/lib/parser.ts:190-303, 370-402`
- **Doc claim:** Google JSON support is described only as legacy/new `locations`, record arrays, and `semanticSegments.timelinePath`.
- **Actual code behavior:** The parser also accepts `timelineObjects` (`activitySegment` / `placeVisit`), `timelineEdits`, `semanticSegments.visit.topCandidate.placeLocation`, flat arrays with `latitude`/`longitude`, and E7 or decimal coordinates.
- **Why the mismatch matters:** The docs make several valid Google Takeout exports look unsupported, which can send users and support agents down the wrong path when a file actually works.
- **Suggested fix:** Expand the supported-format section to enumerate every accepted Google JSON shape, or add a link to a canonical parser matrix that stays in sync with `src/lib/parser.ts` and the e2e fixtures.
- **Confidence:** High
- **Status:** Confirmed

### 4) The documented animation-duration range is narrower than the actual UI and export limits
- **Doc file:** `.context/project/01-overview.md:77-78`
- **Code/file region:** `src/types.ts:80-84`, `src/components/Controls.tsx:24-25`, `src/components/ExportPanel.tsx:112-117`
- **Doc claim:** Animation duration is configurable from 10s to 5min.
- **Actual code behavior:** Playback presets are 10/15/30/60/120/300 seconds, but the export pipeline accepts 5–600 seconds via `EXPORT_LIMITS`, and the export panel clamps to that broader range.
- **Why the mismatch matters:** The docs understate both the minimum and maximum export duration, so users may think certain export lengths are impossible when the app already supports them.
- **Suggested fix:** Clarify that playback presets are 10s–5min while export duration accepts 5s–10min, or align the UI/export limits to a single documented range.
- **Confidence:** High
- **Status:** Confirmed

## Final sweep

I did not find additional high-confidence documentation/code mismatches beyond the four items above.
