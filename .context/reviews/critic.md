# Critic Review — review-plan-fix cycle 4

## Scope and method

I reviewed the current committed change surface directly from the repo state, not by trusting prior review artifacts. The concrete review surface was the cumulative diff from `28597c03a35adc6acef5f89fbeea190221c382f2` to `HEAD` (`a7d85f1215baaf5386120bbf787e6d258833651c`): 72 changed files across runtime code, tests, scripts, configs, and review/plan/context docs.

I inspected every changed source/test/config/context file in that surface, then re-checked the high-risk runtime paths at line level (`src/app/*`, changed `src/components/*`, changed `src/lib/*`, `public/workers/trackParser.worker.js`, changed scripts/configs, changed Playwright fixtures/specs, and the changed `.context/` / `plan/` docs).

## Validation run

- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run build`: passed
- `npm run smoke:static`: passed
- `npm run test:e2e`: failed in this shared workspace because `playwright.config.ts` requires a fresh server on fixed port `3099`, and that port was already occupied by an existing `next dev` process
- `npm run test:e2e:static:ci`: first attempt failed because a stale `serve-static` listener on `4173` already existed; after clearing that listener, the rerun progressed into executing the Playwright suite. I did not wait for the full 61-test run to finish before closing the review.

## Findings

### 1. Export now defaults to a portrait/TikTok preset without any corresponding product or plan rationale
- Severity: Medium
- Confidence: Medium
- Status: likely
- Evidence: `src/components/ExportPanel.tsx:67`, `src/components/ExportPanel.tsx:177-181`, `src/components/ExportPanel.tsx:300-306`
- Failure scenario: a desktop user opens Export and clicks `Start Export` without inspecting the resolution dropdown. They now get a `1080x1920` vertical video instead of the previous landscape default, which is a silent aspect-ratio regression rather than an explicit workflow choice.
- Suggested fix: restore the default preset to the landscape option (`resolutionIdx = 0`), or make the default conditional and explicit (for example: preserve the last user choice, or choose based on a documented product rule).

### 2. The Journey Creator “travel icon” picker still does not affect the authored route preview
- Severity: Low
- Confidence: High
- Status: confirmed
- Evidence: `src/components/JourneyCreator.tsx:52-59`, `src/components/JourneyCreator.tsx:181-229`, `src/components/JourneyCreator.tsx:695-722`
- Failure scenario: a user selects `Plane`, `Bus`, or `Train` expecting the route preview to reflect that choice. The map still renders the same orange circle markers because the selected icon is stored only in GeoJSON properties while the rendered layer is a plain `circle` layer. The only visible effect is the eventual track name prefix.
- Suggested fix: either render the selected symbol in the preview (for example via a symbol/HTML marker layer) or relabel the control so it is clearly “route label/name style”, not a visual icon choice.

### 3. Journey Creator search results use an undefined CSS token, so the dropdown background can fall back to transparent
- Severity: Low
- Confidence: High
- Status: confirmed
- Evidence: `src/components/JourneyCreator.tsx:680-685`; repo-wide search found no `--bg1` definition in `src/app/globals.css` or `src/styles/vitro-base.css`
- Failure scenario: after enabling coordinate search and opening the listbox, result rows can render over live map imagery with no valid background token. That reduces legibility exactly when the user needs to confirm the place/coordinate they are about to add.
- Suggested fix: replace `var(--bg1)` with an existing token such as `var(--bg)` / `var(--gc-solid-bg)` / `var(--go-bg)`, or define `--bg1` centrally with light/dark values.

### 4. Local E2E validation is still tightly coupled to a fixed development port
- Severity: Low
- Confidence: High
- Status: manual-validation risk
- Evidence: `playwright.config.ts:3`, `playwright.config.ts:40-44`
- Failure scenario: `npm run test:e2e` cannot run in a normal shared/local workspace when a developer already has `next dev --port 3099` running. In this review, the command hard-failed for exactly that reason, which means the “full gate” story still depends on an unusually clean local environment.
- Suggested fix: mirror the dynamic-port wrapper approach used for static E2E, or explicitly allow healthy server reuse instead of hard-failing on an occupied port.

### 5. The current verifier artifact is stale and now contradicts the code it cites
- Severity: Low
- Confidence: High
- Status: confirmed
- Evidence: `.context/reviews/verifier.md:15-19`; contradicted by `src/lib/useExportController.ts:171-178` and `src/components/ExportPanel.tsx:151`, `src/components/ExportPanel.tsx:239-245`
- Failure scenario: future review-plan-fix cycles rely on `.context/reviews/verifier.md` as current context and spend time chasing issues that are already fixed. The file still claims fallback downloads are mapped to `ready` and that the filename is hardcoded, but the current code preserves the fallback method and stores the generated filename.
- Suggested fix: refresh or archive the verifier artifact so the persistent review context matches the current repository state.

## Final sweep

I did a final sweep for common misses across the changed runtime surface: parser/worker parity, export lifecycle cleanup, map retry and camera math, toolbar/mobile regressions, accessibility semantics, static hardening scripts, Playwright harness behavior, and stale review/doc coupling.

No relevant changed file in the `28597c0^..HEAD` review surface was intentionally skipped. The remaining review risk is not missing-file coverage; it is that the full long-running Playwright suite was not allowed to finish inside this pass after the rerun began executing.
