# Cycle 4 Review Implementation Plan - 2026-04-25

## Policy Intake

Required repo-rule sources were checked before deferring findings:

- `CLAUDE.md`: absent. `.context/development/01-conventions.md` explicitly says never to use `CLAUDE.md` for this project.
- `AGENTS.md`: supplied in the orchestration prompt for this workspace.
- `.context/README.md`, `.context/development/01-conventions.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`: read.
- `.cursorrules`: absent.
- `CONTRIBUTING.md`: absent.
- `docs/`: absent.

Relevant rules applied: Node 24 LTS, strict TypeScript, no semicolons, single quotes, no new dependencies, run lint/typecheck/build/E2E/static E2E, GPG-signed semantic gitmoji commits, and push after the iteration.

## Source Reviews

This plan is based on `.context/reviews/_aggregate.md`, synthesized from the modified cycle 4 review artifacts:

- `.context/reviews/code-reviewer.md`
- `.context/reviews/critic.md`
- `.context/reviews/debugger.md`
- `.context/reviews/designer.md`
- `.context/reviews/test-engineer.md`
- `.context/reviews/verifier.md`

## Tasks

### TASK-001 - Restore clean-checkout typecheck
- Status: done
- Findings: F1
- Files: `package.json`, `tsconfig.json`
- Plan: keep Next's generated route type includes in `tsconfig.json`, but make `npm run typecheck` refresh them with `next typegen` before `tsc --noEmit`.
- Verification: `npm run typecheck`

### TASK-002 - Stabilize Playwright gate entrypoints
- Status: done
- Findings: F2, F3
- Files: `package.json`, `scripts/run-dev-e2e.mjs`, `scripts/run-static-e2e.mjs`, `playwright.config.ts`, `playwright.static.config.ts`
- Plan: mirror the static dynamic-port wrapper for dev E2E, make `playwright.config.ts` read `PLAYWRIGHT_DEV_PORT`, validate ports against the host family Playwright uses, and add the trailing slash to the static base URL/readiness URL.
- Verification: `npm run test:e2e`, `npm run test:e2e:static`

### TASK-003 - Accept flat Google JSON arrays with delayed records
- Status: done
- Findings: F4
- Files: `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `e2e/travelback.spec.ts`
- Plan: replace the first-100-entry recognizer with a full-array shape check in both parser copies and add a regression fixture generated inside Playwright.
- Verification: `npm run test:e2e`, `npm run test:e2e:static`

### TASK-004 - Restore landscape export default
- Status: done
- Findings: F6
- Files: `src/components/ExportPanel.tsx`, `e2e/travelback.spec.ts`
- Plan: restore `resolutionIdx` default to the landscape preset and add an E2E assertion for the default combobox value and output dimensions.
- Verification: `npm run test:e2e`, `npm run test:e2e:static`

### TASK-005 - Repair Journey Creator visual/state polish
- Status: done
- Findings: F7, F8, F9
- Files: `src/components/JourneyCreator.tsx`
- Plan: replace undefined `--bg1`, make selected travel modes visible through stable per-icon route/waypoint colors, and extend the map-ready retry window.
- Verification: `npm run lint`, `npm run typecheck`, `npm run test:e2e`

### TASK-006 - Keep onboarding reachable when WebGL fails
- Status: done
- Findings: F10
- Files: `src/components/MapView.tsx`
- Plan: convert the full-screen map error takeover into a non-blocking alert card so onboarding/upload controls remain clickable under WebGL failure.
- Verification: `npm run lint`, `npm run test:e2e`

### TASK-007 - Add workspace focus and live announcement after load
- Status: done
- Findings: F11
- Files: `src/app/page.tsx`, `src/lib/i18n.ts`
- Plan: focus a screen-reader-only polite status region after `loadTrackIntoSession()` and announce the loaded track name in all supported locales.
- Verification: `npm run lint`, `npm run typecheck`, `npm run test:e2e`

### TASK-008 - Refresh review provenance
- Status: done
- Findings: F12
- Files: `.context/reviews/_aggregate.md`, `plan/cycle4-review-plan-2026-04-25.md`, `plan/deferred-cycle4-review-2026-04-25.md`
- Plan: replace the stale aggregate with the recovered cycle 4 synthesis and map each finding to either an implemented task or a deferred record.
- Verification: review all finding IDs in this plan and the deferred file.

## Finding Disposition

- Implemented: F1, F2, F3, F4, F6, F7, F8, F9, F10, F11, F12.
- Deferred with explicit records: F5, F13, F14, F15, F16, F17, F18, F19, F20 remaining wait/split work, F21, F22, F23.

## Gate Checklist

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] `npm run test:e2e`
- [x] `npm run test:e2e:static`

Gate note: both Playwright gates passed 63/63. Playwright still reports the single-spec slow-file warning; this is preserved under `plan/deferred-cycle4-review-2026-04-25.md` as D9.
