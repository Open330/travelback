# Cycle 1 Aggregate Review — 2026-04-27 (r2)

Repository: `/Users/hletrd/flash-shared/Travelback`

## Review lanes completed

Completed and persisted per-agent reviews:

- `cycle1-code-reviewer-2026-04-27.md` — 9 findings (4 MEDIUM, 5 LOW)
- `cycle1-perf-reviewer-2026-04-27.md` — 6 findings (1 HIGH, 3 MEDIUM, 2 LOW)
- `cycle1-security-reviewer-2026-04-27.md` — 5 findings (1 MEDIUM, 2 LOW, 2 INFO)
- `cycle1-critic-2026-04-27.md` — 6 findings (3 MEDIUM, 3 LOW)
- `cycle1-test-engineer-2026-04-27.md` — 6 findings (3 HIGH, 3 MEDIUM)
- `cycle1-tracer-2026-04-27.md` — 6 flows traced, all PASS
- `cycle1-verifier-2026-04-27.md` — 7 claims CONFIRMED, 7 edge cases HANDLED, 1 NOT FULLY VERIFIED
- `cycle1-architect-2026-04-27.md` — 6 findings (1 MEDIUM-HIGH, 4 MEDIUM, 1 LOW-MEDIUM)
- `cycle1-debugger-2026-04-27.md` — 3 findings (3 MEDIUM)
- `cycle1-designer-2026-04-27.md` — 4 findings (3 MEDIUM, 1 LOW)
- `cycle1-document-specialist-2026-04-27.md` — 5 findings (2 INFO, 3 LOW)

Total: 56 raw findings across 11 reviewers.

## Uncommitted changes assessed

The working tree contains 8 files with uncommitted changes that partially address 7 findings from cycle 2:

| Finding | Status | Change |
|---------|--------|--------|
| F01 (export React churn) | Partially addressed | `renderFrameAndWait` + 10Hz throttle; still routes through React at ~10Hz |
| F06 (export frame timing) | Addressed | `renderFrameAndWait` uses MapLibre `render` event + rAF |
| F10 (timeline end-handle) | Addressed | Simplified `ratioToIndex` always returns `hi` for end edge |
| F16 (degenerate LineString) | Addressed | `buildLineGeoJSON` guard + `updateMapData` skip for <2 waypoints |
| F17 (bootstrap rewrite) | Addressed | `hasBootstrap && !replaced` guard throws on silent failure |
| F18 (GPX/KML point budget) | Addressed | `assertPointBudget` before push in GPX and GeoJSON paths |
| F25/F26 (docs mismatches) | Addressed | README and architecture doc updated with correct labels |

**These changes are NOT committed, NOT gate-tested, and NOT deployed.**

## Deduplicated findings

Severity/confidence preserves the highest level reported by any lane. "Agreement" lists lanes that independently flagged the same or overlapping issue.

---

### N01 — Per-frame trail geometry rebuild is O(traveled points) during playback (not just export)

- **Severity:** HIGH
- **Confidence:** High
- **Status:** Confirmed, uncommitted changes do not address playback path
- **Files:** `src/components/MapView.tsx:924-938`, `src/components/MapView.tsx:110-171`
- **Agreement:** code-reviewer (CR-03), perf-reviewer (P-01), architect (ARCH-06)
- **Failure scenario:** At 60fps on a track with 100K points, every frame slices, wraps, and copies coordinates for the entire traveled portion, creating ~50K-element coordinate arrays. GC pressure causes jank. The uncommitted `renderFrameAndWait` helps the export path but the normal playback path is unchanged.
- **Suggested fix:** Pre-compute segment coordinate arrays at track load time. Only update the segment containing the current position during playback. Consider MapLibre `line-gradient` + feature-state for trail animation.

---

### N02 — No unit test layer for parser, interpolation, camera, or export pure functions

- **Severity:** HIGH
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/lib/parser.ts`, `src/lib/camera.ts`, `src/lib/interpolate.ts`, `src/lib/videoEncoder.ts`
- **Agreement:** test-engineer (TE-01, TE-02), critic (implied), architect (implied)
- **Failure scenario:** Small regressions in parser/camera/interpolation math pass E2E because UI still renders. Debugging is slow since failures appear only through browser-level scenarios.
- **Suggested fix:** Add Vitest unit test layer for pure functions. Use existing `e2e/fixtures/` as test data. Wire into `npm test`.

---

### N03 — E2E export success path exercises only a localhost stub, not the real encoder/capture pipeline

- **Severity:** HIGH
- **Confidence:** High
- **Status:** Confirmed (same as cycle 2 F05)
- **Files:** `src/lib/useExportController.ts:20-29`, `src/lib/useExportController.ts:163-172`
- **Agreement:** test-engineer (TE-04), debugger (implied)
- **Failure scenario:** CI stays green while real `exportVideo()`, `waitForIdle()`, canvas capture, codec probing, or MP4 finalization break.
- **Suggested fix:** Add at least one small real-export smoke path with very short duration/resolution/fps. Run behind explicit non-stub flag.

---

### N04 — Google JSON parser logic is duplicated in worker vs main thread without parity tests

- **Severity:** MEDIUM-HIGH
- **Confidence:** High
- **Status:** Confirmed (same as cycle 2 F03)
- **Files:** `src/lib/parser.ts:253-539`, `public/workers/trackParser.worker.js:45-262`
- **Agreement:** architect (ARCH-04), test-engineer (implied), critic (implied)
- **Failure scenario:** A fix for one Google export shape lands in `src/lib/parser.ts` but not in the worker. Small fallback imports and worker-capable large imports produce different results.
- **Suggested fix:** Extract shared Google parsing logic into one module consumed by both contexts. Add behavioral parity tests.

---

### N05 — Export still routes playback progress through React state at ~10Hz during export

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Partially addressed by uncommitted throttle; still entangled
- **Files:** `src/lib/useExportController.ts:179-184`, `src/components/MapView.tsx:914-1020`
- **Agreement:** perf-reviewer (P-02), architect (ARCH-03), code-reviewer (CR-05)
- **Failure scenario:** During export, `setPlaybackProgress` (throttled to ~10Hz) triggers MapView's `useEffect([progress])` which updates marker, trail, and camera. This is unnecessary during export — only camera updates are needed. The throttle reduces but does not eliminate the entanglement.
- **Suggested fix:** Add `isExporting` prop to MapView that suppresses non-camera side effects during export. Camera updates go through `renderFrameAndWait` only. At completion, sync progress and re-enable effects.

---

### N06 — `renderFrameAndWait` can deadlock if MapLibre never fires a `render` event

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** New finding from uncommitted code
- **Files:** `src/components/MapView.tsx:486-517` (uncommitted)
- **Agreement:** debugger (DBG-03)
- **Failure scenario:** If the camera state is identical to the current map state, MapLibre may not repaint. The `render` event never fires, leaving the promise pending indefinitely and stalling the export.
- **Suggested fix:** Add a timeout (3-5 seconds) to `renderFrameAndWait`. If the timeout fires, resolve anyway (a duplicate frame is acceptable). Alternatively, check if the camera state is identical and resolve immediately.

---

### N07 — `normalizeBasePath` is triplicated across three files

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed (same as prior cycle)
- **Files:** `src/types.ts:23-27`, `src/lib/parser.ts:594-598`, `src/lib/env.ts`
- **Agreement:** code-reviewer (CR-01)
- **Failure scenario:** A normalization logic change must be applied in three places. If one copy diverges, worker URLs or style paths may break.
- **Suggested fix:** Remove duplicates from `types.ts` and `parser.ts`. Import from `env.ts`.

---

### N08 — Scene editor range sliders have static `aria-valuemin`/`aria-valuemax`

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed (same as cycle 2 F11)
- **Files:** `src/components/SceneEditor.tsx:189-190`
- **Agreement:** code-reviewer (CR-04), designer (D-01)
- **Failure scenario:** Screen-reader users hear `aria-valuemin={0}` / `aria-valuemax={100}` for start/end handles, but the real constraint is dynamic. WCAG 4.1.2 / 1.3.1 violation.
- **Suggested fix:** Make min/max dynamic per handle, matching `TimelineSelector` pattern.

---

### N09 — `handleRangeChange` clears all scenes whenever the range is not full

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/app/page.tsx:293-297`
- **Agreement:** critic (C-03)
- **Failure scenario:** User carefully authors a scene composition, then drags a timeline handle. All scenes are silently destroyed with no undo or confirmation.
- **Suggested fix:** Re-scale scenes proportionally to the new range, or show a confirmation dialog before discarding.

---

### N10 — Scene normalization silently mutates user intent; UI warns after the fact

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed (same as cycle 2 F24/F30)
- **Files:** `src/lib/camera.ts:19-43`, `src/components/SceneEditor.tsx:265-281`
- **Agreement:** critic (C-02), architect (ARCH-05)
- **Failure scenario:** User creates overlapping scenes; `normalizeScenes()` silently clamps them. The user cannot see or restore their original values. Future undo/timeline-snapping features are harder.
- **Suggested fix:** Store raw authored scenes in UI state. Derive normalized scenes only for playback/export. Show warnings against raw values.

---

### N11 — Map layer ownership is split across MapView, JourneyCreator, and export controller

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed (same as cycle 2 F07)
- **Files:** `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`, `src/lib/useExportController.ts`
- **Agreement:** architect (ARCH-01), code-reviewer (implied)
- **Failure scenario:** Multiple components independently mutate the same MapLibre instance. Style reload, export resize, or mode transition can leave stale listeners or remove layers out of order.
- **Suggested fix:** Replace `getMap()` with explicit overlay registration APIs. Make MapView the sole MapLibre mutator.

---

### N12 — Track session state is spread across 12+ independent state atoms in page.tsx

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed (same as cycle 2 F08)
- **Files:** `src/app/page.tsx:61-112`, `src/app/page.tsx:258-315`
- **Agreement:** architect (ARCH-02), code-reviewer (CR-08)
- **Failure scenario:** A future feature edits track/session state but forgets one coupled reset path.
- **Suggested fix:** Extract `useTrackSessionController` reducer for session-level transitions.

---

### N13 — Animated mesh background does not respect `prefers-reduced-motion`

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** Confirmed (same as cycle 2 F13)
- **Files:** `src/app/layout.tsx:80`, `src/styles/vitro-base.css:389-435`
- **Agreement:** perf-reviewer (P-03), designer (D-03)
- **Failure scenario:** Animated decorative background competes with map rendering. For reduced-motion users, the animation loop still churns.
- **Suggested fix:** Set `animation: none !important` under `prefers-reduced-motion`. Pause mesh during export.

---

### N14 — Export memory guard underestimates peak for 4K exports

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** Confirmed (same as cycle 2 F14)
- **Files:** `src/lib/videoEncoder.ts:36-49`
- **Agreement:** perf-reviewer (P-06), security-reviewer (SEC-02)
- **Failure scenario:** Mobile browser accepts a long 4K export under the cap but crashes during encoding because actual memory exceeds the estimate.
- **Suggested fix:** Increase multiplier to 8x or add resolution-dependent scaling. Lower cap for mobile user agents.

---

### N15 — Worker crash fallback only works for files under 16MB

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/lib/parser.ts:609`, `src/lib/parser.ts:672-680`
- **Agreement:** debugger (DBG-02)
- **Failure scenario:** For files between 16MB and 100MB, a worker crash results in a `WORKER_FAILED` error with no recovery and no actionable guidance.
- **Suggested fix:** Improve error message for large-file worker crashes. Suggest smaller date range or different browser.

---

### N16 — Export can leave the map in a resized state if `resetSize` fails during cleanup

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** Confirmed
- **Files:** `src/lib/useExportController.ts:227-235`
- **Agreement:** debugger (DBG-01)
- **Failure scenario:** If `resetSize` throws (e.g., map destroyed during export), the container element retains forced width/height inline styles. User sees a permanently resized map until reload.
- **Suggested fix:** In `resetSize`, clear container styles first, then wrap `map.resize()` in try/catch. Add CSS class override as fallback.

---

### N17 — Mobile "more controls" panel is marked dialog but is not truly modal

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed (same as cycle 2 F12)
- **Files:** `src/components/TrackToolbar.tsx`
- **Agreement:** designer (D-02)
- **Failure scenario:** Keyboard users can tab into page content behind the panel while it is open. WCAG 2.4.3 / 4.1.2 violation.
- **Suggested fix:** Reuse `ModalDialog` for mobile panel, or downgrade to true popover/menu with correct semantics.

---

### N18 — Error handling inconsistency: videoEncoder uses generic Error while parser uses ParseError

- **Severity:** LOW
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/lib/videoEncoder.ts:86,169`, `src/lib/parser.ts:12-18`
- **Agreement:** critic (C-06)
- **Failure scenario:** Export errors cannot be i18n-translated using the same pattern as parse errors. User sees raw English error text in toast.
- **Suggested fix:** Create `ExportError` class with machine-readable codes. Map export error codes to i18n keys.

---

### N19 — Export test stub is not documented

- **Severity:** LOW
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/lib/useExportController.ts:20-29`
- **Agreement:** critic (C-04), document-specialist (DS-03)
- **Failure scenario:** Developer accidentally enables `travelback-export-test-stub` localStorage flag. Sees "successful" 26-byte stub exports without realizing.
- **Suggested fix:** Document the test stub. Add visible console warning when active.

---

### N20 — Uncommitted changes need to be committed and gate-tested

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** 8 files with uncommitted changes
- **Agreement:** code-reviewer (CR-09), critic (C-01)
- **Failure scenario:** Uncommitted changes address 7 prior findings but are not validated by build gates or E2E tests. They could introduce regressions.
- **Suggested fix:** Commit as separate semantic commits, running gates between each.

---

### N21 — `isLocalExportTestStubEnabled` is duplicated in two files

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:20-29`, `src/components/ExportPanel.tsx:37-46`
- **Agreement:** code-reviewer (CR-02)
- **Suggested fix:** Extract to shared utility.

---

### N22 — `computeCumulativeDistances` is computed in both page.tsx and MapView fallback

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:149-158`, `src/components/MapView.tsx:860-862`
- **Agreement:** perf-reviewer (P-04)
- **Suggested fix:** Remove MapView fallback. Make `cumulativeDistances` a required prop when `track` is provided.

---

### N23 — Locale handling never sets `dir` attribute (RTL unreadiness)

- **Severity:** LOW
- **Confidence:** Medium
- **Status:** Confirmed (same as cycle 2 F28)
- **Files:** `src/lib/i18n.ts`, `src/app/page.tsx`
- **Agreement:** designer (D-04)
- **Suggested fix:** Set `document.documentElement.dir` from locale. Migrate to logical CSS properties.

---

### N24 — Architecture doc does not document `renderFrameAndWait` export path

- **Severity:** LOW
- **Confidence:** High
- **Files:** `.context/project/02-architecture.md:46-67`
- **Agreement:** document-specialist (DS-04)
- **Suggested fix:** Update Export Pipeline section to reflect `renderFrameAndWait` path.

---

### N25 — `videoEncoder.ts` `waitForIdle` fallback uses double-rAF without tile guarantee

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:144-150`
- **Agreement:** code-reviewer (CR-06)
- **Suggested fix:** Document limitation or make `waitForIdle` required for export.

---

### N26 — `usePlaybackController` fallback timer can fire after component unmount

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/usePlaybackController.ts:119`
- **Agreement:** critic (C-05)
- **Suggested fix:** Move `mountedRef` check to the very beginning of `animate`.

---

### N27 — Reference grid recomputed on every track/style change without caching

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:241-350`, `src/components/MapView.tsx:869`
- **Agreement:** perf-reviewer (P-03, in prior cycle)
- **Suggested fix:** Cache grid data keyed on track reference.

---

### N28 — `normalizeBasePath` does not reject path traversal

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/env.ts`, `src/lib/parser.ts:613-614`
- **Agreement:** security-reviewer (SEC-01)
- **Suggested fix:** Add `..` rejection in `normalizeBasePath`. Defense-in-depth only.

---

## Aggregate priority

### Must-address (correctness, data-loss, guard regression):

1. **N01** — Per-frame trail geometry rebuild O(points) during playback (HIGH)
2. **N02** — No unit test layer (HIGH)
3. **N03** — Real export untested (HIGH)
4. **N04** — Duplicated Google parser (MEDIUM-HIGH)
5. **N06** — `renderFrameAndWait` deadlock risk (MEDIUM)
6. **N09** — Timeline trim destroys scenes (MEDIUM)
7. **N20** — Uncommitted changes need gate-testing (MEDIUM)
8. **N08** — Scene editor static aria bounds (MEDIUM)

### Performance/test risks (address where practical):

9. **N05** — Export React state entanglement (MEDIUM)
10. **N13** — Animated mesh vs reduced-motion (MEDIUM)
11. **N14** — Export memory guard underestimation (MEDIUM)
12. **N15** — Worker crash fallback 16MB limit (MEDIUM)
13. **N16** — Export resized map on resetSize failure (MEDIUM)
14. **N25** — videoEncoder double-rAF fallback (MEDIUM)

### Architectural (plan as larger refactors):

15. **N10** — Scene normalization mutates user intent (MEDIUM)
16. **N11** — Map layer ownership boundaries (MEDIUM)
17. **N12** — Session state coupling (MEDIUM)
18. **N17** — Mobile dialog semantics (MEDIUM)

### Documentation/low-priority:

19. **N07** — normalizeBasePath triplication (MEDIUM)
20. **N18** — ExportError consistency (LOW)
21. **N19** — Test stub documentation (LOW)
22. **N21** — isLocalExportTestStubEnabled duplication (LOW)
23. **N22** — computeCumulativeDistances fallback (LOW)
24. **N23** — RTL unreadiness (LOW)
24. **N24** — Architecture doc update (LOW)
25. **N26** — Playback timer unmount race (LOW)
26. **N27** — Reference grid caching (LOW)
27. **N28** — Path traversal defense-in-depth (LOW)

## Finding count summary

| Severity | Count | New this review | Carried from prior cycles |
|----------|-------|----------------|--------------------------|
| HIGH | 3 | 0 (all carried) | N01, N02, N03 |
| MEDIUM-HIGH | 1 | 0 (carried) | N04 |
| MEDIUM | 17 | 6 (N06, N09, N20, N16, N25, N07) | 11 carried |
| LOW | 8 | 5 (N18, N21, N26, N27, N28) | 3 carried |
| **Total** | **29** | **11** | **18** |

## Key delta from cycle 2 aggregate

- The 5 HIGH findings from cycle 2 (F01-F05) are carried forward: F01 is partially addressed by uncommitted throttle but not fully resolved; F02 is now N01; F03 is N04; F04 is N02; F05 is N03.
- **New HIGH-severity finding:** N06 (`renderFrameAndWait` deadlock risk) — introduced by the uncommitted F06 fix.
- **New MEDIUM findings:** N06 (deadlock), N09 (trim destroys scenes), N16 (resetSize failure), N25 (double-rAF fallback), N20 (uncommitted changes need gate-testing).
- The uncommitted changes correctly address 7 prior findings (F06, F10, F16, F17, F18, F25, F26) but introduce one new risk (N06) and are not yet committed or tested.
