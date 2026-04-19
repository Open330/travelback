# Comprehensive Deep Code Review — Cycle 9 (2026-04-19)

**Reviewer:** Multi-angle deep code review (code quality, performance, security, accessibility, correctness, UX)
**Scope:** Full repository — all 27 source files under `src/`
**Prior cycles:** 8 prior review cycles completed. Codebase is well-hardened; most MEDIUM/HIGH issues resolved.

## Methodology

Every source file was read in full. Each was analyzed from code quality, performance, security, correctness, accessibility, and UX perspectives. Cross-file interactions were traced. Previously deferred findings were re-evaluated. The review specifically looked for issues that 8 prior cycles may have missed, focusing on subtle logic bugs, cross-component consistency, and edge cases.

## Files Reviewed

| File | Lines | Status |
|------|-------|--------|
| `src/app/page.tsx` | 422 | Reviewed |
| `src/app/layout.tsx` | 81 | Reviewed |
| `src/types.ts` | 117 | Reviewed |
| `src/lib/usePlaybackController.ts` | 199 | Reviewed |
| `src/lib/useExportController.ts` | 193 | Reviewed |
| `src/lib/parser.ts` | 565 | Reviewed |
| `src/lib/videoEncoder.ts` | 191 | Reviewed |
| `src/lib/camera.ts` | 445 | Reviewed |
| `src/lib/interpolate.ts` | 173 | Reviewed |
| `src/lib/i18n.ts` | 1740 | Reviewed |
| `src/lib/env.ts` | 1 | Reviewed |
| `src/components/MapView.tsx` | 883 | Reviewed |
| `src/components/ExportPanel.tsx` | 326 | Reviewed |
| `src/components/FileUpload.tsx` | 256 | Reviewed |
| `src/components/SceneEditor.tsx` | 569 | Reviewed |
| `src/components/JourneyCreator.tsx` | 759 | Reviewed |
| `src/components/Controls.tsx` | 151 | Reviewed |
| `src/components/TrackToolbar.tsx` | 227 | Reviewed |
| `src/components/TrackWorkspace.tsx` | 155 | Reviewed |
| `src/components/GlobalToolbar.tsx` | 71 | Reviewed |
| `src/components/ThemeToggle.tsx` | 73 | Reviewed |
| `src/components/KeyboardHelp.tsx` | 84 | Reviewed |
| `src/components/ModalDialog.tsx` | 188 | Reviewed |
| `src/components/Toast.tsx` | 90 | Reviewed |
| `src/components/ElevationProfile.tsx` | 130 | Reviewed |
| `src/components/TimelineSelector.tsx` | 389 | Reviewed |
| `src/components/ErrorBoundary.tsx` | 83 | Reviewed |
| `src/components/GoogleGuide.tsx` | 373 | Reviewed |

---

## Findings

### NEW-C11-1: TimelineSelector distance-ratio to point-index mapping mismatch

- **Severity:** MEDIUM
- **Confidence:** HIGH
- **File:** `src/components/TimelineSelector.tsx:96-111`
- **Category:** Correctness / Logic bug

**Problem:**

The histogram buckets are computed using distance-based bucketing (cycle 7 fix NEW-C7-1). Each bucket represents an equal fraction of total track distance. The drag handle positions (`startRatio`, `endRatio`) are fractions of the histogram width, which corresponds to fractions of total distance.

However, `resolveRangeIndexes` converts these distance-fraction ratios to point indices using count-based linear interpolation:

```ts
let startIdx = Math.floor(Math.max(0, Math.min(1, startRatio)) * lastIndex)
let endIdx = Math.ceil(Math.max(0, Math.min(1, endRatio)) * lastIndex)
```

This treats `startRatio` as a fraction of the point count, not of the distance. When GPS points are unevenly distributed (dense in cities, sparse on highways — common for Google Location History), the visual handle position on the histogram doesn't correspond to the actual point range being selected.

**Concrete failure scenario:**

A Google Location History track has 1000 points: 900 clustered in a city (first 10% of distance) and 100 spread over a highway (remaining 90% of distance). The user drags the start handle to the 50% mark on the histogram (meaning "start from halfway through the journey").

- **Expected:** `startIdx` should be around 900 (where 50% of the total distance is).
- **Actual:** `Math.floor(0.5 * 999) = 499` — selects a point deep in the city cluster, corresponding to only ~5% of the distance.

The user sees the handle at the 50% distance mark but the selected range starts in the wrong place, resulting in a track slice that doesn't match the visual selection.

**Fix:**

Replace the linear interpolation with a binary search over `cumulDist` to correctly map distance fractions to point indices:

```ts
const resolveRangeIndexes = useCallback(() => {
  const lastIndex = points.length - 1
  if (lastIndex <= 0) return { startIdx: 0, endIdx: 0 }

  const totalDist = cumulDist[cumulDist.length - 1] ?? 0

  const ratioToIndex = (ratio: number): number => {
    if (totalDist <= 0) return Math.floor(ratio * lastIndex)
    const targetDist = ratio * totalDist
    let lo = 0, hi = cumulDist.length - 1
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1
      if (cumulDist[mid] <= targetDist) lo = mid
      else hi = mid
    }
    return lo
  }

  let startIdx = ratioToIndex(Math.max(0, Math.min(1, startRatio)))
  let endIdx = ratioToIndex(Math.max(0, Math.min(1, endRatio)))

  if (startIdx >= lastIndex) startIdx = lastIndex - 1
  if (endIdx <= startIdx) endIdx = Math.min(lastIndex, startIdx + 1)

  return { startIdx, endIdx }
}, [endRatio, points.length, startRatio, cumulDist])
```

This is a regression from the cycle 7 histogram fix — the histogram visualization was corrected to use distance-based bucketing, but the handle-to-index mapping was not updated to match.

---

### NEW-C11-2: ExportPanel Share button silently fails when file sharing unsupported

- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/components/ExportPanel.tsx:120-131, 142, 203-213`
- **Category:** UX / Correctness

**Problem:**

The Share button visibility is controlled by:

```ts
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
```

This checks only that `navigator.share` exists. But `handleShare` also checks `navigator.canShare?.({ files: [file] })` before attempting to share. On browsers that support `navigator.share` for URLs but not for files, the Share button appears but clicking it does nothing — the `canShare` check returns false, and the function returns silently with no user feedback.

**Concrete failure scenario:**

On some desktop browsers (or older mobile browsers), `navigator.share` exists but `navigator.canShare({ files: [...] })` returns false. The user sees the Share button, clicks it, and nothing happens. No error toast, no visual feedback.

**Fix:**

Either (a) check `navigator.canShare?.({ files: [videoFile] })` to conditionally show the button, or (b) show a toast when sharing fails due to unsupported file type:

```ts
if (navigator.share && navigator.canShare?.({ files: [file] })) {
  await navigator.share({ files: [file], title: 'Travelback' })
} else {
  // Show feedback that file sharing isn't supported
  console.warn('File sharing not supported on this browser')
}
```

---

### NEW-C11-3: ExportPanel handleExport doesn't clamp fps against EXPORT_LIMITS

- **Severity:** INFO
- **Confidence:** HIGH
- **File:** `src/components/ExportPanel.tsx:112-118`
- **Category:** Consistency / Defense-in-depth

**Problem:**

In `handleExport`, `duration` and `bitrate` are clamped to `EXPORT_LIMITS`, but `fps` is passed through unclamped:

```ts
const safeDuration = Math.max(EXPORT_LIMITS.duration.min, Math.min(duration, EXPORT_LIMITS.duration.max))
const safeBitrate = Math.max(EXPORT_LIMITS.bitrate.min, Math.min(bitrate, EXPORT_LIMITS.bitrate.max))
onExport({ resolution, codec, fps, duration: safeDuration, bitrate: safeBitrate, scenes: [] })
```

The `exportVideo` function in `videoEncoder.ts` does clamp all three parameters, so there's no functional bug. But this is an inconsistency in the defense-in-depth pattern — `duration` and `bitrate` are sanitized at the UI layer, while `fps` relies solely on the lower layer.

**Fix:**

Add `safeFps` for consistency:

```ts
const safeFps = Math.max(EXPORT_LIMITS.fps.min, Math.min(fps, EXPORT_LIMITS.fps.max))
onExport({ resolution, codec, fps: safeFps, duration: safeDuration, bitrate: safeBitrate, scenes: [] })
```

---

### NEW-C11-4: cycleStyle doesn't persist theme preference to localStorage

- **Severity:** INFO
- **Confidence:** MEDIUM
- **File:** `src/app/page.tsx:272-282`
- **Category:** Consistency

**Problem:**

`handleModeChange` persists the theme to `localStorage` via `localStorage.setItem('travelback-theme', mode)`. But `cycleStyle` directly calls `setColorMode(nextMode)` and `applyDocumentMode(nextMode)` without persisting to localStorage. If the user cycles to a dark map style (which also sets dark mode), then refreshes the page, the theme reverts to whatever was in localStorage.

This is consistent with the fact that the map style choice itself isn't persisted either — both are runtime-only preferences. But the mode change side-effect of `cycleStyle` could be confusing since theme changes via the explicit toggle ARE persisted.

**Fix:**

Either (a) add `localStorage.setItem('travelback-theme', nextMode)` to `cycleStyle`, or (b) have `cycleStyle` call `handleModeChange` instead of directly setting mode state. Option (b) would also ensure the map style auto-switches if there's no explicit map style choice.

---

## Previously Resolved Findings (Verified Still Fixed)

| ID | Finding | Status |
|----|---------|--------|
| NEW-C8-1 | Playback hotkeys not suppressed during export | Confirmed fixed |
| NEW-C8-2 | Export overlay missing `data-disable-playback-hotkeys` | Confirmed fixed |
| NEW-C9-1 | `setExportState('idle')` not guarded by `mountedRef` | Confirmed fixed |
| NEW-C10-1 | `setIsPlaying`/`setFollowCamera` exposed from usePlaybackController | Confirmed fixed |
| NEW-C7-1 | TimelineSelector index-based histogram | Histogram fix confirmed; but NEW-C11-1 reveals the handle-to-index mapping was not updated |

## Deferred Findings (Unchanged)

All 10 previously deferred findings remain deferred with no change in status:
- F4, F5, F7, F8, F9, F11, F12, F14, F16, NEW-R3-2

## Final Sweep

One additional pass was made specifically looking for:
- Race conditions in async operations (export, file parsing, map rendering) — none found beyond documented deferred items
- Memory leaks (object URLs, event listeners, animation frames) — all properly cleaned up
- XSS via user-controlled strings — track names are sanitized in `videoEncoder.ts`; i18n strings are static; no `dangerouslySetInnerHTML` with user content
- Inconsistent null checks — all paths handle null track properly
- Off-by-one errors in array indexing — checked all `.slice()`, `.filter()`, index arithmetic — correct
- Stale closure issues in callbacks — all event handlers use refs for mutable state — correct

No additional findings from the final sweep.

## Overall Assessment

The codebase remains in excellent shape. Cycle 9 produced 1 actionable MEDIUM-severity finding (NEW-C11-1, a regression from the cycle 7 histogram fix where the handle-to-index mapping wasn't updated to match the distance-based histogram), 1 LOW-severity UX issue, and 2 INFO-level consistency notes. The MEDIUM finding is a genuine correctness bug that affects range selection accuracy for unevenly distributed GPS data.
