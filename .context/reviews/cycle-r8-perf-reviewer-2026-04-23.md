# Cycle r8 — Perf Reviewer (2026-04-23)

## Scope

Performance review at cycle-r8 start — same tip as cycle r7 end
(`0000000f8`). Gates green.

## Observations

1. The cycle-r7 Escape-to-cancel useEffect in `src/app/page.tsx:143-155`
   installs its listener only while `isExporting === true`, so idle-app
   runtime cost is zero. The listener is registered with `capture:true`
   and performs an O(1) key check; no measurable hot-path cost during
   export either.
2. No new allocations, no new O(n) paths on animation frames, and no
   new `useMemo`/`useCallback` misses were introduced since cycle r7.
3. The already-deferred cosmetic perf items (Toast onDismiss closure,
   TimelineSelector bucket recompute, buildReferenceGridData style
   reload) remain deferred with no new evidence requiring escalation.

## Findings

### PR8-1 — No new perf findings (INFO)

## Verdict

No action required this cycle from the perf lane.
