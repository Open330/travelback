# Cycle 9 Comprehensive Deep Code Review — 2026-04-19

Reviewer: integrated multi-perspective review (code quality, performance, security, a11y, architecture)

## Review scope
All source files under `src/` (28 files), re-verified against prior cycle aggregates (C1-C8).

## Method
Full file-by-file read of every source file. Cross-referenced with all prior cycle reviews and aggregates. Focused on finding NEW issues not previously identified or fixed.

## Prior cycle findings verification
All C8-AGG-001 through C8-AGG-003 confirmed FIXED in current codebase:
- C8-AGG-001: ThemeToggle mount-time `onModeChange` effect removed — only `prefers-color-scheme` listener remains (lines 32-49)
- C8-AGG-002: Controls uses `cumulativeDistances[cumulativeDistances.length - 1] ?? 0` (line 41), no `totalDistance` import
- C8-AGG-003: MapView track-load effect deps `[track, cumulativeDistancesProp]` with eslint-disable (line 812)

## New findings

### C9-001 — HIGH — Export codec support check race: button enabled while `codecSupport[codec] === null`

**File:** `src/components/ExportPanel.tsx:71-77,128-129`

**Code:**
```ts
const [codecSupport, setCodecSupport] = useState<Record<VideoCodec, boolean | null>>(() =>
  codecSupportCache ?? { h264: null, h265: null, av1: null },
);
// ...
const codecReady = codecSupport[codec] === true
// ...
const handleExport = useCallback(() => {
  if (!codecReady) return
```

**Why it matters:**
`codecSupport` initializes all codecs to `null` (unknown). The `codecReady` guard only blocks when `codecSupport[codec] === false`. While support is still being probed (`null`), `codecReady` is `false` and the button is disabled — which is correct. However, there's a subtle issue: if `codecSupportCache` is populated from a prior mount, the state initializes from cache and the probe is skipped. But if the browser's codec capabilities change between sessions (e.g., after a browser update), the cache is stale and the button could be enabled for an unsupported codec.

More importantly, if the user switches codec while probing is in progress, the old probe result overwrites the cache for all codecs, but `codecReady` for the new codec is still `null` — so the button stays disabled until the probe finishes. This is correct behavior but creates a confusing UX where switching codec makes the button temporarily unclickable even for codecs that were previously confirmed.

**Suggested fix:**
When the user changes codec and the new codec's support state is still `null`, perform a targeted single-codec probe immediately rather than waiting for the full parallel probe to finish. Alternatively, store per-codec probe results as they arrive instead of waiting for all three.

**Confidence:** Medium (edge case, not a data-loss bug)

---

### C9-002 — HIGH — Export `finally` block awaits `waitForIdle` with potentially already-aborted signal

**File:** `src/lib/useExportController.ts:175-188`

**Code:**
```ts
finally {
  exportAbortRef.current = null
  mapViewRef.current?.resetSize()
  try {
    await mapViewRef.current?.waitForIdle(abortController.signal)
  } catch {
    // Timeout or abort is acceptable during cleanup
  }
```

**Why it matters:**
When the user cancels an export, `abortController.abort()` is called. The `finally` block then passes the same `abortController.signal` (already aborted) to `waitForIdle()`. Looking at `MapView.tsx:490-543`, when `signal.aborted` is true, `waitForIdle` immediately rejects with `AbortError`. The catch block swallows this, so no crash occurs.

However, the `resetSize()` call happens before the idle wait, meaning the map container is already resized back before `waitForIdle` even gets a chance to settle. The idle wait after abort is effectively a no-op because the signal is already aborted — it just rejects immediately and the catch swallows it.

The real problem is that `mapViewRef.current?.resetSize()` runs before the map has settled from its export-size state. If the map hasn't finished rendering at the export resolution when resetSize fires, the map may briefly show a distorted frame before snapping back. This isn't a bug per se, but it's wasted work.

**Suggested fix:**
Skip the `waitForIdle` call entirely when the export was aborted. The abort path already rejects the main promise, so there's no benefit to waiting for idle after cancellation. Just call `resetSize()` and be done.

**Confidence:** High

---

### C9-003 — MEDIUM — `handleRangeChange` may produce incorrect `segmentStartIndices` when trimming

**File:** `src/app/page.tsx:157-178`

**Code:**
```ts
const handleRangeChange = useCallback((startIdx: number, endIdx: number) => {
  if (!fullTrack) return
  const slicedPoints = fullTrack.points.slice(startIdx, endIdx + 1)
  if (slicedPoints.length < 2) return
  const filteredTrack: Track = {
    name: fullTrack.name,
    points: slicedPoints,
    ...(fullTrack.segmentStartIndices
      ? {
          segmentStartIndices: fullTrack.segmentStartIndices
            .filter((index) => index >= startIdx && index <= endIdx)
            .map((index) => index - startIdx)
            .filter((index) => index > 0),
        }
      : {}),
  }
  setTrack(filteredTrack)
  resetPlayback()
}, [fullTrack, resetPlayback])
```

**Why it matters:**
When a segment start index falls exactly at `startIdx`, it gets filtered out by `.filter((index) => index > 0)` after the offset is applied (since `startIdx - startIdx = 0`). This is correct — index 0 is not a segment start, it's the beginning of the track.

However, when a segment starts at `startIdx + 1` (the second point in the trimmed slice), the resulting index would be `1`, which is kept. This is correct behavior.

The actual bug is more subtle: when the trim range starts in the middle of a segment, the first point of the trimmed track is connected to the second point as if they're part of the same continuous segment. But there should be NO segment break here since the original segment was continuous. The existing code correctly avoids inserting a spurious break.

However, when a segment start index falls between `startIdx` and `endIdx` but the original segment boundary becomes the new start of the trimmed track (i.e., `index === startIdx`), we get `index - startIdx = 0` which is filtered out. This means the first segment of the trimmed track is always treated as continuous, even when the trim starts at a segment boundary. This is actually correct — the beginning of the track is not a segment break.

No bug found after deeper analysis. The code is correct.

**Confidence:** N/A (verified correct, not a finding)

---

### C9-004 — MEDIUM — Toast container uses `role="status"` which can suppress rapid sequential announcements

**File:** `src/components/Toast.tsx:66`

**Code:**
```ts
<div role="status" className="fixed bottom-28 sm:bottom-24 right-4 z-50 flex flex-col gap-2">
```

**Why it matters:**
`role="status"` is a live region with `aria-live="polite"` and `aria-atomic="true"`. When multiple toasts appear in rapid succession (e.g., export cancelled followed by a new error), assistive technology will typically only announce the most recent content, potentially missing intermediate messages. The `aria-atomic="true"` default means the entire container content is announced as a unit, which can be verbose when multiple toasts are visible.

More critically, if a toast is dismissed while another is being announced, the announcement may be interrupted. This is a known limitation of `role="status"` with dynamic lists.

**Suggested fix:**
Use `role="log"` with `aria-live="polite"` instead of `role="status"`. `role="log"` is designed for sequential entries where new items are added over time, which matches the toast pattern better. Alternatively, keep `role="status"` but ensure each `ToastItem` has its own `role="status"` so individual toasts are announced independently.

**Confidence:** Medium (a11y concern, not a functional bug)

---

### C9-005 — MEDIUM — `parseSemanticSegments` can create a segment break between timelinePath and visit within the same `semanticSegment`, but the visit's segment start index points to the wrong position after dedup

**File:** `src/lib/parser.ts:269-313`

**Code:**
```ts
function parseSemanticSegments(segments: Record<string, unknown>[], out: TrackPoint[], segStarts: number[]) {
  for (const seg of segments) {
    const preLen = out.length
    // ... parse timelinePath ...
    const afterPathLen = out.length
    if (afterPathLen > preLen && preLen > 0) segStarts.push(preLen)

    // ... parse visit ...
    if (out.length > afterPathLen && afterPathLen > 0) segStarts.push(afterPathLen)
  }
}
```

**Why it matters:**
When a single `semanticSegment` contains both a `timelinePath` and a `visit`, the code correctly inserts a segment break between them. However, the dedup/sort step in `parseGoogleLocationHistory` (lines 393-424) can remove duplicate points or reorder them. The `adjustedSegStarts` remapping (lines 416-424) searches forward from the original index to find the nearest surviving point, but this forward search can map two different original segment-start indices to the same deduplicated index, creating duplicate segment starts. The `.filter(idx => idx > 0)` at line 424 removes index 0 but does not remove duplicate positive indices.

When `normalizeSegmentStarts` in MapView (line 94-100) deduplicates with `new Set(...)`, this is harmless. But it means the segment-start indices array can have redundant entries that don't correspond to actual segment boundaries.

**Suggested fix:**
After the `adjustedSegStarts` computation, deduplicate the array before returning: `const dedupedSegStarts = [...new Set(adjustedSegStarts)]`.

**Confidence:** Medium (cosmetic, downstream code handles it, but it indicates a data-quality issue)

---

### C9-006 — LOW — `Controls` progress bar input uses `step={0.001}` which creates 1000 discrete positions — may be too coarse for long tracks and too fine for screen readers

**File:** `src/components/Controls.tsx:54-71`

**Code:**
```ts
<input
  type="range"
  min={0}
  max={1}
  step={0.001}
  value={progress}
  onChange={handleProgressChange}
  aria-label={t('controls.progressAria')}
```

**Why it matters:**
With `step={0.001}`, the range has 1000 discrete steps. For screen readers, each step announces as a percentage (0.1% increments), which is reasonable. However, for a 5-minute playback, each step represents 0.3 seconds. For a 10-minute export, each step is 0.6 seconds. This is adequate for most use cases.

No actual bug here — the step size is reasonable for the use case. Removing this finding.

**Confidence:** N/A (verified acceptable, not a finding)

---

### C9-007 — MEDIUM — `exportTrack` callback depends on `scenes` which can become stale during export

**File:** `src/lib/useExportController.ts:84-200`

**Code:**
```ts
const exportTrack = useCallback(async (config: ExportConfig) => {
  // ...
  const exportScenes = config.scenes.length > 0
    ? config.scenes
    : scenes.length > 0
    ? scenes
    : generateDefaultScenes()
  // ...
}, [
  // ...
  scenes,
  // ...
])
```

**Why it matters:**
The `exportTrack` callback captures `scenes` from its closure. When the export starts, `scenes` is captured at callback creation time. If the user edits scenes while the export is running (the scene editor could be opened during the export overlay), the export would still use the old scenes from the closure. This is actually correct behavior — you don't want mid-export scene changes.

However, there's a subtle issue: the export overlay blocks interaction with the scene editor (the overlay has `data-disable-playback-hotkeys="true"` and covers the screen), but the scene editor panel itself is still rendered underneath and could theoretically be interacted with if the overlay were dismissed. Since the export overlay has `z-20` and the scene editor is `z-20` as well, they could overlap in the z-order.

More importantly, `transitionDuration` is also captured in the closure at callback creation time. If the user changes the blend duration between exports, the next export correctly picks up the new value because `exportTrack` is recreated. This is correct.

No actual bug found after deeper analysis — the closure behavior is correct for the export use case.

**Confidence:** N/A (verified correct, not a finding)

---

## Actual new findings (summary)

After thorough re-analysis, the genuine new findings this cycle are:

1. **C9-002**: Export `finally` block does unnecessary `waitForIdle` with already-aborted signal — wasteful but harmless (MEDIUM)
2. **C9-004**: Toast container `role="status"` may suppress rapid sequential announcements (MEDIUM)
3. **C9-005**: `parseSemanticSegments` dedup can create duplicate segment-start indices (LOW, downstream handles it)

## No-issue verifications (explicitly checked, confirmed not bugs)

| Area | Finding | Why not an issue |
|------|---------|-------------------|
| C9-001 | Export codec cache staleness | Cache is populated per-session from live probe; staleness only occurs across sessions which is an extreme edge case. The button IS correctly disabled while probing. Not a real bug. |
| C9-003 | `handleRangeChange` segment index trimming | Verified correct: index 0 is not a segment start, and the first point of a trimmed track is always continuous by definition |
| C9-006 | Controls step={0.001} | 1000 steps is reasonable for the playback duration range |
| C9-007 | exportTrack scenes closure | Correct behavior: mid-export scene changes should not affect running export |

## Carried-forward deferred items (unchanged)

All prior deferred items remain deferred per their existing exit criteria. No new deferrals this cycle.
