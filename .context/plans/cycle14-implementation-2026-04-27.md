# Cycle 14 Implementation Plan — 2026-04-27

Derived from `.context/reviews/_aggregate.md` (cycle 14).

## Active findings to address this cycle

### C14-01 — Fix reduced-motion `transition-duration` from 0.01ms to 0ms

- **Finding:** C14-F01 (LOW)
- **File:** `src/styles/vitro-base.css:770`
- **Change:** Replace `transition-duration: 0.01ms !important` with `transition-duration: 0ms !important` in the `@media (prefers-reduced-motion: reduce)` block.
- **Verification:** CSS visual inspection; no functional test needed.

### C14-02 — Move `pendingTrimRange` cleanup from `handleScenesChange` to a `useEffect`

- **Finding:** C14-F02 (MEDIUM)
- **File:** `src/app/page.tsx:430-437`
- **Change:** Remove the `pendingTrimRange` cleanup logic from `handleScenesChange`. Add a `useEffect` that watches `scenes.length` and `pendingTrimRange`, clearing `pendingTrimRange` when `scenes.length === 0` and `pendingTrimRange !== null`.
- **Verification:** Manual test: create scenes, drag timeline (sets pendingTrimRange), delete all scenes — pendingTrimRange should be cleared without the confirmation dialog appearing stale.

### C14-03 — Store `scenes` in a ref inside `useExportController` to stabilize `exportTrack` identity

- **Finding:** C14-F03 (LOW-MEDIUM)
- **File:** `src/lib/useExportController.ts`
- **Change:** Add a `scenesRef` that mirrors `scenes` via `useEffect`. Read `scenesRef.current` instead of `scenes` inside `exportTrack`. Remove `scenes` from the `exportTrack` dependency array.
- **Verification:** ESLint + tsc + build pass. Export still works with and without scenes.

### C14-04 — Store full scenes snapshot for undo instead of single-scene splice

- **Finding:** C14-F06 (LOW)
- **File:** `src/components/SceneEditor.tsx:363-367`
- **Change:** Change `deletedScene` state from `{ scene: Scene; precedingSceneId }` to `{ scenes: Scene[]; deletedId: string }` storing the full pre-deletion scenes array. On undo, restore the full array via `commitScenes(deletedScene.scenes)` instead of splicing the single scene back into the current (post-normalization) array.
- **Verification:** Create scenes A(0-0.3) and B(0.3-0.6). Delete A. B normalizes to B(0-0.6). Undo. Both A and B should be restored to their original ranges.

### C14-05 — Add toast feedback for non-AbortError share failures

- **Finding:** C14-F08 (LOW)
- **File:** `src/components/ExportPanel.tsx:169-180`
- **Change:** In the `catch` block of `handleShare`, after the AbortError check, add an `addToast` call for other errors. Since ExportPanel doesn't have direct `addToast` access, add an `onShareError` prop or use a simpler approach: log and show a generic error message via a local state.
- **Verification:** Share button on a device without file share support shows a user-visible error instead of silently failing.

---

## Deferred findings (not scheduled this cycle)

### Newly deferred this cycle

- **C14-F05** (LOW) — `checkJsonDepth` UTF-16 vs Unicode code point iteration. Deferred: Extremely unlikely in practice since Google exports use ASCII keys. Fix would be `for...of` instead of indexed iteration but risks introducing a subtle regression for negligible real-world benefit.
- **C14-F07** (LOW) — `buildFitBounds` antimeridian degenerate padding. Deferred: Requires careful coordinate-space handling; degenerate tracks at the antimeridian are extremely rare. The current DEGENERATE_PADDING=0.1 improvement from C13-F06 makes this a minor edge case.

### All prior deferred items remain deferred

From `.context/plans/deferred-findings-cycle17-2026-04-23.md`:
- DF-C17-001 through DF-C17-006, DF-C17-008 through DF-C17-019

From cycle 4:
- DF-C4-001: SceneEditor normalizes on every name keystroke
- DF-C4-002: ExportPanel estimated time multiplier inaccuracy

From cycle 5:
- DF-C5-001: Worker ERROR_CODE and MAX_MESSAGE_SIZE constants not enforced

Carried open findings from aggregate (not scheduled):
- N02 (HIGH) — No unit test layer
- N03 (HIGH) — E2E export only exercises stub
- N04 (MEDIUM-HIGH) — Google JSON parser duplicated in worker vs main
- N08 (MEDIUM) — Scene editor static aria-valuemin/aria-valuemax
- N11 (MEDIUM) — Map layer ownership split
- N12 (MEDIUM) — Track session state spread
- N14 (MEDIUM) — Export memory guard underestimates 4K peak
- N25 (MEDIUM) — videoEncoder double-rAF fallback
- N29 (MEDIUM) — checkJsonDepth double traversal
- N30 (MEDIUM) — No test for isExporting guard
- N31 (MEDIUM) — isExporting implicit contract
