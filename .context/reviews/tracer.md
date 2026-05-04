# Tracer — Cycle 3 (2026-05-04)

## Scope
Causal tracing of suspicious flows.

## Traces

### C3-TR1. Export-cancel-restart race condition — DISPROVED
**Hypothesis**: Cancelling and immediately restarting export could corrupt state.
**Evidence**: AbortController is per-export-call (line 143). exportSucceeded is closure-scoped. finally block checks exportSucceeded before modifying state. No race.

### C3-TR2. Marker state leak between track sessions — DISPROVED
**Hypothesis**: Switching tracks could leave stale markers.
**Evidence**: clearTrackArtifacts removes marker and nulls ref. Track-loading effect also cleans up. Double cleanup is safe.

### C3-TR3. Scene normalization mutation — CORRECTED
**Hypothesis**: normalizeScenes mutates original scene objects.
**Evidence**: Creates new objects via spread at each map step. Sort is on new array. Original scenes not mutated. N10 finding should be archived.

### C3-TR4. Export memory estimate for 4K — VERIFIED
**Evidence**: 1.5x multiplier for >1080p, 8x base multiplier. 4K estimate ~397MB+. Conservative.

## Summary
No new bugs found. Export abort flow is safe. Marker cleanup is correct. Scene normalization does not mutate originals.
