# Deferred findings — review-plan-fix cycle 1/100 — 2026-04-24

Deferred items follow `.context/development/01-conventions.md` and the review-plan-fix deferred-fix rules. Security, correctness, and data-loss findings from the aggregate are scheduled in `plan/cycle1-review-plan-2026-04-24.md`; the items below are deferred because they are performance, maintainability, broad test strategy, or infrastructure follow-up that requires larger design work after this correctness pass.

## Deferred items

### DEF-001 — Generate/share parser-worker implementation instead of maintaining duplicate files
- **Finding:** AGG-015
- **Citation:** `src/lib/parser.ts:346-454`, `public/workers/trackParser.worker.js:137-268`
- **Original severity/confidence:** Medium-High / High
- **Reason for deferral:** This cycle schedules parity fixes in both files, but replacing the public worker with a generated/shared bundle is a build-pipeline refactor that should be planned separately to avoid destabilizing static export.
- **Exit criterion:** Re-open when adding a worker bundling step or parser unit-test harness; completion means one source of truth generates both main and worker parser behavior.

### DEF-002 — Stream/chunk large GPX/KML parsing and enforce XML limits earlier
- **Finding:** AGG-016
- **Citation:** `src/lib/parser.ts:516-567`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Performance/memory hardening for 200 MB XML imports requires a parser strategy change or lower product limits. This cycle fixes parser correctness without changing import capability.
- **Exit criterion:** Re-open before increasing file limits or when adding streaming XML parsing; completion means large XML files do not monopolize the main thread before point limits are enforced.

### DEF-003 — Replace per-frame trail GeoJSON rebuilds with scalable rendering
- **Finding:** AGG-017
- **Citation:** `src/components/MapView.tsx:841-847`
- **Original severity/confidence:** High / High
- **Reason for deferral:** This is performance architecture work requiring MapLibre layer/style redesign and visual regression checks. No correctness data loss is deferred; current behavior remains functionally correct for existing test fixtures.
- **Exit criterion:** Re-open when optimizing >50k-point playback/export; completion means per-frame work is bounded independently of traveled point count.

### DEF-004 — Move export frame updates off app-wide React state
- **Finding:** AGG-018
- **Citation:** `src/lib/useExportController.ts:141-146`, `src/lib/videoEncoder.ts:101-130`
- **Original severity/confidence:** High / Medium-High
- **Reason for deferral:** This cycle adds a frame boundary before capture to reduce the correctness race, but a full imperative export-rendering lane requires broader MapView API design.
- **Exit criterion:** Re-open when export performance is prioritized; completion means export frame rendering does not require app-wide React progress updates.

### DEF-005 — Memoize overview camera bounds for large tracks
- **Finding:** AGG-019
- **Citation:** `src/lib/camera.ts:153-162`, `src/lib/camera.ts:391-400`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Pure performance optimization that benefits large exports but is not needed to stabilize current correctness gates.
- **Exit criterion:** Re-open with camera unit tests; completion means overview bounds/zoom are computed once per track/scene set.

### DEF-006 — Add memory-aware export limits or streaming output
- **Finding:** AGG-020
- **Citation:** `src/types.ts:80-107`, `src/lib/videoEncoder.ts:73-86`, `src/lib/videoEncoder.ts:142-158`
- **Original severity/confidence:** High / High
- **Reason for deferral:** Changing export limits affects product behavior and needs UX copy/preset decisions. This cycle fixes cleanup/cancellation but does not alter supported export presets.
- **Exit criterion:** Re-open before release marketing for long 4K exports; completion means the UI prevents in-memory encodes that exceed a tested memory budget.

### DEF-007 — Downsample ElevationProfile rendering for very large tracks
- **Finding:** AGG-021
- **Citation:** `src/components/ElevationProfile.tsx`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Display-only performance optimization; no current correctness issue after the point-limit guard.
- **Exit criterion:** Re-open when adding large-track benchmarks; completion means SVG path point count is capped while distance/elevation calculations remain exact enough for display.

### DEF-008 — Debounce expensive map reload work during live timeline drag
- **Finding:** AGG-022 remainder
- **Citation:** `src/components/TimelineSelector.tsx:182-229`, `src/app/page.tsx:185-205`, `src/components/MapView.tsx:756-816`
- **Original severity/confidence:** Medium-High / High
- **Reason for deferral:** This cycle fixes stale distance data and keyboard correctness; deeper drag-preview architecture needs UX/performance validation.
- **Exit criterion:** Re-open if drag stutter appears on large fixtures; completion means pointer-frame updates do not reload full map/elevation state.

### DEF-009 — Stream static preview server responses and special-case HEAD
- **Finding:** AGG-023
- **Citation:** `scripts/serve-static.mjs`
- **Original severity/confidence:** Low-Medium / High
- **Reason for deferral:** Local tooling performance issue with no user-facing production impact.
- **Exit criterion:** Re-open when static fixtures grow or HEAD checks are added; completion means file responses stream and HEAD does not read bodies.

### DEF-010 — Split large UI modules after behavior is locked
- **Finding:** AGG-024
- **Citation:** `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`, `src/components/SceneEditor.tsx`, `src/app/page.tsx`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Refactor-only maintainability work; repo rules require behavior-locking tests before cleanup edits. This cycle focuses on concrete defects.
- **Exit criterion:** Re-open under a cleanup/refactor workflow with regression coverage; completion means each module has smaller state/effect/render boundaries.

### DEF-011 — Add broad parser/worker, export, camera, JourneyCreator, and flake-hardening test suites
- **Findings:** AGG-025 remainder, AGG-026 remainder, AGG-027, AGG-028 remainder, AGG-030
- **Citation:** `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/components/JourneyCreator.tsx`, `e2e/travelback.spec.ts`, `playwright*.config.ts`
- **Original severity/confidence:** High to Medium / Medium-High to High
- **Reason for deferral:** This cycle adds targeted regression tests for the defects it fixes. A broader unit/component test harness would require tooling and dependency decisions that the repo rules prohibit without explicit request.
- **Exit criterion:** Re-open when adding a unit-test runner or Playwright component testing; completion means parser, camera, export, JourneyCreator, and readiness behaviors are covered by focused deterministic tests.

## Cycle 1 progress note

All non-deferrable security, correctness, and data-loss findings from that review wave were scheduled and completed in `plan/archive/cycle1-review-plan-2026-04-24.md`. The deferred items above remain intentionally open as performance, maintainability, infrastructure, or broad test-harness follow-ups; their original severity/confidence labels and exit criteria are unchanged.
