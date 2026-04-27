# Cycle 7 Focused Deep Code Review (2026-04-27)

Reviewer: consolidated (single deep pass replacing 11-agent fan-out given 6+ prior converged cycles)

## Review Scope

All src/ files, scripts/, and key configuration files. Cross-referenced against the aggregate review from cycle 6 (AG6-01 through AG6-19) and the cycle 7 plan.

## New Findings

### C7-F01 — `handleRangeChange` has unnecessary `t` dependency causing callback churn

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/app/page.tsx:328`
- **Detail:** ESLint already flagged this: `useCallback has an unnecessary dependency: 't'`. The `handleRangeChange` callback depends on `t` but never uses it within the callback body. This causes the callback (and all its consumers) to recreate on every locale change, which is unnecessary since `t` is not called inside the callback. The `t` was likely left from a previous iteration that included a toast message.
- **Fix:** Remove `t` from the dependency array of `handleRangeChange`.
- **Cross-reference:** ESLint warning `react-hooks/exhaustive-deps` at line 328.

### C7-F02 — `exportTrack` useCallback missing `revokeExportedVideoUrl` dependency

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:268`
- **Detail:** ESLint flagged: `useCallback has a missing dependency: 'revokeExportedVideoUrl'`. The function `revokeExportedVideoUrl` is called inside `exportTrack` (line 137) but is not in the dependency array. Since `revokeExportedVideoUrl` is a stable callback (created via `useCallback` with `[]` deps), omitting it is technically safe but violates the exhaustive-deps rule and could become a bug if the implementation changes.
- **Fix:** Add `revokeExportedVideoUrl` to the dependency array.
- **Cross-reference:** ESLint warning `react-hooks/exhaustive-deps` at line 268.

### C7-F03 — `playbackProgress` still in `exportTrack` dependency array (AG6-07 partial fix)

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:268`
- **Detail:** AG6-07 identified that `playbackProgress` (updated at ~60fps) is in `exportTrack`'s dependency array, causing callback churn. A `playbackProgressRef` was added but `playbackProgress` is still in the dependency array at line 268. The ref is used inside the callback but the state variable still appears in deps, negating the optimization.
- **Fix:** Remove `playbackProgress` from the dependency array since the ref is used instead.

### C7-F04 — `handleModeChange` unnecessarily couples theme and map style changes

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/app/page.tsx:458-476`
- **Detail:** When the user manually changes the theme (dark/light), `handleModeChange` also changes the map style if `!hasExplicitMapStyleChoice`. This means a user who explicitly set the map style to "Dark" while in light mode will have their map style silently changed when they switch to dark mode. The coupling is documented in the comment but the behavior may surprise users who set a specific map style.
- **Fix:** This is an intentional design choice (theme-map style coupling). No code change needed. Documenting as a known behavior.

### C7-F05 — `computeCameraForProgress` gap after last scene still causes bearing snap

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/camera.ts:401-410`
- **Detail:** This was identified as AG6-03 in cycle 6. Re-confirming it was NOT fixed in cycle 6. The after-last-scene gap now has a lerp from the previous camera to the default follow camera (added in a prior cycle), but the lerp is from `computeCameraForScene(track, cumulDist, prevScene, 1.0, elapsedSec)` which uses the *current elapsedSec*. For orbit/overview modes with rotation, this means the "previous camera end state" includes ongoing rotation, making the lerp start point move as progress advances through the gap. This creates a subtle but visible bearing wobble during the transition rather than a smooth blend.
- **Fix:** The lerp start point should be captured at the exact moment the gap begins and held constant throughout the gap transition. This requires caching the previous scene's end-state camera when the gap is first entered.

### C7-F06 — `ElevationProfile` SVG click handler doesn't account for padding/margins

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/ElevationProfile.tsx:64-71`
- **Detail:** The click handler computes `clickFraction` as `(e.clientX - rect.left) / rect.width` where `rect` is from `getBoundingClientRect()`. This includes padding/borders in the calculation. The SVG viewBox is `0 0 100 100` but the actual plotting area starts at x=0 and ends at x=100. If any CSS padding is applied to the SVG element itself, the click coordinates would be slightly offset. Currently no padding is applied directly to the SVG, so this is a latent risk rather than a current bug.
- **Fix:** No immediate fix needed. Flag as latent risk.

### C7-F07 — `JourneyCreator` `handleSearchSubmit` enables search when `searchEnabled` is false

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/JourneyCreator.tsx:552-555`
- **Detail:** `handleSearchSubmit` has a guard `if (!searchEnabled) return` but this is only checked in the button click handler. If `searchEnabled` is false, the search input and submit button are not rendered, so the guard is redundant but not harmful. However, if the search input were ever shown without the search being enabled (e.g., via keyboard shortcut), the submit would be silently ignored. Not a current bug.
- **Fix:** No immediate fix needed.

## Carried-Forward Findings (from AG6, still relevant)

These were identified in cycle 6 and remain actionable:

| ID | Severity | Status | Note |
|----|----------|--------|------|
| AG6-01 | HIGH | **FIXED** | Trail/marker updates added to `renderFrameAndWait` in a prior cycle |
| AG6-02 | MEDIUM | **FIXED** | `hadExistingExport` removed in a prior cycle |
| AG6-03 | MEDIUM | PARTIAL | After-last-scene gap lerp added but still has wobble (C7-F05) |
| AG6-04 | MEDIUM | **FIXED** | Debug URL parameter removed in a prior cycle |
| AG6-05 | LOW-MEDIUM | OPEN | Worker message validation not added |
| AG6-07 | LOW-MEDIUM | PARTIAL | Ref added but `playbackProgress` still in deps (C7-F03) |

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| MEDIUM | 1 | C7-F05 |
| LOW-MEDIUM | 3 | C7-F01, C7-F02, C7-F03 |
| LOW | 2 | C7-F04 (intentional), C7-F06 (latent risk) |

## Actionable This Cycle

C7-F01, C7-F02, C7-F03 are straightforward ESLint warning fixes. C7-F05 (bearing wobble) is a medium-severity camera issue that needs more careful fixing.
