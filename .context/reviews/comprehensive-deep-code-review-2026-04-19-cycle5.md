# Comprehensive Deep Code Review - Cycle 5

**Date:** 2026-04-19
**Reviewer:** Automated review cycle 5/100
**Scope:** Full source tree (`src/`, `public/`, `scripts/`, `e2e/`)

## Previous Cycle Verification

All 4 findings from cycle 4 have been verified as fixed:

| ID | Finding | Status |
|----|---------|--------|
| NEW-C4-1 | Worker error message says "200MB" but limit is 500MB | FIXED -- line 263 now reads `'Input too large: exceeds 500MB limit'` |
| NEW-C4-2 | i18n `fileUpload.fileTooLarge` says "max 200 MB" but JSON limit is 500MB | FIXED -- i18n key now uses `{max}` placeholder; `FileUpload.tsx` passes `maxForType` dynamically |
| NEW-C4-3 | `downloadVideo` fetches blob URL only to re-create blob | FIXED -- `downloadVideo` now accepts optional `Blob` parameter; `useExportController` passes blob directly |
| NEW-C4-4 | Drag-and-drop silently ignores unsupported file types | FIXED -- `handleDrop` now calls `setError(t('fileUpload.unsupportedFormat'))` before returning |

## New Findings

### NEW-C5-1: ElevationProfile click-to-seek uses incorrect progress conversion

**Severity:** MEDIUM
**File:** `src/components/ElevationProfile.tsx:76-84`
**Category:** Correctness / UX bug

**Description:**
When the user clicks on the elevation profile SVG to seek to a position, the code converts the click position to a progress value using point index instead of distance fraction:

```typescript
// Current code (line 76-84):
const targetDist = clickFraction * totalDist
let lo = 0, hi = cumulDist.length - 1
while (lo < hi) {
  const mid = (lo + hi) >>> 1
  if (cumulDist[mid] < targetDist) lo = mid + 1
  else hi = mid
}
const seekProgress = lo / (track.points.length - 1)  // <-- BUG
```

The SVG's x-axis is proportional to cumulative distance (see line 52):
```typescript
const x = totalDist > 0 ? (cumulDist[i] / totalDist) * w : (i / (n - 1)) * w
```

So `clickFraction` already represents the correct distance-based progress fraction. The binary search and `lo / (track.points.length - 1)` conversion introduces an error when points are unevenly distributed by distance, because `lo / (track.points.length - 1)` treats progress as "fraction of total points" rather than "fraction of total distance".

**Concrete example:** A track with 5 points at distances [0, 100, 200, 300, 1000]m. Clicking at 30% of the SVG width (300m = 30% of total distance):
- Binary search finds `lo = 3` (cumulDist[3] = 300)
- Current: `seekProgress = 3/4 = 0.75` (75% of track distance)
- Correct: `seekProgress = 0.30` (30% of track distance)

The user would see the playback position jump to 75% of the track instead of the expected 30%. This is especially noticeable for tracks with unevenly distributed points (e.g., dense GPS points in a city, sparse points on a highway).

**Fix:** Since the SVG x-axis is already proportional to cumulative distance when `totalDist > 0`, simply use `clickFraction` directly:

```typescript
if (totalDist <= 0 || track.points.length < 2) {
  onSeek(Math.max(0, Math.min(1, clickFraction)))
  return
}
// SVG x-axis is distance-proportional, so clickFraction IS the correct progress
onSeek(Math.max(0, Math.min(1, clickFraction)))
```

The entire binary search block (lines 76-84) is unnecessary when `totalDist > 0` because the x-coordinate already encodes the correct distance fraction.

**Verification:**
- Load a track with unevenly distributed points
- Click on the left portion of the elevation profile
- Confirm the playback position seeks to the correct distance-proportional position

---

## Codebase Health Assessment

### Strengths (confirmed from previous cycles)

1. **Security posture is solid**: No `eval()`, `Function()`, or `innerHTML` usage. CSP hardening via post-build script. XML entity stripping. JSON depth checking with spot-checks. Worker isolation for large JSON parsing. The single `dangerouslySetInnerHTML` (theme-init script) is CSP-hashed in production.

2. **Resource cleanup is thorough**: Object URLs revoked in cleanup effects. Map markers/layers removed on unmount. Event listeners cleaned up in effect returns. `mountedRef` pattern prevents state updates after unmount. Worker `terminate()` in all exit paths.

3. **Type safety is good**: `ParseError` class with machine-readable codes for i18n mapping. Proper TypeScript types throughout. No `any` usage in source files. TypeScript `--noEmit` passes clean.

4. **Antimeridian handling**: Consistent shifted-longitude interpolation across `lerpCamera`, `smoothCameraState`, and `computeBoundingBox`.

5. **Accessibility**: Modal dialogs with focus trapping and `aria-modal`. Keyboard navigation support. `inert`/`aria-hidden` on background content when modals are open. ARIA labels on interactive elements.

6. **Defense-in-depth for parsing**: Multiple size checks (FileUpload pre-check, parser check, worker check). Worker fallback to main thread on failure. Date field repair after structured clone.

7. **No TODO/FIXME/HACK comments** in source code.

8. **All console statements justified**: No extraneous debug logging.

9. **All eslint-disable comments justified**: 5 total, each with documented reasons.

### No Regressions Detected

All previously fixed issues remain fixed. No new code quality regressions, security issues, or architectural problems beyond the single finding above.

### Module-Level Assessment

| Module | Lines | Assessment |
|--------|-------|------------|
| `src/app/page.tsx` | 422 | Central orchestrator, clean state management |
| `src/lib/parser.ts` | 566 | Robust parsing, 5 Google formats, defense-in-depth |
| `src/components/MapView.tsx` | 883 | Complex but well-structured, proper cleanup |
| `src/lib/camera.ts` | 445 | Clean antimeridian handling, good scene system |
| `src/lib/videoEncoder.ts` | 191 | Proper abort handling, config clamping |
| `src/lib/i18n.ts` | ~1740 | Complete 5-locale coverage, type-safe keys |
| `src/components/SceneEditor.tsx` | 569 | Complex drag handling, proper cleanup |
| `src/components/JourneyCreator.tsx` | 759 | Local-only search, map interaction cleanup |
| `src/components/ElevationProfile.tsx` | 141 | **Bug found** (NEW-C5-1) |
| `src/components/ExportPanel.tsx` | 326 | Good codec support detection |
| `src/components/TimelineSelector.tsx` | 375 | Consistent index-based design |
| `src/components/ModalDialog.tsx` | 188 | Proper stacking, focus trap, body scroll lock |
| `scripts/harden-static-export.mjs` | 102 | Clean CSP hardening, HTML entity handling |

---

## Summary

| ID | Finding | Severity | Files |
|----|---------|----------|-------|
| NEW-C5-1 | ElevationProfile click-to-seek uses point-index instead of distance-fraction | MEDIUM | `src/components/ElevationProfile.tsx:76-84` |

**Net assessment:** The codebase remains in excellent shape. The single finding is a correctness bug in the elevation profile's click-to-seek behavior that causes the playback position to jump to the wrong location when track points are unevenly distributed by distance. This is a straightforward fix.
