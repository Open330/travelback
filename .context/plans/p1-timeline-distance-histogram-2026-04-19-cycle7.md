# P1 - TimelineSelector Distance-Based Histogram (Cycle 7)

**Priority:** P1 — consistency with distance-based paradigm used throughout the app
**Source:** comprehensive-deep-code-review-2026-04-19-cycle7 (NEW-C7-1)
**Estimated effort:** 30 minutes

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| NEW-C7-1 | TimelineSelector histogram uses index-based bucketing instead of distance-based | MEDIUM | `src/components/TimelineSelector.tsx:70-78` |

---

## Problem

The TimelineSelector's histogram distributes points into buckets using point index:

```typescript
const b = Math.min(
  BUCKET_COUNT - 1,
  Math.floor((i / points.length) * BUCKET_COUNT)
)
```

When track points are unevenly distributed (dense in cities, sparse on highways), the histogram visually misrepresents the data. A dense cluster of 1000 points in a small area takes up a disproportionate portion of the histogram even though they represent very little distance.

This is inconsistent with the distance-based paradigm used everywhere else in the app (ElevationProfile SVG x-axis, playback progress, trail rendering).

---

## Implementation steps

### 1. Compute cumulative distances in TimelineSelector

**File:** `src/components/TimelineSelector.tsx`

Add an import for `computeCumulativeDistances` from `@/lib/interpolate` and compute the distances alongside the existing `buckets` memo:

```typescript
import { computeCumulativeDistances } from '@/lib/interpolate'
```

Then in the component, add a `cumulDist` memo:

```typescript
const cumulDist = useMemo(
  () => computeCumulativeDistances(track.points, track.segmentStartIndices),
  [track]
)
```

### 2. Rewrite the buckets memo to use distance-based bucketing

Replace the current index-based bucketing with distance-based bucketing:

```typescript
const buckets = useMemo(() => {
  const arr = new Array<number>(BUCKET_COUNT).fill(0)
  if (points.length === 0) return arr
  const totalDist = cumulDist[cumulDist.length - 1] ?? 0
  if (totalDist <= 0) {
    // Fallback: use index-based bucketing when no distance data
    for (let i = 0; i < points.length; i++) {
      const b = Math.min(BUCKET_COUNT - 1, Math.floor((i / points.length) * BUCKET_COUNT))
      arr[b]++
    }
    return arr
  }
  for (let i = 0; i < points.length; i++) {
    const dist = cumulDist[i] ?? 0
    const b = Math.min(BUCKET_COUNT - 1, Math.floor((dist / totalDist) * BUCKET_COUNT))
    arr[b]++
  }
  return arr
}, [points, cumulDist])
```

### 3. Verify build passes

```bash
npm run build
```

---

## Verification checklist

- [ ] `npm run build` succeeds
- [ ] Load a track with unevenly distributed points
- [ ] The histogram should show higher bars in areas with more points per distance unit (e.g., city segments)
- [ ] The histogram should visually correlate with the ElevationProfile SVG (both distance-based)
- [ ] Timeline range handles still work correctly after the change

---

## Deferred findings

NEW-C7-6 (`checkJsonDepth` spot-check string/escape state) — LOW confidence, LOW severity. The false positive (rejecting a valid file with an extremely unusual string pattern) is safer than a false negative. Deferring with exit criterion: if users report false `JSON_DEPTH_EXCEEDED` errors on valid files, re-evaluate.
