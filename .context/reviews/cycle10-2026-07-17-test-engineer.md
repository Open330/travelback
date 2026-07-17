# Cycle 10 Test Engineer Review — 2026-07-17

Reviewed exact revision `3d74754369d22ad1bb9e7970634e0f0163d5b777` on `codex/review-plan-fix-2026-07-16`.

## Outcome

The repository has broad parser and end-to-end coverage, but the four confirmed Cycle 10 failures sit behind missing right-reason assertions: semantic heading level, localized display-name resolution for unnamed inputs, save confirmation versus download initiation, and the Journey Creator's complete mobile action geometry.

## Test and repository inventory

- Mapped every Vitest suite under `src`, the complete `e2e/travelback.spec.ts`, all 18 GPX/KML/Google fixtures, both Playwright configurations, Vitest inclusion, TypeScript/ESLint/Next/PostCSS configuration, package scripts, worker generation/parity, static hardening/server/smoke scripts, workflow, and lockfile.
- Coverage tracing included byte/point limits, all supported Google representations, worker/main-thread parity, playback and timeline semantics, scene editing/camera behavior, localization/theme, dialogs/focus, export codecs/cancel/save/share, desktop/mobile geometry, CSP/base path, and opt-in real export.
- Browser evidence used the exact-HEAD isolated app, not a pre-existing primary-worktree server. Desktop and iPhone-emulated sample flows completed without a page error.
- Fresh gates in the isolated copy: lint passed; Next type generation plus `tsc --noEmit` passed; generated-worker parity passed; Vitest passed 17 files/405 tests; production build and three-file CSP hardening passed.
- Focused Chromium E2E, one worker and retries disabled: **13/13 passed in 6.3 minutes**. It covered landing/main, GPX, KML, flat JSON, Records, Semantic Location History, Timeline Edits, Semantic Segments, local export, picker cancellation, and full KML/Records journeys. This report does not represent that slice as the full 102-test suite.

## Findings

### TE10-01 — Landing tests accept a broken heading outline

- Severity / confidence: Medium / High
- Status: Confirmed regression gap with confirmed live failure
- Locations: production heading `src/components/FileUpload.tsx:259-261`; landing coverage in `src/components/FileUpload.test.ts` and `e2e/travelback.spec.ts`
- Concrete gap: current tests exercise upload/sample/manual-entry behavior but do not require exactly one accessible level-one page heading. The live tree contains only `h2 "Travelback"`.
- Failure scenario: visual copy remains unchanged, all interaction tests pass, and a semantic accessibility regression ships unnoticed.
- Root regression: query the landing page by `getByRole('heading', { level: 1, name: 'Travelback' })`, assert a single H1, and retain the visual/layout assertions independently.

### TE10-02 — Parser tests freeze English fallback names instead of testing locale ownership

- Severity / confidence: Medium / High
- Status: Confirmed design/coverage gap with confirmed source failure
- Locations: `src/lib/parser.ts:214-216,228-230`; `src/lib/googleJsonParser.ts:377-380`; parser/worker tests under `src/lib/parser.test.ts` and `src/workers/trackParser.worker.test.ts`; locale suites `src/lib/i18n.test.ts`
- Concrete gap: parser coverage validates successful shapes and fallback naming in isolation, while dictionary parity validates only known i18n keys. No integration assertion switches to Korean/Japanese/Chinese/Spanish and imports an unnamed GPX, unnamed KML, or Google export.
- Failure scenario: adding dictionaries or switching locale cannot affect the literal parser names, yet all parser and i18n suites remain green.
- Root regression: return stable missing-name/source-kind metadata from parsing, then table-drive the three sources across shipped locales at the display boundary. Do not make worker output locale-dependent.

### TE10-03 — Export completion tests do not distinguish “started” from “saved”

- Severity / confidence: Medium / High
- Status: Confirmed regression gap with confirmed source failure
- Locations: `src/lib/videoEncoder.ts:296-303,336-360`; `src/lib/useExportController.ts:250-264`; `src/components/ExportPanel.tsx:302-310`; export unit/E2E coverage in `src/components/ExportPanel.test.ts`, `src/lib/useExportController.test.ts`, and `e2e/travelback.spec.ts`
- Concrete gap: the fallback contract explicitly returns `saved:false`, but no rendered-copy assertion requires the heading to differ from the save-confirmed branch. The panel therefore displays `export.success` (“Video saved!”) for `downloadMethod:'fallback'`.
- Failure scenario: a blocked synthetic download produces the same success heading as a confirmed file-system save and the suite still passes.
- Root regression: table-drive `ready`, `fallback`, and save-confirmed `picker` results; assert heading, explanatory text, recovery action, and focus for each state. A fallback test should simulate a rejected/absent picker and an anchor click that cannot be confirmed.

### TE10-04 — Browser matrix cannot establish physical iOS safe-area behavior

- Severity / confidence: Low / High
- Status: Manual-validation coverage gap, not a confirmed product failure
- Locations: Chromium-only project in `playwright.config.ts`; viewport ownership `src/app/page.tsx:579`, `src/components/TrackWorkspace.tsx:142-155`
- Concrete gap: mobile checks emulate dimensions in Chromium; the exact-HEAD agent-browser probe likewise returned a zero safe-area inset. Neither reproduces Safari's nonzero home-indicator inset or dynamic browser chrome.
- Root validation: add a documented physical iPhone/Safari release check (or an equivalent WebKit harness with injected safe-area test geometry) that proves playback controls remain visible and operable in portrait and landscape.

### TE10-05 — Mobile Journey Creator tests omit the narrow Cancel target

- Severity / confidence: Low / High
- Status: Confirmed regression gap with confirmed live usability failure
- Locations: `src/components/JourneyCreator.tsx:740-750`; coarse-pointer height-only rule `src/styles/vitro-base.css:796-805`; current mobile target coverage `e2e/travelback.spec.ts:958-983`
- Concrete gap: the E2E correctly verifies the six journey-mode toggle icons at 44×44, but does not measure the header Cancel action. In the same 393px coarse-pointer layout, Cancel was 20.75×44.09px.
- Failure scenario: icon-target assertions remain green while a critical exit action becomes a narrow text hitbox.
- Root regression: under the existing mobile/coarse-pointer setup, assert both dimensions of Cancel—and preferably the complete primary-action inventory—are at least 44px. Keep this separate from WCAG 2.5.8, whose spacing exception may apply.

## Final test sweep

The final pass reviewed retry masking, skips, test-stub leakage, stale locators, worker drift, host locale/time zone, async focus/RAF ownership, temp fixtures, port ownership, static/dev parity, cancellation races, unsupported input recovery, localized intrinsic widths, reduced motion, viewport-visible hit areas, and save/share state. The Scene endpoint candidate was explicitly rejected after live bounding-box measurements; no regression test is requested for a failure that was not present.
