# Cycle 1 Debugger Review — Travelback

Repository: `/Users/hletrd/flash-shared/Travelback`  
Date: 2026-04-25  
Lane: debugger / deep review  
Verdict: **COMMENT** — no Critical/High blocker found, but there are several Medium/Low regression and edge-case risks.

## Inventory examined

I reviewed the active runtime and build surface across:

- `src/app/*`
- `src/components/*`
- `src/lib/*`
- `src/types.ts`
- `src/styles/*`
- `scripts/*.mjs`
- `public/workers/trackParser.worker.js`
- `public/map-styles/*.json`
- `public/*.svg`, `public/sample-trip.gpx`, `public/fonts/*`
- `e2e/travelback.spec.ts`
- `e2e/fixtures/*`
- root configs/docs: `package.json`, `package-lock.json`, `next.config.ts`, `eslint.config.mjs`, `playwright*.config.ts`, `postcss.config.mjs`, `README.md`

Generated/vendor/runtime-output directories were excluded from review: `node_modules/`, `.next/`, `out/`, `.git/`, `test-results/`, `playwright-report/`, `tsconfig.tsbuildinfo`.

## Verification performed

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run smoke:static` ✅

## Findings

### 1) Production base path is hard-coded, so the app breaks outside `/travelback`

- **Severity:** Medium
- **Confidence:** High
- **Status:** confirmed
- **Files/regions:** `next.config.ts:3-10`; related wiring in `src/lib/env.ts:23-28`, `playwright.static.config.ts:18,45`, `scripts/serve-static.mjs:27-28`
- **Failure scenario:** a fork, preview deployment, or self-hosted build served from `/` or a different subpath will emit mismatched asset/worker/style URLs because the production build always bakes in `/travelback`. The current repo works for the GitHub Pages path, but the configuration is not portable and will fail silently on other hosts.
- **Suggested fix:** derive base path from a single explicit env/config source and thread it through `next.config.ts`, `NEXT_PUBLIC_BASE_PATH`, the static server, and Playwright base URLs. Default to `''` unless deployment explicitly sets `/travelback`.

### 2) Google JSON parsing is duplicated between the main parser and the public worker

- **Severity:** Medium
- **Confidence:** High
- **Status:** likely
- **Files/regions:** `src/lib/parser.ts:485-641`; `public/workers/trackParser.worker.js:1-343`
- **Failure scenario:** the app has two independently maintained Google Location History parsers: the TypeScript source path and a hand-copied worker path used for large JSON imports. A future bug fix or format support update can land in one file but not the other, causing large-file imports, worker fallbacks, or browser-specific paths to diverge and silently lose data or reject a valid export.
- **Suggested fix:** move the Google JSON parser into a shared worker-safe module and import/bundle it from both entry points, or add fixture parity tests that run every JSON fixture through both paths and compare points, segment starts, timestamps, names, and error codes.

### 3) Export size gating underestimates actual browser memory pressure

- **Severity:** Medium
- **Confidence:** Medium
- **Status:** manual-validation
- **Files/regions:** `src/lib/videoEncoder.ts:7,32-34,70-72`; `src/components/ExportPanel.tsx:100-110,128-136`
- **Failure scenario:** the current guard only estimates encoded output size. It does not account for the live MapLibre canvas, WebCodecs/mediabunny working memory, Blob wrapping, and preview video/object URLs. A 4K or long 60 fps export can still pass the UI gate and then crash or get tab-killed on lower-memory devices even though the estimated encoded bytes are under the 256 MB cap.
- **Suggested fix:** add a device/browser-aware export budget that considers raw frame footprint and not just encoded bytes, or lower the allowed presets/limits for touch/mobile devices where memory headroom is smaller.

### 4) JSON file-read and worker failure paths lose structured parser errors

- **Severity:** Low
- **Confidence:** High
- **Status:** confirmed
- **Files/regions:** `src/lib/parser.ts:625-637,670-674`; `src/components/FileUpload.tsx:63-87`
- **Failure scenario:** if `file.arrayBuffer()` rejects for a JSON upload, or if the worker crashes/no-tracks before returning a `ParseError`, the UI receives a raw rejection or a generic invalid-JSON fallback instead of the stable `READ_FAILED`/specific parser code path that `FileUpload` knows how to present. That means the user loses the more actionable recovery hint and the logs become harder to triage.
- **Suggested fix:** normalize `file.arrayBuffer()` failures to `ParseError('Failed to read file', 'READ_FAILED')` and give worker crash/no-track cases a dedicated parser code rather than collapsing them into a generic parse failure.

## Final missed-issue sweep

I re-checked the codebase for secrets, injection sinks, `dangerouslySetInnerHTML` misuse, worker message validation, export/playback cleanup, focus trapping, path traversal, and parser edge cases. I did not find any Critical/High issue that would block merge from this lane. The remaining risks are portability, parser parity, export memory headroom, and error-code fidelity.

## Skipped-file confirmation

I did not manually inspect generated/vendor/runtime-output directories: `node_modules/`, `.next/`, `out/`, `.git/`, `test-results/`, `playwright-report/`, `tsconfig.tsbuildinfo`. Historical review artifacts under `.context/reviews/` were treated as prior outputs, not as source of truth.
