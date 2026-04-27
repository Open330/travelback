# Cycle 2 Aggregate Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Review lanes completed

Completed and persisted per-agent reviews:

- `cycle2-code-reviewer-2026-04-27.md` — 3 new findings (all LOW); 8 carried re-evaluated (1 resolved, 1 partially resolved, 6 unchanged)
- `cycle2-perf-reviewer-2026-04-27.md` — 3 new findings (1 MEDIUM, 2 LOW); 7 carried re-evaluated (1 resolved, 1 partially resolved, 5 unchanged)
- `cycle2-security-reviewer-2026-04-27.md` — 3 new findings (1 LOW, 2 INFO); 4 carried re-evaluated (1 resolved, 1 partially resolved, 2 unchanged)
- `cycle2-critic-2026-04-27.md` — 3 new findings (1 MEDIUM, 2 LOW); 7 carried re-evaluated (1 resolved, 6 unchanged)
- `cycle2-verifier-2026-04-27.md` — 4 verified resolved, 1 partially resolved, 4 unverified uncommitted changes
- `cycle2-test-engineer-2026-04-27.md` — 4 new findings (1 MEDIUM, 3 LOW); 3 carried HIGH unchanged
- `cycle2-tracer-2026-04-27.md` — 6 flows traced, all PASS
- `cycle2-architect-2026-04-27.md` — 3 new findings (1 MEDIUM, 2 LOW); 6 carried re-evaluated (1 resolved, 1 partially resolved, 4 unchanged)
- `cycle2-debugger-2026-04-27.md` — 3 new findings (all LOW); 3 carried re-evaluated (2 resolved, 1 partially resolved)
- `cycle2-designer-2026-04-27.md` — 2 new findings (1 LOW, 1 INFO); 4 carried unchanged
- `cycle2-document-specialist-2026-04-27.md` — 3 new findings (1 LOW, 2 INFO); 2 carried re-evaluated (1 partially resolved, 1 unchanged)

Total: 30 new raw findings across 11 reviewers; 28 carried findings re-evaluated.

## Resolved findings (from cycle 1 aggregate)

| ID | Finding | Resolution |
|----|---------|------------|
| N05 | Export React state entanglement | `isExporting` prop guards MapView progress effect |
| N06 | renderFrameAndWait deadlock | 5s timeout + identical-state fast path |
| N16 | Export resized map on resetSize failure | `resetSize` clears styles first, try/catch on resize |
| N28 | normalizeBasePath path traversal | `..` rejection in env.ts |

## Deduplicated findings

### Carried forward (unchanged from cycle 1)

These findings were re-evaluated and confirmed still present:

---

### N01 — Per-frame trail geometry rebuild is O(traveled points) during playback

- **Severity:** HIGH → MEDIUM-HIGH (partially resolved by precomputed segments)
- **Confidence:** High
- **Status:** PARTIALLY RESOLVED — precomputed segments eliminate wrapping/copying for fully-traversed segments; partial segment copy remains O(current-segment-points)
- **Files:** `src/components/MapView.tsx:1019-1076`
- **Agreement:** code-reviewer, perf-reviewer, architect

---

### N02 — No unit test layer for parser, interpolation, camera, or export pure functions

- **Severity:** HIGH
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/lib/parser.ts`, `src/lib/camera.ts`, `src/lib/interpolate.ts`, `src/lib/videoEncoder.ts`
- **Agreement:** test-engineer, critic, architect

---

### N03 — E2E export success path exercises only a localhost stub

- **Severity:** HIGH
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/lib/useExportController.ts`, `src/lib/test-stub.ts`
- **Agreement:** test-engineer, debugger

---

### N04 — Google JSON parser logic is duplicated in worker vs main thread without parity tests

- **Severity:** MEDIUM-HIGH
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/lib/parser.ts:253-539`, `public/workers/trackParser.worker.js`
- **Agreement:** architect, test-engineer, security-reviewer

---

### N07 — `normalizeBasePath` still triplicated (partially resolved — parser.ts imports from env.ts, types.ts may still duplicate)

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** PARTIALLY RESOLVED
- **Files:** `src/types.ts:23-27`, `src/lib/env.ts`
- **Agreement:** code-reviewer, security-reviewer

---

### N08 — Scene editor range sliders have static `aria-valuemin`/`aria-valuemax`

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/components/SceneEditor.tsx:189-190`
- **Agreement:** code-reviewer, designer

---

### N09 — `handleRangeChange` clears all scenes whenever the range is not full

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/app/page.tsx:293-297`
- **Agreement:** critic

---

### N10 — Scene normalization silently mutates user intent; UI warns after the fact

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/lib/camera.ts:19-43`, `src/components/SceneEditor.tsx:265-281`
- **Agreement:** critic, architect

---

### N11 — Map layer ownership is split across MapView, JourneyCreator, and export controller

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`, `src/lib/useExportController.ts`
- **Agreement:** architect, code-reviewer

---

### N12 — Track session state is spread across 12+ independent state atoms in page.tsx

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/app/page.tsx:61-112`
- **Agreement:** architect, code-reviewer

---

### N13 — Animated mesh background does not respect `prefers-reduced-motion`

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** UNCHANGED
- **Files:** `src/app/layout.tsx:80`, `src/styles/vitro-base.css:389-435`
- **Agreement:** perf-reviewer, designer

---

### N14 — Export memory guard underestimates peak for 4K exports

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** UNCHANGED
- **Files:** `src/lib/videoEncoder.ts:36-49`
- **Agreement:** perf-reviewer, security-reviewer

---

### N15 — Worker crash fallback only works for files under 16MB

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** PARTIALLY RESOLVED — error message now suggests "smaller date range or different browser"
- **Files:** `src/lib/parser.ts:609,672-680`
- **Agreement:** debugger

---

### N17 — Mobile "more controls" panel is marked dialog but is not truly modal

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/components/TrackToolbar.tsx`
- **Agreement:** designer

---

### N18 — Error handling inconsistency: videoEncoder uses generic Error while parser uses ParseError

- **Severity:** LOW
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/lib/videoEncoder.ts`, `src/lib/parser.ts`
- **Agreement:** critic

---

### N19 — Export test stub is not documented

- **Severity:** LOW
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/lib/useExportController.ts:20-29`, `src/lib/test-stub.ts`
- **Agreement:** critic, document-specialist

---

### N20 — Uncommitted changes need to be committed and gate-tested

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED — 8 files with uncommitted changes, not gate-tested
- **Files:** 8 modified files in working tree
- **Agreement:** code-reviewer, critic

---

### N21 — `isLocalExportTestStubEnabled` is duplicated in two files

- **Severity:** LOW
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/lib/useExportController.ts`, `src/components/ExportPanel.tsx`
- **Agreement:** code-reviewer

---

### N22 — `computeCumulativeDistances` is computed in both page.tsx and MapView fallback

- **Severity:** LOW
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/app/page.tsx`, `src/components/MapView.tsx`
- **Agreement:** perf-reviewer

---

### N23 — Locale handling never sets `dir` attribute (RTL unreadiness)

- **Severity:** LOW
- **Confidence:** Medium
- **Status:** UNCHANGED
- **Files:** `src/lib/i18n.ts`, `src/app/page.tsx`
- **Agreement:** designer

---

### N24 — Architecture doc does not document `renderFrameAndWait` export path

- **Severity:** LOW
- **Confidence:** High
- **Status:** PARTIALLY RESOLVED — doc updated for renderFrameAndWait; missing `isExporting` and precomputed segments
- **Files:** `.context/project/02-architecture.md`
- **Agreement:** document-specialist

---

### N25 — `videoEncoder.ts` `waitForIdle` fallback uses double-rAF without tile guarantee

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/lib/videoEncoder.ts:144-150`
- **Agreement:** code-reviewer

---

### N26 — `usePlaybackController` fallback timer can fire after component unmount

- **Severity:** LOW
- **Confidence:** Medium
- **Status:** UNCHANGED
- **Files:** `src/lib/usePlaybackController.ts:119`
- **Agreement:** critic

---

### N27 — Reference grid recomputed on every track/style change without caching

- **Severity:** LOW
- **Confidence:** High
- **Status:** UNCHANGED
- **Files:** `src/components/MapView.tsx:241-350`
- **Agreement:** perf-reviewer

---

### New findings (deduplicated)

---

### N29 — `checkJsonDepth` scans entire JSON text before `JSON.parse()` (double traversal)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.ts:504-521,524`
- **Agreement:** perf-reviewer (P2-01)
- **Detail:** For 100MB Google JSON, `checkJsonDepth` iterates ~100M characters, then `JSON.parse` iterates the same text again. Adds ~15-30% overhead to main-thread parsing. Worker path is less affected.
- **Suggested fix:** Integrate depth check into a streaming JSON parser, or defer to try/catch with stack depth limit.

---

### N30 — No test coverage for `isExporting` guard in MapView

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:1000`
- **Agreement:** test-engineer (TE2-01), critic (C2-01 implied)
- **Detail:** The `isExporting` guard is critical correctness path. No test verifies: (1) progress updates are suppressed during export, (2) trail/marker state is restored after export, (3) guard doesn't cause stale geometry.
- **Suggested fix:** Add E2E or integration test for export → verify guard → verify restoration.

---

### N31 — `isExporting` prop creates implicit contract between useExportController and MapView

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:25,454,1000`
- **Agreement:** architect (ARCH2-01), critic (C2-02 implied)
- **Detail:** Future effects added to MapView must remember the `isExporting` guard. No type-level or lint-level enforcement.
- **Suggested fix:** Consider MapView internal state machine (`idle` | `playback` | `export`) instead of scattered boolean guards.

---

### N32 — Trail geometry update strategy is split between precomputed-segment path and buildTrackGeometry fallback without parity verification

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:1019-1076`
- **Agreement:** architect (ARCH2-03), critic (C2-01)
- **Detail:** Two code paths must produce identical visual results but are implemented differently. No test verifies parity.
- **Suggested fix:** Add test or remove fallback once precomputed segments are always populated.

---

### N33 — `stripXmlEntities` is redundant with `preflightXml` DOCTYPE/ENTITY rejection

- **Severity:** INFO
- **Confidence:** High
- **Files:** `src/lib/parser.ts:155-160,162-165`
- **Agreement:** security-reviewer (SEC2-01)
- **Detail:** `preflightXml` throws before `stripXmlEntities` is reached. Function is dead code but harmless as defense-in-depth.
- **Suggested fix:** Keep as defense-in-depth or remove for clarity.

---

### N34 — Architecture doc does not document `isExporting` prop or precomputed segments

- **Severity:** LOW
- **Confidence:** High
- **Files:** `.context/project/02-architecture.md`
- **Agreement:** document-specialist (DS2-01, DS2-03)
- **Detail:** Export Pipeline and Component Architecture sections don't document the `isExporting` guard, precomputed segments, or `resetSize` style-first cleanup.
- **Suggested fix:** Update architecture doc with these patterns.

---

### N35 — Export panel swipe-to-dismiss gesture could conflict with scroll on small viewports

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/ExportPanel.tsx:110-124`
- **Agreement:** designer (D2-01)
- **Detail:** Fast diagonal swipe starting on header could dismiss panel when user intended to scroll.
- **Suggested fix:** Require horizontal component < Math.abs(dy) * 0.3 for dismiss.

---

## Aggregate priority

### Must-address (correctness, data-loss, guard regression):

1. **N20** — Uncommitted changes need gate-testing (MEDIUM) — blocks all other improvements
2. **N02** — No unit test layer (HIGH)
3. **N03** — Real export untested (HIGH)
4. **N01** — Trail geometry perf (MEDIUM-HIGH, partially resolved)
5. **N04** — Duplicated Google parser (MEDIUM-HIGH)
6. **N09** — Timeline trim destroys scenes (MEDIUM)
7. **N30** — No test for isExporting guard (MEDIUM)

### Performance/test risks (address where practical):

8. **N29** — checkJsonDepth double traversal (MEDIUM)
9. **N14** — Export memory guard (MEDIUM)
10. **N13** — Mesh vs reduced-motion (MEDIUM)
11. **N25** — videoEncoder double-rAF fallback (MEDIUM)
12. **N31** — isExporting implicit contract (MEDIUM)
13. **N15** — Worker crash fallback (MEDIUM, partially resolved)

### Architectural (plan as larger refactors):

14. **N10** — Scene normalization mutates user intent (MEDIUM)
15. **N11** — Map layer ownership boundaries (MEDIUM)
16. **N12** — Session state coupling (MEDIUM)
17. **N17** — Mobile dialog semantics (MEDIUM)

### Documentation/low-priority:

18. **N07** — normalizeBasePath triplication (MEDIUM, partially resolved)
19. **N08** — Scene editor static aria bounds (MEDIUM)
20. **N34** — Architecture doc missing isExporting/precomputed segments (LOW)
21. **N32** — Trail update strategy split (LOW)
22. **N18** — ExportError consistency (LOW)
23. **N19** — Test stub documentation (LOW)
24. **N21** — isLocalExportTestStubEnabled duplication (LOW)
25. **N22** — computeCumulativeDistances fallback (LOW)
26. **N23** — RTL unreadiness (LOW)
27. **N26** — Playback timer unmount race (LOW)
27. **N27** — Reference grid caching (LOW)
28. **N35** — Export panel swipe conflict (LOW)
29. **N33** — stripXmlEntities redundancy (INFO)

## Finding count summary

| Severity | Count | New this review | Carried/resolved from prior cycles |
|----------|-------|----------------|-----------------------------------|
| HIGH | 2 | 0 | N02, N03 (carried) |
| MEDIUM-HIGH | 2 | 0 | N01 (downgraded), N04 (carried) |
| MEDIUM | 15 | 3 (N29, N30, N31) | 12 carried |
| LOW | 11 | 5 (N32, N34, N35, plus DS2-02, P2-03 absorbed) | 6 carried |
| INFO | 1 | 1 (N33) | 0 carried |
| **Total** | **31** | **9** | **22** |

## Key delta from cycle 1 aggregate

- **4 findings resolved:** N05 (export React entanglement), N06 (renderFrameAndWait deadlock), N16 (resetSize failure), N28 (path traversal).
- **1 finding downgraded:** N01 from HIGH to MEDIUM-HIGH due to precomputed segments.
- **1 finding partially resolved:** N15 (worker crash fallback) — improved error message but 16MB limit unchanged.
- **9 new findings:** N29-N35 (deduplicated from 30 raw findings across 11 reviewers).
- **N20 remains the most actionable finding:** Uncommitted changes must be committed and gate-tested before any other improvements can be reliably validated.
