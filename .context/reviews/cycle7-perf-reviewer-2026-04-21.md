# Performance Reviewer -- Cycle 7 (2026-04-21)

## Methodology

Reviewed all 30 source files for CPU, memory, UI responsiveness, and rendering performance issues. Cross-referenced with prior deferred items.

## Prior Fix Verification

- Accumulator-based playback progress (usePlaybackController.ts:87-102): Confirmed. Eliminates frame-rate dependency and accumulation error.

## New Findings

### C7-PR-1: buildReferenceGridData recomputes on every MapView render that touches cumulativeDistancesProp [LOW/MEDIUM]

**File:** src/components/MapView.tsx:228-328, called from addReferenceGridLayers (330)
**Confidence:** MEDIUM

`buildReferenceGridData(track)` is called inside `addReferenceGridLayers`, which is invoked from multiple effects (style load, track load, animation state update). The function iterates over all track points to compute bounding box, then generates grid features. For tracks with 100k+ points, the bounding box computation is O(n) on each invocation. The function is not memoized and not guarded by a ref comparison.

However, in practice the function is called with the same `track` reference repeatedly, and the bounding box computation is fast (simple min/max). The grid generation is bounded by the step size and margins, not by point count.

**Scenario:** Large track (200k points). During playback, `addReferenceGridLayers` is called from the animation effect, but the early return `if (!map.isStyleLoaded()) return` and the source existence check mean it only does expensive work on the first call or style change.

**Fix:** LOW priority. Could memoize `buildReferenceGridData` by track reference or bounding box. The existing guards already prevent redundant expensive work in the hot path.

### C7-PR-2: TimelineSelector resolveRangeIndexes called on every render via useMemo [LOW/LOW]

**File:** src/components/TimelineSelector.tsx:243
**Confidence:** LOW

`const { startIdx, endIdx } = useMemo(() => resolveRangeIndexes(), [resolveRangeIndexes])` recomputes whenever `resolveRangeIndexes` changes, which depends on `startRatio`, `endRatio`, `cumulDist`, and `points.length`. During drag, `startRatio`/`endRatio` change on every pointer move, causing this binary search to re-execute. However, the binary search is O(log n) on the cumulative distances array, which is very fast even for 250k points.

**Fix:** Not worth optimizing. The binary search is already optimal.

## Deferred Items Status

All prior performance deferred items (DF-C2-002 through DF-C2-008, DF-C4-003) remain valid and carry forward. No new HIGH/MEDIUM performance findings this cycle.
