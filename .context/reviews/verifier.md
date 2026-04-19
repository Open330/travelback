# Prompt 1 evidence-based correctness review

Scope inventoried: `.context/**`, `package.json`, configs, `src/**`, `scripts/**`, `e2e/**`, `public/**`.

## Verification run
- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm run smoke:static` — failed: `bright.json still depends on remote sprite/glyph assets`
- `npm run test:e2e:static:ci` — failed mid-suite after the static server became unreachable (`ERR_CONNECTION_REFUSED` on `http://localhost:4173/`)
- `lsof -nP -iTCP:4173 -sTCP:LISTEN` — no listener while the Playwright suite was failing

## Findings: 2

### 1) Confirmed — map styles are not fully local
- **File/region:** `public/map-styles/{bright,dark,liberty,positron,voyager}.json:5-22`
- **Expected behavior:** bundled/local map styles with no third-party tile, glyph, or sprite requests, matching the project docs and the static smoke check.
- **Actual behavior:** every style still points at CARTO remote `tiles`, `sprite`, and `glyphs` URLs.
- **Failure scenario:** static/offline/privacy-sensitive runs still fetch external map assets; `npm run smoke:static` fails immediately on the style audit.
- **Suggested fix:** vendor the map assets locally or update the product/docs/tests to explicitly acknowledge the external dependency.
- **Confidence:** high
- **Status:** Confirmed

### 2) Likely — static Playwright suite loses its web server mid-run
- **File/region:** `playwright.static.config.ts:40-45`, `scripts/serve-static.mjs:121-183`
- **Expected behavior:** the static server stays alive for the full 50-test suite.
- **Actual behavior:** after the first few tests, Playwright reported `page.goto('/')` failing with `net::ERR_CONNECTION_REFUSED` at `http://localhost:4173/`; `lsof` showed no listener on port 4173.
- **Failure scenario:** every later test fails in `beforeEach`, so the suite cannot complete coverage for parsing, playback, scene/camera, export, and accessibility paths.
- **Suggested fix:** capture server stdout/stderr and determine why the web server exits; if needed, harden or replace the custom static-server wrapper used in CI.
- **Confidence:** medium
- **Status:** Likely

## Bottom line
- Parser/playback/camera/export/accessibility code inspected cleanly in source.
- The only confirmed product-level mismatch found in this sweep is the “fully local map styles” claim.
- The static E2E test path is currently unreliable because the web server disappears during the run.
