# Code Review Summary

**Reviewer:** code-reviewer
**Date:** 2026-04-25
**Scope:** Full repository review across source, tests, scripts, config, and active context docs
**Files Reviewed:** 47 review-relevant files
**Relevant Files Skipped:** None

## Verdict
**COMMENT**

No blocking correctness or security defect surfaced in the current repository snapshot, but there are several medium-severity reliability/maintainability risks around export verification, theme-state behavior, and duplicated parser logic that should be addressed before treating the codebase as fully hardened.

## Stage 1: Spec / Intent Compliance
The repository still matches the documented product shape in `.context/project/01-overview.md` and `.context/project/02-architecture.md`:
- GPX, KML, and Google Location History import paths are implemented.
- Track playback, trimming, scene editing, journey creation, theming, and static-export security hardening are present.
- Static build + CSP hardening + smoke validation currently pass.

I did not find a repository-wide “wrong feature / missing primary feature” failure.

## Stage 2: Code Quality / Correctness Findings

### [MEDIUM] Export pipeline is not actually executed by automated tests
- **Type:** confirmed risk
- **Confidence:** High
- **Files / Regions:**
  - `src/lib/useExportController.ts:94-214`
  - `src/lib/videoEncoder.ts:31-137`
  - `e2e/travelback.spec.ts:1139-1177`
  - `e2e/travelback.spec.ts:1180-1203`
  - `e2e/travelback.spec.ts:1292-1346`
- **Problem:** The repository’s most failure-prone user flow is the real export path, but the Playwright suite only verifies that the export dialog renders and that the `Start Export` button is visible. It never clicks `Start Export`, never waits for `Rendering...`, never exercises `waitForIdle()`, never validates `downloadVideo()`, and never covers abort/cleanup behavior.
- **Concrete failure scenario:** A regression in `mediabunny` loading, WebCodecs capability probing, `MapView.waitForIdle()`, abort cleanup, or file-save fallback can ship with a green test suite because every current “export” test stops before the frame loop starts.
- **Suggested fix:** Add at least one automated export smoke path that stubs/observes download initiation and one cancellation path that confirms cleanup (`resetSize`, playback restore, and export state reset). If real MP4 generation is too slow for CI, mock the encoder boundary but still drive `useExportController.exportTrack()` end-to-end through the UI.

### [MEDIUM] The app stops following OS theme changes after hydration
- **Type:** likely behavior bug
- **Confidence:** High
- **Files / Regions:**
  - `src/app/page.tsx:63-84`
  - `src/app/page.tsx:344-358`
  - `src/components/ThemeToggle.tsx:35-55`
- **Problem:** `HomeInner` reads the initial theme from `document` / `localStorage` / `matchMedia()` once, then treats theme as fully app-controlled. `ThemeToggle` does have a `matchMedia` listener, but it explicitly ignores OS changes whenever a controlled `mode` prop is supplied, which is how the app uses it. That means the app follows system theme only on first paint, not after that.
- **Concrete failure scenario:** A user opens the app in light mode with no stored override, leaves the tab open past an OS dark-mode transition, and the app stays in light mode until reload. Because map style is coupled to theme when there is no explicit style choice, the map style also stays stale.
- **Suggested fix:** Move the `matchMedia('(prefers-color-scheme: dark)')` subscription to `page.tsx` and gate it on whether the user has made an explicit theme override. Keep `ThemeToggle` as a pure control surface when `mode` is controlled.

### [LOW] `READ_FAILED` is mapped to the wrong user-facing error
- **Type:** confirmed
- **Confidence:** High
- **Files / Regions:**
  - `src/components/FileUpload.tsx:64-75`
  - `src/lib/parser.ts:672`
  - `src/lib/i18n.ts:40`
- **Problem:** `parseTrackFile()` raises `READ_FAILED` for file-read failures, and `i18n.ts` already defines `fileUpload.readFailed`, but `FileUpload` maps `READ_FAILED` to `fileUpload.parseFailed` instead. That loses a more accurate diagnosis the codebase already has.
- **Concrete failure scenario:** If the browser fails while reading a selected file (filesystem glitch, revoked handle, sandboxed mobile browser quirk), the UI tells the user the file could not be parsed even though parsing never started.
- **Suggested fix:** Map `READ_FAILED` to `fileUpload.readFailed` in `errorCodeMap`, and keep parse failures reserved for actual parse errors.

### [LOW] Google JSON parsing is still hand-copied across the main thread and worker
- **Type:** confirmed maintainability risk
- **Confidence:** High
- **Files / Regions:**
  - `src/lib/parser.ts:465-620`
  - `public/workers/trackParser.worker.js:1-322`
- **Problem:** The Google Location History parser, validation rules, depth guard, dedup logic, and point-limit handling live in two separate implementations. This is already a large, nuanced parser surface, and keeping two hand-maintained copies materially raises drift risk.
- **Concrete failure scenario:** A future fix for one Google export shape or one coordinate-validation edge case lands in `src/lib/parser.ts` but not in `public/workers/trackParser.worker.js`, so Worker-capable browsers parse the same file differently from the fallback path.
- **Suggested fix:** Extract the Google JSON parser into a shared module that can be bundled for both the main thread and the worker, or generate the worker from the shared source as part of build tooling.

## Diagnostics / Verification
- Attempted OMX code-intel/LSP diagnostics first, but the `omx_code_intel` transport was closed in this session, so I fell back to CLI verification.
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅
- `npm run smoke:static` ✅
- Translation parity check across `en`, `ko`, `ja`, `zh`, `es` ✅ (309 keys each, no missing/extra keys)
- Pattern sweeps run for `console.log`, empty catches, hardcoded secrets, and TODO/FIXME markers

## Provenance
Commands and inspections used during this review included:
- Repository inventory: `rg --files`, `find . -name AGENTS.md`
- Working tree state: `git status -sb`
- File-by-file line review via `nl -ba` / `sed -n` across the review-relevant codebase
- Verification: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run smoke:static`
- Consistency checks: translation-key parity script, regex sweeps for problematic patterns
- Prior-review context checked for continuity: existing `.context/reviews/code-reviewer-cycle5.md`

## Review Inventory
Reviewed directly:
- Root config: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `playwright.config.ts`, `playwright.static.config.ts`
- Context docs: `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/development/01-conventions.md`
- App shell: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Shared types / libs: `src/types.ts`, all files under `src/lib/`
- Components: all files under `src/components/`
- Worker: `public/workers/trackParser.worker.js`
- Scripts: all files under `scripts/`
- Tests: `e2e/travelback.spec.ts`

Not treated as review-relevant implementation files:
- Binary/static assets (`.ico`, `.woff2`, screenshots)
- Sample fixture payloads under `e2e/fixtures/` and static SVG/JSON asset payloads under `public/` beyond targeted invariants already covered by the smoke/build review

## Missed-Issue Sweep
Final sweep completed after diagnostics and build/smoke verification. I did not identify additional high-severity correctness or security findings beyond the items above, and I did not skip any review-relevant source/script/config/test/context file.
