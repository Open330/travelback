# Performance Review — Travelback (2026-05-04, Cycle 2)

## Summary

No new performance findings beyond cycle 1. The precomputed segment approach, accumulator-based playback, and throttled progress updates remain well-implemented.

## Findings

### C2-PR-01. Export frame loop allocates per-frame — LOW risk (unchanged)
**File**: `src/lib/videoEncoder.ts:134-166`
**Issue**: Each export frame allocates a new TrackPoint and potentially a Date object. For a 3-min export at 30fps, that is 5400+ allocations. Modern GC handles this easily.
**Suggestion**: No change needed.

### C2-PR-02. `normalizeScenes` called on every `commitScenes` — LOW risk, HIGH confidence
**File**: `src/components/SceneEditor.tsx:289-328`
**Issue**: `commitScenes` calls `normalizeScenes` on every scene edit. With typical scene counts (1-8), this is negligible. The normalization also runs `scenesWereAdjusted` comparison.
**Suggestion**: No change needed.

### C2-PR-03. Reference grid cached via useMemo — PASS
**File**: `src/components/MapView.tsx:515`
**Issue**: `buildReferenceGridData(track)` is memoized via `useMemo` keyed on `[track]`. Grid is only recomputed when track changes. Correctly implemented.
**Suggestion**: No change needed.
