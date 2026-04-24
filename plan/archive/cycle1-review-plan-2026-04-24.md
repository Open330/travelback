# Cycle 1 review-plan-fix implementation plan — 2026-04-24

Source review aggregate: `.context/reviews/_aggregate.md`.

## Repository rules consulted

- `.context/development/01-conventions.md`: TypeScript strict mode, no semicolons, single quotes, 2-space indentation, `npm run build`/`npm run lint` required, GPG-signed semantic gitmoji commits.
- `.context/README.md` and `.context/plans/README.md`: `.context/` is authoritative project context and active/deferred plan state must remain accurate.
- No `CLAUDE.md`, `.cursorrules`, or `CONTRIBUTING.md` exists in this repo.

## Scheduled implementation tasks

### TASK-1 — Repair timeline trim data ownership and keyboard behavior

Findings: AGG-001, AGG-002, AGG-003, AGG-022 (partial), AGG-030 (partial).  
Severity/confidence: High/High for range correctness; Medium/High for hotkey conflict.

Plan:
1. Compute active-track and full-track cumulative-distance arrays separately in `src/app/page.tsx`.
2. Pass full-track distances into `TimelineSelector` while preserving active-track distances for map/playback/elevation/export.
3. Route keyboard slider updates through index resolution + `onRangeChange`.
4. Stop handled slider key events from reaching global playback hotkeys.
5. Add E2E coverage for second trim expansion and keyboard trimming updating the loaded track title.

### TASK-2 — Stabilize playback/export state and download cleanup

Findings: AGG-004, AGG-005, AGG-006, AGG-007, AGG-008, AGG-018 (partial), AGG-026 (partial).  
Severity/confidence: High/High for export cancellation state; Medium/High for playback/download issues.

Plan:
1. Rebase playback timing when speed or duration changes while playback is active.
2. Capture and restore pre-export playback progress in `useExportController`.
3. Retain encoded blobs/object URLs before attempting a download so picker cancellation does not discard output.
4. Revoke newly-created URLs on failed download/error paths and keep existing reset/unmount cleanup.
5. Skip `showSaveFilePicker` when transient user activation is not available; use fallback download instead.
6. Wrap fallback anchor download cleanup in `try`/`finally`.
7. Add a browser frame delay before export idle waits so React-driven map progress updates can commit before capture.

### TASK-3 — Fix parser correctness and segment invariants

Findings: AGG-009, AGG-010, AGG-011, AGG-015 (partial), AGG-025 (partial).  
Severity/confidence: High/High for numeric and segment correctness.

Plan:
1. Treat `null`, `undefined`, and empty strings as absent in main/worker numeric parsing.
2. Strip complete XML DOCTYPE internal subsets and entity declarations without leaving malformed fragments.
3. Change Google JSON parsing to collect logical segments, dedupe points, sort segments by segment start time, then flatten and derive `segmentStartIndices`.
4. Mirror the segment parser changes in `public/workers/trackParser.worker.js` so worker/main behavior stays aligned for this cycle.
5. Add E2E fixture coverage for malformed optional values and out-of-order Google segments if feasible without adding a new test runner.

### TASK-4 — Fix static-map-compatible Journey Creator and mobile semantics

Findings: AGG-012, AGG-013, AGG-014, AGG-028 (partial).  
Severity/confidence: Medium/High for glyphless symbol layer and mobile title; Low/High for menu semantics.

Plan:
1. Remove the runtime MapLibre symbol label layer from JourneyCreator so bundled glyphless static styles remain warning-free.
2. Add a compact mobile loaded-track title/status chip.
3. Replace mobile overflow popup menu semantics with group semantics and remove incorrect `menuitem` roles.
4. Add/adjust E2E checks where low-risk.

### TASK-5 — Align docs/scripts/plans with current behavior

Findings: AGG-029, AGG-031, AGG-032, AGG-033, AGG-034, AGG-035.  
Severity/confidence: High/High for anti-framing doc overstatement; Medium/High for static smoke/script gap.

Plan:
1. Chain `npm run smoke:static` into the main static E2E script after build.
2. Update `.context/README.md` to stop claiming there are no active plans.
3. Clarify GitHub Pages anti-framing posture: JS frame-buster ships, host/CDN headers require hosting support outside GitHub Pages.
4. Update architecture scene names and export preset docs.
5. Correct stale plan chronology and archive/mark resolved stale deferred documentation items where identified.

## Completion criteria

- All scheduled tasks above implemented or explicitly marked complete in this plan.
- `npm run lint`, `npm run typecheck`, `npm audit --audit-level=high`, `npm run build`, `npm run smoke:static`, and `npm run test:e2e:static:ci` pass.
- Review artifacts and plan/deferred records remain in the repo for traceability.

## Cycle 1 implementation progress

Status: complete as of 2026-04-24.

- [x] TASK-1 — Timeline trim data ownership and keyboard behavior fixed in `src/app/page.tsx`, `src/components/TrackWorkspace.tsx`, `src/components/TimelineSelector.tsx`, and `e2e/travelback.spec.ts`.
- [x] TASK-2 — Playback timing, export progress restoration, save-picker fallback, and download cleanup fixed in `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/components/ExportPanel.tsx`, and `src/lib/i18n.ts`.
- [x] TASK-3 — Parser optional-number handling, GPX/GeoJSON coordinate validation, XML stripping, Google segment preservation, and worker parity fixed in `src/lib/parser.ts` and `public/workers/trackParser.worker.js`.
- [x] TASK-4 — Glyphless static-map Journey Creator behavior, mobile title visibility, and mobile popup semantics fixed in `src/components/JourneyCreator.tsx`, `src/components/TrackWorkspace.tsx`, and `src/components/TrackToolbar.tsx`.
- [x] TASK-5 — Static E2E smoke chaining, project docs, stale plan chronology, and stale deferred records updated in `package.json`, `.context/README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `plan/cycle2-c2-plan.md`, and `.context/plans/deferred-findings-cycle-r2-2026-04-23.md`.

Gate evidence:

- [x] `npm run lint` — passed.
- [x] `npm run typecheck` — passed.
- [x] `npm audit --audit-level=high` — passed with 0 vulnerabilities.
- [x] `npm run build` — passed, including `postbuild` CSP hardening.
- [x] `npm run smoke:static` — passed.
- [x] `npm run test:e2e:static:ci` — passed, 56 tests.

Follow-up status: remaining performance, maintainability, and broad test-harness work stays deferred in `plan/deferred-cycle1-review-plan-2026-04-24.md` with original severities and exit criteria preserved.
