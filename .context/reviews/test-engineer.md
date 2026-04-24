# Test Engineer Review

Date: 2026-04-25
Repo: `/Users/hletrd/flash-shared/Travelback`
Lane: review-plan-fix cycle 4

## Scope and evidence

Reviewed:
- Test/config/gate files: `e2e/travelback.spec.ts`, `playwright.config.ts`, `playwright.static.config.ts`, `package.json`, `.github/workflows/deploy-pages.yml`
- Fixtures: all files under `e2e/fixtures/`
- Static/build scripts: `scripts/smoke-static.mjs`, `scripts/harden-static-export.mjs`, `scripts/run-static-e2e.mjs`, `scripts/serve-static.mjs`
- Source modules in scope: all files under `src/` plus `public/workers/trackParser.worker.js`
- Guidance/context: `.context/development/01-conventions.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/agents/non-tech-traveler-reviewer.md`, prior review artifacts in `.context/reviews/`

Commands run:
- `npx playwright test -c playwright.static.config.ts --list` -> 61 tests in 1 file
- `npm run smoke:static` -> passed (`[smoke-static] OK`)
- `npm run typecheck` -> passed

Current test inventory:
- E2E only: `e2e/travelback.spec.ts` (61 Playwright tests, single spec file)
- No unit tests found
- No component/integration tests found
- No skipped/fixme/only tests found

## Coverage snapshot

Covered reasonably well by current E2E:
- Happy-path imports for GPX, KML, and multiple Google JSON variants
- Basic upload/playback flow
- Core map rendering presence and style cycling
- Some keyboard/focus flows
- Some mobile layout overlap checks
- Basic scene editor open/add/change-mode flow
- Export panel open/select/close shell
- Static deployment smoke gate

Under-covered or unprotected:
- Parser internals and worker/main-thread parity
- Upload/parser error taxonomy
- Export execution state machine and save/share outcomes
- Timeline touch/region drag/reset behavior
- Scene range editing, undo, swipe-dismiss, normalization warnings
- Playback/camera math at unit level
- Mobile gesture behavior
- Locale formatting and full-flow localization
- Worker crash/fallback and large/deep JSON failure paths

## Findings

### F1. Confirmed issue: no direct tests protect parser, camera, playback, interpolation, or export logic
- Type: Confirmed issue
- Severity: High
- Confidence: High
- Evidence:
  - No `*.test.*` or `*.spec.*` files exist outside `e2e/travelback.spec.ts`
  - High-risk logic lives in untested source modules: `src/lib/parser.ts:145-675`, `src/lib/interpolate.ts:18-185`, `src/lib/camera.ts:19-428`, `src/lib/usePlaybackController.ts:17-228`, `src/lib/useExportController.ts:15-247`, `src/lib/videoEncoder.ts:40-225`
- Failure scenario:
  - Parser edge cases, antimeridian math, playback timing, export cleanup, or worker fallback can regress while still leaving most UI smoke tests green.
- Suggested test/fix:
  - Add a unit/integration layer before more E2E expansion.
  - Start with parser fixtures, camera/interpolation math, playback timing, and export controller state transitions.
  - TDD priority: extract fixture-driven unit tests around `parseGoogleLocationHistory`, `flattenGoogleSegments`, `lerpCamera`, `interpolateAlongTrack`, and `useExportController`.

### F2. Likely gap: parser format coverage is broad at the UI level but misses worker/main-thread parity and critical failure-path assertions
- Type: Likely gap
- Severity: High
- Confidence: High
- Evidence:
  - Parser format/guard logic spans `src/lib/parser.ts:145-675`
  - Worker duplicate implementation spans `public/workers/trackParser.worker.js:1-322`
  - Existing E2E import checks mostly assert “track loaded” for formats at `e2e/travelback.spec.ts:410-437`, `1206-1243`
  - No tests assert parity of returned `segmentStartIndices`, date coercion, dedup ordering, JSON depth guard, point-limit guard, or worker fallback behavior
- Failure scenario:
  - Worker path diverges from main-thread parser for a supported Google format, segment boundaries shift, or a large/deep JSON file reports the wrong error code. UI import tests still pass on smaller happy-path fixtures.
- Suggested test/fix:
  - Add fixture-driven parser tests that run both `parseGoogleLocationHistory` and worker parsing against the same inputs and compare `name`, `points`, `segmentStartIndices`, and error codes.
  - Add explicit tests for `JSON_DEPTH_EXCEEDED`, `FILE_TOO_LARGE`, `TOO_MANY_POINTS`, malformed JSON, malformed XML, and worker crash fallback.

### F3. Likely gap: upload error coverage only proves unsupported extension, not actual parser failures
- Type: Likely gap
- Severity: High
- Confidence: High
- Evidence:
  - Upload error mapping lives in `src/components/FileUpload.tsx:52-93`
  - Supported parser error codes are mapped there, but only unsupported file format is exercised in `e2e/travelback.spec.ts:1247-1260`
  - Parser emits additional failure codes in `src/lib/parser.ts:446-675` and `public/workers/trackParser.worker.js:254-320`
- Failure scenario:
  - Invalid GPX/KML/JSON, too-few-points, too-many-points, deep JSON, or worker-only failures show the wrong message or leave the component in a bad loading state without any regression signal.
- Suggested test/fix:
  - Add one test per error class through the upload surface.
  - Assert alert text, loading reset, input reset, and that the app remains interactive after failure.

### F4. Likely gap: export execution states are largely untested beyond opening the dialog
- Type: Likely gap
- Severity: High
- Confidence: High
- Evidence:
  - Export controller state machine: `src/lib/useExportController.ts:83-245`
  - Video encoding/download paths: `src/lib/videoEncoder.ts:40-225`
  - Export panel success/share/download states: `src/components/ExportPanel.tsx:142-260`
  - Existing tests stop at dialog semantics/open/select/close in `e2e/travelback.spec.ts:1139-1201`, plus “Start Export” button presence in `1265-1320`
- Failure scenario:
  - Cancel path fails to restore playback/map size, map-render timeout shows the wrong toast, completed exports regress from `done` to `idle`, or picker/fallback/ready download states break with no automated detection.
- Suggested test/fix:
  - Add integration tests with a stubbed map handle and stubbed `exportVideo`/`downloadVideo`.
  - Cover `idle -> exporting -> done`, `idle -> exporting -> cancelled`, `idle -> exporting -> error`, existing-export replacement, and picker/fallback/ready result mapping.

### F5. Likely gap: keyboard/focus coverage misses the export-overlay cancel path and post-close focus behavior
- Type: Likely gap
- Severity: Medium
- Confidence: High
- Evidence:
  - Export-overlay Escape handler now exists in `src/app/page.tsx:173-187`
  - Global playback hotkey exclusions live in `src/lib/usePlaybackController.ts:166-217`
  - Current focus tests cover landing, guide modal, export dialog, and timeline keyboard trim in `e2e/travelback.spec.ts:259-279`, `746-785`, `1139-1153`
  - No test targets the export-in-progress overlay or focus restoration after closing/cancelling dialogs
- Failure scenario:
  - A future refactor removes the capture-phase Escape listener or breaks focus return after modal close/cancel. Dialog shell tests still pass because they only exercise the idle export panel.
- Suggested test/fix:
  - Add regression tests for:
    - pressing `Escape` while export is in progress
    - verifying playback hotkeys remain suppressed during export
    - verifying focus returns to the invoking button after modal close/cancel

### F6. Likely gap: timeline selector has only partial drag coverage; touch, region drag, start-handle drag, and reset remain under-protected
- Type: Likely gap
- Severity: Medium
- Confidence: High
- Evidence:
  - Timeline behavior: `src/components/TimelineSelector.tsx:25-522`
  - Touch/global drag listeners: `src/components/TimelineSelector.tsx:271-291`
  - Reset button: `src/components/TimelineSelector.tsx:515-517`
  - E2E coverage exercises end-handle drag and keyboard trim at `e2e/travelback.spec.ts:695-785`
- Failure scenario:
  - Touch dragging breaks on mobile, dragging the selected region shifts the wrong range, start-handle drag collapses incorrectly, or reset stops restoring the full range. Existing tests still pass because they mainly use the end handle and keyboard.
- Suggested test/fix:
  - Add tests for start handle, selected-region drag, reset button, and touch drag on a mobile viewport.
  - Prefer component/integration tests for `ratioToIndex`, `resolveIndexesForRatios`, and drag state transitions, then keep one E2E per gesture family.

### F7. Likely gap: scene editing coverage misses the riskiest authoring interactions
- Type: Likely gap
- Severity: Medium
- Confidence: High
- Evidence:
  - Scene range dragging and keyboard logic: `src/components/SceneEditor.tsx:48-241`
  - Validation/normalization warnings: `src/components/SceneEditor.tsx:254-278`
  - Swipe dismiss and undo delete timers: `src/components/SceneEditor.tsx:280-334`
  - Existing E2E only covers open/add/preset localization/change-mode/basic trim clear in `e2e/travelback.spec.ts:979-1064`
- Failure scenario:
  - Scene handles stop clamping correctly, overlapping scenes silently normalize in a user-hostile way, undo-delete expires incorrectly, or swipe-dismiss breaks on mobile. Current tests would not catch it.
- Suggested test/fix:
  - Add focused tests for start/end/region drag, keyboard handle controls, delete/undo timeout behavior, overlap warnings, and mobile swipe-dismiss.

### F8. Confirmed issue: the E2E gate is flake-prone because it relies on hard sleeps, dev-overlay removal, serialization, and a single large spec
- Type: Confirmed issue
- Severity: Medium
- Confidence: High
- Evidence:
  - Playwright config is serialized with retries: `playwright.config.ts:8-39`, `playwright.static.config.ts:8-39`
  - Hard waits in the suite: `e2e/travelback.spec.ts:147`, `507`, `523`, `817`, `845`, `922`, `937`, `1272`, `1309`
  - The suite actively strips Next dev overlay DOM in `e2e/travelback.spec.ts:139-147`, `211-235`
  - All 61 tests live in one file and one worker
- Failure scenario:
  - Timing drift on CI, slower map/style readiness, or small hydration changes cause intermittent failures or mask real regressions behind retry-only greens.
- Suggested test/fix:
  - Replace fixed sleeps with event/state-driven waits.
  - Prefer static-mode E2E for most assertions and reserve dev-mode checks for issues that truly require `next dev`.
  - Split the spec by domain so failures isolate faster and retries are narrower.

### F9. Manual-validation risk: final MP4 save/share behavior is still not proven end to end
- Type: Manual-validation risk
- Severity: Medium
- Confidence: High
- Evidence:
  - Save/share logic is in `src/lib/videoEncoder.ts:171-212` and `src/components/ExportPanel.tsx:148-173`, `211-260`
  - Project guidance already notes this limit in `.context/agents/non-tech-traveler-reviewer.md:84-101`
  - Current automated tests do not execute a full successful export or assert browser save/share outcomes
- Failure scenario:
  - `showSaveFilePicker`, anchor fallback, or `navigator.share` works differently across Chromium/Safari/mobile even though export-panel smoke tests pass.
- Suggested test/fix:
  - Keep this as an explicit manual matrix unless a deterministic harness is added.
  - At minimum, add integration tests for picker-abort, picker-success, fallback download click, and share availability gating with browser API mocks.

### F10. Likely gap: responsive/mobile/i18n coverage is broad but shallow for gestures and locale formatting
- Type: Likely gap
- Severity: Low
- Confidence: Medium
- Evidence:
  - Supported locales: `src/lib/i18n.ts:8-1823`
  - Locale-sensitive date rendering: `src/components/TimelineSelector.tsx:50-58`, `493-498`
  - Touch/mobile dismiss handlers: `src/components/ExportPanel.tsx:96-106`, `src/components/SceneEditor.tsx:280-291`, `src/components/TimelineSelector.tsx:271-291`
  - Current locale tests cover visible string swaps in KO/JA/ZH/ES at `e2e/travelback.spec.ts:282-317`, `1033-1044`
  - Current mobile tests are mostly layout overlap assertions at `e2e/travelback.spec.ts:567-691`, `787-814`
- Failure scenario:
  - Locale-specific date text, mobile touch gestures, or Korean/Spanish loaded-state flows regress while headline translation checks stay green.
- Suggested test/fix:
  - Add one mobile gesture test each for timeline drag, scene panel dismiss, and export panel dismiss.
  - Add locale assertions around timeline date formatting and one full non-English happy path from upload to export panel.

### F11. Likely gap: static build hardening has a solid smoke gate, but no direct regression tests pin the hardening script behavior itself
- Type: Likely gap
- Severity: Low
- Confidence: Medium
- Evidence:
  - Hardening logic is script-based in `scripts/harden-static-export.mjs:1-93`
  - Smoke assertions validate emitted output in `scripts/smoke-static.mjs:89-174`
  - CI runs the full static gate in `.github/workflows/deploy-pages.yml:18-27`
- Failure scenario:
  - A future Next export shape change breaks the CSP replacement regex or bootstrap inlining logic. The smoke gate should catch many regressions, but root-cause isolation will be poor and there is no narrow test protecting the transformation contract.
- Suggested test/fix:
  - Add a minimal script-level fixture test for the CSP replacement and bootstrap extraction routines, independent of a full app build.

## Domain-by-domain assessment

### Parsing formats
- Happy-path fixture breadth is good.
- Missing direct assertions for segment boundaries, ordering, dedup, timestamps, worker parity, malformed inputs, and oversized/deep JSON.

### Upload errors
- Only unsupported extension is covered.
- Parser/code-specific failures are untested through the UI.

### Keyboard/focus
- Modal trapping and some keyboard shortcuts are covered.
- Export-in-progress Escape/cancel and focus return are not.

### Map/playback
- Route/trail attachment and camera stability are covered.
- Core math and playback timing are untested outside E2E.

### Scene editing
- Open/add/change-mode/localized preset names are covered.
- Range editing, undo, overlap warnings, and touch dismissal are not.

### Export states
- Panel shell is covered.
- Rendering, cancel, error, done, save, share, and cleanup states are not.

### Static build hardening
- Strongest existing gate: CI runs build -> smoke -> static E2E, and smoke passed locally.
- Missing narrow tests for the hardening transform functions themselves.

### Responsive/mobile/i18n
- Layout overlap checks are good.
- Gesture behavior and locale-sensitive formatting remain shallowly tested.

### Failure paths
- Map style load failure and unsupported upload are covered.
- Worker crash, parser taxonomy, export map timeout, codec/share/download fallbacks, and deactivation/cleanup failures are not.

## TDD opportunities

Highest-value RED-first opportunities:
- Parser fixture matrix for `src/lib/parser.ts` and `public/workers/trackParser.worker.js`
- Camera/interpolation math tests for `src/lib/camera.ts` and `src/lib/interpolate.ts`
- Export controller state-machine tests around `src/lib/useExportController.ts`
- Timeline selector interaction tests around `src/components/TimelineSelector.tsx`
- Scene editor range/undo/validation tests around `src/components/SceneEditor.tsx`

Recommended order:
1. Parser + worker parity
2. Export controller states
3. Timeline + scene interaction logic
4. Playback/camera math
5. Narrow static hardening script fixtures

## Gate reliability

Strengths:
- CI gate is meaningful: `lint`, `typecheck`, `audit`, `build`, `smoke:static`, and static E2E all run in `.github/workflows/deploy-pages.yml`
- Static smoke passed in this review
- Typecheck passed in this review

Risks:
- One large E2E spec means poor isolation
- Retries can hide low-grade flake
- Fixed sleeps and dev-overlay surgery are fragile
- No lower-level tests exist to catch regressions before full-browser runs

## Missed-gap sweep

Final sweep checks:
- No additional test files, component tests, or unit-test harnesses were found
- No skipped/fixme/only Playwright tests were found
- No coverage was found for `showSaveFilePicker` success/abort, `navigator.share`, worker crash fallback, deep JSON limits, too-many-points upload UX, scene undo timer expiry, timeline reset, or mobile touch drags
- `public/workers/trackParser.worker.js` remains behaviorally critical and effectively untested except via happy-path UI imports

## Skipped-file confirmation

Reviewed all code-bearing files in scope under `src/`, `scripts/`, `e2e/`, `public/workers/`, config files, workflow files, and `.context` guidance.

Not deeply analyzed as test targets:
- Static assets with no executable behavior (`public/*.svg`, fonts, generated `out/`, CSS-only styling files except where test relevance was obvious)
- These were only checked insofar as they affect the existing smoke/E2E gates.

## Bottom line

The repo has a decent browser-level regression net, but it is carrying too much responsibility in one Playwright file. The biggest current risk is not missing one more E2E happy path; it is the absence of direct tests for parser/worker parity, export state transitions, and interaction-heavy scene/timeline logic.
