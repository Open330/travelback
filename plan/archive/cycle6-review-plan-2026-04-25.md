# Cycle 6 Review Implementation Plan — 2026-04-25

Source review aggregate: `.context/reviews/_aggregate.md`

Repo-policy checks before planning:
- `CLAUDE.md`: absent, and `.context/development/01-conventions.md` says never use it for this project.
- `AGENTS.md`: orchestrator-provided workspace rules apply.
- `.context/**`: read `.context/README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/development/01-conventions.md`, and `.context/plans/README.md`.
- `.cursorrules`, `CONTRIBUTING.md`, `docs/`: absent in this repo snapshot.
- Deferred and future work remains bound by repo policy: Node 24 LTS, strict TypeScript, no new dependencies without explicit request, lint/typecheck/build/e2e gates before commit, semantic gitmoji commit messages, GPG-signed commits, and push after each implementation iteration.

Archived completed plan:
- `plan/cycle5-review-recovery-plan-2026-04-25.md` moved to `plan/archive/cycle5-review-recovery-plan-2026-04-25.md`.

## Implementation Tasks

### TASK-1 — Keep export state truthful after track/editor changes
- **Findings:** F6-01
- **Severity/confidence:** High / High
- **Files:** `src/app/page.tsx`, `src/lib/useExportController.ts`, `src/components/ExportPanel.tsx`, `e2e/travelback.spec.ts`
- **Plan:** Reset export output/session state when the active track range changes and when scene/transition inputs change. Add an E2E regression that completes a stub export, trims the timeline, reopens export, and confirms the stale completed-export UI is gone.
- **Progress:** complete — `src/app/page.tsx` resets export session state after timeline range changes and scene/transition edits; `e2e/travelback.spec.ts` covers completed-export invalidation after trimming.

### TASK-2 — Align export duration display with export duration limits
- **Findings:** F6-02
- **Severity/confidence:** High / High
- **Files:** `src/components/ExportPanel.tsx`, `e2e/travelback.spec.ts`
- **Plan:** Clamp the duration copied from playback into the export panel before storing/displaying it, so a 300-second playback setting cannot show as an exportable 300-second value while the request silently uses 180 seconds. Add an E2E regression.
- **Progress:** complete — `src/components/ExportPanel.tsx` clamps the copied playback duration before displaying it; E2E coverage verifies a 300-second playback setting opens export at 180 seconds.

### TASK-3 — Restore live camera after scene preview ends
- **Findings:** F6-03
- **Severity/confidence:** Medium / High
- **Files:** `src/app/page.tsx`, `src/components/SceneEditor.tsx`, `e2e/travelback.spec.ts`
- **Plan:** Treat `onPreviewScene(null)` as a restore signal by recomputing the current camera from `track`, `progress`, `duration`, `scenes`, `transitionDuration`, and cumulative distances, then applying it to `MapView`. Add coverage around a scene parameter preview-clear path.
- **Progress:** complete — `src/app/page.tsx` handles `onPreviewScene(null)` by recomputing the live camera for the current playback state; `SceneEditor` clears preview on pointer, keyboard, and blur completion; E2E coverage verifies restore outside the edited scene.

### TASK-4 — Reduce XML import main-thread availability risk
- **Findings:** F6-04
- **Severity/confidence:** Medium / High
- **Files:** `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `scripts/smoke-static.mjs`, `e2e/travelback.spec.ts`
- **Plan:** Lower the GPX/KML XML file cap to a more conservative browser-main-thread budget and keep smoke/static guards aligned. Add a focused E2E regression for XML size rejection using a synthetic file.
- **Progress:** complete — XML imports are capped at 4MB, static smoke enforces the cap, and E2E coverage verifies oversize GPX rejection before parsing.

### TASK-5 — Enforce Google point budgets during extraction
- **Findings:** F6-05
- **Severity/confidence:** Medium / Medium-High
- **Files:** `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `scripts/smoke-static.mjs`
- **Plan:** Add a shared point-budget guard to the main parser and mirrored worker parser so extraction stops with `TOO_MANY_POINTS` as soon as a branch exceeds the point budget, rather than waiting until final `Track` validation. Extend smoke parity checks for the mirrored limit constant.
- **Progress:** complete — main-thread and worker Google parsers now share point-budget checks during extraction/final flattening, and static smoke checks the mirrored constant.

### TASK-6 — Repair high-confidence accessibility semantics
- **Findings:** F6-12, F6-13, F6-14, F6-15
- **Severity/confidence:** High / High; Medium / High; Medium / High; Medium / High
- **Files:** `src/components/JourneyCreator.tsx`, `src/components/ElevationProfile.tsx`, `src/components/TrackToolbar.tsx`, `src/components/SceneEditor.tsx`, `e2e/travelback.spec.ts`
- **Plan:** Render Journey Creator listbox options as non-tabbable option elements controlled by the input; expose ElevationProfile as a slider-style control with value metadata; align the mobile toolbar flyout semantics with its actual popup behavior; add live-region/status announcements for Scene Editor warnings and delete/undo feedback. Add E2E/accessibility assertions for the changed semantics.
- **Progress:** complete — Journey search options now use listbox option semantics, ElevationProfile exposes slider metadata, the mobile toolbar no longer advertises a dialog popup, and SceneEditor exposes delete/warning feedback through a live status region; E2E coverage checks each high-confidence semantic fix.

### TASK-7 — Clarify Journey Creator coordinate-link copy
- **Findings:** F6-11
- **Severity/confidence:** Medium / High
- **Files:** `src/lib/i18n.ts`, `.context/project/02-architecture.md`, `e2e/travelback.spec.ts`
- **Plan:** Narrow all locale copy from generic "map link" support to "coordinates or coordinate links" so it matches the local-only coordinate parser. Update the architecture note to match. Keep tests focused on supported coordinate-link behavior.
- **Progress:** complete — locale copy and the architecture note now describe coordinate-bearing links instead of generic map links.

### TASK-8 — Make dev E2E and static CI gates less brittle
- **Findings:** F6-09, F6-10
- **Severity/confidence:** Medium / High; Low / High
- **Files:** `scripts/run-dev-e2e.mjs`, `.github/workflows/deploy-pages.yml`, `package.json`, `playwright.config.ts`
- **Plan:** Ensure `npm run test:e2e` can run when an existing `next dev` server is active in the workspace, by terminating the wrapper-owned dev server before Playwright launches its own server or otherwise avoiding concurrent `next dev`. Remove duplicate static smoke invocation from CI while preserving the composed local static gate.
- **Progress:** complete — `scripts/run-dev-e2e.mjs` reuses an active Next dev lock when present, `playwright.config.ts` supports that reuse, and Pages CI no longer runs duplicate static smoke before the composed static gate.

### TASK-9 — Regression tests for this cycle's behavior fixes
- **Findings:** F6-01, F6-02, F6-03, F6-04, F6-06, F6-12, F6-13, F6-14, F6-15
- **Severity/confidence:** Mixed, preserving source severities
- **Files:** `e2e/travelback.spec.ts`
- **Plan:** Add focused Playwright regressions for stale export invalidation, export duration clamping, scene preview clear, XML oversize messaging, timeline semantic stability as practical, Journey Creator listbox semantics, ElevationProfile slider semantics, mobile toolbar popup semantics, and Scene Editor live-region feedback.
- **Progress:** complete — added regressions for stale export invalidation, export duration clamping, scene preview restore, XML oversize rejection, Journey listbox semantics, ElevationProfile slider semantics, mobile toolbar popup semantics, and SceneEditor live-region feedback.

## Gate Warning Follow-up

- `npm run test:e2e` and `npm run test:e2e:static` both report Playwright's informational "Slow test file" notice for `e2e/travelback.spec.ts`. No test failed or retried in the final runs. Deferred because splitting the suite is a CI-duration refactor outside the cycle-6 review findings; reopen if CI wall time becomes a release blocker or if Playwright worker parallelization is introduced.

## Verification

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npm run test:e2e` — passed, 69/69.
- `npm run test:e2e:static` — passed, static smoke plus 69/69.

## Deferred Findings

All deferred cycle-6 findings are recorded in `plan/deferred-cycle6-review-2026-04-25.md`.
