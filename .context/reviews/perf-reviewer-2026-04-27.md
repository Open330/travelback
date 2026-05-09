# Performance Review

**Reviewer**: perf-reviewer  
**Date**: 2026-04-27

---

## Finding 1: `i18n.ts` — All 5 locale translations bundled into client JS

**File**: `src/lib/i18n.ts:11-1797`  
**Severity**: Medium  
**Confidence**: Medium  

All 5 locale translations are bundled into the client JS. Only one locale is active per session. This adds ~30-40KB of uncompressed JS that is never used.

**Fix**: Split translations per-locale and dynamically import only the active one.

---

## Finding 2: `MapView.tsx` — `buildReferenceGridData` recomputes on every track reference change

**File**: `src/components/MapView.tsx:475`  
**Severity**: Low  
**Confidence**: High  

For 250K-point tracks this is O(n) work that could be cached alongside the already-cached `overviewCamera`.

**Fix**: Cache reference grid data in the same `WeakMap<Track, ...>` pattern used for `overviewCameraCache`.

---

## Finding 3: `useExportController.ts` — Progress updates cause React re-renders during export

**File**: `src/lib/useExportController.ts:216-219,227-229`  
**Severity**: Low  
**Confidence**: High  

The 10Hz throttle for `setPlaybackProgress` and `setExportProgress` triggers React state updates and re-renders during export. ~300 re-renders over a 30-second export.

**Fix**: Consider using `useRef` for export progress display and only update the progress bar via direct DOM manipulation during export.

---

## Finding 4: `TimelineSelector.tsx` — `maxBucket` computed with spread on every render

**File**: `src/components/TimelineSelector.tsx:152`  
**Severity**: Low  
**Confidence**: High  

`Math.max(...buckets, 1)` uses spread. Use a simple loop instead: `buckets.reduce((max, v) => v > max ? v : max, 1)`.

---

## Finding 5: `parser.ts` — 16MB synchronous JSON parse fallback on main thread

**File**: `src/lib/parser.ts:601-606`  
**Severity**: Low  
**Confidence**: High  

`parseSmallGoogleJsonFallback` parses JSON synchronously on the main thread for files up to 16MB. This can block the UI for 200-500ms.

**Fix**: Lower the `MAIN_THREAD_JSON_FALLBACK_SIZE` threshold or always use the worker path.

---

## Finding 6: `camera.ts` — `normalizeScenes` called per-frame in playback path

**File**: `src/lib/camera.ts:359`  
**Severity**: Low  
**Confidence**: High  

When `preNormalized` is false (the default), `normalizeScenes` is called on every frame during playback. The export path already pre-normalizes once, but the playback path does not.

**Fix**: Pass `preNormalized: true` and use the pre-normalized scenes from the playback path.

---

## Finding 7: `MapView.tsx` — `interpolateAlongTrack` called twice per frame during playback

**File**: `src/components/MapView.tsx:1076`  
**Severity**: Low  
**Confidence**: High  

Called once in the progress effect and again inside `computeCameraForProgress`. For large tracks the binary search is efficient but still redundant.

**Fix**: Pass the already-computed `result` to the camera computation.

---

## Summary

| # | Finding | Severity | Confidence |
|---|---------|----------|------------|
| 1 | Full i18n bundle loaded | Medium | Medium |
| 2 | Reference grid recomputation | Low | High |
| 3 | Progress re-renders during export | Low | High |
| 4 | Spread in maxBucket | Low | High |
| 5 | 16MB synchronous JSON parse | Low | High |
| 6 | normalizeScenes per-frame | Low | High |
| 7 | Double interpolateAlongTrack | Low | High |
