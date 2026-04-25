# Deferred Findings — Cycle 1 — 2026-04-25

Deferred items from `.context/reviews/_aggregate.md`. Security/correctness/data-loss findings are not deferred unless the repo itself explicitly permits the residual risk. Deferred work remains bound by `.context/development/01-conventions.md` git/testing rules when picked up later.

## Repo rule quoted for F14 only

`.context/project/01-overview.md` deployment note:

> The static bundle ships a client-side frame-busting fallback. Hosts/CDNs that support response headers should also send `Content-Security-Policy: frame-ancestors 'none'` and/or `X-Frame-Options: DENY`; GitHub Pages cannot attach those custom headers, so the Pages deployment relies on the JS fallback unless it is fronted by a header-capable CDN.

`.context/project/02-architecture.md` security hardening note repeats the same accepted Pages limitation: GitHub Pages cannot attach custom anti-framing headers and relies on the JS frame-buster unless fronted by a header-capable CDN.

## Deferred items

### DF-C1-20250425-001 — F10 MapView/map-overlay ownership boundary
- **Citation:** `src/components/MapView.tsx:26-34`, `src/components/MapView.tsx:571-781`, `src/components/JourneyCreator.tsx:20-253`, `src/lib/useExportController.ts:136-186`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Architectural refactor across map display, journey creation, and export. Current cycle schedules concrete state/recovery fixes; full ownership boundary needs design and broader regression coverage.
- **Exit criterion:** Re-open when adding another map overlay/export mode or during a dedicated map architecture pass with tests for style reload, journey layers, and export capture.

### DF-C1-20250425-002 — F11 App-shell/session reducer extraction
- **Citation:** `src/app/page.tsx:61-182`, `src/app/page.tsx:258-315`, `src/app/page.tsx:462-581`, `src/components/TrackWorkspace.tsx:13-50`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Broad refactor, not a current correctness blocker. Scheduled fixes preserve existing state shape.
- **Exit criterion:** Re-open before multi-track/saved-project work or if another reset/export/session bug appears.

### DF-C1-20250425-003 — F12 Split monolithic modules/specs/i18n
- **Citation:** `src/components/MapView.tsx:410-985`, `src/components/SceneEditor.tsx:244-715`, `src/lib/i18n.ts:1-1849`, `e2e/travelback.spec.ts:216-1524`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Maintainability refactor; current cycle is fixing concrete review findings. Splitting files without a behavior target risks churn.
- **Exit criterion:** Re-open when touching any of these modules for a feature or when adding a unit/component test layer.

### DF-C1-20250425-004 — F14 Host-level frame headers on GitHub Pages
- **Citation:** `src/app/layout.tsx:53`, `src/app/layout.tsx:63-66`, `scripts/harden-static-export.mjs:9-14`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Repo docs explicitly permit the GitHub Pages residual risk via JS frame-busting fallback and recommend a header-capable CDN for stricter deployments (quoted above). The static host cannot attach `frame-ancestors` headers from repo code alone.
- **Exit criterion:** Re-open when deployment moves to a header-capable host/CDN or GitHub Pages adds custom response-header support.

### DF-C1-20250425-005 — F17 Add a full unit/component test layer
- **Citation:** `src/lib/*`, `src/components/*`, `e2e/travelback.spec.ts`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Requires choosing and integrating test tooling. Repo rules say “No new dependencies without explicit request” and “Minimal dependency footprint,” so this cycle uses existing Playwright/smoke scripts only.
- **Exit criterion:** Re-open when user approves a unit/component test dependency or a no-dependency Node test harness is designed.

### DF-C1-20250425-006 — F18 Real WebCodecs/MP4 export harness
- **Citation:** `src/lib/videoEncoder.ts`, `src/lib/useExportController.ts`, `e2e/travelback.spec.ts`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Browser/codec-dependent harness work is larger than this cycle's code fixes and may require CI capability decisions. Current cycle improves export guardrails/copy.
- **Exit criterion:** Re-open when CI can run real WebCodecs export reliably or a manual release checklist is formalized.

### DF-C1-20250425-007 — F19 Replace fixed sleeps in Playwright suite
- **Citation:** `e2e/travelback.spec.ts`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Suite-wide test refactor. Current cycle updates targeted tests only.
- **Exit criterion:** Re-open when a flaky test is observed or during the next E2E hardening pass.

### DF-C1-20250425-008 — F20 Add flake/concurrency lanes
- **Citation:** `playwright.config.ts`, `playwright.static.config.ts`, test scripts
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** CI strategy change; not a product runtime bug. Needs staged reduction of sleeps first.
- **Exit criterion:** Re-open after fixed-sleep cleanup or before increasing CI parallelism.

### DF-C1-20250425-009 — F21 Negative/parser-limit fixture expansion
- **Citation:** `e2e/fixtures/*`, `src/lib/parser.ts`, `public/workers/trackParser.worker.js`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Broad fixture expansion. Current cycle adds targeted smoke coverage for scheduled parser fixes.
- **Exit criterion:** Re-open with a parser-focused test cycle or when adding a new supported import format.

### DF-C1-20250425-010 — F22 Direct trim/scene/export reset boundary tests
- **Citation:** `src/components/TimelineSelector.tsx`, `src/components/SceneEditor.tsx`, `src/lib/useExportController.ts`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Requires component/unit test harness not currently present.
- **Exit criterion:** Re-open once unit/component test tooling is approved or a no-dependency harness exists.

### DF-C1-20250425-011 — F23 Map geometry/antimeridian unit assertions
- **Citation:** `src/components/MapView.tsx`, `src/lib/interpolate.ts`, `src/lib/camera.ts`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Requires extracting/test-harness work. Current cycle schedules two concrete performance fixes in interpolation/camera.
- **Exit criterion:** Re-open during map geometry extraction or before changing antimeridian behavior.

### DF-C1-20250425-012 — F24 Systematic accessibility/i18n coverage
- **Citation:** `src/lib/i18n.ts`, `src/components/ModalDialog.tsx`, `e2e/travelback.spec.ts`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** Broad test coverage expansion. Current cycle fixes concrete accessibility/copy findings.
- **Exit criterion:** Re-open during locale expansion or modal/accessibility test hardening.

### DF-C1-20250425-013 — F35 Scene editor casual-user simplification
- **Citation:** `src/components/SceneEditor.tsx`, `src/lib/i18n.ts`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** Product UX wording/disclosure redesign, not a correctness bug. Current cycle avoids large scene editor IA changes.
- **Exit criterion:** Re-open with a UX-focused cycle or after validating casual-user scene-editor completion rate.

### DF-C1-20250425-014 — F37 Per-frame trail GeoJSON growth optimization
- **Citation:** `src/components/MapView.tsx:894-900`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Requires redesigning trail rendering/caching. Current cycle targets lower-risk perf improvements first.
- **Exit criterion:** Re-open before increasing max track points, or if playback/export jank is observed on large fixtures.

### DF-C1-20250425-015 — F38 Export frame loop drives React playback state
- **Citation:** `src/lib/useExportController.ts`, `src/components/MapView.tsx`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Requires export pipeline architecture change. Current cycle improves memory guard/copy but avoids changing export control flow.
- **Exit criterion:** Re-open if export remains slow after simpler perf fixes or before adding longer export durations.

### DF-C1-20250425-016 — F41 Elevation profile downsampling
- **Citation:** `src/components/ElevationProfile.tsx`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Performance improvement with visual regression risk; not blocking current gates.
- **Exit criterion:** Re-open when adding large-track visual performance tests or if large-track profile renders slowly.

### DF-C1-20250425-017 — F42 Timeline drag full-track scans
- **Citation:** `src/components/TimelineSelector.tsx`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Needs profiling and careful memoization around trim state; not blocking current gates.
- **Exit criterion:** Re-open when large location-history drag jank is reproduced.

### DF-C1-20250425-018 — F43 JSON worker peak memory/clone cost
- **Citation:** `src/lib/parser.ts:557-641`, `public/workers/trackParser.worker.js`
- **Original severity/confidence:** Medium / Medium
- **Reason for deferral:** Streaming/chunking parser architecture is larger than this cycle. Existing size limits remain.
- **Exit criterion:** Re-open when supporting larger Google exports or if memory pressure is reproduced under current 100 MB cap.

### DF-C1-20250425-019 — F44 `preserveDrawingBuffer` always enabled
- **Citation:** `src/components/MapView.tsx:582-587`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Export capture depends on this context attribute at map creation; changing it likely requires a separate export map/canvas strategy.
- **Exit criterion:** Re-open during export architecture redesign or if interactive GPU perf is measured as problematic.

### DF-C1-20250425-020 — F45 Glass/mesh background GPU cost
- **Citation:** `src/app/globals.css`, `src/styles/vitro-base.css`
- **Original severity/confidence:** Low / Medium
- **Reason for deferral:** Visual/performance polish tradeoff; not a gate or correctness blocker.
- **Exit criterion:** Re-open if mobile GPU performance is poor or if adding a reduced-effects setting.

### DF-C1-20250425-021 — F46 Untracked temp Playwright helper hygiene
- **Citation:** `.tmp-travelback-mina-manual.mjs:5-10`
- **Original severity/confidence:** Low / High
- **Reason for deferral:** The file is an untracked pre-existing local artifact, not repository source. Removing it could destroy local scratch work; committing it would be worse.
- **Exit criterion:** Re-open if the helper becomes tracked or is promoted into `scripts/`; then make it env-driven with temp cleanup or delete it through an explicit cleanup pass.
