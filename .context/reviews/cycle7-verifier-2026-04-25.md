# Cycle 7 Verifier Review

Files reviewed: 25

Verdict: REQUEST CHANGES

## Findings

### 1. Google JSON imports still materialize the full payload before the point cap is enforced
- Severity: MEDIUM
- Evidence:
  - `src/lib/parser.ts:476-523` parses the entire Google JSON string with `JSON.parse(...)`, then enforces the 250k-point cap only after `flattenGoogleSegments(...)` returns.
  - `src/lib/parser.ts:541-545` decodes the whole ArrayBuffer into a full string before parsing.
  - `public/workers/trackParser.worker.js:316-325` does the same in the worker path: bounds the byte size, decodes the full buffer, then calls `parseGoogleLocationHistory(text)` and only checks `MAX_TRACK_POINTS` after full materialization.
- Concrete failure scenario:
  - A valid Google Takeout export under the 100 MB transport limit can still contain enough usable points to force a very large object graph. The browser/worker can spike memory or stall before `TOO_MANY_POINTS` is raised, so the guard arrives too late to prevent resource exhaustion.
- Confidence: High
- Fix:
  - Enforce the point budget during extraction instead of after `JSON.parse`, or switch the large-JSON path to a bounded/streaming parser.
  - Add a regression test that exercises a dense-but-valid Google JSON fixture near the cap.

### 2. Static serving caches runtime-critical public assets for one hour
- Severity: MEDIUM
- Evidence:
  - `scripts/serve-static.mjs:62-67` returns `public, max-age=3600` for every non-HTML asset outside `_next/static/`.
  - `scripts/serve-static.mjs:146-157` applies that policy to the worker script and bundled map-style JSON files as served from `public/`.
  - Header check during review:
    - `curl -I http://127.0.0.1:4185/travelback/workers/trackParser.worker.js` returned `Cache-Control: public, max-age=3600`
    - `curl -I http://127.0.0.1:4185/travelback/map-styles/voyager.json` returned `Cache-Control: public, max-age=3600`
- Concrete failure scenario:
  - After a deploy, a browser can keep an old `trackParser.worker.js` or map-style JSON for up to an hour. That can strand users on stale parsing logic or stale map definitions even though the HTML bundle has already been updated, which defeats hotfixes and makes worker/main-thread behavior drift across releases.
- Confidence: Medium-High
- Fix:
  - Treat runtime-critical public assets as `no-cache` or `must-revalidate`, or fingerprint them so they can be safely cached immutably.
  - Keep immutable caching only for hashed assets under `_next/static/`.

## Verification

- `npm run smoke:static` -> passed
- `PLAYWRIGHT_STATIC_PORT=4184 npx playwright test -c playwright.static.config.ts --grep "imports Google JSON flat array and displays track|export panel can complete the local export path"` -> passed, 2 tests
- `npm run typecheck` -> passed

## Missed-Issue Sweep

- I did not find additional blocker-level issues in playback, export, or CSP hardening after the line-level sweep.
- Remaining test gap: the E2E suite covers the happy-path Google JSON imports and export success path, but it still does not directly exercise `FILE_TOO_LARGE`, `JSON_DEPTH_EXCEEDED`, or worker-fallback failures. That leaves the memory-pressure finding above covered only by code inspection, not by an automated regression.
