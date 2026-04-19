# Cycle 11 Comprehensive Deep Code Review — 2026-04-19

Reviewer: integrated multi-perspective review (code quality, performance, security, a11y, architecture)

## Review scope
All source files under `src/` (28 files), re-verified against prior cycle aggregates (C1-C10).
Full file-by-file read of every source file. Cross-referenced with all prior cycle reviews and aggregates.

## Prior cycle findings verification

All C10-AGG-001 and C10-AGG-002 confirmed FIXED:
- C10-AGG-001: TrackToolbar mobile menu now uses `useFocusFirstOnOpen` hook with `useRef` + `useEffect` (TrackToolbar.tsx:11-17, 52-53)
- C10-AGG-002: `seekTo` has `Number.isFinite` guard (usePlaybackController.ts:64)

Verified prior cycle "incorrect findings" that were already resolved:
- `--err-rgb` IS defined in `:root` at vitro-base.css:30 — the cycle-15 finding claiming it was undefined was wrong
- `--gi-sh` and `--gs-sh` ARE defined in `[data-mode=dark]` at vitro-base.css:276 and 286 — the cycle-15 finding claiming they were missing was wrong
- Dead `public/theme-init.js` was already noted and is a deferred cosmetic item

## New findings

### C11-001 — MEDIUM — ExportPanel duration input allows values outside EXPORT_LIMITS

**File:** `src/components/ExportPanel.tsx:270-277`

**Code:**
```tsx
<input
  type="number"
  min={5}
  max={600}
  value={duration}
  onChange={e => setDuration(Math.max(5, Math.min(600, parseInt(e.target.value) || 30)))}
```

**Why it matters:**
The HTML `min`/`max` attributes and the `Math.max/Math.min` clamp in `onChange` use hard-coded `5`/`600` instead of `EXPORT_LIMITS.duration.min`/`EXPORT_LIMITS.duration.max`. While `handleExport` re-clamps using `EXPORT_LIMITS`, the displayed value in the input can diverge from the actually-used value. If someone changes `EXPORT_LIMITS` in `types.ts`, the input UI would be out of sync.

More critically, `parseInt(e.target.value)` returns `NaN` for empty input, which then falls through to `|| 30`, silently resetting to 30. If a user clears the field to type a new value, it jumps to 30 mid-keystroke.

**Suggested fix:**
Use `EXPORT_LIMITS.duration.min`/`max` in the input, and handle `NaN` from empty input by keeping the previous value rather than defaulting to 30.

**Confidence:** High

---

### C11-002 — LOW — SceneRangeEditor keyboard navigation does not call onChange for Home/End keys

**File:** `src/components/SceneEditor.tsx:183-204`

**Code:**
The `onKeyDown` handler for the SceneRangeEditor sliders handles `ArrowRight`/`ArrowLeft`/`ArrowUp`/`ArrowDown` but does not handle `Home` or `End` keys. Users who press Home/End on a slider expect it to jump to min/max, but nothing happens.

**Why it matters:**
WCAG 2.1 SC 4.1.2 requires slider widgets to support expected keyboard patterns. Home/End are standard slider key bindings per WAI-ARIA authoring practices.

**Suggested fix:**
Add Home/End key handlers that set startPercent to 0 or endPercent to 1 (respectively), calling `onChangeRef.current`.

**Confidence:** High

---

### C11-003 — MEDIUM — TimelineSelector resolveRangeIndexes called on every render outside memo

**File:** `src/components/TimelineSelector.tsx:245`

**Code:**
```tsx
const { startIdx, endIdx } = resolveRangeIndexes()
```

This call is at the top level of the render function (not inside `useMemo` or `useCallback`). `resolveRangeIndexes` performs binary search on cumulative distances for both start and end ratios. Since `TimelineSelector` is wrapped in `memo`, this only re-runs when props change, but it still runs unnecessarily during drag operations because `startRatio`/`endRatio` state changes trigger re-renders and the calculation is not memoized.

**Why it matters:**
During timeline drag, every pointer move updates `startRatio`/`endRatio` state, causing `resolveRangeIndexes()` to re-run binary searches on every render. While the binary search is O(log n), the function itself is called on every render, and it creates a new closure and does object allocation each time.

**Suggested fix:**
Wrap the result in `useMemo` keyed on `[startRatio, endRatio, cumulativeDistances]` to avoid redundant recomputation during unrelated re-renders.

**Confidence:** Medium

---

### C11-004 — LOW — Toast component renders null when messages is empty but Toast container div would be more useful with role="log" always present

**File:** `src/components/Toast.tsx:63-66`

**Code:**
```tsx
if (messages.length === 0) return null
```

**Why it matters:**
When the Toast component returns `null`, the live region (`role="log"`) is not present in the DOM. Screen readers that have already announced toasts need the region to persist so they can detect removals. Removing and re-adding the live region can cause inconsistent announcements in some screen readers (NVDA, JAWS).

**Suggested fix:**
Always render the container `div` with `role="log" aria-live="polite"`, even when messages is empty, so the live region is stable in the accessibility tree.

**Confidence:** Medium

---

### C11-005 — LOW — TrackWorkspace track title `right-56` uses fixed rem instead of responsive value

**File:** `src/components/TrackWorkspace.tsx:119`

**Code:**
```tsx
className="absolute left-4 right-56 top-4 z-10 ..."
```

**Why it matters:**
`right-56` is 14rem (224px). On viewports between `lg` (1024px) and 1280px, this leaves only ~640px for the title, which is fine. But when the scene editor is open, TrackToolbar shifts right by `sm:right-[18rem]` but the title still has `right-56`. The title can overlap with the scene editor panel.

**Suggested fix:**
Consider adjusting `right-56` to a more responsive value when the scene editor is visible, similar to how TrackToolbar adjusts its `right` position.

**Confidence:** Low

---

### C11-006 — MEDIUM — exportVideo frame loop does not check signal.aborted between renderFrame and waitForIdle

**File:** `src/lib/videoEncoder.ts:93-126`

**Code:**
```ts
for (let frame = 0; frame < totalFrames; frame++) {
  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError')
  }
  // ... renderFrame ...
  // ... waitForIdle ...
  // ... add frame ...
}
```

**Why it matters:**
The abort check only happens at the top of the loop. If the user cancels during `renderFrame` or `waitForIdle`, the loop continues to the next iteration's abort check. The `waitForIdle` is passed the signal and will reject on abort, which is caught by the try block. However, `renderFrame` (which calls `setPlaybackProgress` and `applyCameraState`) runs synchronously and is not abort-aware — so a cancelled export still applies one more camera state and progress update before the abort is detected.

**Suggested fix:**
Add `if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError')` after `await renderFrame()` and before `await waitForIdle()`.

**Confidence:** Medium

---

### C11-007 — LOW — ElevationProfile click handler does not account for RTL layout

**File:** `src/components/ElevationProfile.tsx:64-66`

**Code:**
```ts
const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const clickFraction = (e.clientX - rect.left) / rect.width
```

**Why it matters:**
In an RTL layout, `e.clientX - rect.left` would be measured from the right edge visually, but the SVG x-axis always goes left-to-right. For an app with Korean/Japanese/Chinese locale support, RTL is unlikely but the code should be defensive.

**Suggested fix:**
Low priority — only matters if RTL is ever supported. Can be deferred.

**Confidence:** Low

---

### C11-008 — MEDIUM — downloadVideo fallback path returns `saved: true` but the download may not complete

**File:** `src/lib/videoEncoder.ts:183-194`

**Code:**
```ts
const a = document.createElement('a')
a.href = url
a.download = filename
document.body.appendChild(a)
a.click()
setTimeout(() => { a.remove() }, 100)
return { saved: true, method: 'fallback' }
```

**Why it matters:**
The fallback `<a download>` click returns `{ saved: true }` immediately, but browsers (especially Safari < 15.4 and some mobile WebViews) may silently fail to initiate the download. The UI then shows "saved to Downloads" even when no file was saved. This was flagged in prior reviews (critic.md finding 3) but never addressed or deferred.

**Suggested fix:**
Change the fallback success message from "Video saved" to "Download started" when `method === 'fallback'`, since the save cannot be confirmed. The `downloadMethod` is already tracked and surfaced in ExportPanel.tsx:208, so only the i18n key mapping needs adjustment.

**Confidence:** High (prior finding carried forward, still valid)

---

### C11-009 — LOW — Controls elapsed calculation can show values > duration due to floating point

**File:** `src/components/Controls.tsx:43`

**Code:**
```ts
const elapsed = duration * progress
```

**Why it matters:**
When `progress` is exactly `1` and `duration` is 30, `elapsed` is 30. But when `progress` approaches 1 from below due to floating point, `elapsed` can be slightly less than `duration`. More importantly, when `progress` is exactly 1 (playback complete), `traveled` is set to `total` (line 42) but `elapsed` is `duration * 1 = duration`, which is correct. No actual bug, but the display might show `0:30 / 0:30` with occasional floating-point wobble.

**Confidence:** Low (cosmetic only)

---

## Final sweep — confirmed no files skipped

All 28 source files under `src/` were read and reviewed. No new high-severity findings beyond those already in the deferred backlog. The codebase has improved significantly over cycles 1-10 with most critical issues resolved.

The most impactful remaining issues are the deferred performance items (DF-C2-002 through DF-C2-008) which require architectural changes beyond the scope of a single bug-fix cycle.
