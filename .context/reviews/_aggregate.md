# Cycle 7 Aggregate Review (2026-04-27)

Consolidated single deep pass (6+ prior converged cycles). Source: cycle7-focused-review-2026-04-27.md

---

## New Findings

### C7-F01 — `handleRangeChange` has unnecessary `t` dependency causing callback churn

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/app/page.tsx:328`
- **Detail:** `useCallback` has unnecessary dependency `t`. The callback never calls `t` inside its body, causing recreation on every locale change.
- **Fix:** Remove `t` from the dependency array.

---

### C7-F02 — `exportTrack` useCallback missing `revokeExportedVideoUrl` dependency

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:268`
- **Detail:** `revokeExportedVideoUrl` is called inside `exportTrack` (line 137) but omitted from the dependency array. Currently safe because it has `[]` deps, but violates exhaustive-deps.
- **Fix:** Add `revokeExportedVideoUrl` to the dependency array.

---

### C7-F03 — `playbackProgress` still in `exportTrack` deps despite ref optimization (AG6-07 partial)

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:268`
- **Detail:** `playbackProgressRef` was added for reading inside the callback, but `playbackProgress` state still appears in deps at line 268, negating the optimization.
- **Fix:** Remove `playbackProgress` from the dependency array.

---

### C7-F04 — `handleModeChange` theme-map coupling (intentional)

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/app/page.tsx:458-476`
- **Detail:** Theme changes silently override map style when no explicit map style choice exists. Intentional design decision — no fix needed.

---

### C7-F05 — After-last-scene gap lerp bearing wobble (AG6-03 partial fix)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/camera.ts:401-410`
- **Detail:** The lerp start point `computeCameraForScene(track, cumulDist, prevScene, 1.0, elapsedSec)` uses current `elapsedSec`, causing the start point to move during rotation modes. Creates visible bearing wobble instead of smooth blend.
- **Fix:** Cache the previous scene's end-state camera when the gap is first entered and hold it constant throughout the gap transition.

---

### C7-F06 — ElevationProfile SVG click handler padding risk (latent)

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/ElevationProfile.tsx:64-71`
- **Detail:** Click coordinate calculation does not account for CSS padding. Currently no padding is applied, so no current bug.
- **Fix:** No immediate fix needed. Flag as latent risk.

---

### C7-F07 — `handleSearchSubmit` guard redundant (latent)

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/JourneyCreator.tsx:552-555`
- **Detail:** Guard checks `searchEnabled` but the search UI is not rendered when disabled. No current bug.
- **Fix:** No immediate fix needed.

---

## Carried Forward from Cycle 6 (still relevant)

| ID | Severity | Status | Note |
|----|----------|--------|------|
| AG6-01 | HIGH | **FIXED** | Trail/marker updates added to `renderFrameAndWait` |
| AG6-02 | MEDIUM | **FIXED** | `hadExistingExport` removed |
| AG6-03 | MEDIUM | PARTIAL | After-last-scene gap lerp added but wobble remains (C7-F05) |
| AG6-04 | MEDIUM | **FIXED** | Debug URL parameter removed |
| AG6-05 | LOW-MEDIUM | OPEN | Worker message validation not added |
| AG6-06 | MEDIUM | **FIXED** | Resolved by AG6-01 fix |
| AG6-07 | LOW-MEDIUM | PARTIAL | Ref added but `playbackProgress` still in deps (C7-F03) |
| AG6-08 | LOW-MEDIUM | **FIXED** | Resolved by AG6-01 fix |
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

---

## Summary by severity

| Severity | Count | IDs |
|----------|-------|-----|
| MEDIUM | 1 | C7-F05 |
| LOW-MEDIUM | 3 | C7-F01, C7-F02, C7-F03 |
| LOW | 2 | C7-F04 (intentional), C7-F06 (latent) |

## Actionable this cycle

C7-F01 (trivial — remove `t` from deps), C7-F02 (trivial — add `revokeExportedVideoUrl` to deps), C7-F03 (trivial — remove `playbackProgress` from deps), C7-F05 (medium — cache gap start camera state)

## Deferred to future cycles

AG6-05 (worker message validation), AG6-09 through AG6-19 (see cycle 6 aggregate), C7-F04 (intentional), C7-F06 (latent), C7-F07 (latent)
