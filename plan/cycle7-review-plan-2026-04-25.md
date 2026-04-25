# Cycle 7 Review Implementation Plan — 2026-04-25

Source aggregate: `.context/reviews/_aggregate.md`

## Repo Rules Consulted

- `CLAUDE.md`: absent; `.context/development/01-conventions.md` says not to use `CLAUDE.md` for this project.
- `AGENTS.md`: orchestrator-provided workspace rules apply, including autonomous execution, small reversible diffs, full gates, GPG-signed semantic gitmoji commits, and preserving deferred-fix records.
- `.context/**`: read `.context/README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/development/01-conventions.md`, and `.context/plans/README.md`.
- `.cursorrules`, `CONTRIBUTING.md`, and `docs/` policy files: absent in this repo snapshot.
- Deferred work remains bound by repo policy: Node 24 LTS, strict TypeScript, no new dependencies without explicit request, lint/typecheck/build/e2e gates before commit, GPG-signed semantic gitmoji commits, and push after each implementation iteration.

Archived completed plans before this cycle:
- `plan/cycle4-review-plan-2026-04-25.md` moved to `plan/archive/cycle4-review-plan-2026-04-25.md`.
- `plan/cycle6-review-plan-2026-04-25.md` moved to `plan/archive/cycle6-review-plan-2026-04-25.md`.

## Scheduled Implementation Tasks

### TASK-1 — Correct Google import guidance and traveler-facing recovery copy

- Findings: AGG-001, AGG-008, AGG-009, AGG-011
- Severity/confidence: Critical/High for Google guide; Medium/High for export/readiness/error guidance.
- Files: `src/components/GoogleGuide.tsx`, `src/lib/i18n.ts`, `src/components/FileUpload.tsx`, `src/components/ExportPanel.tsx`
- Plan:
  1. Split or clarify phone Google Timeline export steps for iPhone and Android.
  2. Show visible export readiness text near the disabled Start Export action when codec/export support is unavailable.
  3. Make unsupported/parse/file-size errors include concrete recovery next steps, including ZIP extraction and accepted file types.
  4. Make post-export sharing tips honest about Downloads/Files/Photos/gallery paths.
- Progress: pending

### TASK-2 — Harden parser correctness and availability limits

- Findings: AGG-002, AGG-003, AGG-004
- Severity/confidence: High/High.
- Files: `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `scripts/smoke-static.mjs`, `e2e/travelback.spec.ts`
- Plan:
  1. Preserve identical revisits across Google semantic segments by scoping dedupe to each segment instead of one global set.
  2. Mirror the dedupe behavior in the worker parser.
  3. Add a pre-parse Google JSON point-budget scan so dense exports can be rejected before full object materialization.
  4. Lower the synchronous XML import limit to a safer cap and update the static smoke guard.
  5. Add focused E2E coverage for the revisit preservation and XML cap behavior where feasible without adding dependencies.
- Progress: pending

### TASK-3 — Fix interaction and accessibility regressions

- Findings: AGG-006, AGG-007, AGG-010, AGG-025, AGG-026
- Severity/confidence: Medium-High/Medium-High to Low/High.
- Files: `src/components/TimelineSelector.tsx`, `src/app/page.tsx`, `src/components/JourneyCreator.tsx`, `src/components/ThemeToggle.tsx`, `src/components/ExportPanel.tsx`, `e2e/travelback.spec.ts`
- Plan:
  1. Flush the latest timeline pointer position on drag end instead of cancelling the pending final update.
  2. Stop moving focus to the invisible live region after track load while preserving the announcement.
  3. Suppress map click-add immediately after waypoint drag.
  4. Derive the initial theme-toggle visual state from the bootstrapped document mode.
  5. Restrict export swipe-dismiss so ordinary scroll gestures do not close the dialog.
  6. Add focused E2E coverage where practical.
- Progress: pending

### TASK-4 — Prevent stale runtime worker/style assets after static deploys

- Findings: AGG-005
- Severity/confidence: Medium-High / Medium-High.
- Files: `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`
- Plan:
  1. Serve `workers/*.js` and `map-styles/*.json` with `no-cache` or `must-revalidate`.
  2. Keep immutable caching for hashed `_next/static` assets.
  3. Add smoke assertions for worker and map-style cache headers.
- Progress: pending

## Non-Scheduled Findings

All review findings not listed above are recorded in `plan/deferred-cycle7-review-2026-04-25.md` with original severity/confidence, file citations, deferral reason, and exit criterion.

## Completion Criteria

- Scheduled tasks above are implemented and marked complete.
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, and `npm run test:e2e:static` pass.
- Any gate warnings that cannot be cleanly fixed are recorded in the deferred ledger.
- Changes are committed with GPG-signed semantic gitmoji commits and pushed.
