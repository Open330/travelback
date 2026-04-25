# Deferred Cycle 5 Recovery Findings — 2026-04-25

This file records only review findings from `.context/reviews/_aggregate.md` that are not scheduled in `plan/cycle5-review-recovery-plan-2026-04-25.md`. Severity and confidence are preserved from the source aggregate.

Repo-policy checks before deferral:
- `CLAUDE.md`: absent, and `.context/development/01-conventions.md` says never use it for this project.
- `AGENTS.md`: orchestrator-provided workspace rules apply.
- `.context/**`: read project context, architecture, conventions, and plan index.
- `.cursorrules`, `CONTRIBUTING.md`, `docs/`: absent.
- Deferred work remains bound by repo policy: Node 24 LTS, strict TypeScript, no new dependencies without explicit request, lint/typecheck/build/e2e gates, GPG-signed semantic gitmoji commits, and push after each implementation iteration.

## Deferred Items

### D5-01 — Playback and export hot paths rebuild too much per frame
- **Aggregate finding:** F5-01
- **Source citation:** `src/lib/usePlaybackController.ts:95-135`, `src/app/page.tsx:106-123`, `src/components/MapView.tsx:839-861`, `src/components/TrackWorkspace.tsx:52-170`, `src/lib/videoEncoder.ts:93-130`
- **Original severity/confidence:** High / High
- **Reason for deferral:** This is a broad performance/architecture refactor. Cycle 5 schedules the concrete export marker, XML import, and session-state correctness defects first; rerouting high-frequency playback state and replacing trail rendering strategy needs a dedicated design/test pass.
- **Reopen exit criterion:** Reopen when playback jank is reported on large tracks, when `MapView` playback rendering is next touched, or before implementing a new trail/progress rendering strategy.

### D5-02 — Timeline drag performs full O(n) track commits during pointer movement
- **Aggregate finding:** F5-02
- **Source citation:** `src/components/TimelineSelector.tsx:182-226`, `src/app/page.tsx:231-257`, `src/components/MapView.tsx:770-830`
- **Original severity/confidence:** High / High
- **Reason for deferral:** This is a performance refactor requiring a new trim-view state model. It is not a confirmed correctness, security, or data-loss defect, and it shares design work with D5-01.
- **Reopen exit criterion:** Reopen before changing timeline drag semantics, adding large-track timeline features, or when large-track trim interaction jank is reported.

### D5-03 — Worker/main-thread Google parser logic is duplicated
- **Aggregate finding:** F5-04
- **Source citation:** `src/lib/parser.ts:465-620`, `public/workers/trackParser.worker.js:1-322`
- **Original severity/confidence:** High / High
- **Reason for deferral:** This is a maintainability and build-architecture task, not a confirmed current parse defect. Cycle 5 schedules worker-constant drift and XML availability hardening; unifying the parser source requires a larger worker bundling plan.
- **Reopen exit criterion:** Reopen before changing Google parsing rules, worker fallback behavior, or error codes.

### D5-04 — Shipped map styles lack real geographic context
- **Aggregate finding:** F5-05
- **Source citation:** `public/map-styles/voyager.json:4-28`, `scripts/fetch-map-styles.mjs:14-37`, `src/components/MapView.tsx:225-379`
- **Original severity/confidence:** High / High
- **Reason for deferral:** This is product/design scope rather than a security, correctness, or data-loss defect. Fixing it requires either real local basemap data, an opt-in remote style mode, or revised product positioning.
- **Reopen exit criterion:** Reopen before marketing/release copy changes, before adding map-style assets, or when deciding whether Travelback should remain fully local/offline.

### D5-05 — No lower-layer test harness protects deterministic logic
- **Aggregate finding:** F5-11
- **Source citation:** `package.json:5-15`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/parser.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`
- **Original severity/confidence:** High / High
- **Reason for deferral:** This is a coverage architecture gap. Adding a full unit/component harness may require tooling choices and possibly dependencies, while repo policy says no new dependencies without explicit request. Cycle 5 instead schedules bounded tests around fixed runtime defects.
- **Reopen exit criterion:** Reopen before broad parser/camera/playback/export refactors or when explicit approval exists for a unit/component test harness.

### D5-06 — Parser worker/fallback/error branches are under-tested
- **Aggregate finding:** F5-12
- **Source citation:** `src/lib/parser.ts:446-675`, `src/components/FileUpload.tsx:52-93`, `e2e/travelback.spec.ts:1215-1277`
- **Original severity/confidence:** High / High
- **Reason for deferral:** This is a coverage matrix across many file/error branches. Cycle 5 schedules concrete XML limit and `READ_FAILED` fixes; full mocked worker/FileReader branch coverage belongs with the lower-layer harness in D5-05.
- **Reopen exit criterion:** Reopen before touching parser worker fallback, parse error codes, or upload error UI.

### D5-07 — JSON worker enforces point cap after high-memory parsing
- **Aggregate finding:** F5-13
- **Source citation:** `public/workers/trackParser.worker.js:207-241`, `public/workers/trackParser.worker.js:307-312`, `src/lib/parser.ts:465-519`
- **Original severity/confidence:** High / Medium-High
- **Reason for deferral:** This is a performance/availability optimization for already worker-isolated JSON input, not a main-thread security defect. Streaming or early-budget extraction touches every Google parser branch and should follow the shared-parser design.
- **Reopen exit criterion:** Reopen when large Google exports approach memory limits, before changing Google extraction loops, or after shared parser generation is planned.

### D5-08 — Timer/global-state UI behaviors lack direct tests
- **Aggregate finding:** F5-20
- **Source citation:** `src/components/ModalDialog.tsx:31-189`, `src/components/Toast.tsx:19-91`, `src/components/SceneEditor.tsx:244-333`, `src/components/TimelineSelector.tsx:76-148`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Coverage gap only; no current timer/global-state runtime defect was confirmed in cycle 5.
- **Reopen exit criterion:** Reopen before changing modal stack handling, toast timers, scene undo, or timeline hint persistence.

### D5-09 — Static worker-backed JSON import parity is only indirectly covered
- **Aggregate finding:** F5-21
- **Source citation:** `src/lib/parser.ts:536-620`, `playwright.static.config.ts:12-43`, `scripts/smoke-static.mjs:191-203`
- **Original severity/confidence:** Medium / Medium
- **Reason for deferral:** Coverage gap only; current static smoke validates the worker asset exists, and no static worker path defect was confirmed.
- **Reopen exit criterion:** Reopen before changing `basePath`, worker URL construction, static export serving, or Google JSON worker loading.

### D5-10 — Script branch behavior is under-tested
- **Aggregate finding:** F5-22
- **Source citation:** `scripts/serve-static.mjs:69-170`, `scripts/run-dev-e2e.mjs:5-58`, `scripts/run-static-e2e.mjs:5-58`, `scripts/smoke-static.mjs:70-203`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** Coverage gap only; the active gates exercise the normal script paths.
- **Reopen exit criterion:** Reopen when changing static server path resolution, headers, method handling, or port fallback.

### D5-11 — `HomeInner` remains a broad session orchestration hub
- **Aggregate finding:** F5-24
- **Source citation:** `src/app/page.tsx:59-158`, `src/app/page.tsx:201-375`, `src/app/page.tsx:444-481`, `src/components/TrackWorkspace.tsx:13-50`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Maintainability refactor only. Cycle 5 schedules the concrete session reset defect without broad state architecture churn.
- **Reopen exit criterion:** Reopen before adding new workspace concerns or when `page.tsx` changes require more prop-drilling.

### D5-12 — i18n payload and runtime logic are coupled in one large client module
- **Aggregate finding:** F5-25
- **Source citation:** `src/lib/i18n.ts:11-1829`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Maintainability/performance refactor only; no confirmed locale runtime defect in this cycle.
- **Reopen exit criterion:** Reopen when adding locales, significantly expanding strings, or changing locale loading strategy.

## Gate Warnings Deferred

### G5-01 — Playwright reports the single e2e file as slow
- **Gate citation:** `npm run test:e2e`, `npm run test:e2e:static`
- **Source citation:** `e2e/travelback.spec.ts`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** The warning is about suite organization, not a failing behavior. Splitting the file or enabling parallelism is a broad test-architecture change and risks shared server/context assumptions; this cycle focused on correctness fixes and making the required gates green.
- **Reopen exit criterion:** Reopen when adding substantial e2e coverage, when CI wall time becomes a release blocker, or before changing Playwright worker/parallelism configuration.
