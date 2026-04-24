# Deferred Cycle 4 Review Findings - 2026-04-25

This file records only review findings from `.context/reviews/_aggregate.md` that were not fully implemented in cycle 4. Severity and confidence are preserved from the source reviews.

Repo-policy constraints checked before deferral:

- `CLAUDE.md`: absent; `.context/development/01-conventions.md` says not to use `CLAUDE.md` for this project.
- `AGENTS.md`: supplied by the orchestrator for this workspace.
- `.context/**`: read for conventions, project overview, and architecture.
- `.cursorrules`, `CONTRIBUTING.md`, `docs/`: absent.
- Deferred work remains bound by repo policy: no new dependencies without explicit request, strict TypeScript, lint/typecheck/build/E2E gates before commit, GPG-signed semantic gitmoji commits, and push after each implementation iteration.

## Deferred Items

### D1. Parser implementation duplication between main thread and worker
- Aggregate finding: F5
- Source citation: `src/lib/parser.ts:145-675`, `public/workers/trackParser.worker.js:1-322`
- Original severity/confidence: Low / High
- Reason for deferral: cycle 4 fixed the confirmed flat-array defect in both copies, but removing duplication requires a shared parser bundling/generation design that affects worker packaging and should be planned separately.
- Reopen exit criterion: schedule a parser architecture task when touching worker parsing again, or when a parser fix cannot be made identically in both locations.

### D2. No direct tests for parser, camera, playback, interpolation, or export logic
- Aggregate finding: F13
- Source citation: `src/lib/parser.ts`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`
- Original severity/confidence: High / High
- Reason for deferral: this is a broad test-layer gap rather than one confirmed runtime defect. Cycle 4 added focused E2E regressions for the fixed parser/export findings, but introducing a unit/integration test framework or broad module harness is larger than the scheduled fixes.
- Reopen exit criterion: before the next parser/camera/playback/export refactor, add a dedicated unit/integration test plan and select the test harness without adding dependencies unless explicitly approved.

### D3. Parser worker/main-thread parity and failure-path coverage
- Aggregate finding: F14
- Source citation: `src/lib/parser.ts:145-675`, `public/workers/trackParser.worker.js:1-322`, `e2e/travelback.spec.ts:410-437`, `e2e/travelback.spec.ts:1206-1243`
- Original severity/confidence: High / High
- Reason for deferral: cycle 4 added one regression for delayed flat-array records and patched both implementations. Full parity coverage across segment indices, date coercion, dedup ordering, depth/size limits, and worker fallback requires a broader fixture matrix.
- Reopen exit criterion: add shared parser parity tests before changing Google JSON parsing, worker fallback, or segment boundary logic.

### D4. Upload parser error taxonomy coverage
- Aggregate finding: F15
- Source citation: `src/components/FileUpload.tsx:52-93`, `src/lib/parser.ts:446-675`, `public/workers/trackParser.worker.js:254-320`, `e2e/travelback.spec.ts:1247-1260`
- Original severity/confidence: High / High
- Reason for deferral: no confirmed user-facing error mapping bug was identified in cycle 4; the finding is a coverage gap across many malformed/oversized file classes.
- Reopen exit criterion: when adding parser fixtures or changing `ParseError` codes, add upload-surface tests for each parser error class and loading/input reset behavior.

### D5. Export execution, download, save, share, and cleanup coverage
- Aggregate finding: F16
- Source citation: `src/lib/useExportController.ts:83-245`, `src/lib/videoEncoder.ts:40-225`, `src/components/ExportPanel.tsx:142-260`, `e2e/travelback.spec.ts:1139-1201`, `e2e/travelback.spec.ts:1265-1320`
- Original severity/confidence: High / High
- Reason for deferral: cycle 4 fixed the confirmed default-resolution regression and added a guard. Full export execution coverage needs deterministic WebCodecs/map/browser API mocking, which is not a narrow fix and was not a confirmed current runtime defect.
- Reopen exit criterion: before modifying export state, save picker, share, or fallback download behavior, add integration tests for `idle -> exporting -> done/cancel/error` and browser API branches.

### D6. Export overlay keyboard/focus coverage
- Aggregate finding: F17
- Source citation: `src/app/page.tsx:173-187`, `src/lib/usePlaybackController.ts:166-217`, `e2e/travelback.spec.ts:259-279`, `e2e/travelback.spec.ts:746-785`, `e2e/travelback.spec.ts:1139-1153`
- Original severity/confidence: Medium / High
- Reason for deferral: no current keyboard defect was confirmed for the export overlay; the finding is missing regression coverage.
- Reopen exit criterion: add tests for Escape cancel while exporting, hotkey suppression during export, and focus return before changing modal or export keyboard handling.

### D7. Timeline selector touch, region drag, start-handle drag, and reset coverage
- Aggregate finding: F18
- Source citation: `src/components/TimelineSelector.tsx:25-522`, `src/components/TimelineSelector.tsx:271-291`, `src/components/TimelineSelector.tsx:515-517`, `e2e/travelback.spec.ts:695-785`
- Original severity/confidence: Medium / High
- Reason for deferral: this is an interaction coverage gap; cycle 4 did not change timeline behavior.
- Reopen exit criterion: add focused timeline tests before changing drag, touch, reset, or range-index logic.

### D8. Scene editor range, undo, validation, and swipe-dismiss coverage
- Aggregate finding: F19
- Source citation: `src/components/SceneEditor.tsx:48-334`, `e2e/travelback.spec.ts:979-1064`
- Original severity/confidence: Medium / High
- Reason for deferral: this is an authoring coverage gap with no confirmed current runtime defect in cycle 4.
- Reopen exit criterion: add scene editor tests before changing range handles, normalization warnings, undo timers, or mobile swipe handling.

### D9. Remaining E2E flake-reduction work
- Aggregate finding: F20
- Source citation: `playwright.config.ts:8-39`, `playwright.static.config.ts:8-39`, `e2e/travelback.spec.ts:139-147`, `e2e/travelback.spec.ts:211-235`, `e2e/travelback.spec.ts:147`, `e2e/travelback.spec.ts:507`, `e2e/travelback.spec.ts:523`, `e2e/travelback.spec.ts:817`, `e2e/travelback.spec.ts:845`, `e2e/travelback.spec.ts:922`, `e2e/travelback.spec.ts:937`, `e2e/travelback.spec.ts:1272`, `e2e/travelback.spec.ts:1309`
- Original severity/confidence: Medium / High
- Reason for deferral: cycle 4 fixed the blocking fixed-port part. Replacing hard sleeps, removing dev-overlay stripping, and splitting the single spec is a larger test-maintenance pass.
- Reopen exit criterion: when a Playwright flake occurs or the suite is next touched broadly, replace affected fixed waits with event-driven waits and split the spec by domain.

### D10. Final MP4 save/share manual-validation risk
- Aggregate finding: F21
- Source citation: `src/lib/videoEncoder.ts:171-212`, `src/components/ExportPanel.tsx:148-173`, `src/components/ExportPanel.tsx:211-260`, `.context/agents/non-tech-traveler-reviewer.md:84-101`
- Original severity/confidence: Medium / High
- Reason for deferral: this is a browser-matrix validation risk, not a confirmed current correctness defect. Cycle 4 did not have a deterministic cross-browser save/share harness.
- Reopen exit criterion: before changing save/share/download behavior, run or create a browser API matrix covering picker success/abort, anchor fallback, and share availability.

### D11. Responsive/mobile/i18n gesture and formatting coverage
- Aggregate finding: F22
- Source citation: `src/lib/i18n.ts:8-1823`, `src/components/TimelineSelector.tsx:50-58`, `src/components/ExportPanel.tsx:96-106`, `src/components/SceneEditor.tsx:280-291`, `src/components/TimelineSelector.tsx:271-291`, `e2e/travelback.spec.ts:282-317`, `e2e/travelback.spec.ts:567-814`
- Original severity/confidence: Low / Medium
- Reason for deferral: no current mobile or locale formatting defect was confirmed; the finding is coverage breadth.
- Reopen exit criterion: add mobile gesture and locale date-format tests before changing touch handlers, locale strings, or timeline date formatting.

### D12. Static hardening script fixture tests
- Aggregate finding: F23
- Source citation: `scripts/harden-static-export.mjs:1-93`, `scripts/smoke-static.mjs:89-174`, `.github/workflows/deploy-pages.yml:18-27`
- Original severity/confidence: Low / Medium
- Reason for deferral: the existing build plus smoke-static gate validates emitted output; narrow fixture tests would improve isolation but are not required to fix a confirmed defect this cycle.
- Reopen exit criterion: add script-level fixture tests when hardening logic changes or when Next output shape changes break the smoke gate.

