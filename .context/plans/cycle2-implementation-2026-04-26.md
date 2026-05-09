# Cycle 2 Implementation Plan — 2026-04-26

Based on cycle 2 aggregate review at `.context/reviews/_aggregate-cycle2-2026-04-26.md`.

## Plan structure

Each finding below has: severity, file/region, fix description, and effort estimate.

## Must-address (F01-F05 HIGH severity, F06-F19 MEDIUM/LOW with corrective action)

---

### P01 — Export frame drives normal playback React path (F01)

- **Severity:** HIGH
- **File region:** `src/lib/useExportController.ts:173-186`, `src/lib/videoEncoder.ts:117-158`
- **Fix:**
  1. In `useExportController.ts`, split `renderFrame` into two paths: an imperative `renderExportFrame` that updates the map via refs without React state, and a throttled `onExportProgress` that updates visible state at ~4-10 Hz.
  2. Remove `setPlaybackProgress(nextProgress)` from the per-frame export callback. Only restore `playbackProgress` on export completion or abort.
  3. Add a new MapView imperative method `applyExportCameraState(cameraState)` that updates camera, marker position, and trail without triggering React effect chains.
- **Effort:** Medium (refactor of export controller + MapView interface)

---

### P02 — Per-frame trail geometry rebuild O(points) (F02)

- **Severity:** HIGH
- **File region:** `src/components/MapView.tsx:109-170`, `src/components/MapView.tsx:890-904`
- **Fix:**
  1. Precompute immutable per-segment coordinate arrays once per track load.
  2. Instead of rebuilding full trail GeoJSON each frame, update trail styling via MapLibre `line-gradient`/filter or use a tracked position-based approach.
  3. Alternatively, reuse precomputed segment coordinates and only update the head/cutoff point.
- **Effort:** Medium (MapView trail rendering refactor)
- **Note:** Coordinate with P01 since both paths update trail on progress.

---

### P03 — Duplicated Google parser logic (F03)

- **Severity:** HIGH
- **File region:** `src/lib/parser.ts:253-539`, `public/workers/trackParser.worker.js:45-262`
- **Fix:**
  1. Extract shared Google parsing helpers (format detection, E7 conversion, semantic segment parsing, dedup, sorting) into pure functions in a new module `src/lib/google-parser.ts`.
  2. Import this module in both `src/lib/parser.ts` and build the worker from it (or import via a bundled entry).
  3. Add behavioral parity tests that run all JSON fixtures through both paths and compare normalized output.
- **Effort:** Large (refactor to shared module + worker build integration)
- **Defer note:** If full extraction is too invasive for a single cycle, add parity tests first as minimum, then extract in a follow-up.

---

### P04 — No unit/integration test layer (F04)

- **Severity:** HIGH
- **File region:** `package.json:5-17`, `src/lib/parser.ts`, `src/lib/camera.ts`, `src/lib/interpolate.ts`
- **Fix:**
  1. Add a test runner (Node native test runner or vitest).
  2. Add focused unit tests for:
     - `interpolate.ts`: cumulative distance computation, binary search, antimeridian cases
     - `camera.ts`: scene normalization, camera blending, edge cases for each mode
     - `parser.ts`: fixture-based tests with exact normalized Track output comparison
     - `videoEncoder.ts`: estimate/memory guard edge cases
  3. Wire into `npm test` and CI.
- **Effort:** Large (new testing infrastructure + test cases)

---

### P05 — Real export untested (F05)

- **Severity:** HIGH
- **File region:** `src/lib/useExportController.ts:20-29`, `e2e/travelback.spec.ts:1299-1368`
- **Fix:**
  1. Add a short-duration (2s at 1fps) real export smoke test that does NOT set the stub flag.
  2. Run it in static E2E with a small GPX fixture and verify success state.
  3. Keep the stub test for fast CI, but the real path must be covered separately.
- **Effort:** Small (new E2E test case with real export path)

---

### P06 — Export frame capture timing (F06)

- **Severity:** MEDIUM
- **File region:** `src/components/MapView.tsx:475-568`, `src/lib/useExportController.ts:173-183`
- **Fix:**
  1. In the export frame render path, wait for a MapLibre `render` event after `jumpTo` before capturing.
  2. Replace `waitForIdle()` fast-path for export: add `renderFrameAndWait(cameraState, signal)` that guarantees a fresh frame.
- **Effort:** Small (MapView export frame API change)

---

### P07 — Timeline end-handle under-select sparse tracks (F10)

- **Severity:** LOW-MEDIUM
- **File region:** `src/components/TimelineSelector.tsx:29-52`
- **Fix:**
  1. Change `ratioToIndex()` end-handle logic to return first index at or after the target distance.
  2. If trimmed result is too short, keep minimum two-point guard.
  3. Add deterministic unit tests for uneven cumulative distances.
- **Effort:** Small

---

### P08 — JourneyCreator degenerate LineString (F16)

- **Severity:** MEDIUM
- **File region:** `src/components/JourneyCreator.tsx:80-101, 192-236`
- **Fix:**
  1. Guard `buildLineGeoJSON()` and `updateMapData()`: for 0 points use empty FeatureCollection; for 1 point do not update the line source.
  2. Initialize the line source with an empty FeatureCollection.
  3. Only update line source when >=2 waypoints exist.
- **Effort:** Small

---

### P09 — Static hardening bootstrap rewrite silent failure (F17)

- **Severity:** MEDIUM
- **File region:** `scripts/harden-static-export.mjs:74-85, 116-130`
- **Fix:**
  1. Return `{ html, replaced }` from `inlineTravelbackBootstrap()`.
  2. Throw if source contains `travelback-bootstrap` id but no replacement occurred.
  3. Add smoke assertion that `out/index.html` contains direct `<script id="travelback-bootstrap">` form.
- **Effort:** Small

---

### P10 — GPX/KML point limit after materialization (F18)

- **Severity:** MEDIUM
- **File region:** `src/lib/parser.ts:51-146, 195-224, 704-715`
- **Fix:**
  1. Thread `assertPointBudget()` into GPX/KML segment accumulation before batch push.
  2. Reject at extraction boundary rather than after full Track built.
- **Effort:** Small

---

### P11 — Google E2E weak assertions (F19)

- **Severity:** MEDIUM
- **File region:** `e2e/travelback.spec.ts:1391-1438`
- **Fix:**
  1. Replace generic `/\d+ \/ \d+ locations/` regex with exact expected point counts for each fixture.
  2. Add fixture comments documenting expected count/order/segments.
- **Effort:** Small

---

### P12 — Scene stale warnings (F24)

- **Severity:** LOW-MEDIUM
- **File region:** `src/components/SceneEditor.tsx:254-278`
- **Fix:**
  1. Store raw authored scenes in UI state.
  2. Derive normalized scenes only for playback/export.
  3. Calculate warnings against raw scenes before normalization.
- **Effort:** Medium (refactor scene state management)

---

### P13 — README import guide description (F25)

- **Severity:** LOW
- **File:** `README.md:64, 127`
- **Fix:** Update description to reflect 7-tab import guide (Google Maps, Google Takeout, Strava, Garmin, AllTrails, Komoot, Other Apps).
- **Effort:** Tiny

---

### P14 — Camera mode names mismatch (F26)

- **Severity:** LOW
- **Files:** `README.md:48`, `.context/project/02-architecture.md:73-80`
- **Fix:** Add doc table mapping semantic camera keys to UI labels, or align naming.
- **Effort:** Tiny

---

### P15 — Temp script cleanup (F27)

- **Severity:** LOW
- **File:** `.tmp-travelback-mina-manual.mjs`
- **Fix:** Delete the untracked temp script. It is obsolete and causes confusion.
- **Effort:** Tiny

---

## Deferred findings (performance/test risks requiring larger refactors)

| ID | Issue | Reason for deferral | File | Exit criterion |
|-----|-------|---------------------|------|----------------|
| F07 | Map layer ownership split | Requires architectural refactor of MapView/JourneyCreator boundaries | `MapView.tsx`, `JourneyCreator.tsx` | `getMap()` replaced with narrow overlay APIs |
| F11 | Scene editor aria bounds | Medium accessibility fix, separate from correctness | `SceneEditor.tsx:178-190` | Dynamic min/max per handle matching TimelineSelector |
| F12 | Mobile dialog semantics | Medium accessibility fix, separate from correctness | `TrackToolbar.tsx` | Reuse ModalDialog or downgrade semantics |
| F13 | Animated mesh reduced-motion | Low priority, UX polish | `vitro-base.css:761-767` | `animation: none` under `prefers-reduced-motion` |
| F14 | In-memory export buffer duplication | Requires streaming/file target investigation | `videoEncoder.ts:7` | Lower limit or use streaming target |
| F15 | Manual route drag perf | Low impact (manual routes are small) | `JourneyCreator.tsx:174-178` | Incremental segment distance computation |
| F20 | CI PR trigger | Medium, infra change | `.github/workflows/deploy-pages.yml` | Add `pull_request` trigger for build/test |
| F21 | Playwright flake tracking | Medium, infra change | `playwright.config.ts` | JSON reporter + flaky count tracking |
| F22 | Temp files in fixture dir | Low, test hygiene | `e2e/travelback.spec.ts` | Use `testInfo.outputPath()` |
| F09 | Eager map mount with preserved buffer | Requires lazy-mount architecture | `page.tsx:462-478` | Lazy-mount MapView until track exists |
| F08 | Session state coupling | Requires `useTrackSessionController` reducer | `page.tsx`, `TrackWorkspace.tsx` | Extract session reducer |

## Deferred findings (require hosting/product decisions)

| ID | Issue | Reason for deferral | File | Exit criterion |
|-----|-------|---------------------|------|----------------|
| F23 | GitHub Pages static headers | Known limitation, cannot add headers on Pages | N/A | Deploy behind header-capable CDN |
| F28 | RTL readiness | No RTL locales currently, low risk | `i18n.ts` | Set `dir` attribute when RTL locale added |
| F29 | Large import memory pressure | Requires streaming JSON parsing architecture | `parser.ts`, `trackParser.worker.js` | Measure and lower limits based on browser memory |
| F30 | Scene raw state preservation | Product decision on undo/versioning UX | `SceneEditor.tsx`, `camera.ts` | Store raw scenes in UI state, derive normalized |
| F31 | Scene editor too technical | UX improvement, not a regression | `SceneEditor.tsx` | Preset-oriented copy, hide advanced params |
| F32 | Korean export i18n gaps | UX polish, not a regression | `i18n.ts`, `ExportPanel.tsx` | Naturalize Korean export copy |

## Implementation order

1. **P15** (temp script delete) — trivially safe
2. **P13, P14** (README/docs) — trivially safe
3. **P08** (JourneyCreator LineString) — small, prevents MapLibre errors
4. **P10** (GPX/KML point budget) — small, prevents memory issues
5. **P07** (Timeline end-handle) — small, fixes trim correctness
6. **P09** (Static hardening bootstrap) — small, prevents silent regression
7. **P11** (Google E2E assertions) — small, improves test signal
8. **P06** (Export frame timing) — small, fixes export capture correctness
9. **P01+P02** (Export React churn + trail rebuild) — medium, core performance fix
10. **P05** (Real export test) — small, after P01+P02 refactor
11. **P12** (Scene stale warnings) — medium
12. **P03** (Parser deduplication) — large, may span cycles
13. **P04** (Unit test layer) — large, may span cycles

## Quality gates

After implementation:
- `npm run lint` — must pass
- `npm run typecheck` (`next typegen && tsc --noEmit`) — must pass
- `npm run build` — must pass
- `npm run test:e2e` or equivalent — must pass
- `git commit -S` — GPG-signed with conventional commit + gitmoji
