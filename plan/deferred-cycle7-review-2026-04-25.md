# Deferred Cycle 7 Review Findings — 2026-04-25

This file records only findings from `.context/reviews/_aggregate.md` that are not scheduled in `plan/cycle7-review-plan-2026-04-25.md`. Severity and confidence are preserved from the source aggregate.

Repo-policy checks before deferral:
- `CLAUDE.md`: absent; `.context/development/01-conventions.md` says not to use `CLAUDE.md` for this project.
- `AGENTS.md`: orchestrator-provided workspace rules apply.
- `.context/**`: read project context, architecture, conventions, and plan index.
- `.cursorrules`, `CONTRIBUTING.md`, `docs/`: absent.
- Deferred work remains bound by repo policy: Node 24 LTS, strict TypeScript, no new dependencies without explicit request, lint/typecheck/build/e2e gates before commit, GPG-signed semantic gitmoji commits, and push after each implementation iteration.

## Deferred Items

### D7-01 — Real WebCodecs/mediabunny export path is not covered by automated E2E

- Aggregate finding: AGG-012
- Original severity/confidence: Medium / High
- Citation: `src/lib/useExportController.ts:157-186`, `src/lib/videoEncoder.ts:40`, `e2e/travelback.spec.ts:1274`, `e2e/travelback.spec.ts:1296`
- Reason for deferral: coverage architecture gap; not a confirmed runtime defect. A real encoder shard can be slow/flaky and needs CI budget/test-shape design. Current cycle fixes user-facing export readiness copy and keeps existing stub coverage.
- Exit criterion: reopen before export pipeline refactors, before changing `mediabunny`/WebCodecs integration, or when CI budget allows a bounded real-encoder smoke.

### D7-02 — Parser worker/fallback/error branches lack deterministic tests

- Aggregate finding: AGG-013
- Original severity/confidence: Medium / High
- Citation: `src/lib/parser.ts:537-690`, `public/workers/trackParser.worker.js:255-334`, `e2e/travelback.spec.ts:1343-1389`
- Reason for deferral: coverage matrix gap across Worker and FileReader failure branches. This cycle schedules parser correctness/availability fixes and focused browser regressions, but no new lower-layer test framework is authorized.
- Exit criterion: reopen before touching parser worker fallback, parse error codes, or upload error UI again.

### D7-03 — Export cancellation/failure/cleanup state transitions lack coverage

- Aggregate finding: AGG-014
- Original severity/confidence: Medium / High
- Citation: `src/lib/useExportController.ts:105-244`, `src/lib/videoEncoder.ts:40-212`, `e2e/travelback.spec.ts:1274-1323`
- Reason for deferral: coverage gap without a fresh confirmed runtime failure. A robust fix needs hook/component testing or controllable export mocks, which likely requires broader harness work.
- Exit criterion: reopen before changing abort/download/object URL/reset-size behavior.

### D7-04 — Camera math coverage is timing-sensitive and incomplete

- Aggregate finding: AGG-015
- Original severity/confidence: Medium / High
- Citation: `src/lib/camera.ts:101-119`, `src/lib/camera.ts:125-193`, `src/lib/camera.ts:339-427`, `e2e/travelback.spec.ts:44-133`, `e2e/travelback.spec.ts:920-972`
- Reason for deferral: test-layer gap only. Adding deterministic camera unit tests requires a lower-layer harness decision; no current camera runtime defect was confirmed.
- Exit criterion: reopen before changing camera interpolation, scene blending, or antimeridian camera logic.

### D7-05 — Playback hotkey behavior is under-tested

- Aggregate finding: AGG-016
- Original severity/confidence: Medium / High
- Citation: `src/lib/usePlaybackController.ts:176-248`, `e2e/travelback.spec.ts:748-786`
- Reason for deferral: coverage gap only; no active hotkey bug was confirmed in this review.
- Exit criterion: reopen before changing global hotkeys, dialog/input hotkey suppression, or export keyboard handling.

### D7-06 — Dialog focus-trap tests are too weak

- Aggregate finding: AGG-017
- Original severity/confidence: Medium / High
- Citation: `src/components/ModalDialog.tsx:31-160`, `e2e/travelback.spec.ts:249-262`, `e2e/travelback.spec.ts:1210-1224`
- Reason for deferral: coverage gap only; designer review did not confirm a focus-trap runtime defect this cycle.
- Exit criterion: reopen before changing `ModalDialog` focus/inert behavior.

### D7-07 — Static serving/header hardening tests are narrower than implementation surface

- Aggregate finding: AGG-018
- Original severity/confidence: Medium / Medium-High
- Citation: `scripts/serve-static.mjs:69-170`, `scripts/smoke-static.mjs:70-83`, `scripts/smoke-static.mjs:223-236`
- Reason for deferral: broad static-server branch coverage. This cycle schedules the confirmed runtime asset cache issue and a smoke assertion for that specific behavior.
- Exit criterion: reopen before changing `serve-static.mjs` routing/security-header behavior.

### D7-08 — Several Playwright tests are visibility-only and do not lock behavior

- Aggregate finding: AGG-019
- Original severity/confidence: Medium / High
- Citation: `e2e/travelback.spec.ts:499-512`, `e2e/travelback.spec.ts:1335-1389`, `e2e/travelback.spec.ts:1412-1467`
- Reason for deferral: broad test-quality cleanup; not a direct runtime defect. Current cycle adds targeted regressions for scheduled fixes where practical.
- Exit criterion: reopen when editing affected test areas or when a visibility-only test masks a regression.

### D7-09 — Playwright suite is tightly coupled to English copy

- Aggregate finding: AGG-020
- Original severity/confidence: Medium / High
- Citation: `e2e/travelback.spec.ts:223-240`, `e2e/travelback.spec.ts:384`, `e2e/travelback.spec.ts:795`, `e2e/travelback.spec.ts:1212`, `e2e/travelback.spec.ts:1235`, `e2e/travelback.spec.ts:1440`
- Reason for deferral: maintainability/test-noise issue, not security/correctness/data loss. Refactoring selectors across the whole suite should be a dedicated test-maintenance pass.
- Exit criterion: reopen before broad copy/localization changes or when touching affected tests.

### D7-10 — Product/docs over-promise bundled map styles as real map context

- Aggregate finding: AGG-021
- Original severity/confidence: Medium / High
- Citation: `.context/project/01-overview.md:11`, `.context/project/01-overview.md:14`, `.context/project/01-overview.md:80`, `.context/project/01-overview.md:91`, `public/map-styles/*.json`, `scripts/fetch-map-styles.mjs:18`
- Reason for deferral: product-positioning decision. Fix requires choosing between real local basemap assets and renaming/reframing map styles as abstract backdrop themes.
- Exit criterion: reopen before release/marketing copy changes, before adding map-style assets, or when deciding the privacy/offline map positioning.

### D7-11 — Preference state ownership is split across bootstrap, page, and toggle

- Aggregate finding: AGG-022
- Original severity/confidence: Medium / High
- Citation: `src/app/layout.tsx:53-56`, `src/app/page.tsx:32-99`, `src/app/page.tsx:209-238`, `src/app/page.tsx:414-453`, `src/components/ThemeToggle.tsx:7-64`, `src/lib/i18n.ts:1786-1813`
- Reason for deferral: architecture maintainability risk. Current cycle schedules the confirmed first-paint toggle symptom only, not the full preferences provider refactor.
- Exit criterion: reopen before adding theme modes, map styles, locale persistence rules, or changing first-paint bootstrap behavior.

### D7-12 — Google parser logic is duplicated between main parser and worker

- Aggregate finding: AGG-023
- Original severity/confidence: Medium / High
- Citation: `src/lib/parser.ts:273-530`, `public/workers/trackParser.worker.js:64-253`, `scripts/smoke-static.mjs:172-201`
- Reason for deferral: maintainability/build-architecture task. Current cycle mirrors concrete parser fixes in both implementations; shared worker generation needs a separate design.
- Exit criterion: reopen before further Google parser changes or before changing worker packaging.

### D7-13 — App shell and map/export boundary remain oversized and imperative

- Aggregate finding: AGG-024
- Original severity/confidence: Medium / High
- Citation: `src/app/page.tsx:61-182`, `src/app/page.tsx:256-313`, `src/components/TrackWorkspace.tsx:13-49`, `src/components/MapView.tsx:26-34`, `src/lib/useExportController.ts:105-186`
- Reason for deferral: broad architecture refactor, not a confirmed current runtime defect.
- Exit criterion: reopen before major session/trim/export/map rendering changes.

### D7-14 — Export defaults to landscape despite strong social-video intent

- Aggregate finding: AGG-027
- Original severity/confidence: Low / Medium
- Citation: `src/types.ts:99-106`, `src/components/ExportPanel.tsx:82-85`, `src/components/ExportPanel.tsx:314-321`
- Reason for deferral: product preference decision; changing defaults can surprise existing users and should be paired with saved-user-preference design.
- Exit criterion: reopen before export UX redesign or after deciding first-run social-video defaults.

### D7-15 — Korean export UI leaks technical jargon

- Aggregate finding: AGG-028
- Original severity/confidence: Low / Medium
- Citation: `src/lib/i18n.ts:451-483`, `src/lib/i18n.ts:568-570`
- Reason for deferral: localization polish, not a correctness/security/data-loss finding. Current cycle prioritizes the critical Google import guide and export readiness guidance.
- Exit criterion: reopen during Korean export copy review or before adding more export options.

### D7-16 — Localization dictionaries live in one large client module

- Aggregate finding: AGG-029
- Original severity/confidence: Low / Medium-High
- Citation: `src/lib/i18n.ts:11-1752`, `src/lib/i18n.ts:1803-1829`
- Reason for deferral: bundle/maintainability architecture task; no current runtime defect was confirmed.
- Exit criterion: reopen before adding locales or doing broad i18n copy restructuring.

### D7-17 — GitHub Pages deployment cannot enforce the same header controls as local static serving

- Aggregate finding: AGG-030
- Original severity/confidence: Low / High
- Citation: `.github/workflows/deploy-pages.yml:33`, `scripts/serve-static.mjs:147`, `.context/project/01-overview.md:30`, `.context/project/02-architecture.md:114`, `src/app/layout.tsx:63`
- Reason for deferral: hosting constraint already documented in repo architecture; resolving requires a header-capable host/CDN decision outside this cycle. This is not deferred as a security fix because the repo explicitly states GitHub Pages cannot attach those headers and relies on JS frame-busting unless fronted by a CDN.
- Exit criterion: reopen when changing deployment host, fronting with a CDN, or adding host-level header support.
