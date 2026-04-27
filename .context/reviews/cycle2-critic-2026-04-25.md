# Cycle 2 Critic Review — 2026-04-25

Scope: entire current working tree in `/Users/hletrd/flash-shared/Travelback`, including docs, source, tests, scripts, deployment workflow, and current review/plan context. I did not edit source files.

## Inventory / rules checked

- Repo rules and context: `.context/development/01-conventions.md`, `.context/README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/plans/README.md`, `.context/agents/non-tech-traveler-reviewer.md`.
- Current implementation/review context: `plan/cycle1-review-plan-2026-04-25.md`, `plan/deferred-cycle1-review-2026-04-25.md`, `.context/reviews/_aggregate.md`, `.context/reviews/cycle1-*-2026-04-25.md`.
- App/config: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `playwright.config.ts`, `playwright.static.config.ts`, `.github/workflows/deploy-pages.yml`.
- Active source: `src/app/{layout,page,globals}.tsx/css`, all `src/components/*.tsx`, all `src/lib/*.ts`, `src/types.ts`, `src/styles/vitro-base.css`.
- Public/runtime assets: `public/workers/trackParser.worker.js`, `public/map-styles/*.json`, guide/sample/icon assets.
- Scripts: `scripts/{fetch-map-styles,harden-static-export,run-dev-e2e,run-static-e2e,serve-static,smoke-static}.mjs`.
- Tests/fixtures: `e2e/travelback.spec.ts`, all fixtures under `e2e/fixtures/`.

## Verification run

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run build` — passed; `postbuild` hardened CSP across 3 HTML files.
- `npm run test:e2e:static:ci` — passed: static smoke OK; 74 Playwright tests passed in 29.0m.

## Findings

### F1 — “New Route” destroys the loaded trip before the user commits to replacement

- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed
- **Category:** Product behavior / UX / data-loss risk
- **Citations:** `src/app/page.tsx:278-286`, `src/app/page.tsx:362-364`, `src/components/TrackToolbar.tsx:101-109`, `src/components/TrackToolbar.tsx:173-180`, `e2e/travelback.spec.ts:866-919`.
- **Failure scenario:** A user uploads a GPX, trims it, creates scenes, maybe finishes an export, then taps **New Route** accidentally or just to inspect the manual route creator. `startFreshJourneySession()` immediately clears `track`, `fullTrack`, scenes, export state, and map artifacts. If the user presses Cancel in Journey Creator, `handleCancelJourney()` only sets `isCreatingJourney` to false; the previous trip is not restored. The app lands back at the upload state with the prior in-memory work gone.
- **Why this matters:** The action is destructive before confirmation. The current E2E test intentionally locks “new route clears prior trip map artifacts,” but it does not test cancel/restore behavior.
- **Fix:** Preserve the previous session until Journey Creator completion, or show a destructive confirmation before clearing. If the user cancels, restore the previous `fullTrack`, `track`, scenes, export result, and map artifacts. Add an E2E regression: upload GPX → click New Route → Cancel → original track title/layers/scenes still present.

### F2 — Unsupported file-picker selections can be read as large text before rejection

- **Severity:** Medium-High
- **Confidence:** High
- **Status:** Confirmed
- **Category:** Robustness / performance / product import flow
- **Citations:** `src/lib/parser.ts:644-699`, `src/components/FileUpload.tsx:96-107`, `src/components/FileUpload.tsx:125-129`, `src/components/FileUpload.tsx:250-254`.
- **Failure scenario:** Drag/drop rejects unsupported extensions before parsing, but the file input path relies on the browser `accept` hint and sends the selected file directly to `parseTrackFile()`. If a user overrides the picker filter or selects a common Google Takeout `.zip`, `parseTrackFile()` applies the broad 200MB default cap and then reads the unsupported file with `FileReader.readAsText()` before throwing `UNSUPPORTED_FORMAT`.
- **Why this matters:** A large ZIP/photo/video can burn memory and main-thread time just to display an error. The product explicitly tells users ZIPs must be extracted, so ZIP mis-selection is realistic.
- **Fix:** In `parseTrackFile()`, reject unsupported extensions before size checks and before creating `FileReader`. Mirror the same preflight in `handleInputChange()` so picker and drop paths behave identically. Add an E2E or unit regression for a large unsupported extension proving no read/parsing path starts.

### F3 — Main Google parser and worker parser remain hand-mirrored without semantic parity coverage

- **Severity:** High
- **Confidence:** High
- **Status:** Risk / carry-forward
- **Category:** Architecture / tests / code interaction
- **Citations:** `src/lib/parser.ts:253-539`, `public/workers/trackParser.worker.js:1-334`, `scripts/smoke-static.mjs:183-212`, `plan/deferred-cycle1-review-2026-04-25.md:8-14`.
- **Failure scenario:** A future parser fix lands in `src/lib/parser.ts` but not in `public/workers/trackParser.worker.js`. Small files may pass in fallback/main-thread paths while production JSON imports use the worker and diverge.
- **Why this matters:** The smoke guard checks constants/error-code shape, not semantic output parity across fixtures and negative cases.
- **Fix:** Generate the worker from shared parser source, or add a parity harness that runs all Google fixtures through both implementations and compares normalized `Track` output plus error codes.

### F4 — Map ownership leaks through `MapViewHandle`, increasing style/export/editor coupling

- **Severity:** Medium-High
- **Confidence:** High
- **Status:** Risk / carry-forward
- **Category:** Architecture / maintainability
- **Citations:** `src/components/MapView.tsx:26-34`, `src/lib/useExportController.ts:136-186`, `src/components/JourneyCreator.tsx:183-430`, `plan/deferred-cycle1-review-2026-04-25.md:24-30`.
- **Failure scenario:** Export resizing/capture and Journey Creator overlays both manipulate MapLibre lifecycle through the same handle. A style reload, layer ID change, or map teardown fix can break route rendering, manual-route editing, or export capture in another component.
- **Fix:** Move overlay and export operations behind explicit `MapView` commands/events: e.g. `beginExportResize`, `renderExportFrame`, `beginJourneyDraft`, `updateJourneyDraft`, `commitJourneyDraft`, `clearJourneyDraft`. Keep raw `getMap()` out of feature components where possible.

### F5 — “Export Again” closes the panel instead of returning to export settings

- **Severity:** Low-Medium
- **Confidence:** High
- **Status:** Confirmed
- **Category:** UX / post-export flow
- **Citations:** `src/components/ExportPanel.tsx:268-276`, `src/app/page.tsx:382-385`.
- **Failure scenario:** After a successful export, the user clicks **Export Again** expecting to tweak duration/resolution/quality. `handleResetExport()` resets state and closes the panel, forcing the user to find and press Export again.
- **Fix:** Keep the export modal open and return it to idle settings, or rename the button to “Close”/“Done” and add a separate “Export another version” action that does not close.

### F6 — Static E2E coverage is comprehensive but too slow for a single serial file

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed
- **Category:** Tests / deployment feedback loop
- **Citations:** `playwright.static.config.ts:13-15`, `playwright.config.ts:13-15`, `e2e/travelback.spec.ts` single 74-test file; observed `npm run test:e2e:static:ci` runtime: 74 passed in 29.0m.
- **Failure scenario:** A one-line deployment fix waits ~29 minutes for a single serial spec. Any retry or CI contention makes feedback much slower, discouraging frequent verification.
- **Fix:** Split tests into independent spec files by domain and enable safe parallelism where localStorage/session state is isolated. Keep a smaller smoke suite for deploy gating and run full static E2E on scheduled/pre-merge paths if needed.

### F7 — Active plan index is stale relative to the current cycle artifacts

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed
- **Category:** Docs / process traceability
- **Citations:** `.context/plans/README.md:3-7`, `plan/cycle1-review-plan-2026-04-25.md:1-8`, `plan/deferred-cycle1-review-2026-04-25.md:1-8`.
- **Failure scenario:** A contributor opens `.context/plans/README.md` and is directed to `plan/cycle1-current-plan-2026-04-24.md` / older deferred files rather than the latest 2026-04-25 review plan and deferred list.
- **Fix:** Update the Active section to point at `plan/cycle1-review-plan-2026-04-25.md` and `plan/deferred-cycle1-review-2026-04-25.md`, or clearly mark old entries as historical.

### F8 — Scene range sliders expose full 0–100 ARIA bounds even when handles are constrained

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed
- **Category:** Accessibility / Scene Editor UX
- **Citations:** `src/components/SceneEditor.tsx:173-180`, keyboard clamping at `src/components/SceneEditor.tsx:186-227`.
- **Failure scenario:** Screen-reader users hear both start and end handles as 0–100 sliders, but the start handle cannot move past `end - MIN_SCENE_SPAN` and the end handle cannot move before `start + MIN_SCENE_SPAN`. Keyboard behavior clamps correctly, but assistive metadata overstates the valid range.
- **Fix:** Set dynamic `aria-valuemax` on the start handle and dynamic `aria-valuemin` on the end handle, matching the actual constraints.

## Carry-forward risks not re-opened as new bugs

- Header-level anti-framing still cannot be enforced on GitHub Pages; docs acknowledge JS frame-busting as the fallback. See `.context/project/02-architecture.md:114-118`, `.github/workflows/deploy-pages.yml:31-35`, `plan/deferred-cycle1-review-2026-04-25.md:40-46`.
- True streaming/worker-bounded parsing remains deferred for large JSON/XML scalability. Current caps are documented and tests pass, but this remains the main long-term performance boundary.

## Final sweep

- No P0/security blocker found in this pass.
- Core gates pass: lint, typecheck, build, static smoke, and all 74 static E2E tests.
- The strongest confirmed user-facing issue is F1: destructive New Route behavior on cancel.
- The strongest robustness issue is F2: unsupported file-picker path can read large files before rejecting.
- The strongest systemic risk remains parser/worker duplication without semantic parity tests.
