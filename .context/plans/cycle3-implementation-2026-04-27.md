# Cycle 3 Implementation Plan — 2026-04-27

Based on cycle 3 aggregate review at `.context/reviews/cycle3-aggregate-2026-04-27.md`.
25 deduplicated findings (2 HIGH, 1 MEDIUM-HIGH, 11 MEDIUM, 9 LOW, 2 CLOSED).

## Status of prior plan items (cycle2-implementation-2026-04-27.md)

| Item | Finding | Prior status | Current status | Commit |
|------|---------|-------------|----------------|--------|
| P01 | N20 (commit uncommitted) | TODO | **RESOLVED** | Multiple commits |
| P02 | N08 (scene editor aria) | TODO | TODO | — |
| P03 | N09 (trim destroys scenes) | TODO | **RESOLVED** | 909199a |
| P04 | N02 (unit test layer) | TODO | **PARTIALLY RESOLVED** | 755902a (4 test files, no parser) |
| P05 | N03 (real export test) | TODO | **RESOLVED** | 947215a |
| P06 | N04 (duplicated Google parser) | TODO | TODO | — |
| P07 | N13 (mesh reduced-motion) | TODO | **RESOLVED** | 1fda960 |
| P08 | N14 (export memory guard) | TODO | TODO | — |
| P09 | N15 (worker crash error) | TODO | **PARTIALLY RESOLVED** | 2b4dd77 (improved message) |
| P10 | N25 (double-rAF fallback) | TODO | TODO | — |
| P11 | N29 (checkJsonDepth double traversal) | TODO | **RESOLVED** | 9530edd |
| P12 | N07 (normalizeBasePath dedup) | TODO | **RESOLVED** | 35c0466 |
| P13 | N18 (ExportError class) | TODO | **RESOLVED** | 2a6f30e |
| P14 | N19 (test stub docs) | TODO | TODO | — |
| P15 | N21 (test stub dedup) | TODO | **RESOLVED** | 6307f1f |
| P16 | N22 (cumulDist fallback) | TODO | **RESOLVED** | 28722e8 |
| P17 | N24/N34 (architecture doc) | TODO | **RESOLVED** | 7c47649 |
| P18 | N26 (playback timer unmount) | TODO | TODO | — |
| P19 | N27 (reference grid cache) | TODO | **RESOLVED** | 3e332b8 |
| P20 | N35 (export panel swipe) | TODO | **RESOLVED** | 79c8285 |

## Remaining items from prior plan + new findings

---

### 3P01 — Scene editor dynamic aria bounds (C3-05, was N08)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/SceneEditor.tsx:189-190`
- **Fix:**
  1. Change `aria-valuemin` on the start handle from static 0 to dynamic 0 (already correct).
  2. Change `aria-valuemax` on the start handle from static 100 to `Math.round(endPercent * 100)`.
  3. Change `aria-valuemin` on the end handle from static 0 to `Math.round(startPercent * 100)`.
  4. Change `aria-valuemax` on the end handle from static 100 (already correct).
  5. Match the TimelineSelector pattern which already uses dynamic bounds.
- **Effort:** Tiny
- **Status:** RESOLVED (commit 11fb8da)

---

### 3P02 — Add parser unit tests (C3-25, new HIGH)

- **Severity:** HIGH
- **Confidence:** High
- **Files:** `src/lib/parser.ts`, `vitest.config.ts`
- **Fix:**
  1. Create `src/lib/parser.test.ts` with Vitest tests covering:
     - GPX parsing with segments (using inline XML fixtures)
     - KML parsing with MultiGeometry
     - Google JSON format 1: Records (legacy `locations` array)
     - Google JSON format 2: Semantic Location History (`timelineObjects`)
     - Google JSON format 3: Timeline Edits (`timelineEdits`)
     - Google JSON format 4: semanticSegments
     - Point budget enforcement (`TOO_MANY_POINTS`)
     - XML entity rejection (`XML_PARSE_ERROR`)
     - JSON nesting depth limits (`JSON_DEPTH_EXCEEDED`)
     - File size limits
     - Dedup and sorting behavior
  2. Use inline test data (small fixtures) rather than external files.
  3. Wire into existing `vitest.config.ts`.
- **Effort:** Large (many test cases)
- **Status:** RESOLVED (commit 8d48131)

---

### 3P03 — Make `waitForIdle` a required parameter in export (C3-12, was N25)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:161-172`
- **Fix:**
  1. Make `waitForIdle` a required parameter in the `exportVideo` function signature.
  2. Remove the double-rAF fallback code path.
  3. Verify all callers (useExportController) always provide `waitForIdle`.
- **Effort:** Small
- **Status:** RESOLVED (commit 5eefd24)

---

### 3P04 — Fix ESLint warning: missing `t` dependency in `handleRangeChange` (C3-15/C3-24)

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:316`
- **Fix:**
  1. Add `t` to the dependency array of `handleRangeChange` useCallback.
- **Effort:** Tiny
- **Status:** RESOLVED (commit 1b33835)

---

### 3P05 — Add JSDoc to test stub module (C3-17, was N19)

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/test-stub.ts`
- **Fix:**
  1. Add JSDoc to `isLocalExportTestStubEnabled` explaining the test stub system.
  2. Add `console.warn` when stub is active in non-test environments.
- **Effort:** Tiny
- **Status:** RESOLVED (already present in code)

---

### 3P06 — Fix `usePlaybackController` fallback timer unmount race (C3-20, was N26)

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/usePlaybackController.ts:119`
- **Fix:**
  1. Add `mountedRef.current` check at the very beginning of the `animate` callback before any state updates.
  2. Clear the fallback timer in the cleanup function (already done on line 152).
- **Effort:** Tiny
- **Status:** RESOLVED (mountedRef check already present at line 125)

---

### 3P07 — Remove unnecessary initial trail geometry construction (C3-23)

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:824`
- **Fix:**
  1. Initialize the trail source with an empty FeatureCollection instead of building a geometry at index 0.
  2. The progress effect will update the trail on the first render.
- **Effort:** Tiny
- **Status:** RESOLVED (commit ae0407a)

---

## Deferred findings (unchanged from cycle 2)

| ID | Issue | Reason for deferral | Exit criterion |
|----|-------|---------------------|----------------|
| C3-03 | Google parser duplication | Large refactor requiring worker build changes | Extract shared module |
| C3-06 | Scene normalization mutates intent | Product decision on undo/versioning | Store raw scenes |
| C3-07 | Map layer ownership boundaries | Architectural refactor | Replace getMap() with overlay APIs |
| C3-08 | Session state coupling | Requires useTrackSessionController reducer | Extract session reducer |
| C3-09 | Export memory guard | Needs mobile-specific investigation | Lower limit for mobile |
| C3-10 | Worker crash 16MB fallback | Known browser limitation | Accept or raise threshold |
| C3-11 | Mobile dialog semantics | Accessibility fix, not correctness | Reuse ModalDialog |
| C3-13 | No test for isExporting guard | Requires component test infrastructure | Add after parser tests |
| C3-14 | isExporting implicit contract | Architectural pattern | Consider state machine |
| C3-16 | ExportError consistency | Low priority, pattern already established | Already uses ExportError |
| C3-18 | Trail update strategy split | Low risk, needs test coverage | Add parity test |
| C3-19 | RTL unreadiness | No RTL locales currently | Set dir attribute |

## Implementation order

1. **3P01** — Scene editor dynamic aria bounds (MEDIUM, tiny)
2. **3P04** — ESLint `t` dependency (LOW, tiny)
3. **3P03** — Make waitForIdle required (MEDIUM, small)
4. **3P05** — Test stub JSDoc (LOW, tiny)
5. **3P06** — Playback timer unmount race (LOW, tiny)
6. **3P07** — Remove initial trail geometry (LOW, tiny)
7. **3P02** — Parser unit tests (HIGH, large)

## Quality gates

After each commit:
- `npm run lint` — must pass (0 errors)
- `npx tsc --noEmit` — must pass
- `npm run build` — must pass
- `npx vitest run` — must pass
- `git commit -S` — GPG-signed with conventional commit + gitmoji
