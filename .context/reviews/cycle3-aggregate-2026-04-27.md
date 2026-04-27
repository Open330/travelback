# Cycle 3 Aggregate Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Re-evaluation summary

Since the cycle 2 aggregate (2026-04-27), 15 commits have been pushed fixing many findings. This cycle re-evaluates all carried findings against the current HEAD (a334ad3).

## Resolved findings (since cycle 2 aggregate)

| ID | Finding | Resolution | Commit |
|----|---------|------------|--------|
| N01 | Trail O(n) rebuild | Precomputed segments eliminate per-frame wrapping/copying | aea98c4 |
| N02 (partial) | No unit test layer | Vitest added with 4 test files, 60 tests (parser tests still missing) | 755902a |
| N05 | Export React entanglement | `isExporting` guard skips progress effect during export | 33c8694 |
| N06 | renderFrameAndWait deadlock | 5s timeout + identical-state fast path | earlier |
| N09 | Trim destroys scenes | `window.confirm` added before clearing scenes | 909199a |
| N13 | Mesh vs reduced-motion | `prefers-reduced-motion: reduce` now disables mesh animation | 1fda960 |
| N16 | Export resized map on resetSize failure | `resetSize` clears styles first, try/catch on resize | earlier |
| N21 | isLocalExportTestStubEnabled duplication | Extracted to shared `src/lib/test-stub.ts` module | 6307f1f |
| N22 | computeCumulativeDistances fallback in MapView | Fallback removed, MapView requires prop | 28722e8 |
| N28 | normalizeBasePath path traversal | `..` rejection added in env.ts | 35c0466 |
| N29 | checkJsonDepth double traversal | Main thread skips `checkJsonDepth`, relies on JSON.parse RangeError | 9530edd |
| N33 | stripXmlEntities redundancy | Kept as defense-in-depth (confirmed intentional) | — |
| N35 | Export panel swipe-to-dismiss conflict | Vertical-dominant swipe now required for dismiss | 79c8285 |

## Carried findings (still open)

### Still HIGH

---

### C3-01 — No parser unit tests (N02 partial)

- **Severity:** HIGH
- **Confidence:** High
- **Status:** UNCHANGED — parser.ts has no unit tests; 4 other modules have coverage
- **Files:** `src/lib/parser.ts`
- **Detail:** The Google JSON parser handles 6 different formats with complex dedup, sorting, and validation logic. No automated tests verify any of these paths. E2E tests cover the upload UI but not parser edge cases.
- **Suggested fix:** Add parser fixture tests covering: GPX with segments, KML multi-geometry, each Google JSON format variant, point budget enforcement, XML entity rejection, nesting depth limits.

---

### C3-02 — E2E export success path exercises only a localhost stub (N03)

- **Severity:** HIGH
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/lib/useExportController.ts`, `src/lib/test-stub.ts`
- **Detail:** The stub bypasses `exportVideo()` entirely. A real export smoke test exists (commit 947215a) but is separate from the main stub test. The stub path means CI can pass while the real encoder is broken.
- **Suggested fix:** Ensure the real export smoke test runs in CI alongside the stub test.

---

### Still MEDIUM-HIGH

---

### C3-03 — Google JSON parser logic duplicated in worker vs main thread (N04)

- **Severity:** MEDIUM-HIGH
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/lib/parser.ts:253-539`, `public/workers/trackParser.worker.js:45-262`
- **Detail:** Both files implement Google JSON parsing independently. A fix to one path can be missed in the other. No parity tests exist.
- **Suggested fix:** Extract shared parsing logic. At minimum, add parity tests.

---

### Still MEDIUM

---

### C3-04 — `normalizeBasePath` still referenced in types.ts (N07 partial)

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/types.ts:23` imports `basePath` from `@/lib/env` — this is correct (not a duplicate). The original triplication concern about `normalizeBasePath` was resolved; this import is the proper usage.
- **Resolution note:** This finding can be closed — `types.ts` correctly imports from `env.ts`, not duplicating the function.

---

### C3-05 — Scene editor range sliders have static `aria-valuemin`/`aria-valuemax` (N08)

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/components/SceneEditor.tsx:189-190`
- **Detail:** The `aria-valuemin` for the start handle is always 0 and `aria-valuemax` for the end handle is always 100, regardless of the other handle's position. This violates WCAG 4.1.2.
- **Suggested fix:** Make `aria-valuemin`/`aria-valuemax` dynamic per handle, matching the TimelineSelector pattern.

---

### C3-06 — Scene normalization silently mutates user intent (N10)

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/lib/camera.ts:19-43`, `src/components/SceneEditor.tsx:265-281`
- **Detail:** `normalizeScenes()` clamps, sorts, and filters scenes. The SceneEditor stores normalized scenes, losing raw user intent. Warnings are computed post-normalization.
- **Suggested fix:** Store raw authored scenes in UI state. Derive normalized scenes only for playback/export.

---

### C3-07 — Map layer ownership split across MapView, JourneyCreator, and export controller (N11)

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`, `src/lib/useExportController.ts`
- **Detail:** Multiple components independently mutate the same MapLibre instance. Style reload or export resize can leave stale listeners or wrong layer state.
- **Suggested fix:** Replace `getMap()` feature access with narrow overlay registration/update APIs on MapView.

---

### C3-08 — Track session state spread across many independent atoms in page.tsx (N12)

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/app/page.tsx:61-112`
- **Detail:** 12+ independent `useState` atoms with implicit coupling. Future features editing track/session state risk forgetting one coupled reset path.
- **Suggested fix:** Extract a `useTrackSessionController` reducer for session-level transitions.

---

### C3-09 — Export memory guard underestimates peak for 4K exports (N14)

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** UNCHANGED
- **Files:** `src/lib/videoEncoder.ts:36-49`
- **Detail:** `estimateExportMemoryBytes` uses 8x multiplier with 1.5x for 4K. On mobile, the 256MB cap may still be too high given tab memory limits.
- **Suggested fix:** Lower in-memory limit or provide streaming/file target for mobile.

---

### C3-10 — Worker crash fallback only works for files under 16MB (N15)

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** PARTIALLY RESOLVED — error message improved
- **Files:** `src/lib/parser.ts:599-603`
- **Detail:** Files above 16MB that fail in the worker cannot fall back to main-thread parsing. The error message is now clearer but the limitation persists.
- **Suggested fix:** Accept as known limitation or raise the fallback threshold for browsers with more memory.

---

### C3-11 — Mobile "more controls" panel is marked dialog but is not truly modal (N17)

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/components/TrackToolbar.tsx`
- **Detail:** Keyboard users can tab into page content behind the panel. Screen readers get a dialog that is not actually modal.
- **Suggested fix:** Reuse `ModalDialog` or downgrade to correct popover/menu semantics.

---

### C3-12 — videoEncoder double-rAF fallback without tile guarantee (N25)

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/lib/videoEncoder.ts:161-172`
- **Detail:** When `waitForIdle` is not provided, the fallback uses double-rAF which does not guarantee tile loading completion.
- **Suggested fix:** Export callers always provide `waitForIdle`; the fallback could be removed or made to warn loudly in development.

---

### C3-13 — No test for `isExporting` guard in MapView (N30)

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/components/MapView.tsx:1000`
- **Detail:** The `isExporting` guard is critical correctness path. No test verifies that progress updates are suppressed during export, trail/marker state is restored after export, or the guard doesn't cause stale geometry.
- **Suggested fix:** Add E2E or integration test for export guard.

---

### C3-14 — `isExporting` prop creates implicit contract between useExportController and MapView (N31)

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/components/MapView.tsx:25,454,1000`
- **Detail:** Future effects added to MapView must remember the `isExporting` guard. No type-level or lint-level enforcement.
- **Suggested fix:** Consider MapView internal state machine (`idle` | `playback` | `export`) instead of scattered boolean guards.

---

### C3-15 — ESLint warning: `handleRangeChange` missing dependency `t` (N20 partial)

- **Severity:** LOW
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/app/page.tsx:316`
- **Detail:** `useCallback` for `handleRangeChange` uses `t()` inside `window.confirm()` but omits `t` from the dependency array.
- **Suggested fix:** Add `t` to dependency array.

---

### Still LOW

| ID | Finding | Status | File |
|----|---------|--------|------|
| C3-16 | ExportError vs ParseError inconsistency (N18) | UNCHANGED | `src/lib/videoEncoder.ts`, `src/lib/parser.ts` |
| C3-17 | Test stub documentation (N19) | PARTIALLY RESOLVED — shared module exists but lacks JSDoc | `src/lib/test-stub.ts` |
| C3-18 | Trail update strategy split without parity verification (N32) | UNCHANGED | `src/components/MapView.tsx:1019-1076` |
| C3-19 | Locale dir attribute for RTL (N23) | UNCHANGED | `src/lib/i18n.ts`, `src/app/page.tsx` |
| C3-20 | Playback fallback timer could fire after unmount (N26) | UNCHANGED | `src/lib/usePlaybackController.ts:119` |
| C3-21 | Architecture doc missing isExporting/precomputed segments detail (N34) | RESOLVED | commit 7c47649 |
| C3-22 | Reference grid caching (N27) | RESOLVED | commit 3e332b8 |

## New findings this cycle

### C3-23 — `addTrackLayers` initial trail geometry is immediately overwritten

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:824`
- **Detail:** `buildTrackGeometry(track.points, track.segmentStartIndices, 0, track.points[0])` constructs a trail geometry that will be immediately overwritten on the first progress update. The trail source could start empty or with the full route geometry.
- **Impact:** One unnecessary geometry construction per track load. Negligible.

---

### C3-24 — ESLint warning for missing `t` dependency in `handleRangeChange`

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:316`
- **Detail:** `react-hooks/exhaustive-deps` warns that `useCallback` for `handleRangeChange` is missing `t` in its dependency array. The `t` function is used inside `window.confirm(t('scenes.trimClearConfirm'))`.
- **Impact:** If locale changes while the trim is in progress, the confirm dialog text would be stale. Low risk since locale changes are infrequent.

---

### C3-25 — Parser unit tests still missing despite Vitest infrastructure

- **Severity:** HIGH
- **Confidence:** High
- **Files:** `src/lib/parser.ts`, `vitest.config.ts`
- **Detail:** The Vitest infrastructure is in place (4 test files, 60 tests), but `parser.ts` — the most complex and fragile module — has zero unit tests. Google JSON parsing handles 6 formats with complex dedup, sorting, and validation. This is the highest-risk untested module.
- **Suggested fix:** Add parser fixture tests for each Google JSON format, GPX/KML edge cases, point budget enforcement, XML entity rejection, and nesting depth limits.

---

## Aggregate priority

### Must-address (correctness, data-loss, guard regression):

1. **C3-25** — Parser unit tests still missing (HIGH) — highest-risk untested module
2. **C3-02** — Real export untested (HIGH)
3. **C3-03** — Duplicated Google parser (MEDIUM-HIGH)

### Accessibility (WCAG compliance):

4. **C3-05** — Scene editor static aria bounds (MEDIUM)
5. **C3-11** — Mobile dialog semantics (MEDIUM)

### Performance/quality risks:

6. **C3-14** — isExporting implicit contract (MEDIUM)
7. **C3-13** — No test for isExporting guard (MEDIUM)
8. **C3-12** — videoEncoder double-rAF fallback (MEDIUM)
9. **C3-09** — Export memory guard (MEDIUM)
10. **C3-10** — Worker crash fallback 16MB limit (MEDIUM, partially resolved)

### Architectural (plan as larger refactors):

11. **C3-06** — Scene normalization mutates user intent (MEDIUM)
12. **C3-07** — Map layer ownership boundaries (MEDIUM)
13. **C3-08** — Session state coupling (MEDIUM)

### Documentation/low-priority:

14. **C3-04** — normalizeBasePath triplication (CLOSED — was already resolved)
15. **C3-15** — ESLint missing `t` dependency (LOW)
16. **C3-16** — ExportError consistency (LOW)
17. **C3-17** — Test stub documentation (LOW)
18. **C3-18** — Trail update strategy split (LOW)
19. **C3-19** — RTL unreadiness (LOW)
20. **C3-20** — Playback timer unmount race (LOW)
21. **C3-23** — Initial trail geometry waste (LOW)
22. **C3-24** — ESLint `t` dependency (LOW)

## Deferred findings (unchanged from cycle 2)

| ID | Issue | Reason for deferral | Exit criterion |
|----|-------|---------------------|----------------|
| C3-19 | RTL unreadiness | No RTL locales currently | Set `dir` when RTL locale added |
| C3-08 | Session state coupling | Requires `useTrackSessionController` reducer | Extract session reducer |
| C3-07 | Map layer ownership | Requires architectural refactor | Narrow overlay APIs on MapView |
| C3-06 | Scene raw state | Product decision on undo/versioning | Store raw scenes, derive normalized |

## Finding count summary

| Severity | Count | New this cycle | Carried/resolved |
|----------|-------|----------------|------------------|
| HIGH | 2 | 1 (C3-25) | 1 carried (C3-02) |
| MEDIUM-HIGH | 1 | 0 | 1 carried (C3-03) |
| MEDIUM | 11 | 0 | 11 carried |
| LOW | 9 | 2 (C3-23, C3-24) | 7 carried |
| CLOSED | 2 | 0 | 2 resolved (C3-04, C3-21/22) |
| **Total** | **25** | **3** | **22** |
