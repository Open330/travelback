# Tracer — Cycle 5 (2026-05-04)

## Scope
Causal tracing of data flows and state management.

## Traces

### C5-TR1. Export-cancel-restart safety — VERIFIED
**Evidence**: AbortController is per-export-call (useExportController.ts:143). `exportSucceeded` is closure-scoped (line 148). `pendingVideoUrl` tracks URL lifecycle (lines 146, 259). finally block checks `exportSucceeded` before modifying state (line 311). No race condition.

### C5-TR2. Playback/export interaction — VERIFIED SAFE
**Evidence**: `pausePlayback()` called at export start (line 159). MapView progress effect gated by `isExporting` (line 1052). Export exclusively drives visual state via `renderFrameAndWait`. No conflicting state updates.

### C5-TR3. Scene normalization does not mutate originals — VERIFIED
**Evidence**: `normalizeScenes` (camera.ts:25-50) creates new objects via spread at each `.map()` step. Sort operates on new array. Original scene objects untouched.

### C5-TR4. TimelineSelector ratio-to-index mapping — VERIFIED CORRECT
**Evidence**: `ratioToIndex` (TimelineSelector.tsx:30-53) uses binary search on cumulative distances, not linear interpolation. This correctly handles non-uniformly-spaced points. `resolveRangeIndexes` (lines 156-171) applies guards for degenerate ranges.

## Summary
All traced flows are correct. No bugs found in data flow or state management.