# Cycle 1 Review Remediation Plan — 2026-04-25

## Source reviews

- `.context/reviews/_aggregate.md`
- `.context/reviews/cycle1-*-2026-04-25.md`

## Implementation plan and progress

### P0 correctness regressions

- [x] Remove the raw Google JSON point-like-key pre-scan that rejected valid exports before validation/dedup.
  - Files: `src/lib/parser.ts`, `public/workers/trackParser.worker.js`
  - Evidence: `deduplicates timed Google observations repeated across matching export branches` E2E; full static E2E passed.
- [x] Restore dedupe for timed duplicate observations across matching Google export branches without collapsing repeated untimed semantic visits.
  - Files: `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `e2e/fixtures/google-mixed-duplicate-branches.json`, `e2e/travelback.spec.ts`
  - Evidence: repeated untimed visit and mixed-duplicate E2E regressions pass.
- [x] Change timeline dragging to commit one parent range update on drag end, and never commit on no-op handle clicks.
  - Files: `src/components/TimelineSelector.tsx`, `e2e/travelback.spec.ts`
  - Evidence: `timeline no-op clicks preserve completed export results` and full static E2E passed.

### P1 user-facing regressions and safety bounds

- [x] Restore realistic XML support above 1 MB while keeping the 4 MB DOMParser safety cap.
  - Files: `src/lib/parser.ts`, `scripts/smoke-static.mjs`, `e2e/travelback.spec.ts`, `.context/project/01-overview.md`
  - Evidence: valid >1 MB GPX imports; oversized >4 MB GPX rejects; static smoke passed.
- [x] Split codec probing from codec unsupported UX.
  - Files: `src/components/ExportPanel.tsx`, `src/lib/i18n.ts`, `e2e/travelback.spec.ts`
  - Evidence: export panel opens without false unsupported-codec alert.
- [x] Add an in-memory export size guard shared by UI and encoder.
  - Files: `src/lib/videoEncoder.ts`, `src/components/ExportPanel.tsx`
  - Evidence: build/typecheck/static E2E pass with the centralized guard.
- [x] Restore visible focus handoff after loading a track.
  - Files: `src/app/page.tsx`, `e2e/travelback.spec.ts`
  - Evidence: focused regression and full static E2E passed.
- [x] Prevent Journey Creator drag suppression from swallowing later intentional clicks.
  - File: `src/components/JourneyCreator.tsx`
  - Evidence: full static E2E journey flows passed.

### P2 infrastructure, docs, and polish

- [x] Normalize upload recovery punctuation.
  - File: `src/components/FileUpload.tsx`
- [x] Harden static preview serving and smoke coverage.
  - Files: `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`
  - Evidence: `npm run smoke:static` and `npm run test:e2e:static:ci` passed.
- [x] Restrict the debug bridge to development or localhost opt-in.
  - File: `src/components/MapView.tsx`
- [x] Correct docs for background themes, XML caps, and selected export codec wording.
  - Files: `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/agents/non-tech-traveler-reviewer.md`

## Deferred items

See `plan/deferred-cycle1-review-2026-04-25.md`. Deferred items preserve original severity/confidence, cite the review evidence, and are limited to architectural/coverage work not required to close the confirmed cycle regressions.

## Quality gates

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm audit --audit-level=high`
- [x] `npm run build`
- [x] `npm run test:e2e:static:ci`
