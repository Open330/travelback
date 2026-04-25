# Cycle 1 Review Implementation Plan — 2026-04-25

Source reviews:
- `.context/reviews/_aggregate.md`
- `.context/reviews/cycle1-*.md`

Repo rules read before planning:
- No `CLAUDE.md`, `.cursorrules`, or `CONTRIBUTING.md` exists in this repo.
- `.context/development/01-conventions.md` is the active rule source: TypeScript strict mode, no semicolons, single quotes, GPG-signed semantic + gitmoji commits, no `Co-Authored-By`, build/lint/typecheck/E2E gates.
- `.context/project/01-overview.md` and `.context/project/02-architecture.md` document the static GitHub Pages frame-header residual risk and browser-only privacy boundary.

## Status

Implemented in cycle 1. All scheduled tasks below were completed, and the configured whole-repo gates passed.

## Acceptance gates

Run all configured cycle gates against the whole repo after implementation:

1. `npm run lint`
2. `npm run typecheck`
3. `npm audit --audit-level=high`
4. `npm run build`
5. `npm run test:e2e:static:ci`

## Scheduled implementation tasks

### C1-T1 — Parser/import correctness and static deploy portability

Findings: F01, F02, F03, F04, F05, F15, F16

Files:
- `next.config.ts`
- `package.json`
- `playwright.static.config.ts`
- `src/lib/env.ts`
- `src/types.ts`
- `src/lib/parser.ts`
- `public/workers/trackParser.worker.js`
- `src/app/layout.tsx`
- `scripts/harden-static-export.mjs`
- `scripts/smoke-static.mjs`

Work:
- Parameterize production base path with a single explicit env surface while preserving `/travelback` for GitHub Pages/default static preview.
- Preserve normalized public base-path behavior for map styles, worker, sample assets, and tests.
- Add semantic-segment `geo:` URI parsing that tolerates uppercase scheme, whitespace, and explicit plus signs in both parser paths.
- Wrap JSON file-read and worker-crash failures in structured `ParseError` codes.
- Add XML preflight limits before `DOMParser` to reduce hostile GPX/KML main-thread risk.
- Narrow CSP inline-style allowance where feasible and add static smoke assertions for CSP/hardening invariants.
- Add/extend smoke checks that make parser-worker drift harder to miss.

### C1-T2 — Interaction state, map recovery, and accessibility semantics

Findings: F06, F07, F08, F09, F29, F30

Files:
- `src/components/JourneyCreator.tsx`
- `src/components/SceneEditor.tsx`
- `src/lib/usePlaybackController.ts`
- `src/components/MapView.tsx`
- `src/components/FileUpload.tsx`
- `src/components/TrackToolbar.tsx`

Work:
- Normalize manual waypoints before storing them.
- Guard playback-only hotkeys when no track exists.
- Clear stale map error state after successful style/layer recovery.
- Make scene normalization warnings match the saved normalized result or explicitly say ranges were adjusted.
- Ensure upload input is visually hidden but accessible through the app-controlled button/label path.
- Add popup/menu semantics to the mobile toolbar sheet.

### C1-T3 — Export UX and browser-memory guardrails

Findings: F13, F33, F34, F36, F39, F40

Files:
- `src/types.ts`
- `src/components/ExportPanel.tsx`
- `src/lib/videoEncoder.ts`
- `src/lib/i18n.ts`
- `src/lib/camera.ts`
- `src/lib/interpolate.ts`
- `src/components/MapView.tsx`
- `e2e/travelback.spec.ts`

Work:
- Default export resolution to the social portrait preset and update tests.
- Improve export progress copy so real exports communicate active rendering and estimates more clearly.
- Add a browser-memory pressure estimate that includes frame size/FPS/duration, not just encoded output bytes.
- Naturalize Korean export wording where this cycle touches export strings.
- Cache overview camera bounds/zoom per track.
- Use binary distance lookup for follow-camera look-ahead instead of an incremental scan.

### C1-T4 — Documentation correctness

Findings: F25, F26, F27, F28, plus deploy/CSP notes from F02/F14/F15/F16

Files:
- `README.md`
- `.context/development/01-conventions.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`

Work:
- Correct scene preset counts and E2E test count.
- Remove stale privacy wording about avoiding place search.
- Clarify App Router server layout vs client components.
- Document explicit base-path configuration and the remaining static-host CSP/header constraints.

### C1-T5 — Regression coverage updates

Findings: F01, F02, F04, F05, F08, F30, F33, F39, F40

Files:
- `scripts/smoke-static.mjs`
- `e2e/travelback.spec.ts`
- Existing fixtures if needed

Work:
- Update E2E expectations for the export default change.
- Add smoke/static assertions for base path, CSP style-source narrowing, parser worker semantic URI support, and structured worker errors where feasible.
- Re-run all gates.

## Finding disposition map

| Finding | Disposition |
|---|---|
| F01 | Scheduled C1-T1/C1-T5 |
| F02 | Scheduled C1-T1/C1-T4/C1-T5 |
| F03 | Scheduled C1-T1 |
| F04 | Scheduled C1-T1/C1-T5 |
| F05 | Scheduled C1-T1/C1-T5 |
| F06 | Scheduled C1-T2 |
| F07 | Scheduled C1-T2 |
| F08 | Scheduled C1-T2/C1-T5 |
| F09 | Scheduled C1-T2 |
| F10 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F11 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F12 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F13 | Scheduled C1-T3 |
| F14 | Deferred with quoted repo static-host rule |
| F15 | Scheduled C1-T1/C1-T4 |
| F16 | Scheduled C1-T1/C1-T4/C1-T5 |
| F17 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F18 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F19 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F20 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F21 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F22 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F23 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F24 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F25 | Scheduled C1-T4 |
| F26 | Scheduled C1-T4 |
| F27 | Scheduled C1-T4 |
| F28 | Scheduled C1-T4 |
| F29 | Scheduled C1-T2 |
| F30 | Scheduled C1-T2/C1-T5 |
| F31 | Scheduled C1-T2/C1-T4 |
| F32 | Scheduled C1-T2 |
| F33 | Scheduled C1-T3/C1-T5 |
| F34 | Scheduled C1-T3 |
| F35 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F36 | Scheduled C1-T3 |
| F37 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F38 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F39 | Scheduled C1-T3 |
| F40 | Scheduled C1-T3 |
| F41 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F42 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F43 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F44 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F45 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |
| F46 | Deferred in `deferred-findings-cycle1-2026-04-25.md` |

## Progress log

- 2026-04-25: Plan created from aggregate review. No existing active plan was archived because no active plan in `.context/plans/README.md` could be verified as fully implemented from current evidence without re-opening historical cycles.
- 2026-04-25: Implemented C1-T1 through C1-T5. Parser/import hardening, base-path portability, CSP narrowing, accessibility semantics, export guardrails, docs, and regression coverage were updated.
- 2026-04-25: Gates passed: `npm run lint`, `npm run typecheck`, `npm audit --audit-level=high`, `npm run build`, and `npm run test:e2e:static:ci` (74 Playwright tests plus static smoke).
