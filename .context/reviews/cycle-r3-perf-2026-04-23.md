# Cycle r3 — perf review (2026-04-23)

Scope: hot paths in `MapView`, `camera.ts`, `interpolate.ts`, `videoEncoder.ts`, and playback controller.

## Findings

### R3-PERF-1 (INFO, HIGH) — Export loop correctly pre-normalizes scenes
- **File**: `src/lib/videoEncoder.ts:69` (`normalizeScenes(scenes)` called once before the frame loop; passes `preNormalized=true` to `computeCameraForProgress`).
- **Schedule**: N/A — good pattern; no action.

### R3-PERF-2 (LOW, MEDIUM) — `ElevationProfile.useMemo` iterates twice over `elevations`
- **File**: `src/components/ElevationProfile.tsx:20-28` (`elevations` memo) and `:30-60` (`{minEle, maxEle, pathD, areaD}` memo scans for min/max).
- **Detail**: Two passes (`elevations.map → .some` for hasElevation; then another loop for min/max). Could be fused into one pass. Impact is negligible for typical tracks (<10k points). Noted as cosmetic.
- **Schedule**: defer — cosmetic.

### R3-PERF-3 (LOW, MEDIUM) — `computeCameraForScene` builds a bounding box every call in the `overview` branch
- **File**: `src/lib/camera.ts:154` (inside `case 'overview':` `computeBoundingBox(track.points)` runs every camera evaluation).
- **Detail**: During export, the overview camera is recomputed once per frame (up to 30 fps * 30 s = 900 frames) and rebuilds the bbox each time. For a 100k-point track this is ~1M point comparisons per frame. Not currently a bottleneck because overview scenes have short durations (default: 8% of timeline). Deferrable but worth memoizing.
- **Fix**: cache the bounding box per-`Track` at compute time; or compute once at export start and pass through `computeCameraForProgress`.
- **Schedule**: defer — deferred as a future perf pass; currently not a user-observable bottleneck.

### R3-PERF-4 (LOW, HIGH) — `computeCumulativeDistances` already cached via `useMemo` in `page.tsx:97-101`
- **File**: `src/app/page.tsx:97-101`.
- **Detail**: Recomputation is correctly avoided by keying on `track?.points, track?.segmentStartIndices`. Good.
- **Schedule**: N/A.

### R3-PERF-5 (LOW, MEDIUM) — `MapView` `smoothAngle` / `smoothCameraState` run every animation frame
- **File**: `src/components/MapView.tsx:61-88`.
- **Detail**: These run every rAF when playback is active. Math is light (modulos + interpolation), but `shortestLngDelta` is called 3 times per frame (angle, camera lng, bearing). Could be reduced to 2 with a shared helper. Minor.
- **Schedule**: defer — aligns with the existing DF-R2-002/003 refactor trigger.

### R3-PERF-6 (INFO, HIGH) — Video encoder waits for map idle per frame — necessary for correctness
- **File**: `src/lib/videoEncoder.ts:117-126`.
- **Detail**: Correctly waits for either `waitForIdle` or a double-rAF fallback. This is the expected trade-off between frame quality and encode speed; no change.
- **Schedule**: N/A.

## Final sweep

- No React re-render storms detected: `useCallback` + `useMemo` are used consistently in `page.tsx`.
- No `useEffect` with missing dependencies that would cause re-runs.
- `MapView.getMap()` returns the stable ref — no per-render map recreation.
- No synchronous large-file reads on the main thread (parser uses worker).

## Recommendations

- No scheduled perf work this cycle. Carry R3-PERF-2/3/5 into the deferred list.
