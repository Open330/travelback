# P1 Robustness & Quality — Cycle 2 (2026-04-19)

**Priority:** P1 — robustness gaps, code quality, and correctness edge cases
**Source:** comprehensive-deep-code-review-2026-04-19-cycle2 (NEW-3, NEW-4, NEW-5, NEW-6, NEW-7)
**Estimated effort:** 2-3 hours

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| NEW-3 | ElevationProfile click-to-seek incorrect for distance-based x-axis | MEDIUM | ElevationProfile.tsx |
| NEW-4 | SceneRangeEditor useEffect re-registers on onChange change | MEDIUM | SceneEditor.tsx |
| NEW-5 | Multiple empty catch blocks silently swallow errors | LOW | parser.ts, videoEncoder.ts, etc. |
| NEW-6 | eslint-disable comments without justification | LOW | TimelineSelector, JourneyCreator |
| NEW-7 | TrackToolbar document listener without passive flag | LOW | TrackToolbar.tsx |

---

## Implementation steps

### 1. Fix ElevationProfile click-to-seek for distance-based x-axis (NEW-3)

**File:** `src/components/ElevationProfile.tsx:66-69`

**Current:** The click handler maps horizontal position to progress linearly, but the SVG x-axis is based on cumulative distance. For tracks with non-uniform point density, clicking at a specific elevation point will seek to the wrong position.

```ts
const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width
  onSeek(Math.max(0, Math.min(1, x)))
}
```

**Fix:** Use a binary search on `cumulDist` to convert the distance-fraction click position to a point-index progress:

```ts
const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const clickFraction = (e.clientX - rect.left) / rect.width
  const totalDist = cumulDist[cumulDist.length - 1] ?? 0
  if (totalDist <= 0 || track.points.length < 2) {
    onSeek(Math.max(0, Math.min(1, clickFraction)))
    return
  }
  const targetDist = clickFraction * totalDist
  // Binary search for the point nearest to targetDist
  let lo = 0, hi = cumulDist.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (cumulDist[mid] < targetDist) lo = mid + 1
    else hi = mid
  }
  const progress = lo / (track.points.length - 1)
  onSeek(Math.max(0, Math.min(1, progress)))
}
```

**Verification:** Create a track with dense points in the first half and sparse points in the second half. Click near the midpoint of the elevation profile. Confirm the seek target matches the visual position, not the point count.

---

### 2. Use ref for SceneRangeEditor onChange to avoid listener re-registration (NEW-4)

**File:** `src/components/SceneEditor.tsx:89-134`

**Current:** The drag useEffect has `onChange` in its dependency array, causing listener re-registration if the parent does not memoize `onChange`.

**Fix:** Use a ref for `onChange`:

```ts
const onChangeRef = useRef(onChange)
useEffect(() => { onChangeRef.current = onChange }, [onChange])

// In the drag useEffect, use onChangeRef.current instead of onChange
// Remove onChange from the dependency array
```

Update lines 99, 105, 120 to use `onChangeRef.current(nextStart, nextEnd)` instead of `onChange(nextStart, nextEnd)`.

Update line 134 to remove `onChange` from deps: `}, [clampRange, dragging])`

**Verification:** Add a console.log to onChange in the parent. Confirm it is not called during listener registration, only during actual drag events.

---

### 3. Add console.warn to non-localStorage empty catch blocks (NEW-5)

**File:** `src/lib/parser.ts:368`, `src/lib/parser.ts:467`, `src/lib/videoEncoder.ts:188`, `src/components/ExportPanel.tsx:100`

**Current:** 4 non-localStorage empty catch blocks silently swallow errors.

**Fix:** Add `console.warn` to each:

```ts
// parser.ts:368
} catch (err) {
  console.warn('Failed to parse Google Location History:', err instanceof Error ? err.message : 'Unknown error')
}

// parser.ts:467 (worker message handler)
} catch (err) {
  reject(err instanceof Error ? err : new Error(String(err)))
}

// videoEncoder.ts:188
} catch (err) {
  console.warn('Download fallback failed:', err)
}

// ExportPanel.tsx:100
} catch (err) {
  console.warn('Failed to read stored export settings:', err)
}
```

The 9 localStorage-related catches (with `/* ignore */` or `/* noop */` comments) remain unchanged — they are intentional.

**Verification:** Trigger each error path and confirm a console warning appears instead of silent failure.

---

### 4. Add justification comments to eslint-disable (NEW-6)

**File:** `src/components/TimelineSelector.tsx:151`, `src/components/JourneyCreator.tsx:413`

**Current:** Two eslint-disable comments lack justification.

**Fix:** Add explanatory comments:

```ts
// TimelineSelector.tsx:151
// eslint-disable-next-line react-hooks/exhaustive-deps -- drag listeners use refs for all mutable state; effect only needs to re-register when points change
```

```ts
// JourneyCreator.tsx:413
// eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only effect; map ref and handlers are stable
```

**Verification:** Verify the eslint-disable comments are preserved and the justification is accurate.

---

### 5. Add passive flag to TrackToolbar mousedown listener (NEW-7)

**File:** `src/components/TrackToolbar.tsx:59`

**Current:** `document.addEventListener('mousedown', handlePointerDown)` without passive flag.

**Fix:** Since `handlePointerDown` does not call `preventDefault()`, add passive flag:

```ts
document.addEventListener('mousedown', handlePointerDown, { passive: true })
```

**Verification:** Verify the mobile menu still opens/closes correctly on touch devices.

---

## Verification checklist

- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e:static:ci` passes
- [ ] ElevationProfile click seeks to correct position for non-uniform tracks (NEW-3)
- [ ] SceneRangeEditor listeners stable across renders (NEW-4)
- [ ] Non-localStorage empty catches log warnings (NEW-5)
- [ ] eslint-disable comments have justification (NEW-6)
- [ ] TrackToolbar mousedown listener is passive (NEW-7)
