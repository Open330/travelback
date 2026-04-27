# Code Reviewer — Cycle 2 (2026-04-27)

## Re-evaluation of carried findings

| Prior | Status | Notes |
|-------|--------|-------|
| N01 (trail O(n) rebuild) | PARTIALLY RESOLVED | `precomputedSegmentsRef` (line 944) eliminates per-frame wrapping/copying for fully-traversed segments. Partial segment still copies O(n) coords via manual push loop (lines 1040-1053). `buildTrackGeometry` fallback remains for empty precomputed segments. |
| N05 (export React entanglement) | RESOLVED | `isExporting` prop added (MapView.tsx:25,454); progress effect returns early at line 1000. Camera/trail/marker updates during export go through `renderFrameAndWait` only. |
| N07 (normalizeBasePath triplication) | PARTIALLY RESOLVED | `parser.ts` now imports `basePath` from `@/lib/env` (line 3). Need to verify `types.ts` still has a duplicate. |
| N08 (Scene editor static aria) | UNCHANGED | SceneEditor still uses static `aria-valuemin`/`aria-valuemax`. |
| N09 (trim destroys scenes) | UNCHANGED | `handleRangeChange` in page.tsx still clears scenes when range changes. |
| N20 (uncommitted changes) | UNCHANGED | 8 files with uncommitted changes, not gate-tested. |
| N21 (test stub duplication) | UNCHANGED | `isLocalExportTestStubEnabled` still duplicated. |
| N25 (double-rAF fallback) | UNCHANGED | videoEncoder.ts still uses double-rAF fallback for `waitForIdle`. |

## New findings

### CR2-01 — Trail partial-segment copy uses manual push loop instead of `.slice()`

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:1040-1053`
- **Detail:** The partial-segment copy iterates coordinates one-by-one with `partialCoords.push(seg.coordinates[i])`. Replacing with `seg.coordinates.slice(0, segmentIndex - seg.range.start + 1)` would use the engine's native slice, which is typically faster for large arrays.
- **Impact:** Minor perf improvement for tracks with long segments during playback.

### CR2-02 — `addTrackLayers` creates initial trail geometry at index 0 unnecessarily

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:821`
- **Detail:** `buildTrackGeometry(track.points, track.segmentStartIndices, 0, track.points[0])` constructs a trail geometry that will be immediately overwritten on the first progress update. The trail source could start with the full route geometry (like the route source) and let the progress effect handle the first update.
- **Impact:** One unnecessary geometry construction per track load. Negligible.

### CR2-03 — `useEffect` cleanup in map initialization may not remove `onMapError` listener

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:769-785`
- **Detail:** The cleanup function calls `map.off('style.load', onGlobalStyleLoad)` and `map.off('error', onMapError)`. However, if the map initialization throws synchronously (caught by the outer try/catch on line 786), the cleanup function is never registered. The error listener remains attached to a map that was never stored in `mapRef.current`, and the map itself may leak. In practice this is very rare since MapLibre constructor rarely throws synchronously.
- **Impact:** Theoretical listener leak on sync map construction failure.

## Summary

- Carried forward: 8 findings evaluated (1 resolved, 1 partially resolved, 6 unchanged)
- New findings: 3 (all LOW)
