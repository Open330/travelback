# Cycle 1 Code Reviewer Report — 2026-04-25

Lane: code-reviewer  
Scope: entire current working tree, including uncommitted source/test/script/config changes.  
Mode: read-only source review; this lane only wrote this report file.

## Inventory and project rules reviewed

Project rule/context files reviewed first:

- `.context/README.md`
- `.context/development/01-conventions.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `.context/plans/user-injected/pending-next-cycle.md`
- AGENTS instructions supplied in the prompt for `/Users/hletrd/flash-shared/Travelback`

Review-relevant code/config/test surface inventoried and reviewed: 84 files across `src/`, `scripts/`, `e2e/`, `public/workers/`, bundled map/font/svg assets, and root config (`package.json`, `tsconfig.json`, Next/ESLint/PostCSS/Playwright configs). Historical `.context/reviews/**` and plan archives were inventoried for current-cycle context, but not treated as application code unless they affected project rules.

Uncommitted application changes under review included:

- `src/lib/parser.ts`
- `public/workers/trackParser.worker.js`
- `src/components/TimelineSelector.tsx`
- `src/components/JourneyCreator.tsx`
- `src/components/ExportPanel.tsx`
- `src/components/FileUpload.tsx`
- `src/components/ThemeToggle.tsx`
- `src/app/page.tsx`
- `scripts/serve-static.mjs`
- `scripts/smoke-static.mjs`
- `e2e/travelback.spec.ts`
- `e2e/fixtures/google-revisit-segments.json`

## Verification performed

- `git diff --stat`, `git diff --name-status`, and focused source diffs reviewed.
- LSP diagnostics tool was attempted, but the OMX code-intel MCP transport was closed for `lsp_diagnostics`, `lsp_servers`, and `ast_grep_search`; fallback diagnostics were used.
- `npx tsc --noEmit --incremental false --pretty false` — passed.
- `npx eslint src e2e scripts public/workers --max-warnings=0` — passed.
- `npm audit --audit-level=moderate` — passed, 0 vulnerabilities.
- Secret scan for API keys/tokens/private keys/passwords — no hits.
- SVG scan for scripts/event handlers/javascript URLs — no hits.
- Bundled map-style scan — all 5 styles have 0 sources, no glyphs, no sprites.
- Confirmed parser regression with a VM execution of `public/workers/trackParser.worker.js` using overlapping `locations` + `semanticSegments`; it returned 2 duplicate points for one logical location.

## Code Review Summary

**Files Reviewed:** 84 review-relevant files  
**Total Issues:** 5

### By Severity

- CRITICAL: 0
- HIGH: 1
- MEDIUM: 2
- LOW: 2

## Issues

### [HIGH] Cross-format Google JSON duplicates are no longer removed

**Files:**

- `src/lib/parser.ts:422-535`
- `public/workers/trackParser.worker.js:178-246`

**Issue:** `flattenGoogleSegments()` now creates a fresh `seen` set inside each segment. That preserves repeated untimed visits across separate semantic segments, but it also removes the previous global exact-dedup behavior that `parseGoogleLocationHistory()` still documents as intentional: files matching multiple Google branches can produce duplicates, and “the dedup step below removes any resulting duplicate points” (`src/lib/parser.ts:499-501`). The worker copy has the same behavior.

**Failure scenario:** A Google export containing the same point in both `locations` and `semanticSegments` (or any other overlapping branch pair) imports duplicate coordinates/timestamps. I confirmed this by evaluating the worker parser with one `locations` point and one identical `semanticSegments.timelinePath` point; it returned 2 identical points instead of 1. In the app this inflates `N / N locations`, can create duplicate zero-length segments, and can distort trim/export point counts.

**Confidence:** High.

**Fix:** Keep intra-segment dedup for the repeated-untimed-visit fix, but restore a second cross-branch exact-dedup pass for points that carry a timestamp (or otherwise carry enough identity to prove they are the same observation). Preserve separate untimed semantic visits by not globally deduping `time == null` visit points solely by coordinate. Add a regression with a mixed-format fixture containing duplicated timed points across branches plus the existing repeated-untimed-visit fixture.

### [MEDIUM] Export panel shows “codec unavailable” while codec probing is still pending

**File:** `src/components/ExportPanel.tsx:108-111`, `src/components/ExportPanel.tsx:409-421`

**Issue:** `codecSupport[codec]` starts as `null`, but `codecUnavailable = !codecReady && !localExportTestStubEnabled` treats `null` the same as a confirmed unsupported codec. On every fresh panel open, before the async `isCodecSupported()` probes resolve, the UI can show “This browser cannot export with the selected codec” and disables Start Export even on browsers that will shortly report H.264 support.

**Failure scenario:** A user opens Export on Chrome/Safari. During the dynamic import/probe window, the primary export action is disabled and an unsupported-codec warning is displayed. On a slower mobile device this can look like a real failure before it self-corrects.

**Confidence:** High.

**Fix:** Distinguish pending from unsupported, e.g. `const codecPending = codecSupport[codec] == null; const codecUnavailable = codecSupport[codec] === false && !localExportTestStubEnabled; const canStartExport = !codecPending && !codecUnavailable && !exportTooLarge`. Hide the unavailable alert while pending, or show a neutral “Checking codec support…” message.

### [MEDIUM] Parser and worker maintain duplicate Google parsing/security logic by hand

**Files:**

- `src/lib/parser.ts:253-545`
- `public/workers/trackParser.worker.js:1-334`
- `scripts/smoke-static.mjs:172-202`

**Issue:** The main parser and public worker contain parallel implementations of Google extraction, segment flattening, point budget checks, depth checks, and error-code mapping. The smoke test only checks a few constants/error-code strings; it does not prove behavior parity. The current high-severity duplicate regression had to be introduced in both copies manually, which illustrates the maintenance hazard.

**Failure scenario:** A future parser fix is applied to `src/lib/parser.ts` but not copied exactly to `public/workers/trackParser.worker.js`, so small JSON fallback imports and large worker imports behave differently. Users then see format-dependent failures that local happy-path E2E coverage may miss.

**Confidence:** High.

**Fix:** Prefer generating/bundling the worker from shared parser code, or extract pure parsing logic into a shared module used by both main and worker builds. If that is too large for this cycle, add direct parity tests that execute both implementations against the same fixtures and negative cases: mixed-format duplicates, repeated untimed visits, invalid JSON, depth cap, point cap, unsupported Google format, and worker error-code propagation.

### [LOW] File-too-large errors can render double punctuation after adding the recovery hint

**Files:**

- `src/components/FileUpload.tsx:80-84`
- `src/lib/parser.ts:656-658`

**Issue:** `withRecoveryHint()` unconditionally appends `. ${hint}`. `FILE_TOO_LARGE` uses the parser's dynamic message, which already ends with a period (`Maximum size is ...MB.`). The resulting alert is likely `... Maximum size is 1MB.. Use an extracted .json...`.

**Failure scenario:** Uploading an oversized GPX/KML/JSON shows an unpolished error with double punctuation, reducing trust in an otherwise helpful recovery message.

**Confidence:** High.

**Fix:** Normalize trailing punctuation before appending, for example:

```ts
const withRecoveryHint = (text: string) =>
  `${text.replace(/[.\s]+$/, '')}. ${t('fileUpload.recoveryHint')}`
```

### [LOW] Static smoke cache-policy guard would allow weaker cache headers than the server currently emits

**File:** `scripts/smoke-static.mjs:221-231`

**Issue:** The new smoke check passes if a runtime asset cache header contains either `no-cache` or `must-revalidate`. `must-revalidate` alone does not force revalidation during a positive `max-age`; a future regression such as `public, max-age=3600, must-revalidate` would pass this check while still allowing stale worker/style assets for up to an hour. `scripts/serve-static.mjs:62-67` is currently correct (`no-cache, must-revalidate`), but the guard is weaker than the invariant it appears intended to protect.

**Failure scenario:** A future cache-policy edit reintroduces stale `workers/trackParser.worker.js` or `map-styles/*.json` caching. `npm run smoke:static` still passes because the header includes `must-revalidate`, even though users can remain on stale runtime-critical assets until `max-age` expires.

**Confidence:** Medium-High.

**Fix:** Assert an exact policy for those assets, or parse directives and require `no-cache` or `max-age=0` in addition to any `must-revalidate` directive.

## Positive observations

- TypeScript and ESLint are clean under fallback diagnostics.
- `scripts/serve-static.mjs` currently serves worker and map-style assets with `no-cache, must-revalidate`.
- The new `TimelineSelector` final-rAF flush is directionally correct and avoids losing the last drag position on pointer-up.
- The `JourneyCreator` drag suppression change correctly prevents a map click from adding a waypoint immediately after dragging an existing waypoint.
- The bundled map styles remain local-only with no external tile/glyph/sprite sources.
- No hardcoded secrets or dependency audit issues were found.

## Recommendation

**REQUEST CHANGES**

The cross-format Google JSON dedup regression is a functional correctness issue in a core import path. The remaining findings are smaller but should be queued with the fix or covered by follow-up tests.

## Final sweep — files reviewed

Reviewed all review-relevant files identified for this lane:

- Rule/context: `.context/README.md`, `.context/development/01-conventions.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/plans/user-injected/pending-next-cycle.md`.
- App shell/styles/types: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/styles/vitro-base.css`, `src/types.ts`.
- Components: `src/components/Controls.tsx`, `ElevationProfile.tsx`, `ErrorBoundary.tsx`, `ExportPanel.tsx`, `FileUpload.tsx`, `GlobalToolbar.tsx`, `GoogleGuide.tsx`, `JourneyCreator.tsx`, `KeyboardHelp.tsx`, `MapView.tsx`, `ModalDialog.tsx`, `SceneEditor.tsx`, `ThemeToggle.tsx`, `TimelineSelector.tsx`, `Toast.tsx`, `TrackToolbar.tsx`, `TrackWorkspace.tsx`.
- Libraries: `src/lib/camera.ts`, `env.ts`, `i18n.ts`, `interpolate.ts`, `parser.ts`, `useExportController.ts`, `usePlaybackController.ts`, `videoEncoder.ts`.
- Worker/scripts/config: `public/workers/trackParser.worker.js`, `scripts/fetch-map-styles.mjs`, `harden-static-export.mjs`, `run-dev-e2e.mjs`, `run-static-e2e.mjs`, `serve-static.mjs`, `smoke-static.mjs`, `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `playwright.config.ts`, `playwright.static.config.ts`.
- Tests/fixtures/assets: `e2e/travelback.spec.ts`, all tracked/untracked `e2e/fixtures/*` files, bundled `public/map-styles/*.json`, `public/fonts/pretendard.css`, and public SVG assets scanned for script/event-handler content.
