# Cycle 11 Perf Reviewer — 2026-04-27

## Inventory of reviewed files

- `src/components/MapView.tsx` — full read
- `src/lib/useExportController.ts` — full read
- `src/lib/videoEncoder.ts` — full read
- `src/lib/interpolate.ts` — full read
- `src/lib/parser.ts` — full read
- `src/components/SceneEditor.tsx` — full read
- `src/components/JourneyCreator.tsx` — full read

## Findings

### P11-01 — `computeBearing` called in `interpolateAlongTrack` even when a === b for bearing lookup

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/interpolate.ts:153-161`
- **Detail:** `computeBearing(a, b)` is always called first (line 153), then if `a.lat === b.lat && a.lng === b.lng`, the backward walk runs. For consecutive identical points (common in Google exports), this wastes a `computeBearing` call with degenerate input (atan2(0, 0) returns 0, which is correct but unnecessary computation).
- **Failure scenario:** Not a correctness issue — just a minor performance inefficiency on tracks with many duplicate points.
- **Suggested fix:** Check `a.lat === b.lat && a.lng === b.lng` before calling `computeBearing(a, b)`.

---

### P11-02 — `buildReferenceGridData` iterates all track points twice when crossing antimeridian

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:299-318`
- **Detail:** When the track crosses the antimeridian (`rawMaxLng - rawMinLng > 180`), the function iterates all track points once to find `minLng`/`maxLng`, then a second time to find shifted bounds. The memoization via `useMemo` already prevents recomputation per render, but the initial computation is O(2n) instead of O(n).
- **Failure scenario:** For a 250K-point track crossing the antimeridian, the grid computation reads 500K points instead of 250K. This only runs once per track load.
- **Suggested fix:** Combine both loops into a single pass that tracks both raw and shifted bounds simultaneously.

---

### P11-03 — `normalizeScenes` creates intermediate arrays on every call

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/camera.ts:19-43`
- **Detail:** `normalizeScenes` chains `.map().sort().map().filter()`, creating 3 intermediate arrays. Called on every scene edit in the UI, and also per-frame during export (with `preNormalized` flag bypassing it). The per-edit path is not a performance concern, but the pattern could be improved.
- **Failure scenario:** Not a practical performance issue — scenes arrays are typically < 20 elements.
- **Suggested fix:** No action needed for current usage. Could optimize if scene count grows significantly.
