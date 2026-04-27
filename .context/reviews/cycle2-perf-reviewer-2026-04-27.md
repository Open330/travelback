# Performance Reviewer — Cycle 2 (2026-04-27)

## Re-evaluation of carried findings

| Prior | Status | Notes |
|-------|--------|-------|
| N01 (trail O(n) rebuild) | PARTIALLY RESOLVED | Precomputed segments eliminate wrapping/copying for fully-traversed segments. Partial segment copy is O(current-segment-points) instead of O(all-traveled-points). For tracks with many short segments, this is nearly O(1) per frame. For tracks with one long segment, worst case is still O(n) but with native array reference for completed segments. |
| N05 (export React entanglement) | RESOLVED | `isExporting` guard skips the entire progress-driven effect during export. |
| N13 (mesh vs reduced-motion) | UNCHANGED | Animated mesh background in layout.tsx still runs without `prefers-reduced-motion` check. |
| N14 (export memory guard) | UNCHANGED | `estimateExportMemoryBytes` multiplier is still 8x with resolution scaling. The cap is 256MB. No mobile-specific lowering. |
| N22 (cumulativeDistances fallback) | UNCHANGED | MapView still has fallback `computeCumulativeDistances` when prop is empty. |
| N25 (double-rAF fallback) | UNCHANGED | videoEncoder.ts `waitForIdle` fallback still uses double-rAF without tile guarantee. |
| N27 (reference grid caching) | UNCHANGED | `buildReferenceGridData` recomputed on every style/track change. |

## New findings

### P2-01 — `checkJsonDepth` scans entire JSON text before `JSON.parse()` (double traversal)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.ts:504-521,524`
- **Detail:** `checkJsonDepth(text)` iterates every character in the JSON string to count nesting depth. Then `JSON.parse(text)` parses the same text again. For a 100MB Google JSON file, this means ~100M character iterations twice. The depth check could be integrated into a streaming JSON parser, or the depth check could be deferred to a `try/catch` around `JSON.parse` with a stack depth limit.
- **Impact:** Adds ~15-30% overhead to large Google JSON parsing on the main thread. Worker path is less affected since the check happens in the worker.

### P2-02 — Precomputed segments are rebuilt on every track load but never incrementally updated

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:944`
- **Detail:** `precomputedSegmentsRef.current = precomputeWrappedSegments(...)` rebuilds all wrapped segment coordinates when the track changes. For the common case of trimming (same track, different range), the segments don't change and could be reused. The current code already avoids rebuilding on progress changes (using the ref), so this only affects track-range changes.
- **Impact:** Negligible — track loads are infrequent relative to per-frame updates.

### P2-03 — `bucket` histogram computation uses `Math.max(...buckets, 1)` which spreads the full array

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/TimelineSelector.tsx:152`
- **Detail:** `Math.max(...buckets, 1)` spreads the `BUCKET_COUNT` (60) elements as function arguments. While 60 is well within the call stack limit, this is a common pattern that breaks if `BUCKET_COUNT` is ever increased. A reduce-based max would be more resilient.
- **Impact:** None at current BUCKET_COUNT=60. Fragile to future changes.

## Summary

- Carried forward: 7 findings evaluated (1 resolved, 1 partially resolved, 5 unchanged)
- New findings: 3 (1 MEDIUM, 2 LOW)
