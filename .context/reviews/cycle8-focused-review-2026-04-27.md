# Cycle 8 Focused Review (2026-04-27)

Consolidated deep pass following 7+ prior converged cycles. Focus on modified files and carried-forward findings.

---

## Verified Already-Fixed Findings (from C7)

| ID | Status | Verification |
|----|--------|-------------|
| C7-F01 | **FIXED** | `handleRangeChange` in `page.tsx:328` no longer has `t` in deps |
| C7-F02 | **FIXED** | `exportTrack` in `useExportController.ts:268` now includes `revokeExportedVideoUrl` in deps |
| C7-F03 | **FIXED** | `playbackProgress` removed from `exportTrack` deps; only `playbackProgressRef` used inside |

---

## New / Carried-Forward Findings

### C8-F01 — MEDIUM — Scene transition blending bearing wobble (carried from C7-F05)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/camera.ts:436, 442`
- **Detail:** At scene start boundaries (line 436), the previous scene's end-state camera is computed with `computeCameraForScene(track, cumulDist, prevScene, 1.0, elapsedSec)`. For rotation-dependent modes (orbit, overview), this makes the lerp start point move with elapsed time, causing visible bearing wobble instead of a smooth blend. The same issue exists at scene end boundaries (line 442) where `computeCameraForScene(track, cumulDist, nextScene, 0.0, elapsedSec)` uses `elapsedSec` for the next scene's start-state camera.
- **Contrast:** The gap-blending code (lines 393-395) correctly uses `0` for `elapsedSec` in both the previous and next scene cameras. The transition-blending code should do the same.
- **Fix:** Replace `elapsedSec` with `0` in both transition-blending calls on lines 436 and 442.
- **Failure scenario:** An orbit scene followed by a flyover scene will show the orbit's bearing rotating during the transition blend, producing visible wobble instead of a smooth camera interpolation.

### C8-F02 — LOW-MEDIUM — `useExportController` exportTrack useCallback has `t` in deps unnecessarily

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:275`
- **Detail:** `t` (the translation function) is in the dependency array of `exportTrack`. It is only used in error/success toast messages (lines 121, 219, 231-237), which are not part of the hot export path. However, `t` changes on every locale change, causing the entire `exportTrack` callback to be recreated. This can be avoided by using a ref for `t` (same pattern as `playbackProgressRef`).
- **Fix:** Add a `tRef` that stays in sync, use `tRef.current` inside `exportTrack`, and remove `t` from deps.
- **Note:** This is a minor optimization. The current code is correct; the fix reduces unnecessary callback recreation.

### C8-F03 — LOW — `addScene` in SceneEditor recomputes on every locale change

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/SceneEditor.tsx:331-345`
- **Detail:** `addScene` depends on `commitScenes` which depends on `t` (for normalization warnings). This means every locale change cascades through `commitScenes` -> `addScene`, `removeScene`, `undoDelete`, `updateScene`, `buildPresetScenes`. The cascade is correct but causes unnecessary callback recreation.
- **Fix:** Could use a ref for `t` inside `commitScenes` for warning messages (non-critical path). Low priority.
- **Note:** This is a known pattern in the codebase. Not a bug; purely an optimization opportunity.

---

## Carried Forward from Cycle 6/7 (still open)

| ID | Severity | Status | Note |
|----|----------|--------|------|
| AG6-05 | LOW-MEDIUM | OPEN | Worker message validation not added |
| AG6-09 | LOW-MEDIUM | OPEN | Bootstrap regex comments not added |
| AG6-10 | LOW | OPEN | Unsafe type casts |
| AG6-11 | LOW | OPEN | Stale frame logging |
| AG6-12 | LOW | OPEN | Grid memo optimization |
| AG6-13 | LOW-MEDIUM | OPEN | Buffer copy optimization |
| AG6-14 | LOW-MEDIUM | OPEN | Normalization warnings specificity |
| AG6-15 | LOW-MEDIUM | OPEN | Export progress bar transition |
| AG6-16 | LOW | OPEN | Toast z-index overlap |
| AG6-17 | LOW | OPEN | README accuracy |
| AG6-18 | MEDIUM | OPEN | Camera unit test coverage |
| AG6-19 | MEDIUM | DEFERRED | Architectural refactor of useExportController |
| C7-F05 | MEDIUM | NOW C8-F01 | See above |
| C7-F06 | LOW | OPEN | ElevationProfile SVG click handler padding risk (latent) |
| C7-F07 | LOW | OPEN | handleSearchSubmit guard redundant (latent) |

---

## Summary by severity

| Severity | Count | IDs |
|----------|-------|-----|
| MEDIUM | 1 | C8-F01 |
| LOW-MEDIUM | 1 | C8-F02 |
| LOW | 1 | C8-F03 |

## Actionable this cycle

C8-F01 (medium — fix transition blending elapsedSec -> 0), C8-F02 (low-medium — use tRef in exportTrack)

## Deferred

All prior deferred items remain deferred per their existing exit criteria.
