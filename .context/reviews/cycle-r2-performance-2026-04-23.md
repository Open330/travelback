# Cycle 2 Performance Review (2026-04-23, orchestrator run r2)

Scope: render loop, export loop, map update frequency, parser hot paths, list virtualization needs, allocation patterns, memoization correctness.

## Hot paths re-checked

### MapView animation effect (`src/components/MapView.tsx:825-932`)
Runs on every progress change, which is ~60fps during playback. Inside the effect:
- `interpolateAlongTrack` does a binary search (log n) plus O(1) arithmetic.
- `buildTrackGeometry` walks segments slice-wise — **O(n)** on the active portion per frame.
- `map.jumpTo({...})` applies camera state.

### R2-PF-1 (medium/high) — `buildTrackGeometry` re-wraps the full traveled portion on every progress tick
- File: `src/components/MapView.tsx:106-167` invoked at line 846.
- Evidence: every frame reallocates `coordinates` for the full traveled slice, then reallocates a `number[][]` of segments. Allocations grow linearly with `progress` and restart at 0 on each new playback. For a 250k-point track this is ~250k push/slice ops per second at 60fps by the end of playback.
- Failure scenario: on phones or modest hardware, a long track (> 50k points) chokes the main thread once the trail is near-complete, causing visible animation stutter and delayed map repaints.
- Fix options (ranked by risk/effort):
  1. Incremental geometry: maintain a running `GeoJSON.LineString` and only append new coordinates as `segmentIndex` grows; truncate on seek.
  2. Sub-sample points for the trail layer (only render every Nth point when n is huge) — sufficient for visual fidelity at low zoom.
  3. Skip trail update when `segmentIndex` has not changed between frames (currently always updates via `setData`).
- Confidence: **High** for the identification, **Medium** for the preferred fix — a careful refactor. This is DF-C17-005 territory and remains deferred per the existing exit criterion ("dedicated map-performance pass").

### R2-PF-2 (low/medium) — `computeCumulativeDistances` is recomputed in several places for the same track
- Files: `src/app/page.tsx:97-101` (memoized), passed down; `src/components/MapView.tsx:772-773` falls back to recomputing if prop is missing; `src/lib/useExportController.ts:133-135` falls back likewise.
- Evidence: the fallbacks exist as defense-in-depth, but both MapView and useExportController are now always called with a non-empty `cumulativeDistancesProp` from `page.tsx`. The fallbacks never execute in practice; they pay no runtime cost but add code surface.
- Fix (optional): delete the fallbacks, document the invariant, and fail fast if `cumulativeDistances` is empty when a track is present. Low priority. Confidence: **Medium**.

### R2-PF-3 (low) — `ExportPanel` recomputes `canShare` result via `useMemo([])` — good, but `canShare` allocates a 1-byte `ArrayBuffer` + `File` each test.
- File: `src/components/ExportPanel.tsx:155-164`.
- Evidence: the allocation is trivial (one byte, one File object) and runs once per component mount; no issue.
- **Positive finding.**

### R2-PF-4 (low) — Parser worker transfers the buffer but main-thread keeps a `textCopy` for fallback
- File: `src/lib/parser.ts:449` — `const textCopy = decodeJsonBuffer(buffer)` precedes `worker.postMessage({ ext, buffer }, [buffer])` at line 512.
- Evidence: for a 100 MB JSON this doubles memory briefly (buffer + decoded string + worker copy). Trade-off: correctness wins (if the worker crashes we still have the fallback text). Accepted.
- **Trade-off acknowledged.**

### R2-PF-5 (low) — `ElevationProfile` computes `pathD` over the full track on every progress change
- File: `src/components/ElevationProfile.tsx:30-60`.
- Evidence: `useMemo` deps are `[elevations, hasElevation, cumulDist]` — progress is NOT a dep, so the path is rebuilt only when the track or cumulative distances change. Progress affects only `progressX` and `clipPath`. Good.
- **Positive finding.**

### R2-PF-6 (low) — `TimelineSelector.buckets` memo has `[points, cumulDist]` deps
- File: `src/components/TimelineSelector.tsx:103-121`.
- Evidence: recomputes only when points/distances change; drag handles use refs + rAF. Good.
- **Positive finding.**

### R2-PF-7 (low) — `i18n.ts` is 1784 lines, all five locales are eagerly loaded into the bundle
- File: `src/lib/i18n.ts`.
- Evidence: matches DF-C17-016 (code-splitting locales). Remains deferred per bundle-optimization scope.
- **Carry forward DF-C17-016.**

### R2-PF-8 (low) — MapView `useEffect` that updates the camera runs on every `progress` change
- File: `src/components/MapView.tsx:825`.
- Evidence: this matches DF-C17-005. The effect takes the current progress, recomputes camera, and calls `map.jumpTo`. When `followCamera` is off, only the marker position + trail geometry update. This is the main re-render cost, already-flagged.
- **Carry forward DF-C17-005.**

## Net assessment
No new performance findings worth scheduling this cycle. The one high-severity issue (R2-PF-1) overlaps with the pre-existing DF-C17-005 deferral; same exit criterion applies.

## Below-threshold / deferred candidates (new this cycle)
- R2-PF-2 (fallback path is dead code) — cleanup pass only; defer.
