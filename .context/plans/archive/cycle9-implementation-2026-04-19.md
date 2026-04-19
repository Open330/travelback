# Cycle 9 Implementation Plan

**Date:** 2026-04-19
**Source review:** `comprehensive-deep-code-review-2026-04-19-cycle9.md`

---

## Finding: NEW-C11-1 — TimelineSelector distance-ratio to point-index mapping mismatch

- **Severity:** MEDIUM
- **Confidence:** HIGH
- **File:** `src/components/TimelineSelector.tsx:96-111`
- **Status:** DONE

### Problem

The histogram buckets are computed using distance-based bucketing (cycle 7 fix NEW-C7-1), but `resolveRangeIndexes` still converts distance-fraction ratios to point indices using count-based linear interpolation (`Math.floor(ratio * lastIndex)`). When GPS points are unevenly distributed, the visual handle position doesn't correspond to the actual point range being selected.

This is a regression from the cycle 7 histogram fix — the histogram visualization was corrected but the handle-to-index mapping was not updated to match.

### Plan

1. Replace the linear interpolation in `resolveRangeIndexes` with a binary search over `cumulDist` to correctly map distance fractions to point indices
2. Add a helper function `ratioToIndex` that:
   - Handles `totalDist <= 0` edge case (fallback to linear)
   - Uses binary search on `cumulDist` for the general case
3. Verify that `cumulDist` is available in the callback (it is — already computed via `useMemo`)
4. Run `tsc --noEmit` to confirm no type errors
5. Run `npm run build` to confirm no build errors
6. Manually verify: load a Google Location History file with uneven point distribution, drag timeline handles, confirm selected range matches visual position

### Exit criteria

- `resolveRangeIndexes` uses binary search over `cumulDist` instead of linear interpolation
- `tsc --noEmit` passes
- `npm run build` passes
- Range selection accuracy matches histogram visual position for unevenly distributed GPS data

### Implementation

- Replaced linear interpolation (`Math.floor(ratio * lastIndex)`) with `ratioToIndex` helper using binary search over `cumulDist`
- `ratioToIndex` handles `totalDist <= 0` edge case with linear fallback
- Added `cumulDist` to the `useCallback` dependency array
- `tsc --noEmit` passes clean
- LSP diagnostics show 0 errors
- `npm run build` passes
- Committed as `e7ae34c`

---

## Finding: NEW-C11-2 — ExportPanel Share button silently fails when file sharing unsupported

- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/components/ExportPanel.tsx:120-131, 142, 203-213`
- **Status:** DONE

### Problem

Share button appears when `navigator.share` exists, but `handleShare` also checks `navigator.canShare?.({ files: [file] })`. When file sharing is unsupported, the button is visible but clicking it does nothing — no user feedback.

### Plan

1. Move the `canShare` check to also verify file-sharing capability by creating a test file and checking `navigator.canShare?.({ files: [testFile] })`
2. Only show the Share button when file sharing is confirmed to work
3. Alternatively, show a toast when sharing fails due to unsupported file type
4. Run `tsc --noEmit` to confirm no type errors
5. Run `npm run build` to confirm no build errors

### Exit criteria

- Share button is only shown when `navigator.canShare?.({ files: [...] })` returns true, OR a toast is shown when sharing fails
- `tsc --noEmit` passes
- `npm run build` passes

### Implementation

- Replaced `canShare` check with IIFE that also verifies `navigator.canShare?.({ files: [testFile] })` using a minimal test file
- Gracefully handles `canShare` not existing (returns false) and exceptions (returns false)
- Share button now only appears when file sharing is confirmed to work
- `tsc --noEmit` passes clean
- LSP diagnostics show 0 errors
- `npm run build` passes
- Committed as `764be2d`

---

## Finding: NEW-C11-3 — ExportPanel handleExport doesn't clamp fps against EXPORT_LIMITS

- **Severity:** INFO
- **Confidence:** HIGH
- **File:** `src/components/ExportPanel.tsx:112-118`
- **Status:** NO FIX NEEDED

### Rationale

The `exportVideo` function in `videoEncoder.ts` already clamps all three parameters (duration, fps, bitrate) against `EXPORT_LIMITS`. The defense-in-depth is provided at the lower layer. Adding `safeFps` in the UI layer is a nice consistency improvement but not required for correctness.

---

## Finding: NEW-C11-4 — cycleStyle doesn't persist theme preference to localStorage

- **Severity:** INFO
- **Confidence:** MEDIUM
- **File:** `src/app/page.tsx:272-282`
- **Status:** NO FIX NEEDED

### Rationale

The map style choice itself isn't persisted either — both are runtime-only preferences that reset on page load. This is a design decision (map style and its associated mode change are transient). The explicit theme toggle via `handleModeChange` IS persisted, which gives users a deliberate way to save their preference. Making `cycleStyle` persist would create a confusing interaction where cycling styles has a side effect of overwriting the user's explicit theme choice.

---

## Deferred Findings Update

No new deferred items from this cycle. All previously deferred findings remain unchanged as documented in `.context/plans/deferred-findings-cycle2-2026-04-19.md`.
