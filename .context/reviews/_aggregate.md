# Aggregate Review - Cycle 4 Recovery (2026-04-25)

## Scope

This aggregate synthesizes the modified cycle 4 review artifacts that existed at recovery time:

- `.context/reviews/code-reviewer.md`
- `.context/reviews/critic.md`
- `.context/reviews/debugger.md`
- `.context/reviews/designer.md`
- `.context/reviews/test-engineer.md`
- `.context/reviews/verifier.md`

The user explicitly directed recovery from the current modified review notes. Older historical review files were retained for provenance but were not counted as new cycle 4 findings.

## Agent Status

- Completed from on-disk artifacts: code-reviewer, critic, debugger, designer, test-engineer, verifier.
- Agent limitations: the earlier fan-out was interrupted before all requested specialist surfaces wrote fresh modified artifacts. Recovery continued from the modified files present on disk, per user instruction.
- Browser limitation from designer: WebGL could not initialize in headless Chromium, so the designer validated the fallback/error path plus DOM/focus behavior rather than a normal rendered map.

## New Findings

### F1. Clean-checkout typecheck can fail before build-generated Next types exist
- Severity: High
- Confidence: High
- Status: confirmed
- Agreement: code-reviewer
- Evidence: `package.json:10-15`, `tsconfig.json:25-31`
- Failure scenario: `npm run typecheck` runs before `npm run build`, but generated `.next/types/**/*.ts` entries can reference generated files that are missing or stale on a clean/dev checkout.
- Fix: run `next typegen` before `tsc --noEmit` so Next's expected generated route types exist before TypeScript checks them.

### F2. Static Playwright base URL is missing a trailing slash
- Severity: Medium
- Confidence: High
- Status: confirmed
- Agreement: code-reviewer
- Evidence: `playwright.static.config.ts:18`, `playwright.static.config.ts:39`
- Failure scenario: with Playwright URLs set to `/travelback` instead of `/travelback/`, `page.goto('/')` can resolve to the origin root rather than the static subpath and server readiness checks can target a subtly different URL.
- Fix: set the static Playwright base URL and web-server readiness URL to `http://localhost:${PORT}/travelback/`.

### F3. Dev E2E is coupled to fixed port 3099
- Severity: Low
- Confidence: High
- Status: confirmed/manual-validation risk
- Agreement: critic, debugger
- Evidence: `playwright.config.ts:3-44`, `package.json:12`
- Failure scenario: `npm run test:e2e` fails in shared workspaces when another dev server already owns port 3099.
- Fix: run dev Playwright through a dynamic-port wrapper like the static E2E wrapper.

### F4. Flat Google JSON arrays are only recognized if the first 100 entries include a record
- Severity: Medium
- Confidence: High
- Status: likely
- Agreement: debugger
- Evidence: `src/lib/parser.ts:479-483`, `public/workers/trackParser.worker.js:209`
- Failure scenario: a valid flat Google Takeout array with metadata/noise first and real location records after index 99 is rejected.
- Fix: search the full array for a recognizable location record before dispatching to `parseRecords`.

### F5. Parser implementation is duplicated between main thread and worker
- Severity: Low
- Confidence: High
- Status: risk
- Agreement: code-reviewer, test-engineer, verifier
- Evidence: `src/lib/parser.ts:145-675`, `public/workers/trackParser.worker.js:1-322`
- Failure scenario: a parser bug is fixed in one copy but not the other, so worker and fallback paths disagree.
- Fix: plan a shared parser module or generation strategy with parity tests.

### F6. Export panel defaults to the portrait/TikTok preset
- Severity: Medium
- Confidence: Medium
- Status: likely
- Agreement: critic
- Evidence: `src/components/ExportPanel.tsx:67`, `src/components/ExportPanel.tsx:177-181`, `src/components/ExportPanel.tsx:300-306`
- Failure scenario: a desktop user opens Export and clicks Start Export without inspecting the dropdown, producing vertical output unexpectedly.
- Fix: restore the landscape preset as the default and add an E2E guard.

### F7. Journey Creator icon picker does not affect the rendered route preview
- Severity: Low
- Confidence: High
- Status: confirmed
- Agreement: critic, debugger
- Evidence: `src/components/JourneyCreator.tsx:52-59`, `src/components/JourneyCreator.tsx:181-229`, `src/components/JourneyCreator.tsx:695-722`
- Failure scenario: selecting Plane, Bus, or Train leaves the map preview looking identical because the rendered layer is still a plain orange circle layer.
- Fix: make the selected travel mode visible in the preview or relabel the control. Cycle 4 uses per-icon marker/line colors as the low-risk visible preview signal.

### F8. Journey Creator search result background uses undefined `--bg1`
- Severity: Low
- Confidence: High
- Status: confirmed
- Agreement: critic, debugger, verifier
- Evidence: `src/components/JourneyCreator.tsx:680-685`; repo-wide search found no `--bg1` definition.
- Failure scenario: the coordinate search listbox can render transparently on top of the map.
- Fix: replace `--bg1` with an existing background token.

### F9. Journey Creator can give up on map hookup after about 3 seconds
- Severity: Low
- Confidence: High
- Status: likely
- Agreement: debugger
- Evidence: `src/components/JourneyCreator.tsx:243-250`
- Failure scenario: on slow starts the panel becomes active before `mapRef.current?.getMap()` exists, exhausts retries, and stays inert until toggled.
- Fix: extend the retry window or bind to a real map-ready signal.

### F10. Map fallback blocks pointer/touch access to onboarding controls when WebGL fails
- Severity: High
- Confidence: High
- Status: confirmed
- Agreement: designer
- Evidence: `src/components/MapView.tsx:948-975`, `src/app/page.tsx:371-394`
- Failure scenario: if WebGL cannot initialize, the map error layer intercepts clicks intended for Browse Files, Try Sample, or route creation.
- Fix: make the map error a non-blocking alert/banner so onboarding remains pointer-accessible.

### F11. Successful file/sample load does not move focus or announce the workspace transition
- Severity: Medium
- Confidence: High
- Status: confirmed
- Agreement: designer
- Evidence: `src/app/page.tsx:197-205`, `src/app/page.tsx:253-276`
- Failure scenario: keyboard and screen-reader users activate a file/sample load and focus falls back to `body` with no announcement that the workspace is ready.
- Fix: add a focusable polite status handoff after `loadTrackIntoSession`.

### F12. Current verifier artifact was stale
- Severity: Low
- Confidence: High
- Status: confirmed
- Agreement: critic
- Evidence: `.context/reviews/verifier.md:15-19`
- Failure scenario: future cycles chase already-fixed issues because the persisted verifier note contradicts current code.
- Fix: refresh verifier context and this aggregate.

### F13. No direct tests protect parser, camera, playback, interpolation, or export logic
- Severity: High
- Confidence: High
- Status: confirmed
- Agreement: test-engineer, verifier
- Evidence: no `*.test.*` or `*.spec.*` files outside `e2e/travelback.spec.ts`; high-risk modules include `src/lib/parser.ts`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`.
- Failure scenario: core math, parser, playback, or export state regressions slip through UI smoke coverage.
- Fix: add a unit/integration layer in a follow-up plan.

### F14. Parser worker/main-thread parity and failure paths are under-tested
- Severity: High
- Confidence: High
- Status: likely gap
- Agreement: test-engineer, verifier
- Evidence: `src/lib/parser.ts:145-675`, `public/workers/trackParser.worker.js:1-322`, `e2e/travelback.spec.ts:410-437`, `e2e/travelback.spec.ts:1206-1243`
- Failure scenario: segment indices, date coercion, dedup ordering, JSON depth, point-limit, or worker fallback behavior diverges while happy-path imports still pass.
- Fix: add fixture parity tests and explicit failure-code tests.

### F15. Upload parser error coverage only proves unsupported extensions
- Severity: High
- Confidence: High
- Status: likely gap
- Agreement: test-engineer
- Evidence: `src/components/FileUpload.tsx:52-93`, `src/lib/parser.ts:446-675`, `public/workers/trackParser.worker.js:254-320`, `e2e/travelback.spec.ts:1247-1260`
- Failure scenario: invalid supported files, oversized files, too-few-points, deep JSON, or worker-only failures show wrong messages or leave loading state stuck.
- Fix: add upload-surface error taxonomy tests.

### F16. Export execution/download states are largely untested
- Severity: High
- Confidence: High
- Status: likely gap
- Agreement: test-engineer, verifier
- Evidence: `src/lib/useExportController.ts:83-245`, `src/lib/videoEncoder.ts:40-225`, `src/components/ExportPanel.tsx:142-260`, `e2e/travelback.spec.ts:1139-1201`, `e2e/travelback.spec.ts:1265-1320`
- Failure scenario: cancel, error, done, save picker, fallback download, share, or cleanup branches break while dialog-only tests pass.
- Fix: add controller integration tests and one deterministic export completion test.

### F17. Keyboard/focus coverage misses export-overlay cancel and post-close focus behavior
- Severity: Medium
- Confidence: High
- Status: likely gap
- Agreement: test-engineer
- Evidence: `src/app/page.tsx:173-187`, `src/lib/usePlaybackController.ts:166-217`, `e2e/travelback.spec.ts:259-279`, `e2e/travelback.spec.ts:746-785`, `e2e/travelback.spec.ts:1139-1153`
- Failure scenario: Escape cancel or focus return regresses during export without a failing test.
- Fix: add focused export-overlay keyboard tests.

### F18. Timeline selector touch, region drag, start-handle drag, and reset are under-protected
- Severity: Medium
- Confidence: High
- Status: likely gap
- Agreement: test-engineer
- Evidence: `src/components/TimelineSelector.tsx:25-522`, `src/components/TimelineSelector.tsx:271-291`, `src/components/TimelineSelector.tsx:515-517`, `e2e/travelback.spec.ts:695-785`
- Failure scenario: mobile touch or start/region/reset interactions break while end-handle and keyboard tests pass.
- Fix: add targeted timeline interaction tests.

### F19. Scene editing coverage misses range editing, undo, warnings, and swipe-dismiss
- Severity: Medium
- Confidence: High
- Status: likely gap
- Agreement: test-engineer
- Evidence: `src/components/SceneEditor.tsx:48-334`, `e2e/travelback.spec.ts:979-1064`
- Failure scenario: clamping, overlap warnings, undo timers, or mobile dismiss regress without coverage.
- Fix: add focused scene editor interaction tests.

### F20. E2E suite remains flake-prone due to hard sleeps, dev-overlay stripping, serialization, and a single large spec
- Severity: Medium
- Confidence: High
- Status: confirmed
- Agreement: test-engineer, debugger
- Evidence: `playwright.config.ts:8-39`, `playwright.static.config.ts:8-39`, `e2e/travelback.spec.ts:139-147`, `e2e/travelback.spec.ts:211-235`, and hard waits at `e2e/travelback.spec.ts:147`, `507`, `523`, `817`, `845`, `922`, `937`, `1272`, `1309`
- Failure scenario: timing drift or hydration changes cause intermittent failures or retry-only greens.
- Fix: replace waits with state-driven waits and split tests by domain.

### F21. Final MP4 save/share behavior remains manual-validation risk
- Severity: Medium
- Confidence: High
- Status: manual-validation risk
- Agreement: test-engineer, verifier
- Evidence: `src/lib/videoEncoder.ts:171-212`, `src/components/ExportPanel.tsx:148-173`, `src/components/ExportPanel.tsx:211-260`, `.context/agents/non-tech-traveler-reviewer.md:84-101`
- Failure scenario: picker, anchor fallback, or share APIs differ across browsers while panel smoke tests pass.
- Fix: keep a manual matrix and add browser API mock integration tests.

### F22. Responsive/mobile/i18n coverage is broad but shallow for gestures and locale formatting
- Severity: Low
- Confidence: Medium
- Status: likely gap
- Agreement: test-engineer, designer
- Evidence: `src/lib/i18n.ts:8-1823`, `src/components/TimelineSelector.tsx:50-58`, `src/components/ExportPanel.tsx:96-106`, `src/components/SceneEditor.tsx:280-291`, `src/components/TimelineSelector.tsx:271-291`, `e2e/travelback.spec.ts:282-317`, `e2e/travelback.spec.ts:567-814`
- Failure scenario: localized date formatting or mobile gestures regress while headline string and layout overlap checks pass.
- Fix: add locale-format and mobile gesture tests.

### F23. Static hardening script lacks narrow fixture tests
- Severity: Low
- Confidence: Medium
- Status: likely gap
- Agreement: test-engineer
- Evidence: `scripts/harden-static-export.mjs:1-93`, `scripts/smoke-static.mjs:89-174`, `.github/workflows/deploy-pages.yml:18-27`
- Failure scenario: a Next export shape change breaks CSP replacement or bootstrap inlining, and root-cause isolation depends on a full app build.
- Fix: add script-level fixture tests for hardening transformations.

## Implementation Disposition

- Scheduled and implemented in cycle 4: F1, F2, F3, F4, F6, F7, F8, F9, F10, F11, F12.
- Deferred with explicit records in `plan/deferred-cycle4-review-2026-04-25.md`: F5, F13, F14, F15, F16, F17, F18, F19, F20 remaining wait/split work, F21, F22, F23.
