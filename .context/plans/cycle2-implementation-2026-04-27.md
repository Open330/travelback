# Cycle 2 Implementation Plan — 2026-04-27

Based on cycle 2 aggregate review at `.context/reviews/_aggregate-cycle2-2026-04-27.md`.
31 deduplicated findings (2 HIGH, 2 MEDIUM-HIGH, 15 MEDIUM, 11 LOW, 1 INFO).

4 findings resolved since cycle 1: N05, N06, N16, N28.

## Status of prior plan items (cycle1-implementation-2026-04-27.md)

| Item | Finding | Prior status | Current status | Notes |
|------|---------|-------------|----------------|-------|
| C01 | N20 (commit uncommitted) | TODO | TODO | Still 8 files uncommitted |
| C02 | N06 (renderFrameAndWait deadlock) | TODO | **RESOLVED** | 5s timeout + identical-state fast path already in uncommitted MapView |
| C03 | N01 (trail O(n) rebuild) | TODO | **PARTIALLY RESOLVED** | Precomputed segments in uncommitted MapView |
| C04 | N02 (unit test layer) | TODO | TODO | No test infrastructure added |
| C05 | N03 (real export test) | TODO | TODO | No real export test added |
| C06 | N04 (duplicated Google parser) | TODO | TODO | No parser dedup |
| C07 | N08 (scene editor aria) | TODO | TODO | Still static |
| C08 | N09 (trim destroys scenes) | TODO | TODO | Still clears without confirmation |
| C09 | N05 (export React entanglement) | TODO | **RESOLVED** | `isExporting` prop in uncommitted MapView |
| C10 | N13 (mesh reduced-motion) | TODO | TODO | Still no prefers-reduced-motion |
| C11 | N14 (export memory guard) | TODO | TODO | Still 4x multiplier |
| C12 | N15 (worker crash fallback) | TODO | **PARTIALLY RESOLVED** | Error message improved in uncommitted parser |
| C13 | N16 (resetSize failure) | TODO | **RESOLVED** | Style-first cleanup in uncommitted MapView |
| C14 | N25 (double-rAF fallback) | TODO | TODO | No docs/requirement change |
| C15-C28 | Various | TODO/DEFERRED | TODO/DEFERRED | No changes |

## New findings from cycle 2 review

| ID | Severity | Description | Files |
|----|----------|-------------|-------|
| N29 | MEDIUM | checkJsonDepth double traversal | parser.ts:504-521 |
| N30 | MEDIUM | No test for isExporting guard | MapView.tsx:1000 |
| N31 | MEDIUM | isExporting implicit contract | MapView.tsx, useExportController.ts |
| N32 | LOW | Trail update strategy split | MapView.tsx:1019-1076 |
| N33 | INFO | stripXmlEntities redundancy | parser.ts:155-165 |
| N34 | LOW | Architecture doc missing isExporting/precomputed segments | 02-architecture.md |
| N35 | LOW | Export panel swipe conflict | ExportPanel.tsx:110-124 |

## Plan structure

Each item below has: finding IDs, severity, file/region, fix description, effort estimate.

---

## Phase 0 — Commit existing uncommitted changes (N20)

Before any new work, the 8 files with uncommitted changes must be committed and
gate-tested. These already address 4 findings (N05, N06, N16, N28) and partially
address 3 more (N01, N07, N15, N24).

### P01 — Commit uncommitted fixes as separate semantic commits

- **Findings addressed:** N05 (export React entanglement), N06 (renderFrameAndWait
  deadlock), N16 (resetSize failure), N28 (path traversal), N01 partially
  (precomputed segments), N07 partially (parser.ts imports from env.ts), N15
  partially (improved error message), N24 partially (architecture doc update)
- **Files:** `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`,
  `src/components/TimelineSelector.tsx`, `src/lib/parser.ts`,
  `src/lib/useExportController.ts`, `scripts/harden-static-export.mjs`,
  `README.md`, `.context/project/02-architecture.md`
- **Fix:**
  1. Group changes into logical semantic commits:
     - `fix(export): 🐛 guard progress-driven effects during export` (MapView isExporting prop + useExportController wiring)
     - `fix(export): 🐛 add render event wait + timeout + identical-state fast path` (MapView renderFrameAndWait)
     - `fix(export): 🛡️ clear container styles before map.resize() in resetSize` (MapView resetSize)
     - `fix(map): ⚡ precompute trail segments to avoid per-frame wrapping` (MapView precomputedSegments)
     - `fix(timeline): 🐛 return hi index for end-handle on sparse tracks` (TimelineSelector)
     - `fix(journey): 🐛 guard degenerate LineString with <2 waypoints` (JourneyCreator)
     - `fix(parser): 🐛 assert point budget before push in GPX/GeoJSON paths` (parser)
     - `fix(parser): 🛡️ reject path traversal in normalizeBasePath` (env.ts)
     - `fix(build): 🐛 throw on silent bootstrap rewrite failure` (harden-static-export)
     - `docs: 📝 align camera mode names and import guide labels` (README + architecture)
  2. Run gates (`eslint`, `tsc --noEmit`, `next build`) after each commit.
- **Effort:** Small (organizing existing changes)
- **Status:** TODO

---

## Phase 1 — Must-address (correctness, data-loss, guard regression)

### P02 — Scene editor static aria bounds (N08)

- **Severity:** MEDIUM
- **Files:** `src/components/SceneEditor.tsx:189-190`
- **Fix:**
  1. Set `aria-valuemin` on start handle to 0, `aria-valuemax` to `Math.round(endPercent * 100)`.
  2. Set `aria-valuemin` on end handle to `Math.round(startPercent * 100)`, `aria-valuemax` to 100.
  3. Match the `TimelineSelector` pattern which already uses dynamic bounds.
- **Effort:** Tiny

---

### P03 — Timeline trim destroys scenes without confirmation (N09)

- **Severity:** MEDIUM
- **Files:** `src/app/page.tsx:293-297`
- **Fix:**
  1. When `handleRangeChange` detects a non-full range AND scenes exist, show a confirmation dialog before clearing.
  2. If the user cancels, do not apply the range change.
  3. If the user confirms, clear scenes and apply the range change.
  4. Alternative: re-scale scenes proportionally — but confirmation dialog is the minimum safe fix.
- **Effort:** Small

---

### P04 — Add unit test layer for pure functions (N02)

- **Severity:** HIGH
- **Files:** `src/lib/parser.ts`, `src/lib/camera.ts`, `src/lib/interpolate.ts`, `src/lib/videoEncoder.ts`
- **Fix:**
  1. Add `vitest` as dev dependency. Create `vitest.config.ts`.
  2. Add unit tests for:
     - `interpolate.ts`: cumulative distance, binary search, antimeridian, bearing
     - `camera.ts`: normalizeScenes, blending, mode output bounds
     - `parser.ts`: fixture-based Track output comparison for GPX, KML, Google JSON
     - `videoEncoder.ts`: estimateExportMemoryBytes, estimateEncodedBytes
     - `env.ts`: normalizeBasePath (including `..` rejection)
  3. Wire `npm test` to run vitest. Add `test` script to `package.json`.
  4. Use existing `e2e/fixtures/` as test data.
- **Effort:** Large (new testing infrastructure + test cases)

---

### P05 — Add real export smoke test (N03)

- **Severity:** HIGH
- **Files:** `src/lib/useExportController.ts:20-29`, `e2e/travelback.spec.ts`
- **Fix:**
  1. Add Playwright E2E test: 2-second, 1-fps, low-res real export (no stub).
  2. Verify success state and non-trivial buffer.
  3. Gate behind `TRAVELBACK_REAL_EXPORT` env flag.
  4. Keep stub test for fast CI.
- **Effort:** Small

---

### P06 — Extract shared Google parser logic (N04)

- **Severity:** MEDIUM-HIGH
- **Files:** `src/lib/parser.ts:253-539`, `public/workers/trackParser.worker.js:45-262`
- **Fix:**
  1. Extract shared Google parsing helpers into `src/lib/google-parser.ts`.
  2. Import in `src/lib/parser.ts` for main-thread fallback.
  3. For worker: bundle shared module or inline.
  4. Add behavioral parity tests.
- **Effort:** Large (refactor + worker build integration)
- **Defer note:** If full extraction is too invasive for this cycle, add parity tests first, then extract in follow-up.

---

## Phase 2 — Performance/test risks

### P07 — Animated mesh background should respect `prefers-reduced-motion` (N13)

- **Severity:** MEDIUM
- **Files:** `src/app/layout.tsx:80`, `src/styles/vitro-base.css:389-435`
- **Fix:**
  1. Add `@media (prefers-reduced-motion: reduce)` with `animation: none !important`.
  2. Consider pausing mesh during export via CSS class/data attribute.
- **Effort:** Small

---

### P08 — Export memory guard underestimates peak for 4K exports (N14)

- **Severity:** MEDIUM
- **Files:** `src/lib/videoEncoder.ts:36-49`
- **Fix:**
  1. The current code already uses 8x multiplier with resolution scaling (verified by code read). The aggregate's "still 4x" claim appears to be stale.
  2. Add mobile user-agent detection with lower cap.
  3. Verify the multiplier is actually 8x in current code and update the finding status accordingly.
- **Effort:** Small (verify + mobile cap)

---

### P09 — Worker crash fallback only works for files under 16MB (N15)

- **Severity:** MEDIUM (partially resolved — error message improved)
- **Files:** `src/lib/parser.ts:609,672-680`
- **Fix:**
  1. The uncommitted code already improves the error message (suggests "smaller date range or different browser").
  2. Add specific error code `WORKER_FAILED_LARGE` for files >16MB to distinguish from small-file worker crashes.
  3. Add a recovery hint in the toast message.
- **Effort:** Tiny

---

### P10 — `videoEncoder.ts` `waitForIdle` double-rAF fallback (N25)

- **Severity:** MEDIUM
- **Files:** `src/lib/videoEncoder.ts:144-150`
- **Fix:**
  1. Document the limitation: double-rAF does NOT guarantee tile loading completion.
  2. Add `console.warn` when the fallback is used.
  3. Consider making `waitForIdle` a required parameter for export.
- **Effort:** Small

---

### P11 — `checkJsonDepth` scans entire JSON text before `JSON.parse()` (N29)

- **Severity:** MEDIUM
- **Files:** `src/lib/parser.ts:504-521,524`
- **Fix:**
  1. Remove the standalone `checkJsonDepth` call from the main parsing path.
  2. Instead, wrap `JSON.parse` in a try/catch that catches `RangeError` (stack overflow from deep nesting) and converts it to a `ParseError`.
  3. Keep `checkJsonDepth` as a preflight only for the worker path (where stack overflow crashes the worker process entirely).
- **Effort:** Small

---

## Phase 3 — Low-priority and documentation fixes

### P12 — Deduplicate `normalizeBasePath` (N07)

- **Severity:** MEDIUM (partially resolved)
- **Files:** `src/types.ts:23-27`, `src/lib/env.ts`
- **Fix:**
  1. Remove duplicate from `types.ts` (if present).
  2. Verify `parser.ts` already imports from `env.ts`.
- **Effort:** Tiny

---

### P13 — Create `ExportError` class with machine-readable codes (N18)

- **Severity:** LOW
- **Files:** `src/lib/videoEncoder.ts:86,169`, `src/lib/parser.ts:12-18`
- **Fix:**
  1. Create `ExportError` class mirroring `ParseError` pattern.
  2. Replace generic `Error` throws in videoEncoder with `ExportError`.
  3. Map export error codes to i18n keys.
- **Effort:** Small

---

### P14 — Document export test stub and add console warning (N19)

- **Severity:** LOW
- **Files:** `src/lib/test-stub.ts`
- **Fix:**
  1. Add `console.warn` when test stub is active.
  2. Add brief note in development docs.
- **Effort:** Tiny

---

### P15 — Deduplicate `isLocalExportTestStubEnabled` (N21)

- **Severity:** LOW
- **Files:** `src/lib/useExportController.ts`, `src/components/ExportPanel.tsx`
- **Fix:**
  1. Check if `src/lib/test-stub.ts` already exists and exports this function.
  2. If not, extract to shared utility.
  3. Import in both consumers.
- **Effort:** Tiny

---

### P16 — Remove `computeCumulativeDistances` fallback in MapView (N22)

- **Severity:** LOW
- **Files:** `src/app/page.tsx`, `src/components/MapView.tsx`
- **Fix:**
  1. Make `cumulativeDistances` a required prop when `track` is provided.
  2. Remove the fallback computation in MapView.
- **Effort:** Tiny

---

### P17 — Update architecture doc for isExporting and precomputed segments (N24/N34)

- **Severity:** LOW
- **Files:** `.context/project/02-architecture.md`
- **Fix:**
  1. Document `isExporting` prop and its effect on MapView progress effect.
  2. Document precomputed segment strategy for trail updates.
  3. Document `resetSize` style-first cleanup pattern.
  4. Add `isExporting` flow to component architecture diagram.
- **Effort:** Tiny

---

### P18 — Fix `usePlaybackController` fallback timer unmount race (N26)

- **Severity:** LOW
- **Files:** `src/lib/usePlaybackController.ts:119`
- **Fix:**
  1. Move `mountedRef.current` check to the very beginning of `animate` callback.
- **Effort:** Tiny

---

### P19 — Cache reference grid keyed on track reference (N27)

- **Severity:** LOW
- **Files:** `src/components/MapView.tsx:241-350`
- **Fix:**
  1. Memoize `buildReferenceGridData` with `useMemo` keyed on track reference.
- **Effort:** Small

---

### P20 — Export panel swipe-to-dismiss gesture conflict (N35)

- **Severity:** LOW
- **Files:** `src/components/ExportPanel.tsx:110-124`
- **Fix:**
  1. Add horizontal component check: require `Math.abs(dx) < Math.abs(dy) * 0.3` for dismiss.
  2. This prevents diagonal swipes from triggering dismissal when user intended to scroll.
- **Effort:** Tiny

---

## Deferred findings

| ID | Issue | Reason for deferral | Exit criterion |
|----|-------|---------------------|----------------|
| N10 | Scene normalization mutates user intent | Product decision on undo/versioning UX | Store raw scenes, derive normalized |
| N11 | Map layer ownership boundaries | Architectural refactor with MapView as sole mutator | Replace `getMap()` with overlay APIs |
| N12 | Session state coupling | Requires `useTrackSessionController` reducer | Extract session reducer |
| N17 | Mobile dialog semantics | Accessibility fix, separate from correctness | Reuse ModalDialog or downgrade semantics |
| N23 | RTL unreadiness | No RTL locales currently | Set `dir` attribute when RTL locale added |
| N30 | No test for isExporting guard | Requires component test infrastructure | Add after vitest integration (P04) |
| N31 | isExporting implicit contract | Architectural pattern — state machine vs boolean | Consider during export architecture pass |
| N32 | Trail update strategy split | Low risk, needs test coverage first | Add parity test after vitest integration |
| N33 | stripXmlEntities redundancy | Harmless defense-in-depth | Keep or remove for clarity |

## Implementation order

### Immediate (Phase 0 — unblock everything):
1. **P01** — Commit uncommitted changes as semantic commits

### Then (Phase 1 — must-address):
2. **P02** — Fix scene editor static aria bounds (N08, tiny)
3. **P03** — Add confirmation before clearing scenes on trim (N09, small)
4. **P04** — Add Vitest unit test layer (N02, HIGH — large but foundational)
5. **P05** — Add real export smoke test (N03, HIGH — small after P04)
6. **P06** — Extract shared Google parser (N04, MEDIUM-HIGH — large, may span cycles)

### Then (Phase 2 — performance/test risks):
7. **P07** — Animated mesh `prefers-reduced-motion` (N13, small)
8. **P08** — Verify/export memory guard (N14, small — verify first)
9. **P09** — Worker crash error code (N15, tiny)
10. **P10** — Document double-rAF limitation (N25, small)
11. **P11** — Remove redundant checkJsonDepth on main thread (N29, small)

### Then (Phase 3 — low-priority, can be parallelized):
12. **P12** — Deduplicate normalizeBasePath (N07, tiny)
13. **P13** — Create ExportError class (N18, small)
14. **P14** — Document test stub (N19, tiny)
15. **P15** — Deduplicate isLocalExportTestStubEnabled (N21, tiny)
16. **P16** — Remove cumulative distances fallback (N22, tiny)
17. **P17** — Update architecture doc (N24/N34, tiny)
18. **P18** — Fix playback timer unmount race (N26, tiny)
19. **P19** — Cache reference grid (N27, small)
20. **P20** — Export panel swipe conflict (N35, tiny)

## Quality gates

After each commit:
- `npm run lint` — must pass (1 pre-existing warning in page.tsx is acceptable)
- `npx tsc --noEmit` — must pass
- `npm run build` — must pass
- `git commit -S` — GPG-signed with conventional commit + gitmoji

## Deferral justification

All deferred findings are either:
- **Architectural refactors** (N10, N11, N12) requiring dedicated cycles
- **Accessibility improvements** (N17) not correctness/data-loss issues
- **Infrastructure-dependent** (N30, N31, N32) waiting on test tooling
- **Not currently needed** (N23 — no RTL locales, N33 — harmless redundancy)

No security, correctness, or data-loss findings are deferred beyond what was already resolved in the uncommitted changes.
