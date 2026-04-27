# Cycle 2 Aggregate Review — 2026-04-26

Repository: `/Users/hletrd/flash-shared/Travelback`

## Review lanes completed

Completed and persisted per-agent reviews:

- `cycle2-code-reviewer-2026-04-26.md` — 8 findings (6 MEDIUM, 2 LOW)
- `cycle2-critic-2026-04-26.md` — 5 findings (4 MEDIUM, 1 LOW)
- `cycle2-debugger-2026-04-26.md` — 3 findings (1 HIGH, 2 MEDIUM)
- `cycle2-designer-2026-04-26.md` — 4 findings (3 MEDIUM, 1 LOW)
- `cycle2-document-specialist-2026-04-26.md` — 2 findings (2 LOW)
- `cycle2-perf-reviewer-2026-04-26.md` — 6 findings (1 HIGH, 4 MEDIUM, 1 LOW)
- `cycle2-security-reviewer-2026-04-26.md` — 0 findings (clean)
- `cycle2-test-engineer-2026-04-26.md` — 6 findings (2 HIGH, 3 MEDIUM, 1 LOW)
- `cycle2-tracer-2026-04-26.md` — 7 findings (1 HIGH, 4 MEDIUM, 2 LOW)
- `cycle2-verifier-2026-04-26.md` — 3 findings (3 MEDIUM)
- `cycle2-architect-2026-04-25.md` — 6 findings (1 HIGH, 1 MEDIUM-HIGH, 3 MEDIUM, 1 LOW-MEDIUM)

Total: 50 raw findings across 11 reviewers.

## Deduplicated findings

Severity/confidence preserves the highest level reported by any lane. "Agreement" lists lanes that independently flagged the same or overlapping issue.

---

### F01 — Export frame drives the normal playback React path for every encoded frame (per-frame React state churn)

- **Severity:** HIGH
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/lib/useExportController.ts:173-186`, `src/lib/videoEncoder.ts:117-158`, `src/app/page.tsx:160-182`, `src/components/MapView.tsx:879-986`
- **Agreement:** debugger (1), perf-reviewer (P-02), critic (2), tracer (T-01), verifier (1,3)
- **Failure scenario:** At 180s / 60fps = 10,800 frames, each encoded frame calls `setPlaybackProgress(nextProgress)` through React, triggering MapView effects, marker/trail updates, ElevationProfile re-render, controls re-render, and export-progress state. This competes with WebCodecs encoding and canvas capture, making export appear hung or causing idle timeouts on mid-range machines.
- **Suggested fix:** Separate export frame rendering from visible playback state. Keep export progress in a throttled UI signal (4-10 Hz). Update map camera/marker/trail through an imperative export-only path. Only synchronize `playbackProgress` to final value at completion or abort.

---

### F02 — Per-frame trail geometry rebuild is O(full track) and grows with progress

- **Severity:** HIGH
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/components/MapView.tsx:109-170`, `src/components/MapView.tsx:890-904`, parser caps at 250K points
- **Agreement:** debugger (2), perf-reviewer (P-01), critic (1), tracer (T-02), verifier (2)
- **Failure scenario:** `buildTrackGeometry()` slices, wraps, and copies coordinates for the entire traveled portion on every frame. For large tracks (100k-250k points), every playback/export frame allocates and sends a huge GeoJSON to MapLibre. Main thread stutters, playback drops frames, export slows dramatically.
- **Suggested fix:** Precompute immutable per-segment coordinate arrays once per track. Render trail incrementally or use MapLibre `line-gradient`/feature-state/filter instead of replacing full GeoJSON each frame. Throttle display updates separately from analytical point retention.

---

### F03 — Google JSON parser logic is hand-duplicated in two runtimes (worker vs main) without behavioral parity tests

- **Severity:** HIGH (maintainability/correctness)
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/lib/parser.ts:253-539` (main), `public/workers/trackParser.worker.js:45-262` (worker), `scripts/smoke-static.mjs:223-260` (weak parity guard)
- **Agreement:** code-reviewer (C2-CR-01), critic (3), test-engineer (TE-02), architect (ARCH-01)
- **Failure scenario:** A fix for one Google export shape lands in `src/lib/parser.ts` but not in the worker. Small fallback imports and worker-capable large imports then produce different `points`, `segmentStartIndices`, dedup behavior, or error codes for the same data.
- **Suggested fix:** Extract shared Google parsing logic into one module consumed by both contexts. At minimum, add behavioral parity tests running every JSON fixture through both paths and deep-comparing normalized `{ name, points, segmentStartIndices }`.

---

### F04 — No unit/integration test layer for pure functions; full regression signal depends on a monolithic E2E file

- **Severity:** HIGH
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `package.json:5-17`, `e2e/travelback.spec.ts:216-1526`, `src/lib/parser.ts`, `src/lib/camera.ts`, `src/lib/interpolate.ts`, `src/lib/videoEncoder.ts`
- **Agreement:** test-engineer (TE-01), critic (5)
- **Failure scenario:** Small regressions in parser/camera/interpolation/export math pass E2E because UI still renders. Debugging is slow since failures appear only through browser-level scenarios.
- **Suggested fix:** Add fast unit/integration layer for pure functions: parser fixture tests, camera/interpolation edge cases, scene normalization, export lifecycle tests with mocked boundaries. Wire into `npm test`.

---

### F05 — E2E export success path exercises only a localhost stub, not the real encoder/capture pipeline

- **Severity:** HIGH
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/lib/useExportController.ts:20-29`, `src/lib/useExportController.ts:161-172`, `e2e/travelback.spec.ts:1299-1368`
- **Agreement:** debugger (3), tracer (T-05), verifier (3)
- **Failure scenario:** CI stays green while real `exportVideo()`, `waitForIdle()`, canvas capture, codec probing, or MP4 finalization break. The stub bypasses `exportVideo()` entirely.
- **Suggested fix:** Add at least one small real-export smoke path with very short duration/resolution/fps and deterministic local map style. Run in a focused static-export smoke job or behind explicit non-stub export test.

---

### F06 — Export frame capture can resolve before the post-camera frame is actually painted

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Likely
- **Files:** `src/components/MapView.tsx:475-568`, `src/lib/useExportController.ts:173-183`, `src/lib/videoEncoder.ts:131-155`
- **Agreement:** architect (ARCH-02), verifier (1)
- **Failure scenario:** `waitForIdle()` fast-path resolves immediately when `!map.isMoving()` and `areTilesLoaded()` are true. For local styles with no tile sources, this can succeed before the post-`jumpTo` frame is painted. Export may capture stale/duplicate frames after scene camera transitions.
- **Suggested fix:** Wait for a MapLibre `render` event after camera mutation before capturing. Replace generic `waitForIdle()` export path with `renderFrameAndWait(cameraState, signal)` that guarantees a fresh frame.

---

### F07 — Map layer ownership is split across MapView, JourneyCreator, and export controller

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/components/MapView.tsx:26-34`, `src/components/JourneyCreator.tsx:203-476`, `src/lib/useExportController.ts`
- **Agreement:** code-reviewer (C2-CR-05), architect (ARCH-03)
- **Failure scenario:** Multiple components independently mutate the same MapLibre instance. Style reload, export resize, or mode transition can leave stale listeners, remove layers out of order, or re-add feature layers at wrong times.
- **Suggested fix:** Replace `getMap()` feature access with explicit overlay registration/update APIs. Make MapView the only MapLibre mutator with declarative overlay props or narrow overlay methods.

---

### F08 — Track session state is spread across many independent state atoms in page.tsx

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/app/page.tsx:61-112`, `src/app/page.tsx:258-315`, `src/components/TrackWorkspace.tsx:13-50`
- **Agreement:** code-reviewer (C2-CR-06), architect (ARCH-04)
- **Failure scenario:** A future feature edits track/session state but forgets one coupled reset path (stale export, scenes from old full track, focus target not updated). Current code depends on call-order assumptions rather than a single session transition model.
- **Suggested fix:** Extract a `useTrackSessionController` reducer for session-level transitions: `loadTrack`, `startJourney`, `trimRange`, `editScenes`, `resetExport`, `resetPlayback`.

---

### F09 — MapLibre map is eagerly mounted on load with `preserveDrawingBuffer: true`

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/app/page.tsx:462-478`, `src/components/MapView.tsx:571-588`
- **Agreement:** perf-reviewer (P-03), designer (3)
- **Failure scenario:** First visit pays WebGL initialization, style fetch/parse, GPU memory, and preserved drawing buffer overhead before user intent is known. This can hurt LCP/TTI and battery on low-power devices.
- **Suggested fix:** Lazy-mount MapView only after user has a track or creates a journey. For export, gate `preserveDrawingBuffer` to export-only or use a separate export-only map instance.

---

### F10 — Timeline end-handle mapping can under-select sparse tracks

- **Severity:** LOW-MEDIUM
- **Confidence:** Medium
- **Status:** Likely
- **Files:** `src/components/TimelineSelector.tsx:29-52`, `src/app/page.tsx:288-315`
- **Agreement:** code-reviewer (C2-CR-07), tracer (T-06)
- **Failure scenario:** On sparse tracks with one very long segment, dragging the end handle to a position inside that segment trims to the prior point. The resulting track can be visibly shorter than the selected range.
- **Suggested fix:** For end handle, include first point at or after target distance, or synthesize interpolated endpoint. Keep minimum two-point guard.

---

### F11 — Scene editor slider handles have stale aria bounds

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/components/SceneEditor.tsx:178-190`
- **Agreement:** designer (1)
- **Failure scenario:** Screen-reader users hear `aria-valuemin={0}` / `aria-valuemax={100}` for start/end handles, but the real constraint is dynamic (start max = current end value). WCAG 4.1.2 / 1.3.1 issue.
- **Suggested fix:** Make min/max dynamic per handle matching `TimelineSelector` pattern.

---

### F12 — Mobile "more controls" panel is marked dialog but is not truly modal

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/components/TrackToolbar.tsx:10-16, 66-88, 145-258`
- **Agreement:** designer (2)
- **Failure scenario:** Keyboard users can tab into page content behind the panel while it is open. Screen readers get a dialog that is not actually modal.
- **Suggested fix:** Reuse `ModalDialog` for the mobile panel, or downgrade to true popover/menu with correct semantics and roving focus.

---

### F13 — Full-viewport animated mesh runs continuously without reduced-motion disabling

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** Risk
- **Files:** `src/app/layout.tsx:80-81`, `src/styles/vitro-base.css:389-435`, `src/styles/vitro-base.css:761-767`
- **Agreement:** perf-reviewer (P-04)
- **Failure scenario:** Animated decorative background competes with map rendering and canvas capture. For reduced-motion users, `0.01ms !important` infinite animation can still churn.
- **Suggested fix:** Set `animation: none !important` for decorative animations under `prefers-reduced-motion`. Consider pausing mesh during playback/export.

---

### F14 — In-memory video export can duplicate large buffers beyond browser tab limits

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** Likely
- **Files:** `src/lib/videoEncoder.ts:7`, `src/lib/videoEncoder.ts:99-103`, `src/lib/useExportController.ts:188-198`
- **Agreement:** perf-reviewer (P-05)
- **Failure scenario:** At 256 MiB cap, encoder target, final ArrayBuffer, Blob backing store, object URL, video decoder preview, and File wrapper can overlap. Mobile browser may kill tab after long encode.
- **Suggested fix:** Lower in-memory limit accounting for duplicate residency. Prefer streaming/file target. Provide explicit close/delete action for preview.

---

### F15 — Manual route drag recomputes full distance on every pointer move

- **Severity:** LOW
- **Confidence:** Medium
- **Status:** Likely
- **Files:** `src/components/JourneyCreator.tsx:174-178, 349-358`, `src/lib/interpolate.ts:46-54`
- **Agreement:** perf-reviewer (P-06)
- **Failure scenario:** During drag, each pointer move triggers O(n) `totalDistance` scan. On routes with many manual points, dragging can lag.
- **Suggested fix:** Maintain incremental segment distances, recomputing only two adjacent segments per moved point. Throttle `syncUI` during drag.

---

### F16 — JourneyCreator publishes invalid/degenerate LineString geometry before two waypoints exist

- **Severity:** MEDIUM
- **Confidence:** Medium-High
- **Status:** Likely
- **Files:** `src/components/JourneyCreator.tsx:80-101, 192-236`, `src/components/MapView.tsx:150-152`
- **Agreement:** code-reviewer (C2-CR-04), tracer (T-03)
- **Failure scenario:** Empty or one-coordinate `LineString` sent to line source. MapLibre may reject/log the geometry, skip the layer, or leave route preview broken.
- **Suggested fix:** Do not update line source until >=2 waypoints. Represent pre-two-point state as empty FeatureCollection.

---

### F17 — Static hardening silently tolerates failed bootstrap-script rewrite

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `scripts/harden-static-export.mjs:74-85, 116-130`, `src/app/layout.tsx:53-58`
- **Agreement:** code-reviewer (C2-CR-03), tracer (T-04)
- **Failure scenario:** Next changes bootstrap serialization. `npm run build` still produces CSP-hardened HTML, but early frame-buster/theme bootstrap is left in non-executing form. CSP hardening passes but behavior regresses.
- **Suggested fix:** Return replacement count from `inlineTravelbackBootstrap()`. Throw if `travelback-bootstrap` id is not rewritten. Add smoke assertion for direct bootstrap form in `out/index.html`.

---

### F18 — GPX/KML point limits enforced after full in-memory materialization

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** Risk
- **Files:** `src/lib/parser.ts:51-146, 195-224, 704-715`
- **Agreement:** code-reviewer (C2-CR-02)
- **Failure scenario:** Dense GPX/KML file forces browser to allocate and transform excessive points before limit rejection.
- **Suggested fix:** Thread `assertPointBudget()` into segment accumulation before push/append. Reject at extraction boundary, not after full Track built.

---

### F19 — Several Google import E2E tests assert generic count instead of exact parser outcomes

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `e2e/travelback.spec.ts:1391-1438`
- **Agreement:** test-engineer (TE-03)
- **Failure scenario:** `parseTimelineObjects` drops `placeVisit` points or `parseTimelineEdits` loses coordinates, but tests pass as long as at least two points survive.
- **Suggested fix:** Replace generic count assertions with exact visible/full point counts for every Google fixture. Add fixture comments documenting expected count/order/segments.

---

### F20 — CI test gate does not run for pull requests

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `.github/workflows/deploy-pages.yml:3-6`
- **Agreement:** test-engineer (TE-04)
- **Failure scenario:** PRs can merge with regressions. Only `push` to `main` triggers CI gates. Same workflow deploys Pages after build.
- **Suggested fix:** Add `pull_request` trigger for build/test. Split deploy from validation if permissions are a concern.

---

### F21 — Playwright retries can turn intermittent failures green without flake tracking

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** Risk
- **Files:** `playwright.config.ts:11-18`, `playwright.static.config.ts:26-33`
- **Agreement:** test-engineer (TE-05)
- **Failure scenario:** Timing-sensitive tests fail first attempt, pass on retry. CI exits green, flake normalized.
- **Suggested fix:** Use Playwright JSON/JUnit reporter and parse flaky counts. Add scheduled no-retry run. Set retries: 0 on PR validation.

---

### F22 — E2E tests create temp files inside tracked fixture directory

- **Severity:** LOW
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `e2e/travelback.spec.ts:427-435, 438-448, 1398-1413, 1452-1465`
- **Agreement:** test-engineer (TE-06)
- **Failure scenario:** Interrupted test runs leave temp files in fixture directory. PID-only names can collide across workers/retries.
- **Suggested fix:** Use `testInfo.outputPath()` or `fs.mkdtemp` under Playwright's per-test output directory.

---

### F23 — Local static security headers are stronger than deployed GitHub Pages behavior

- **Severity:** LOW
- **Confidence:** High
- **Status:** Confirmed residual
- **Files:** `scripts/serve-static.mjs:151-161`, `.github/workflows/deploy-pages.yml`
- **Agreement:** critic (4)
- **Failure scenario:** Production on raw GitHub Pages has weaker clickjacking/isolation/permissions than `npm run start`. Framebuster is the only protection.
- **Suggested fix:** Either accept as documented residual risk, or deploy behind header-capable CDN and add live-header verification.

---

### F24 — Scene editor range warnings computed before normalization can be stale

- **Severity:** LOW-MEDIUM (carried from cycle1 F07)
- **Confidence:** High
- **Status:** Continuing risk
- **Files:** `src/components/SceneEditor.tsx:254-278`
- **Agreement:** critic (cycle1), architect (ARCH-06 this cycle)
- **Failure scenario:** UI warns about overlaps that `normalizeScenes()` has already corrected.
- **Suggested fix:** Store raw authored scenes in UI state. Derive normalized scenes only for playback/export.

---

### F25 — README import guide still described as Google Takeout-only (DS2-1)

- **Severity:** LOW
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `README.md:64, 127` vs `src/components/GoogleGuide.tsx:146-220`
- **Agreement:** document-specialist (DS2-1)
- **Failure scenario:** README description of import guide is narrower than current 7-tab implementation.
- **Suggested fix:** Rename to "Travel data import guide" or explicitly list all tab targets.

---

### F26 — Camera mode names in docs don't match UI labels (DS2-2)

- **Severity:** LOW
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `README.md:48`, `.context/project/02-architecture.md:73-80` vs UI labels
- **Agreement:** document-specialist (DS2-2)
- **Failure scenario:** Internal "Orbit" vs UI "Spin Around" mismatch causes confusion for contributors/support.
- **Suggested fix:** Add doc table mapping semantic keys to UI labels, or rename docs to user-facing labels.

---

### F27 — Temp Playwright script in repo root (.tmp-travelback-mina-manual.mjs)

- **Severity:** LOW
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `.tmp-travelback-mina-manual.mjs`
- **Agreement:** code-reviewer (C2-CR-08), tracer (T-07)
- **Failure scenario:** Future agents/contributors may mistake for endorsed tooling, run against wrong server, or commit machine-specific paths.
- **Suggested fix:** Delete if obsolete, or move under ignored scratch directory with documented invocation.

---

### F28 — Locale handling never sets `dir` attribute (RTL unreadiness)

- **Severity:** LOW
- **Confidence:** Medium
- **Status:** Risk
- **Files:** `src/lib/i18n.ts:1833-1838`, `src/app/page.tsx:462-498`
- **Agreement:** designer (4)
- **Failure scenario:** If RTL locale added later, toolbar/overlays/controls remain visually LTR and feel mirrored.
- **Suggested fix:** Set `document.documentElement.dir` from locale. Migrate highest-impact positioning to logical properties.

---

### F29 — Large JSON imports worker-isolated but still all-at-once materialized in memory

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** Likely
- **Files:** `src/lib/parser.ts:541-544, 670-672`, `public/workers/trackParser.worker.js:325-331`
- **Agreement:** architect (ARCH-05)
- **Failure scenario:** Valid dense export under 100 MB cap still allocates large string + full parsed object graph + intermediate arrays + final points before rejection.
- **Suggested fix:** Add streaming/bounded JSON extraction or lower limits based on measured browser memory. Instrument worker memory/error outcomes.

---

### F30 — Scene authoring stores normalized ranges, losing raw user intent

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/lib/camera.ts:19-43`, `src/components/SceneEditor.tsx:254-278`
- **Agreement:** architect (ARCH-06)
- **Failure scenario:** UI loses raw authoring intent. Future undo/timeline-snapping features harder to reason about.
- **Suggested fix:** Store raw authored scenes in UI state. Derive normalized scenes only for playback/export.

---

### F31 — Scene editor still feels too technical for casual travelers (continued from cycle1 F35)

- **Severity:** LOW
- **Confidence:** High
- **Status:** Continuing UX gap
- **Files:** `src/components/SceneEditor.tsx`, translations
- **Agreement:** non-tech-traveler-reviewer (cycle1)
- **Suggested fix:** Improve preset-oriented copy and hide advanced parameters behind disclosure.

---

### F32 — Korean export UI leaks technical/English wording (continued from cycle1 F36)

- **Severity:** LOW
- **Confidence:** High
- **Status:** Continuing i18n gap
- **Files:** `src/lib/i18n.ts`, `src/components/ExportPanel.tsx`
- **Agreement:** non-tech-traveler-reviewer (cycle1), test-engineer (cycle1)
- **Suggested fix:** Naturalize Korean export copy and add locale parity checks.

---

## Aggregate priority

### Must-address (correctness, data-loss, guard regression):
1. **F01** — Export per-frame React state churn (HIGH)
2. **F02** — Per-frame trail geometry rebuild O(points) (HIGH)
3. **F03** — Duplicated Google parser (HIGH)
4. **F04** — No unit test layer (HIGH)
5. **F05** — Real export untested (HIGH)
6. **F06** — Export frame capture timing (MEDIUM)
7. **F10** — Timeline end-handle under-select (LOW-MEDIUM)
8. **F16** — JourneyCreator degenerate LineString (MEDIUM)
9. **F17** — Static hardening bootstrap rewrite (MEDIUM)
10. **F18** — GPX/KML point budget after materialization (MEDIUM)
11. **F19** — Google E2E weak assertions (MEDIUM)
12. **F24** — Scene stale warnings (LOW-MEDIUM)
13. **F25, F26** — README/docs mismatches (LOW)
14. **F27** — Temp script cleanup (LOW)

### Performance/test risks (address where practical):
- **F07** — Map layer ownership boundaries (plan as larger refactor)
- **F08** — Session state coupling (plan as larger refactor)
- **F09** — Eager map mount with preserved buffer
- **F11** — Scene editor aria bounds
- **F12** — Mobile dialog semantics
- **F13** — Animated mesh reduced-motion fix
- **F14** — In-memory export buffer duplication
- **F15** — Manual route drag perf
- **F20** — CI PR trigger
- **F21** — Playwright flake tracking
- **F22** — Temp files in fixture dir

### Defer (requires architectural/hosting/product decisions):
- **F23** — GitHub Pages static headers
- **F28** — RTL readiness
- **F29** — Large import memory pressure
- **F30** — Scene raw state preservation
- **F31, F32** — Continuing UX/i18n gaps from cycle1

## Finding count summary

| Severity | Count | Newly identified this cycle | Carried from cycle1 |
|----------|-------|----------------------------|---------------------|
| HIGH | 5 | 5 (F01-F05) | 0 |
| MEDIUM | 18 | 15 | 3 |
| LOW | 9 | 4 (F15, F25-F28) | 5 (F24 F30-F32) |
| **Total** | **32** | **24** | **8** |

## New findings not in cycle1 aggregate

All 5 HIGH-severity findings are new this cycle (F01-F05). These represent the most actionable regression risks in the current codebase. F01+F02 (export React churn + trail rebuild) are tightly coupled and should be addressed together.
