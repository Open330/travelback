# Performance Reviewer — Cycle r10 (2026-04-24)

**Scope:** Full source tree vs cycle-r9 tip `000000046`.

## Summary

No new actionable findings. All prior perf-related fixes confirmed still
applied. The deferred `buildReferenceGridData` memoization (DF-C4-003 /
C9-AGG-D23) remains the only open perf item with unchanged cost/benefit ratio.

## Verified

- `computeCumulativeDistances` memoization in page.tsx:97-101 — correct deps
  (`track?.points, track?.segmentStartIndices`) avoiding O(n) recomputation.
- `useCallback` usage across all event handlers — no unnecessary re-renders.
- MapView effect guards (styleKeyRef short-circuit, layer-existence checks)
  prevent redundant style reload operations.
- Export frame loop uses pre-normalized scenes (US-002) avoiding per-frame
  normalization overhead.
- TimelineSelector rAF-throttled drag updates prevent layout thrashing.

## Deferred (Carryforward)

- C9-AGG-D23 / DF-C4-003: `buildReferenceGridData` memoization — LOW/MEDIUM,
  unfavorable cost/benefit.

## Conclusion

No new findings this cycle.
