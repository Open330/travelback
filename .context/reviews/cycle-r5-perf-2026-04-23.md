# Cycle r5 — perf-reviewer (2026-04-23)

## Scope

Source-side performance review of hot paths (MapView frame loop, TimelineSelector drag loop, parser, video export frame loop, large-array state props).

## Findings

### PR-1 (LOW, MEDIUM) — `Toast.tsx` `onDismiss={() => onDismiss(msg.id)}` recreates closure every parent render

- **Files**: `src/components/Toast.tsx:70`.
- **Evidence**: `<ToastItem key={msg.id} message={msg} onDismiss={() => onDismiss(msg.id)} />`. The inline arrow allocates per render. Because `ToastItem` stores `onDismissRef.current = onDismiss` every render (L22-23), it does not cause a re-render cascade, so the practical cost is an extra closure per message per render. Impact tiny.
- **Fix (optional)**: memoize with `useCallback((id: string) => () => onDismiss(id), [onDismiss])` factory or drop the ref dance.
- **Schedule**: DEFER — negligible impact at typical toast volume (≤3 messages).

### PR-2 (LOW, MEDIUM) — `TimelineSelector.buckets` recomputes on every `points` reference change

- **Files**: `src/components/TimelineSelector.tsx:103-121`.
- **Evidence**: `useMemo(…, [points, cumulDist])`. `points` is `track.points`; when the parent trims the track, a new array is handed down and the O(n) bucket pass runs. For 250k-point tracks this is ~250,000 iterations; acceptable but notable. Not scheduled.
- **Schedule**: DEFER (no user complaint; fires at most per trim).

### PR-3 (LOW, MEDIUM) — `buildReferenceGridData` rebuilds grid on every style/track change

- **Files**: `src/components/MapView.tsx:224-324`, invoked from L328-340 and L657, L780.
- **Evidence**: Called inside `addReferenceGridLayers` and re-runs a full geometry pass on every `style.load` for the same track. Grid geometry depends on track bounds + step; it is stable for a given track. Caching by track reference or track bbox would avoid redundant work; practical impact small (<1 ms for common tracks). Not scheduled.
- **Schedule**: DEFER.

### PR-4 (LOW, MEDIUM) — Cycle-r4 carryover: `preserveDrawingBuffer=true`

- **Files**: `src/components/MapView.tsx:552-558`.
- **Evidence**: documented trade-off for export; no change.
- **Schedule**: DEFER (R4-AGG-D7 carryover).

### PR-5 (LOW, MEDIUM) — Cycle-r4: Real-WebGL LCP/INP/CLS numbers not yet captured

- **Files**: n/a (probe limitation).
- **Schedule**: DEFER (R4-AGG-D4 carryover; needs `--use-gl=angle` or real hardware).

## Confidence summary

No new schedule items this cycle; all perf findings are low impact or require infrastructure changes. Cycle-r4 deferred items unchanged.
