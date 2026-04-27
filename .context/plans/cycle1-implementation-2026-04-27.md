# Cycle 1 Implementation Plan — 2026-04-27

Based on cycle 1 aggregate review at `.context/reviews/_aggregate-cycle1-2026-04-27.md`.
29 deduplicated findings (3 HIGH, 1 MEDIUM-HIGH, 17 MEDIUM, 8 LOW).

## Phase 0 — Commit existing uncommitted changes (N20)

Before any new work, the 8 files with uncommitted changes must be committed and
gate-tested. These address 7 prior findings but are currently unvalidated.

### C01 — Commit uncommitted fixes as separate semantic commits

- **Findings addressed:** F06 (export frame timing), F10 (timeline end-handle),
  F16 (degenerate LineString), F17 (bootstrap rewrite), F18 (GPX/KML point
  budget), F25/F26 (docs mismatches)
- **Files:** `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`,
  `src/components/TimelineSelector.tsx`, `src/lib/parser.ts`,
  `src/lib/useExportController.ts`, `scripts/harden-static-export.mjs`,
  `README.md`, `.context/project/02-architecture.md`
- **Fix:**
  1. Group changes into logical semantic commits:
     - `fix(export): 🐛 use MapLibre render event for frame capture` (MapView renderFrameAndWait + useExportController throttle)
     - `fix(timeline): 🐛 return hi index for end-handle on sparse tracks` (TimelineSelector)
     - `fix(journey): 🐛 guard degenerate LineString with <2 waypoints` (JourneyCreator)
     - `fix(parser): 🐛 assert point budget before push in GPX/GeoJSON paths` (parser)
     - `fix(build): 🐛 throw on silent bootstrap rewrite failure` (harden-static-export)
     - `docs: 📝 align camera mode names and import guide labels` (README + architecture)
  2. Run gates (`eslint`, `tsc --noEmit`, `next build`) after each commit.
- **Effort:** Small (organizing existing changes)
- **Status:** TODO

---

## Phase 1 — Must-address (correctness, data-loss, deadlock, guard regression)

### C02 — Add timeout to `renderFrameAndWait` to prevent deadlock (N06)

- **Severity:** MEDIUM (introduced by uncommitted code in C01)
- **Files:** `src/components/MapView.tsx:486-517`
- **Fix:**
  1. Add a 5-second timeout to `renderFrameAndWait`. If the `render` event
     never fires, resolve the promise anyway (a duplicate frame is acceptable
     for export).
  2. Before `jumpTo`, compare camera state to current map state. If identical,
     resolve immediately without waiting for a render event.
  3. Ensure timeout is cleaned up on normal resolve and on abort.
- **Effort:** Small
- **Status:** TODO

---

### C03 — Per-frame trail geometry rebuild is O(traveled points) during playback (N01)

- **Severity:** HIGH
- **Files:** `src/components/MapView.tsx:110-171`, `src/components/MapView.tsx:924-938`
- **Fix:**
  1. At track load time (`addTrackLayers`), pre-compute per-segment coordinate
     arrays for the full track route. Store as a ref/memo keyed on track.
  2. During playback progress update, instead of slicing the entire coordinate
     array on every frame, only determine which segments have been fully
     traversed (use binary search on cumulative distances — already available)
     and append only the partial segment's coordinates.
  3. For the trail, maintain a "traveled" GeoJSON source that is updated
     incrementally: extend the endpoint on each frame rather than rebuilding.
  4. Consider using MapLibre `line-gradient` with feature-state for the
     traveled/untraveled visual distinction, which avoids GeoJSON updates
     entirely for the color change.
- **Effort:** Medium (MapView trail rendering refactor)
- **Status:** TODO

---

### C04 — Add unit test layer for pure functions (N02)

- **Severity:** HIGH
- **Files:** `src/lib/parser.ts`, `src/lib/camera.ts`, `src/lib/interpolate.ts`,
  `src/lib/videoEncoder.ts`
- **Fix:**
  1. Add `vitest` as dev dependency. Create `vitest.config.ts`.
  2. Add unit tests for:
     - `interpolate.ts`: cumulative distance computation, binary search
       interpolation, antimeridian wrapping, bearing computation
     - `camera.ts`: `normalizeScenes` sorting/clamping/filtering, camera
       blending edge cases, each mode's output bounds
     - `parser.ts`: fixture-based tests with exact normalized Track output
       comparison for GPX, KML, and Google JSON variants
     - `videoEncoder.ts`: `estimateExportMemoryBytes` edge cases,
       `estimateEncodedBytes` boundary conditions
  3. Wire `npm test` to run vitest. Add `test` script to `package.json`.
  4. Use existing `e2e/fixtures/` as test data where applicable.
- **Effort:** Large (new testing infrastructure + test cases)
- **Status:** TODO

---

### C05 — Add real export smoke test (N03)

- **Severity:** HIGH
- **Files:** `src/lib/useExportController.ts:20-29`, `e2e/travelback.spec.ts`
- **Fix:**
  1. Add a Playwright E2E test case that runs a 2-second, 1-fps, low-res
     real export (no stub flag) with a small GPX fixture.
  2. Verify success state and that a non-trivial buffer is returned.
  3. Gate behind a `TRAVELBACK_REAL_EXPORT` env flag so it doesn't run in
     standard fast CI.
  4. Keep the stub test for fast CI.
- **Effort:** Small
- **Status:** TODO

---

### C06 — Extract shared Google parser logic (N04)

- **Severity:** MEDIUM-HIGH
- **Files:** `src/lib/parser.ts:253-539`, `public/workers/trackParser.worker.js:45-262`
- **Fix:**
  1. Extract shared Google parsing helpers (format detection, E7 conversion,
     semantic segment parsing, dedup, sorting) into a new module
     `src/lib/google-parser.ts`.
  2. Import in `src/lib/parser.ts` for main-thread fallback path.
  3. For the worker: since it runs as plain JS, bundle the shared module or
     inline it. The simplest approach is to have the worker import from a
     relative path after copying/symlinking, or use a build step.
  4. Add behavioral parity tests: run all JSON fixtures through both the
     main-thread and worker paths, deep-compare normalized results.
- **Effort:** Large (refactor + worker build integration)
- **Status:** TODO

---

### C07 — Scene editor static aria bounds (N08)

- **Severity:** MEDIUM
- **Files:** `src/components/SceneEditor.tsx:189-190`
- **Fix:**
  1. Set `aria-valuemin` on start handle to 0, `aria-valuemax` to
     `Math.round(endPercent * 100)`.
  2. Set `aria-valuemin` on end handle to `Math.round(startPercent * 100)`,
     `aria-valuemax` to 100.
  3. Match the `TimelineSelector` pattern which already uses dynamic bounds.
- **Effort:** Tiny
- **Status:** TODO

---

### C08 — Timeline trim destroys scenes without confirmation (N09)

- **Severity:** MEDIUM
- **Files:** `src/app/page.tsx:293-297`
- **Fix:**
  1. When `handleRangeChange` detects a non-full range AND scenes exist, show
     a confirmation dialog before clearing.
  2. If the user cancels, do not apply the range change.
  3. If the user confirms, clear scenes and apply the range change.
  4. Alternatively, re-scale scenes proportionally to the new range instead of
     discarding — but confirmation dialog is the minimum safe fix.
- **Effort:** Small
- **Status:** TODO

---

## Phase 2 — Performance/test risks

### C09 — Suppress non-camera side effects during export (N05)

- **Severity:** MEDIUM
- **Files:** `src/lib/useExportController.ts:179-184`, `src/components/MapView.tsx:914-1020`
- **Fix:**
  1. Add an `isExporting` ref/prop to MapView.
  2. When `isExporting` is true, skip the `useEffect([progress])` that updates
     marker, trail, and camera. Camera updates go through
     `renderFrameAndWait` only.
  3. At export completion, sync progress to the final value and re-enable
     effects.
  4. Remove the throttled `setPlaybackProgress` from the export loop entirely;
     only call it once at completion.
- **Effort:** Medium
- **Status:** TODO

---

### C10 — Animated mesh background should respect `prefers-reduced-motion` (N13)

- **Severity:** MEDIUM
- **Files:** `src/app/layout.tsx:80`, `src/styles/vitro-base.css:389-435`,
  `src/styles/vitro-base.css:761-767`
- **Fix:**
  1. Replace the `0.01ms !important` animation duration with
     `animation: none !important` under `@media (prefers-reduced-motion: reduce)`.
  2. Consider adding a CSS class or data attribute on the body during export
     to pause the mesh animation, reducing GPU competition.
- **Effort:** Small
- **Status:** TODO

---

### C11 — Export memory guard underestimates peak for 4K exports (N14)

- **Severity:** MEDIUM
- **Files:** `src/lib/videoEncoder.ts:36-49`
- **Fix:**
  1. Increase the `rawFrameBytes` multiplier from 4x to 8x to account for
     double-buffering, codec intermediate buffers, and canvas readback.
  2. Add resolution-dependent scaling: for resolutions above 1920x1080,
     apply an additional 1.5x multiplier.
  3. Lower the cap for mobile user agents (detect via navigator.userAgent).
- **Effort:** Small
- **Status:** TODO

---

### C12 — Worker crash fallback only works for files under 16MB (N15)

- **Severity:** MEDIUM
- **Files:** `src/lib/parser.ts:609`, `src/lib/parser.ts:672-680`
- **Fix:**
  1. Improve the `WORKER_FAILED` error message for large files (>16MB) to
     include actionable guidance: "This file may be too large for your browser.
     Try importing a smaller date range or using a different browser."
  2. Add a specific error code like `WORKER_FAILED_LARGE` to distinguish from
     small-file worker crashes.
- **Effort:** Tiny
- **Status:** TODO

---

### C13 — Export can leave map in resized state if `resetSize` fails (N16)

- **Severity:** MEDIUM
- **Files:** `src/lib/useExportController.ts:227-235`
- **Fix:**
  1. In `resetSize`, clear container inline styles first (already done).
  2. Wrap `map.resize()` in try/catch. If it throws, the container is still
     restored to its natural size.
  3. Add a CSS class override as fallback: apply a class that forces the
     container back to its natural dimensions, remove after a brief delay.
- **Effort:** Small
- **Status:** TODO

---

### C14 — `videoEncoder.ts` `waitForIdle` double-rAF fallback (N25)

- **Severity:** MEDIUM
- **Files:** `src/lib/videoEncoder.ts:144-150`
- **Fix:**
  1. Document the limitation clearly: double-rAF does NOT guarantee tile
     loading completion.
  2. Make `waitForIdle` a required parameter for export (remove the fallback
     path or throw if not provided).
  3. Add a console.warn when the fallback is used so developers know tile
     completeness is not guaranteed.
- **Effort:** Small
- **Status:** TODO

---

## Phase 3 — Architectural refactors (plan as larger efforts)

### C15 — Scene normalization silently mutates user intent (N10)

- **Severity:** MEDIUM
- **Files:** `src/lib/camera.ts:19-43`, `src/components/SceneEditor.tsx:265-281`
- **Fix:**
  1. Store raw authored scenes in UI state (before normalization).
  2. Derive normalized scenes only for playback/export.
  3. Show warnings against raw values when normalization changes them.
  4. This enables future undo and timeline-snapping features.
- **Effort:** Medium (refactor scene state management)
- **Status:** DEFERRED — requires product decision on undo/versioning UX.
  Minimum: add comment documenting that normalization mutates and why.

---

### C16 — Map layer ownership split across MapView, JourneyCreator, export controller (N11)

- **Severity:** MEDIUM
- **Files:** `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`,
  `src/lib/useExportController.ts`
- **Fix:**
  1. Replace `getMap()` with explicit overlay registration/update APIs on
     MapView's imperative handle.
  2. Make MapView the sole MapLibre mutator. JourneyCreator requests overlay
     additions through MapView's imperative handle rather than reaching into
     the map directly.
  3. Export controller uses only the exposed imperative methods.
- **Effort:** Large (architectural refactor)
- **Status:** DEFERRED — requires architectural refactor. Plan as a dedicated
  cycle after unit tests are in place (C04).

---

### C17 — Track session state spread across 12+ independent state atoms (N12)

- **Severity:** MEDIUM
- **Files:** `src/app/page.tsx:61-112`, `src/app/page.tsx:258-315`
- **Fix:**
  1. Extract `useTrackSessionController` reducer for session-level transitions:
     `loadTrack`, `startJourney`, `trimRange`, `editScenes`, `resetExport`,
     `resetPlayback`.
  2. Replace individual `useState` calls with dispatch actions.
  3. Makes it impossible to forget a reset step.
- **Effort:** Large (page.tsx refactor)
- **Status:** DEFERRED — requires significant page.tsx refactor. Plan after
  C16 (layer ownership) to avoid conflicting changes.

---

### C18 — Mobile "more controls" panel is not truly modal (N17)

- **Severity:** MEDIUM
- **Files:** `src/components/TrackToolbar.tsx`
- **Fix:**
  1. Reuse `ModalDialog` for the mobile panel, or
  2. Downgrade to true popover/menu with correct semantics and roving focus.
  3. Ensure focus trapping and correct ARIA roles.
- **Effort:** Small-Medium
- **Status:** DEFERRED — accessibility fix, separate from correctness. Schedule
  after Phase 1 completes.

---

## Phase 4 — Documentation and low-priority fixes

### C19 — Deduplicate `normalizeBasePath` (N07)

- **Severity:** MEDIUM
- **Files:** `src/types.ts:23-27`, `src/lib/parser.ts:594-598`, `src/lib/env.ts`
- **Fix:**
  1. Remove duplicates from `types.ts` and `parser.ts`.
  2. Import from `env.ts` as the single source of truth.
- **Effort:** Tiny
- **Status:** TODO

---

### C20 — Create `ExportError` class with machine-readable codes (N18)

- **Severity:** LOW
- **Files:** `src/lib/videoEncoder.ts:86,169`, `src/lib/parser.ts:12-18`
- **Fix:**
  1. Create `ExportError` class mirroring `ParseError` pattern with
     machine-readable error codes.
  2. Replace generic `Error` throws in videoEncoder with `ExportError`.
  3. Map export error codes to i18n keys for consistent toast messages.
- **Effort:** Small
- **Status:** TODO

---

### C21 — Document export test stub and add console warning (N19)

- **Severity:** LOW
- **Files:** `src/lib/useExportController.ts:20-29`
- **Fix:**
  1. Add a `console.warn('Travelback export test stub is active — exports will be 26-byte stubs')`
     when `isLocalExportTestStubEnabled()` returns true.
  2. Add a brief note in the development section of README explaining the stub.
- **Effort:** Tiny
- **Status:** TODO

---

### C22 — Deduplicate `isLocalExportTestStubEnabled` (N21)

- **Severity:** LOW
- **Files:** `src/lib/useExportController.ts:20-29`, `src/components/ExportPanel.tsx:37-46`
- **Fix:**
  1. Extract to a shared utility in `src/lib/test-stub.ts` (or similar).
  2. Import in both `useExportController.ts` and `ExportPanel.tsx`.
- **Effort:** Tiny
- **Status:** TODO

---

### C23 — Remove `computeCumulativeDistances` fallback in MapView (N22)

- **Severity:** LOW
- **Files:** `src/app/page.tsx:149-158`, `src/components/MapView.tsx:860-862`
- **Fix:**
  1. Make `cumulativeDistances` a required prop when `track` is provided.
  2. Remove the fallback computation in MapView.
- **Effort:** Tiny
- **Status:** TODO

---

### C24 — Locale handling never sets `dir` attribute (N23 / RTL unreadiness)

- **Severity:** LOW
- **Files:** `src/lib/i18n.ts`, `src/app/page.tsx`
- **Fix:**
  1. Set `document.documentElement.dir` from locale when RTL is detected.
  2. Migrate highest-impact positioning to logical CSS properties
     (`start`/`end` instead of `left`/`right`).
- **Effort:** Medium
- **Status:** DEFERRED — no RTL locales currently. Implement when first RTL
  locale is added.

---

### C25 — Update architecture doc to document `renderFrameAndWait` (N24)

- **Severity:** LOW
- **Files:** `.context/project/02-architecture.md:46-67`
- **Fix:**
  1. Update Export Pipeline section to reflect the `renderFrameAndWait` path:
     `camera.ts computeCameraForProgress() -> MapView.renderFrameAndWait() ->
     map.once('render') + rAF -> mediabunny CanvasSource.add()`.
  2. Note that `waitForIdle` is still used for initial map settling after resize.
- **Effort:** Tiny
- **Status:** TODO

---

### C26 — Fix `usePlaybackController` fallback timer unmount race (N26)

- **Severity:** LOW
- **Files:** `src/lib/usePlaybackController.ts:119`
- **Fix:**
  1. Move `mountedRef.current` check to the very beginning of `animate`
     callback, before any state updates.
- **Effort:** Tiny
- **Status:** TODO

---

### C27 — Cache reference grid keyed on track reference (N27)

- **Severity:** LOW
- **Files:** `src/components/MapView.tsx:241-350`, `src/components/MapView.tsx:869`
- **Fix:**
  1. Memoize grid data computation with `useMemo` keyed on track reference.
  2. Use `track.points` identity (or a hash) as the cache key.
- **Effort:** Small
- **Status:** TODO

---

### C28 — Add `..` rejection in `normalizeBasePath` (N28)

- **Severity:** LOW
- **Files:** `src/lib/env.ts`, `src/lib/parser.ts:613-614`
- **Fix:**
  1. Add path traversal rejection: if the normalized path contains `..`,
     throw an error or strip it.
  2. Defense-in-depth only — the base path is derived from env vars, not
     user input.
- **Effort:** Tiny
- **Status:** TODO

---

## Implementation order

### Immediate (Phase 0 + Phase 1 must-address):
1. **C01** — Commit uncommitted changes as semantic commits
2. **C02** — Add timeout to `renderFrameAndWait` (N06, deadlock risk from C01)
3. **C07** — Fix scene editor static aria bounds (N08, tiny fix)
4. **C08** — Add confirmation before clearing scenes on trim (N09, small fix)
5. **C03** — Pre-compute trail geometry segments (N01, HIGH — core perf)
6. **C04** — Add Vitest unit test layer (N02, HIGH — test infrastructure)
7. **C05** — Add real export smoke test (N03, HIGH — test coverage)
8. **C06** — Extract shared Google parser (N04, MEDIUM-HIGH — dedup)

### Then (Phase 2 — performance/test risks):
9. **C09** — Suppress non-camera effects during export (N05)
10. **C10** — Animated mesh `prefers-reduced-motion` (N13)
11. **C11** — Increase export memory guard multiplier (N14)
12. **C12** — Improve worker crash error for large files (N15)
13. **C13** — Harden `resetSize` against map.destroy (N16)
14. **C14** — Make `waitForIdle` required / document double-rAF limitation (N25)

### Then (Phase 4 — low-priority, can be parallelized):
15. **C19** — Deduplicate `normalizeBasePath` (N07)
16. **C20** — Create `ExportError` class (N18)
17. **C21** — Document test stub + console warning (N19)
18. **C22** — Deduplicate `isLocalExportTestStubEnabled` (N21)
19. **C23** — Remove cumulative distances fallback (N22)
20. **C25** — Update architecture doc (N24)
21. **C26** — Fix playback timer unmount race (N26)
22. **C27** — Cache reference grid (N27)
23. **C28** — Path traversal defense in `normalizeBasePath` (N28)

### Deferred:
- **C15** — Scene normalization mutates user intent (N10) — needs product decision
- **C16** — Map layer ownership boundaries (N11) — needs architectural refactor
- **C17** — Session state coupling (N12) — needs page.tsx refactor
- **C18** — Mobile dialog semantics (N17) — accessibility, post-phase-1
- **C24** — RTL unreadiness (N23) — no RTL locales yet

## Quality gates

After each commit:
- `npm run lint` — must pass
- `npx tsc --noEmit` — must pass
- `npm run build` — must pass
- `git commit -S` — GPG-signed with conventional commit + gitmoji

## Deferral justification

All deferred findings are either:
- **Architectural refactors** (C15, C16, C17) that require dedicated cycles and
  should be done after the unit test layer (C04) is in place
- **Accessibility improvements** (C18) that are important but not
  correctness/data-loss issues
- **RTL readiness** (C24) with no current RTL locales

No security, correctness, or data-loss findings are deferred.
