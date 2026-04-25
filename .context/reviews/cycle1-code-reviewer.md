# Cycle 1 Code Review — code-reviewer lane

Repository: `/Users/hletrd/flash-shared/Travelback`  
Date: 2026-04-25  
Verdict: **COMMENT** — no Critical/High blockers found; Medium maintainability/correctness risks should be planned.

## Summary

**Files reviewed:** 114 review-relevant source/config/doc/asset files, plus `.context/project/02-architecture.md`; prior `.context/reviews/**` artifacts were inventoried but treated as historical review outputs, not runtime/build inputs.  
**Tracked diff:** none (`git diff --name-only` empty).  
**Untracked files present:** `.context/reviews/*`, `.tmp-travelback-mina-manual.mjs`; not modified.

### Issues by severity

- Critical: 0
- High: 0
- Medium: 3
- Low: 3

## Verification performed

- `git status --short`, `git diff --stat`, `git diff --name-only`
- `lsp_diagnostics_directory`: `npx tsc --noEmit --project tsconfig.json` → 0 errors
- `lsp_diagnostics` on all TS/TSX review-critical files → 0 errors
- `npm run lint` → pass
- `npm audit --json` → 0 vulnerabilities
- Fallback grep for secrets/XSS/console/empty catches/unsafe casts because `ast-grep` is unavailable
- JSON parse check for all repo JSON files → 15/15 parsed
- i18n key parity check → `en/ko/ja/zh/es` all 313 keys
- SVG scan for `<script>`, event handlers, external hrefs, `javascript:` → no executable SVG content found

## Inventory examined

Runtime source: `src/app/*`, all `src/components/*`, all `src/lib/*`, `src/types.ts`, `src/styles/vitro-base.css`.

Static/public: `public/workers/trackParser.worker.js`, `public/map-styles/*.json`, public SVGs, guide SVGs, fonts CSS, sample GPX.

Tests/fixtures: `e2e/travelback.spec.ts`, all `e2e/fixtures/*`.

Build/config/scripts/docs: package/lock/config files, all `scripts/*.mjs`, `.github/workflows/deploy-pages.yml`, `.gitignore`, `README.md`, plan docs, `.context/project/02-architecture.md`, `.tmp-travelback-mina-manual.mjs`.

Excluded as generated/vendor/tool-state: `node_modules`, `.next`, `out`, `.git`, `test-results`, `playwright-report`, coverage/cache outputs. Historical `.context/reviews/**` were inventoried but not source-reviewed.

## Findings

### [Medium] Production base path is hard-coded to `/travelback`

**File/region:** `next.config.ts:3-10`; cross-file dependency: `src/types.ts:23-45`, `src/lib/env.ts:1`, `scripts/serve-static.mjs:15-27`, `playwright.static.config.ts:18,45`  
**Confidence:** High  
**Risk type:** Confirmed design/correctness risk

`next.config.ts` sets production `basePath` to `/travelback` unconditionally. Other code is written as if base path is configurable via `NEXT_PUBLIC_BASE_PATH`, but the build config overwrites that expectation.

**Failure scenario:** A fork/self-hosted deployment builds for a custom domain root (`/`) or another subpath. Static asset URLs, map style URLs, worker URL, icons, and Playwright static base URL disagree, causing broken assets or a non-loading map/export worker.

**Suggested fix:** Introduce one validated base-path configuration surface, derive both `basePath` and public env from it. Update README, CI, static server defaults, and tests to cover `/travelback` plus root/custom path.

### [Medium] Worker parser duplicates main parser logic without full parity enforcement

**File/region:** `src/lib/parser.ts:485-641`, `public/workers/trackParser.worker.js:220-343`, `scripts/smoke-static.mjs:183-213`  
**Confidence:** High  
**Risk type:** Confirmed maintainability risk; behavior drift likely over time

Google JSON parsing exists in two separately maintained implementations. The smoke guard validates file-size/point-limit constants and some error-code presence, but not parser behavior parity.

**Failure scenario:** A future fix to a Google Timeline format, dedup rule, timestamp parsing, or error mapping lands in `src/lib/parser.ts` but not the public worker. Small JSON files or worker-fallback paths behave differently from normal worker imports.

**Suggested fix:** Generate/bundle the worker from shared parser code, or add a parity test harness that parses every JSON fixture through both main parser and worker and compares points, segment starts, timestamps, names, and error codes.

### [Medium] Large UI/controller modules concentrate too many responsibilities

**File/region:** `src/components/MapView.tsx:410-985`, `src/components/SceneEditor.tsx:244-715`, `src/lib/i18n.ts:1-1849`, `e2e/travelback.spec.ts:216-1524`  
**Confidence:** High  
**Risk type:** Confirmed maintainability/SOLID risk

`MapView` owns map initialization, style reloads, geometry construction, debug bridge, export resizing, marker lifecycle, camera smoothing, and trail updates. `SceneEditor`, `i18n`, and the E2E spec are similarly monolithic. This makes cross-file interaction bugs harder to isolate.

**Failure scenario:** A small change to map style reload, export resize, or camera smoothing accidentally breaks marker/layer lifecycle because the same component controls all of it.

**Suggested fix:** Extract pure/testable modules for map geometry, MapLibre lifecycle, and track layers; split E2E by feature area; split translations by locale/namespace with generated key parity checks.

### [Low] JSON file read and worker-crash errors lose structured `ParseError` codes

**File/region:** `src/lib/parser.ts:670-674`, `src/lib/parser.ts:625-637`, `src/components/FileUpload.tsx:63-86`  
**Confidence:** High  
**Risk type:** Confirmed error-handling gap

XML read failures map to `ParseError('READ_FAILED')`, but JSON `file.arrayBuffer()` rejection and some worker crashes are passed through as raw errors. `FileUpload` only maps known `ParseError` codes to specific user messages.

**Failure scenario:** Browser/cloud-provider file access fails for a JSON export. User sees generic parse guidance instead of a read-failure message, and the error may be logged as unexpected.

**Suggested fix:** Wrap JSON `arrayBuffer()` rejections in `ParseError('Failed to read file', 'READ_FAILED')`; wrap worker crash/no-track cases in a stable parser code where appropriate.

### [Low] Untracked manual Playwright helper has machine-specific paths and import-time side effects

**File/region:** `.tmp-travelback-mina-manual.mjs:5-10`  
**Confidence:** High  
**Risk type:** Confirmed maintainability/tooling risk

The helper hardcodes `http://localhost:3099`, an absolute repo path, and writes `/tmp/travelback-not-a-track.txt` at module load.

**Failure scenario:** Another agent runs the script outside this exact machine/session and gets misleading failures, or repeated runs leave temp-file residue if execution exits before cleanup.

**Suggested fix:** If this helper should remain, move it under an ignored/manual scripts location or document it; derive repo path from `process.cwd()`, accept base URL via env, and create temp files with `fs.mkdtemp` plus `finally` cleanup.

### [Low] README privacy note is stale/contradictory after local-only coordinate jump

**File/region:** `README.md:211-215`  
**Confidence:** High  
**Risk type:** Confirmed documentation consistency issue

The README says Journey Creator uses a local-only coordinate jump with no network request, then immediately advises strict-privacy users to “avoid place search,” even though the current implementation no longer performs geocoding search.

**Failure scenario:** Users or reviewers infer there is still a network-backed place-search trust boundary and misunderstand the privacy posture.

**Suggested fix:** Replace the stale sentence with guidance matching the current local-only coordinate/link parser.

## Final sweep

Checked hardcoded secrets/API keys, `dangerouslySetInnerHTML`, SVG executable content, dependency audit, type/lint, i18n key parity, worker/static asset constants, and generated/vendor exclusions. No relevant runtime/build/test source file from the inventory was skipped.

## Recommendation

**COMMENT** — no Critical or High severity issue blocks release from this review lane. Address the Medium items in the next review-plan-fix cycle, especially parser worker parity and base-path configurability.
