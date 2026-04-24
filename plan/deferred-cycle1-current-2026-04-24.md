# Deferred findings — current review-plan-fix cycle 1/100 — 2026-04-24

Deferred items follow the user-provided `AGENTS.md`, `.context/development/01-conventions.md`, and the review-plan-fix deferred-fix rules. No security, correctness, or data-loss finding is deferred unless already covered by a scheduled bounded fix in `plan/cycle1-current-plan-2026-04-24.md`; deferred items below are performance, maintainability, hosting, broad test strategy, or product UX redesign work.

Deferred work remains bound by repo policy when picked up: TypeScript strict mode, no semicolons, single quotes, two-space indentation, no new dependencies without explicit request, whole-repo gates, GPG-signed commits, and semantic gitmoji commit messages.

## Deferred items

### DEF-001 — Stream/chunk large GPX/KML parsing
- **Finding:** AGG-019
- **Citation:** `src/lib/parser.ts:116-176`, `src/lib/parser.ts:576-627`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Large-file XML streaming/worker parsing is a performance architecture change. This cycle schedules bounded KML correctness and JSON worker fallback fixes without changing the GPX/KML parser strategy.
- **Exit criterion:** Re-open before raising import limits or publishing large-file support claims; completion means GPX/KML imports cannot monopolize the main thread before point limits are enforced.

### DEF-002 — Enforce Google JSON point limits during parse
- **Finding:** AGG-020
- **Citation:** `public/workers/trackParser.worker.js:307-314`
- **Original severity/confidence:** Medium-High / High
- **Reason for deferral:** Early abort requires restructuring every worker parse branch. This cycle only blocks unsafe large main-thread fallback.
- **Exit criterion:** Re-open when adding parser/worker parity tests; completion means oversized Google exports abort before full materialization/sort/dedupe.

### DEF-003 — Replace per-frame trail GeoJSON rebuilds
- **Finding:** AGG-021
- **Citation:** `src/components/MapView.tsx:106-167`, `src/components/MapView.tsx:824-847`
- **Original severity/confidence:** High / High
- **Reason for deferral:** This is a map-rendering performance redesign, not a bounded correctness fix. Current behavior remains functionally correct for supported test fixtures.
- **Exit criterion:** Re-open for large-track playback/export optimization; completion means frame cost is bounded independently of traveled point count.

### DEF-004 — Move playback/export progress off app-wide React state
- **Finding:** AGG-022
- **Citation:** `src/lib/usePlaybackController.ts:48-51`, `src/app/page.tsx:368-484`, `src/lib/useExportController.ts:147-153`
- **Original severity/confidence:** Medium-High / High
- **Reason for deferral:** Requires an imperative render lane and broader component API work. This cycle focuses on export correctness and cancellation.
- **Exit criterion:** Re-open when export/playback performance work starts; completion means high-frequency map frames no longer require app-wide React state updates.

### DEF-005 — Cache overview camera bounds
- **Finding:** AGG-023
- **Citation:** `src/lib/camera.ts:53-75`, `src/lib/camera.ts:141-150`, `src/lib/camera.ts:329-423`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Pure performance optimization needing camera unit coverage to avoid changing scene behavior accidentally.
- **Exit criterion:** Re-open with camera tests or large-track benchmarks; completion means overview bounds/zoom are computed once per track/scene set.

### DEF-006 — Avoid interactive `preserveDrawingBuffer` overhead
- **Finding:** AGG-024
- **Citation:** `src/components/MapView.tsx:547-558`
- **Original severity/confidence:** Medium / Medium
- **Reason for deferral:** Dedicated export-map/canvas architecture is broader than this cycle. The current setting is required for the existing export path.
- **Exit criterion:** Re-open when designing a separate export renderer; completion means interactive preview does not pay export-only WebGL readback overhead.

### DEF-007 — Downsample `ElevationProfile` rendering
- **Finding:** AGG-025
- **Citation:** `src/components/ElevationProfile.tsx:20-118`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Display-only performance optimization. This cycle schedules keyboard isolation for this component but not the rendering algorithm.
- **Exit criterion:** Re-open with large-track UI benchmarks; completion means SVG path point count is capped to display resolution.

### DEF-008 — Separate timeline live-drag preview from committed track replacement
- **Finding:** AGG-026
- **Citation:** `src/components/TimelineSelector.tsx:182-226`, `src/app/page.tsx:216-237`, `src/components/MapView.tsx:756-816`
- **Original severity/confidence:** Medium-High / High
- **Reason for deferral:** Requires interaction-design and map-state architecture work; no data-loss/correctness issue from this aggregate is deferred here.
- **Exit criterion:** Re-open if timeline drag stutters on large fixtures; completion means live drag does not rebuild full track/map state at pointer-frame cadence.

### DEF-009 — Stream static preview server responses and optimize HEAD
- **Finding:** AGG-027
- **Citation:** `scripts/serve-static.mjs:121-165`
- **Original severity/confidence:** Low-Medium / High
- **Reason for deferral:** Local tooling performance issue with no production runtime impact.
- **Exit criterion:** Re-open if static artifacts grow or HEAD checks become frequent; completion means GET streams from disk and HEAD avoids body reads.

### DEF-010 — Generate/bundle worker parser from shared source
- **Finding:** AGG-028
- **Citation:** `src/lib/parser.ts:182-574`, `public/workers/trackParser.worker.js:1-322`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Build-pipeline refactor could destabilize static export and violates the no-new-dependency/default-minimal-change posture without a separate design pass. This cycle only fixes a bounded worker fallback defect.
- **Exit criterion:** Re-open when adding parser parity tests or a worker build step; completion means main and worker parser logic share one source of truth.

### DEF-011 — Centralize base path and site URL deployment config
- **Finding:** AGG-029
- **Citation:** `next.config.ts:3-10`, `package.json:8`, `playwright.static.config.ts:14`, `scripts/smoke-static.mjs:20`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Deployment configuration is outside this cycle's `DEPLOY_MODE: none` scope and requires deciding supported hosting targets.
- **Exit criterion:** Re-open before supporting any non-`/travelback` deployment; completion means base path/public URL derive from one documented configuration surface.

### DEF-012 — Add browser-enforced anti-framing headers for GitHub Pages
- **Finding:** AGG-030
- **Citation:** `src/app/layout.tsx:49-63`, `.github/workflows/deploy-pages.yml:34-46`, `scripts/serve-static.mjs:147-157`
- **Original severity/confidence:** Low-Medium / High
- **Reason for deferral:** GitHub Pages cannot attach those headers directly; existing docs and smoke checks already record the host limitation. Changing hosting/CDN is a deployment decision.
- **Exit criterion:** Re-open when adding a header-capable CDN/host; completion means production responses include `frame-ancestors 'none'` and/or `X-Frame-Options: DENY`.

### DEF-013 — Remove `style-src 'unsafe-inline'`
- **Finding:** AGG-031
- **Citation:** `src/app/layout.tsx:59-63`, `scripts/harden-static-export.mjs:14-29`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** CSP tightening requires reducing inline style usage across the app and Tailwind/Next output verification; current CSP already blocks higher-risk script/object/base vectors.
- **Exit criterion:** Re-open during CSP hardening; completion means static smoke verifies `style-src` no longer requires `unsafe-inline`.

### DEF-014 — Add deterministic parser/worker parity tests
- **Finding:** AGG-032
- **Citation:** `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `src/components/FileUpload.tsx:61-86`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Broad test-harness work likely needs unit/component tooling decisions. Repo policy says no new dependencies without explicit request.
- **Exit criterion:** Re-open when adding a unit-test or worker-test harness; completion means parser and worker behavior are locked with deterministic fixtures.

### DEF-015 — Add full export state-machine tests through Start Export
- **Finding:** AGG-033
- **Citation:** `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `e2e/travelback.spec.ts:1111-1173`, `e2e/travelback.spec.ts:1237-1292`
- **Original severity/confidence:** High / High
- **Reason for deferral:** This cycle schedules UX/download correctness fixes and runs whole-repo gates; complete export state-machine coverage needs a reliable browser/WebCodecs fixture strategy.
- **Exit criterion:** Re-open before release-candidate export claims; completion means Start Export, fallback-download readiness, cancellation, and result preservation are regression-tested.

### DEF-016 — Replace fixed sleeps/global retry in Playwright
- **Finding:** AGG-035
- **Citation:** `playwright.config.ts:7-11`, `playwright.static.config.ts:7-11`, `e2e/travelback.spec.ts`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Test-harness reliability work is broader than the current defect pass and may interact with all E2E assertions.
- **Exit criterion:** Re-open after this cycle's gates; completion means assertions wait on deterministic app readiness and retries are no longer needed as a default crutch.

### DEF-017 — Add true touch/mobile coverage
- **Finding:** AGG-036
- **Citation:** `playwright.config.ts:21-38`, `src/components/JourneyCreator.tsx:318-347`, `src/components/TimelineSelector.tsx`, `src/components/ExportPanel.tsx:84-94`
- **Original severity/confidence:** Medium / Medium-High
- **Reason for deferral:** Requires new touch-path test design across several controls. This cycle schedules Journey Creator interaction/focus fixes but not full device-input expansion.
- **Exit criterion:** Re-open when hardening mobile release gates; completion means touch drag/swipe paths are covered separately from viewport-only desktop events.

### DEF-018 — Decouple E2E selectors from English copy
- **Finding:** AGG-037
- **Citation:** `e2e/travelback.spec.ts:137-193`, `e2e/travelback.spec.ts:254-257`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** Low-risk test maintainability refactor; no app behavior is blocked by it.
- **Exit criterion:** Re-open during test cleanup; completion means critical selectors use roles/test IDs that survive localization copy changes.

### DEF-019 — Redesign camera customization for casual users
- **Finding:** AGG-045
- **Citation:** `src/components/SceneEditor.tsx`, `src/lib/i18n.ts`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Product UX redesign, not a correctness/security/data-loss defect. This cycle fixes concrete scene-editor accessibility and data-loss issues.
- **Exit criterion:** Re-open during UX redesign; completion means numeric camera controls are hidden behind simpler presets or guided choices.

### DEF-020 — Make Journey creation less coordinate-first
- **Finding:** AGG-046
- **Citation:** `src/components/JourneyCreator.tsx:576-617`, `src/lib/i18n.ts:246`
- **Original severity/confidence:** Medium / Medium
- **Reason for deferral:** Product UX redesign requiring copy, layout, and likely onboarding changes. This cycle keeps the local-only coordinate tool but fixes focus/name/interaction bugs.
- **Exit criterion:** Re-open during Journey Creator UX work; completion means casual users can start by clicking/searching route intent without coordinate-first framing.

### DEF-021 — Migrate older persisted map-style explicitness safely
- **Finding:** AGG-050
- **Citation:** `src/app/page.tsx:44-56`, `src/app/page.tsx:327-339`
- **Original severity/confidence:** Low / Medium
- **Reason for deferral:** Low-risk persisted-state migration needs a compatibility decision for existing localStorage values. Current behavior is recoverable by cycling the map style.
- **Exit criterion:** Re-open when touching theme/map-style persistence; completion means legacy saved styles cannot be mistaken for explicit choices after theme changes.

### DEF-022 — Prove actual video-export last mile with a reliable full export fixture
- **Finding:** AGG-053 remainder
- **Citation:** `e2e/travelback.spec.ts:1237`, `e2e/travelback.spec.ts:1274`
- **Original severity/confidence:** Critical UX concern / Medium
- **Reason for deferral:** Bounded export UX fixes are scheduled under TASK-1/TASK-2. Full last-mile proof overlaps with AGG-033 and needs reliable WebCodecs/export test strategy.
- **Exit criterion:** Re-open before release-candidate export claims; completion means an automated or documented manual gate verifies a real MP4 export and user-accessible save path.

### DEF-023 — Track isolated full-suite retry artifact
- **Finding:** AGG-054
- **Citation:** `test-results/.last-run.json`, static theme retry evidence
- **Original severity/confidence:** Low / Medium
- **Reason for deferral:** The isolated rerun passed and AGG-035 captures the broader flake-hardening work. No failing app behavior is confirmed.
- **Exit criterion:** Re-open on any repeat failure signature; completion means the suite no longer depends on global retry for this path.

## Gate warning notes

### GATE-WARN-001 — React dev-mode CSP eval warning under the development server
- **Finding:** Quality-gate warning from `npm run test:e2e`
- **Citation:** `src/app/layout.tsx:53-63`, `scripts/harden-static-export.mjs:14-29`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** The warning is emitted by React/Next development mode while reconstructing debugging call stacks under the app's conservative CSP. The emitted message states React does not use eval in production mode, and `npm run test:e2e:static` verifies the production static export under the hardened hash-based CSP without this warning.
- **Exit criterion:** Re-open if CI treats console warnings as failures, if the production/static gate starts emitting this warning, or if the dev-server CSP strategy is changed.

### GATE-WARN-002 — Node color environment warning from Playwright/web-server subprocesses
- **Finding:** Quality-gate warning from `npm run test:e2e` and `npm run test:e2e:static`
- **Citation:** `playwright.config.ts:7-11`, `playwright.static.config.ts:7-11`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** This is a runner environment warning: Node reports that `NO_COLOR` is ignored because `FORCE_COLOR` is set. It does not affect app behavior or test assertions. Normalizing inherited terminal color variables is test-harness cleanup covered by the broader deferred test-maintenance lane.
- **Exit criterion:** Re-open if CI treats warnings as failures or if Playwright/web-server output policy is tightened.

### GATE-WARN-003 — Serial E2E spec file reported as slow
- **Finding:** Quality-gate warning from `npm run test:e2e` and `npm run test:e2e:static`
- **Citation:** `e2e/travelback.spec.ts`, `playwright.config.ts:7-38`, `playwright.static.config.ts:7-38`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** The suites passed fully, but Playwright reports the single serial spec file as slow and suggests parallelization. Splitting/parallelizing this file is test-harness restructuring and overlaps with DEF-016 rather than the bounded product fixes in this cycle.
- **Exit criterion:** Re-open when E2E runtime becomes a CI bottleneck or when reducing default retries/fixed waits; completion means slow scenarios are partitioned safely without shared-state cross-test failures.
