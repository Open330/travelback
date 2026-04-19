# P1 Elevation Profile Seek Fix — Cycle 5 (2026-04-19)

**Priority:** P1 — correctness bug causing click-to-seek to jump to wrong position
**Source:** comprehensive-deep-code-review-2026-04-19-cycle5 (NEW-C5-1)
**Estimated effort:** 5 minutes

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| NEW-C5-1 | ElevationProfile click-to-seek uses point-index instead of distance-fraction | MEDIUM | `src/components/ElevationProfile.tsx:76-84` |

---

## Implementation steps

### 1. Fix click-to-seek to use distance-based progress (NEW-C5-1)

**File:** `src/components/ElevationProfile.tsx:66-85`

**Current:**
```typescript
const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const clickFraction = (e.clientX - rect.left) / rect.width
  const totalDist = cumulDist[cumulDist.length - 1] ?? 0
  if (totalDist <= 0 || track.points.length < 2) {
    onSeek(Math.max(0, Math.min(1, clickFraction)))
    return
  }
  // The x-axis is based on cumulative distance, not uniform point distribution.
  // Binary search on cumulDist to convert distance fraction to point-index progress.
  const targetDist = clickFraction * totalDist
  let lo = 0, hi = cumulDist.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (cumulDist[mid] < targetDist) lo = mid + 1
    else hi = mid
  }
  const seekProgress = lo / (track.points.length - 1)
  onSeek(Math.max(0, Math.min(1, seekProgress)))
}
```

**Problem:** The SVG x-axis is already proportional to cumulative distance (line 52). So `clickFraction` already IS the correct distance-based progress. The binary search and `lo / (track.points.length - 1)` conversion incorrectly treats progress as "fraction of total points" rather than "fraction of total distance", causing the seek target to jump to the wrong position when points are unevenly distributed.

**Fix:** Remove the unnecessary binary search. When `totalDist > 0`, `clickFraction` is already the correct progress value:

```typescript
const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const clickFraction = (e.clientX - rect.left) / rect.width
  onSeek(Math.max(0, Math.min(1, clickFraction)))
}
```

This simplification is correct because:
- When `totalDist > 0`: The SVG x-axis is proportional to cumulative distance (line 52), so `clickFraction` = distance fraction = progress
- When `totalDist <= 0`: Falls back to uniform distribution, which `clickFraction` already represents correctly
- The existing `Math.max(0, Math.min(1, clickFraction))` clamp handles edge cases

**Verification:**
- Load a track with unevenly distributed points (e.g., sample trip)
- Click at 25% of the elevation profile width
- Confirm the playback position seeks to approximately 25% of the total distance
- Click at 75% of the elevation profile width
- Confirm the playback position seeks to approximately 75% of the total distance

---

## Verification checklist

- [x] `npm run build` succeeds
- [x] `tsc --noEmit` passes
- [x] Click-to-seek in elevation profile seeks to correct distance-proportional position
