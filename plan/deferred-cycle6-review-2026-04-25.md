# Deferred Cycle 6 Findings — 2026-04-25

This file records review findings from `.context/reviews/_aggregate.md` that are not scheduled in `plan/cycle6-review-plan-2026-04-25.md`. Severity and confidence are preserved from the source aggregate.

Repo-policy checks before deferral:
- `CLAUDE.md`: absent, and `.context/development/01-conventions.md` says never use it for this project.
- `AGENTS.md`: orchestrator-provided workspace rules apply.
- `.context/**`: read project context, architecture, conventions, and plan index.
- `.cursorrules`, `CONTRIBUTING.md`, `docs/`: absent.
- Deferred work remains bound by repo policy: Node 24 LTS, strict TypeScript, no new dependencies without explicit request, lint/typecheck/build/e2e gates, GPG-signed semantic gitmoji commits, and push after each implementation iteration.

## Deferred Items

### D6-01 — Timeline dragging commits O(n) filtered tracks during pointer movement
- **Aggregate finding:** F6-06
- **Source citation:** `src/components/TimelineSelector.tsx:201-245`, `src/app/page.tsx:286-312`, `src/components/MapView.tsx:894-900`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Performance architecture refactor requiring a new live-preview versus committed-trim state model. This cycle schedules correctness, availability, accessibility, and gate defects first.
- **Reopen exit criterion:** Reopen before changing timeline drag semantics, before large-track performance work, or when large-track trim jank is reported.

### D6-02 — Playback/export render work scales with full track length per frame
- **Aggregate finding:** F6-07
- **Source citation:** `src/lib/parser.ts:4`, `src/lib/parser.ts:644-645`, `src/components/MapView.tsx:109-170`, `src/components/MapView.tsx:894-900`, `src/lib/useExportController.ts:173-186`, `src/lib/videoEncoder.ts:93-133`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Broad rendering/performance design work. Fixing it safely requires decimation or incremental geometry design plus performance validation; it is not a confirmed current data-loss/security defect.
- **Reopen exit criterion:** Reopen before changing route/trail rendering, before raising parser caps, or when long-track playback/export jank is reported.

### D6-03 — Page-level playback state rerenders too much per animation tick
- **Aggregate finding:** F6-08
- **Source citation:** `src/app/page.tsx:129-182`, `src/components/TrackWorkspace.tsx:122-166`, `src/lib/usePlaybackController.ts:17-154`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Performance/architecture refactor only. It shares scope with D6-02 and should be handled with the render pipeline redesign.
- **Reopen exit criterion:** Reopen before changing playback state ownership or when profiling shows React rerender cost is a playback/export bottleneck.

### D6-04 — Real export and cancellation paths lack automated coverage
- **Aggregate finding:** F6-16
- **Source citation:** `e2e/travelback.spec.ts:1194-1204`, `src/lib/useExportController.ts:20-29`, `src/lib/useExportController.ts:101-244`, `src/lib/videoEncoder.ts:40-159`, `src/components/MapView.tsx:515-568`
- **Original severity/confidence:** Medium-High / High
- **Reason for deferral:** Coverage architecture gap. This cycle adds targeted regressions for fixed export-state behavior while avoiding expensive real MP4 generation in the mandatory whole-repo gates.
- **Reopen exit criterion:** Reopen before export pipeline refactors, before changing abort/download behavior, or when CI capacity allows a bounded real-encoder shard.

### D6-05 — Parser/worker negative paths lack direct coverage
- **Aggregate finding:** F6-17
- **Source citation:** `src/lib/parser.ts:446-679`, `public/workers/trackParser.worker.js:206-321`, `e2e/travelback.spec.ts:1277-1290`, `scripts/smoke-static.mjs:172-190`
- **Original severity/confidence:** Medium-High / High
- **Reason for deferral:** Coverage gap that is best solved with the lower-layer harness deferred in D6-06. This cycle schedules a point-budget implementation and a focused XML-size regression only.
- **Reopen exit criterion:** Reopen before changing parser error codes, worker fallback behavior, or Google import extraction branches.

### D6-06 — Repo lacks a low-level unit/integration test layer
- **Aggregate finding:** F6-18
- **Source citation:** `package.json:5-18`, `.github/workflows/deploy-pages.yml:27-33`, `src/lib/parser.ts:43-679`, `public/workers/trackParser.worker.js:1-321`, `src/lib/interpolate.ts:3-185`, `src/lib/camera.ts:19-428`, `src/lib/videoEncoder.ts:40-225`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Adding a proper unit/component harness likely requires toolchain choices and may require dependencies, while repo policy says "No new dependencies without explicit request." No explicit dependency approval exists in this cycle.
- **Reopen exit criterion:** Reopen when explicit approval exists for a unit/integration test harness or before broad parser/camera/playback/export refactors.

### D6-07 — Playwright suite still has fixed sleeps and copy-coupled assertions
- **Aggregate finding:** F6-19
- **Source citation:** `e2e/travelback.spec.ts:64-85`, `e2e/travelback.spec.ts:490`, `e2e/travelback.spec.ts:506`, `e2e/travelback.spec.ts:800`, `e2e/travelback.spec.ts:828`, `e2e/travelback.spec.ts:905`, `e2e/travelback.spec.ts:917`, `e2e/travelback.spec.ts:1302`, `e2e/travelback.spec.ts:1339`
- **Original severity/confidence:** High / High for fixed sleeps; Medium / High for copy-coupling
- **Reason for deferral:** Broad test-suite cleanup. This cycle adds focused regression coverage for fixed behavior but does not rewrite unrelated legacy waits/selectors.
- **Reopen exit criterion:** Reopen before splitting the E2E suite, when adding substantial new coverage, or when CI flake recurs around these waits.

### D6-08 — Dev-server E2E path is not protected in CI
- **Aggregate finding:** F6-20
- **Source citation:** `package.json:12-15`, `.github/workflows/deploy-pages.yml:31-33`, `playwright.config.ts:44-49`, `playwright.static.config.ts:44-49`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** CI policy/scope item. This cycle fixes the local `npm run test:e2e` gate path and avoids adding another CI shard without an explicit build-time budget decision.
- **Reopen exit criterion:** Reopen when CI wall-time budget is reviewed or when dev-only regressions escape static E2E coverage.

### D6-09 — Startup preference/bootstrap state is duplicated across bootstrap, page, i18n, and map-style types
- **Aggregate finding:** F6-21
- **Source citation:** `src/app/layout.tsx:53-66`, `src/app/page.tsx:61-99`, `src/app/page.tsx:210-229`, `src/lib/i18n.ts:1786-1813`, `src/types.ts:21-45`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Architecture maintainability risk rather than a confirmed current runtime defect. It should be handled as a dedicated startup-preferences refactor.
- **Reopen exit criterion:** Reopen before adding locales, map styles, theme modes, or changing first-paint bootstrap behavior.

### D6-10 — Export rendering is architecturally coupled to the live interactive map
- **Aggregate finding:** F6-22
- **Source citation:** `src/lib/useExportController.ts:105-186`, `src/components/MapView.tsx:472-569`, `src/components/MapView.tsx:902-977`
- **Original severity/confidence:** High / Medium-High
- **Reason for deferral:** Broad architectural migration. This cycle fixes concrete export-state correctness without splitting the renderer.
- **Reopen exit criterion:** Reopen before changing map renderer internals, export capture, or camera orchestration.

### D6-11 — Map overlay ownership is split across raw IDs and component-local listeners
- **Aggregate finding:** F6-23
- **Source citation:** `src/components/MapView.tsx:699-860`, `src/components/JourneyCreator.tsx:193-252`, `src/components/JourneyCreator.tsx:279-452`
- **Original severity/confidence:** Medium / Medium
- **Reason for deferral:** Architecture risk needing a small overlay-manager design. No current orphaned-layer defect was confirmed.
- **Reopen exit criterion:** Reopen before adding new map overlay modes or allowing journey editing alongside loaded track overlays.

### D6-12 — E2E verification is bottlenecked into one serial mega-spec
- **Aggregate finding:** F6-24
- **Source citation:** `playwright.config.ts:13-15`, `e2e/travelback.spec.ts:1-214`, `e2e/travelback.spec.ts:214-1351`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Test architecture cleanup. Splitting the suite is valuable but outside the concrete correctness/accessibility/gate fixes scheduled for this cycle.
- **Reopen exit criterion:** Reopen before adding large new E2E coverage or when CI duration/flakiness becomes a release blocker.

### D6-13 — Public Pages deployment cannot enforce response-header anti-framing
- **Aggregate finding:** F6-25
- **Source citation:** `src/app/layout.tsx:53-66`, `scripts/harden-static-export.mjs:9-29`, `.github/workflows/deploy-pages.yml:34-46`, `scripts/serve-static.mjs:151-157`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** Deployment-host limitation already documented by the repo: `.context/project/01-overview.md` says "GitHub Pages cannot attach those custom headers, so the Pages deployment relies on the JS fallback unless it is fronted by a header-capable CDN." This cycle cannot change the hosting platform.
- **Reopen exit criterion:** Reopen when moving off GitHub Pages, adding a CDN, or changing anti-framing bootstrap/header behavior.

### D6-14 — Hardened CSP still allows inline styles
- **Aggregate finding:** F6-26
- **Source citation:** `src/app/layout.tsx:63-66`, `scripts/harden-static-export.mjs:15-29`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** Defense-in-depth hardening, not a confirmed exploitable sink. Removing `'unsafe-inline'` requires a broad styling-system migration because the app intentionally uses inline React style attributes and theme variables across many components.
- **Reopen exit criterion:** Reopen before a CSP hardening milestone or before migrating inline style usage into static classes/CSS variables.

### D6-15 — Live map may render two current-position markers at once
- **Aggregate finding:** F6-27
- **Source citation:** `src/components/MapView.tsx:761-780`, `src/components/MapView.tsx:783-805`, `src/components/MapView.tsx:889-892`
- **Original severity/confidence:** Low / Medium
- **Reason for deferral:** Low-confidence visual polish issue. It should be validated visually before code changes because the canvas marker may be intentionally aligned with export capture.
- **Reopen exit criterion:** Reopen when visual QA confirms double-marker thickness/jitter or before changing marker/export rendering.

### D6-16 — Production debug bridge can be exposed by query string or localStorage
- **Aggregate finding:** F6-28
- **Source citation:** `src/components/MapView.tsx:595-633`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** Manual threat-model decision. The bridge exposes camera/map state and no direct exploit was found.
- **Reopen exit criterion:** Reopen before public release hardening or if production debug surfaces are disallowed.

### D6-17 — RTL is not wired into the layout system
- **Aggregate finding:** F6-29
- **Source citation:** `src/lib/i18n.ts:1758`, `src/app/layout.tsx:56`, `src/components/TrackToolbar.tsx:96-168`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** Current supported locales (`en`, `ko`, `ja`, `zh`, `es`) are LTR. This is not a current user-facing defect.
- **Reopen exit criterion:** Reopen before adding any RTL locale.

### D6-18 — Dark-mode glass contrast still needs real-device validation
- **Aggregate finding:** F6-30
- **Source citation:** `src/styles/vitro-base.css:456`, `src/app/globals.css:147`
- **Original severity/confidence:** Low / Medium
- **Reason for deferral:** Manual validation risk with no confirmed source-level contrast failure.
- **Reopen exit criterion:** Reopen during release visual QA or when adjusting glass/background/theme tokens.
