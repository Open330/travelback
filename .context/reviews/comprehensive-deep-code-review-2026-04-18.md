# Comprehensive Deep Code Review — Travelback

**Date:** 2026-04-18  
**Reviewer:** code-reviewer (automated)  
**Scope:** All files in `src/`, `e2e/`, `public/workers/`  
**Total files reviewed:** 30  
**LSP diagnostics:** All clean (0 type errors across all files)

---

## Summary

| Severity | Count |
|----------|-------|
| P0 (data loss / crash) | 2 |
| P1 (bug / degradation) | 8 |
| P2 (code smell / maintainability) | 10 |
| P3 (style / nit) | 5 |
| **Total** | **25** |

---

## P0 Findings

### [P0] Finding: `ElevationProfile` calls `.some()` on every render — O(n) per frame during playback
**File:** src/components/ElevationProfile.tsx:22  
**Problem:** `hasElevation` is computed with `elevations.some(e => e !== null)`. The `elevations` memo depends on `track`, not `progress`, so `hasElevation` is correctly memoized. However, the `elevations` memo itself uses `track` as its dependency but destructures nothing — if `track` is the same object reference across parent re-renders (which it is when only `progress` changes), this is fine. The real problem is that `Math.min(...valid)` and `Math.max(...valid)` on line 29–30 spread the entire elevation array as arguments. For tracks with >100K points (Google Location History files routinely hit 250K), this throws a `RangeError: Maximum call stack size exceeded`.  
**Impact:** App crashes when loading any track with more than ~100K elevation points. This is the maximum-supported track size.  
**Fix:** Replace `Math.min(...valid)` / `Math.max(...valid)` with a manual loop:
```ts
let min = Infinity, max = -Infinity
for (const e of elevations) {
  if (e !== null) { if (e < min) min = e; if (e > max) max = e }
}
```

### [P0] Finding: `normalizeScenes` is called on every frame during export via `computeCameraForProgress`
**File:** src/lib/camera.ts:325  
**Problem:** `computeCameraForProgress` calls `normalizeScenes(scenes)` at the top, which sorts and maps the scenes array into a new array. During video export, this function is called for every single frame (e.g., 30fps * 30s = 900 calls). `normalizeScenes` creates a new sorted + mapped array each time, despite scenes not changing during export.  
**Impact:** For a 30-second export at 30fps, this allocates 900 temporary sorted arrays, each containing 6–8 scene objects with spreads. Causes GC pressure and unnecessary CPU overhead during the most performance-sensitive code path.  
**Fix:** Cache the normalized scenes outside the per-frame loop. Either accept normalized scenes as a parameter (computed once by the caller), or memoize within the export loop:
```ts
// In videoEncoder.ts, compute once before the frame loop:
const normalizedScenes = normalizeScenes(scenes)
// Pass normalizedScenes instead of scenes to computeCameraForProgress
```

---

## P1 Findings

### [P1] Finding: Race condition — `handleRangeChange` can produce empty or one-point tracks
**File:** src/app/page.tsx:142–158  
**Problem:** `handleRangeChange` slices `fullTrack.points.slice(startIdx, endIdx + 1)` but does not validate the result has >= 2 points. The `TimelineSelector` has `clampRatios` logic, but its guard allows a minimum of 1 point gap (`minGap = 1 / points.length`). If `points.length` is very large, `minGap` approaches zero, and rounding could produce a slice with only 1 point. Such a track would be below the parser's 2-point minimum, but no error is thrown here — it silently creates a degenerate track.  
**Impact:** Silent creation of a track with 0–1 points causes downstream errors: `interpolateAlongTrack` returns a zero-bearing result, the elevation profile vanishes, and camera follow breaks.  
**Fix:** Add a guard after slicing:
```ts
const slicedPoints = fullTrack.points.slice(startIdx, endIdx + 1)
if (slicedPoints.length < 2) return
```

### [P1] Finding: Stale closure in `usePlaybackController` animation loop
**File:** src/lib/usePlaybackController.ts:81–109  
**Problem:** The `useEffect` that runs the animation loop depends on `[isPlaying, track, setPlaybackProgress]`. The `animate` function reads `speedRef.current` and `durationRef.current` through refs, which is correct. However, `setPlaybackProgress` updates both state and the ref. If `pausePlayback` is called while the animation loop is scheduling the next frame, there is a one-frame window where `isPlaying` has been set to `false` but the previously-scheduled `requestAnimationFrame` callback still fires because `cancelAnimationFrame` only cancels the *next* scheduled callback, not the currently-executing one. The `if (!isPlaying || !track) return` guard at line 82 is checked at the top of the effect, but the `animate` inner function does not re-check `isPlaying` before calling `setPlaybackProgress`.  
**Impact:** One spurious progress update after pause. Minor visual glitch — the progress bar can jump slightly past where the user paused.  
**Fix:** Add a ref-based guard inside `animate`:
```ts
const isPlayingRef = useRef(false)
// sync in the effect:
if (!isPlayingRef.current) return
```

### [P1] Finding: `MapView` animation `useEffect` has excessive dependency array causing unnecessary re-runs
**File:** src/components/MapView.tsx:831  
**Problem:** The effect that updates marker position, trail geometry, and camera has dependencies `[progress, track, followCamera, suspendAutoCamera, seekNonce, scenes, duration, transitionDuration, addTrackLayers, ensureMarker]`. The `addTrackLayers` and `ensureMarker` callbacks are created with `useCallback(... , [])` so they are stable. But `scenes` is an array that gets a new reference on every scene edit (since `setScenes` creates a new array), and `duration` changes when the user adjusts it. Both cause the entire effect to re-run even when only `progress` changed, which happens 30–60 times per second during playback.  
**Impact:** Every scene edit or duration change during playback causes the effect to tear down and re-establish, which is mostly harmless but can cause a single dropped frame during camera updates.  
**Fix:** Store `scenes`, `duration`, and `transitionDuration` in refs (like `trackRef`) and read from refs inside the effect. Remove them from the dependency array so only `progress` drives re-execution during playback.

### [P1] Finding: `parseGoogleLocationHistory` can merge points from multiple formats in wrong order
**File:** src/lib/parser.ts:284–337  
**Problem:** The dispatcher uses a series of `if` (not `else if`) statements for `timelineObjects`, `timelineEdits`, and `semanticSegments`. This means if a single JSON file contains multiple formats (which is not documented but theoretically possible), points from all formats are concatenated and then de-duplicated and sorted by time. However, the de-duplication key `${p.lat},${p.lng},${p.time?.getTime() ?? ''}` uses exact millisecond + coordinate matching, so two points at the same coordinate from different formats with slightly different timestamps will both be kept. The sort is by time, but points without timestamps (`time == null`) fall back to insertion order, which interleaves them with timed points incorrectly.  
**Impact:** A Google Location History file containing both `timelineObjects` and `semanticSegments` could produce a track with out-of-order points when some have timestamps and some do not. This would cause the animation to jump backward and forward.  
**Fix:** Separate points-with-time from points-without-time during sorting, or assign a stable ordering index that is preserved through the sort for null-time points:
```ts
unique.sort((a, b) => {
  const aTime = a.point.time?.getTime()
  const bTime = b.point.time?.getTime()
  if (aTime != null && bTime != null) return aTime - bTime
  if (aTime != null) return -1  // timed points before untimed
  if (bTime != null) return 1
  return a.order - b.order
})
```

### [P1] Finding: `videoEncoder.ts` calls `output.finalize()` in `finally` block even when aborted
**File:** src/lib/videoEncoder.ts:115–118  
**Problem:** When the export is cancelled (AbortError thrown at line 83), the `finally` block still calls `output.finalize()`. The mediabunny `Output` may throw or behave unexpectedly when finalizing an encoding that was aborted mid-stream — only a partial number of frames were added, and the internal state may be inconsistent.  
**Impact:** Potential unhandled exception during cleanup, or a corrupt buffer that is then checked on line 121 (`if (!buffer)`). The buffer check may pass even though the data is incomplete, resulting in a corrupt MP4 file being downloaded.  
**Fix:** Track whether the loop completed normally and only finalize in that case:
```ts
let completed = false
try {
  for (...) { ... }
  completed = true
} finally {
  if (completed) await output.finalize()
  else { /* best-effort cleanup without finalize */ }
}
```

### [P1] Finding: `useExportController` does not await `resetSize()` in `finally` — potential map render glitch
**File:** src/lib/useExportController.ts:149–151  
**Problem:** After export completes or fails, `mapViewRef.current?.resetSize()` is called but the `await new Promise(resolve => setTimeout(resolve, 200))` that follows is not dependent on `resetSize()` completing. The `resetSize()` method calls `map.resize()` synchronously, but the map may not have finished re-rendering at the original size before `setIsExporting(false)` hides the overlay. This can cause a brief flash where the map is rendered at the export resolution but displayed at the original size.  
**Impact:** Brief visual glitch at the end of export — the map snaps from export resolution to normal size, potentially showing a stretched or squished frame for ~200ms.  
**Fix:** Use `waitForIdle` after reset to ensure the map has re-rendered at normal size before removing the overlay.

### [P1] Finding: `SceneEditor` uses `Date.now()` for scene IDs — collisions possible in fast interactions
**File:** src/components/SceneEditor.tsx:227  
**Problem:** Scene IDs are generated with `scene-${Date.now()}`. If the user clicks "+ Add" rapidly (within the same millisecond), two scenes will receive the same ID. React's `key` prop uses `scene.id`, causing a duplicate-key warning and potentially broken list reconciliation.  
**Impact:** Duplicate React keys cause incorrect DOM recycling — adding a second scene quickly could swap or corrupt the first scene's editing state.  
**Fix:** Use a counter or `crypto.randomUUID()`:
```ts
id: `scene-${crypto.randomUUID().slice(0, 8)}`,
```

### [P1] Finding: `Toast` uses `Date.now()` for IDs — same collision risk
**File:** src/components/Toast.tsx:72  
**Problem:** Toast IDs are `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`. While the `Math.random()` suffix makes exact collisions extremely unlikely, `Date.now()` alone would not be sufficient. The current implementation is probably fine in practice, but the combination is unnecessarily complex compared to just using `crypto.randomUUID()`.  
**Impact:** Very low probability of collision, but the pattern is inconsistent with best practices.  
**Fix:** Simplify to `crypto.randomUUID()`.

### [P1] Finding: `trackCenter` and `estimateOverviewZoom` crash on empty `points` array
**File:** src/lib/camera.ts:46–76  
**Problem:** `trackCenter` initializes `minLng = Infinity, maxLng = -Infinity` and loops over points. If `points` is empty, it returns `[(Infinity + -Infinity) / 2, ...]` which is `[NaN, NaN]`. Similarly, `estimateOverviewZoom` returns `NaN` for an empty array. These functions are called from `computeCameraForScene` when `cameraMode === 'overview'`, which is the default opening mode. While `computeCameraForProgress` has an empty-scenes fallback, the individual scene computation does not guard against empty points.  
**Impact:** If a track somehow has 0 points (should be prevented by parser but not enforced at the type level), the camera center becomes `[NaN, NaN]`, which MapLibre silently ignores, leaving the camera at its previous position — the map appears frozen.  
**Fix:** Add an early return at the top of `computeCameraForScene`:
```ts
if (track.points.length === 0) return { center: [0, 20], zoom: 2, pitch: 0, bearing: 0 }
```

---

## P2 Findings

### [P2] Finding: `page.tsx` is still 411 lines with 15+ state variables — God Component pattern
**File:** src/app/page.tsx:31–411  
**Problem:** `HomeInner` manages 15 `useState` calls, 4 `useRef` calls, and orchestrates 8 child components. The `TrackWorkspace` component was extracted to reduce coupling, but `HomeInner` still owns all the state and passes it down through `TrackWorkspace` as 25+ props. This is a "prop drilling" anti-pattern that makes the component difficult to reason about and test.  
**Impact:** Any change to playback, export, or scene state requires touching `HomeInner`, even though the logic is in separate hooks. Adding new features requires threading new props through `HomeInner` -> `TrackWorkspace`.  
**Fix:** Consider using React Context or a lightweight state manager (zustand, jotai) for the core app state. At minimum, co-locate related state into a single reducer via `useReducer`.

### [P2] Finding: `TrackWorkspace` has 25+ props — interface bloat
**File:** src/components/TrackWorkspace.tsx:14–47  
**Problem:** `TrackWorkspaceProps` has 25+ properties. This is a direct consequence of the prop drilling from `HomeInner`. The component is essentially a layout shell that passes all its props through to children.  
**Impact:** Hard to understand which props are actually used vs. just forwarded. Makes refactoring error-prone.  
**Fix:** Group related props into objects (e.g., `playbackState`, `playbackActions`) or use context.

### [P2] Finding: `MapView` is 850 lines — does too many things
**File:** src/components/MapView.tsx  
**Problem:** `MapView` handles map initialization, style switching, track layer management, reference grid management, camera animation, marker management, and imperative handle — 7 distinct responsibilities in one component. The `useEffect` on line 725 that updates animation state is ~110 lines with deeply nested conditionals.  
**Impact:** Difficult to test individual concerns. Any change to camera logic risks breaking layer management and vice versa.  
**Fix:** Extract into custom hooks: `useMapInit`, `useTrackLayers`, `useCameraFollow`, `useReferenceGrid`. Each hook can own its own refs and effects.

### [P2] Finding: Four `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions
**File:** src/components/MapView.tsx:543,566; src/components/TimelineSelector.tsx:148; src/components/JourneyCreator.tsx:411  
**Problem:** Each suppression indicates a deliberate decision to omit dependencies from a `useEffect` or `useCallback`. In `MapView`, the initialization effect (line 543) intentionally omits `mapStyleKey` to avoid re-creating the map. The style-change effect (line 566) intentionally omits some dependencies. In `TimelineSelector` (line 148), `applyDrag` omits `startRatio`/`endRatio` to use refs. In `JourneyCreator` (line 411), the main setup effect depends only on `isActive`.  
**Impact:** These are intentional and correct (using refs for mutable values), but the suppressions hide potential future bugs if someone changes the code without understanding the ref pattern.  
**Fix:** Add a comment above each suppression explaining *why* the dependency is intentionally omitted and what would break if it were added.

### [P2] Finding: `i18n.ts` is 1726 lines — 90% of the file is translation data
**File:** src/lib/i18n.ts  
**Problem:** The translations object is ~1600 lines of inline data in a single file. This makes the file difficult to navigate and review. Adding a new locale requires editing this already-massive file.  
**Impact:** Slow code review, merge conflicts when multiple people edit translations, and poor separation of concerns.  
**Fix:** Split translations into per-locale JSON files (e.g., `locales/en.json`, `locales/ko.json`) and import them dynamically or at build time.

### [P2] Finding: Duplicated `haversineDistance` / `centerDistanceMeters` logic
**File:** src/lib/interpolate.ts:3–11 vs src/components/MapView.tsx:69–74  
**Problem:** `haversineDistance` in `interpolate.ts` and `centerDistanceMeters` in `MapView.tsx` compute similar things (approximate meter distances between coordinates) using slightly different formulas. `haversineDistance` uses the exact haversine formula; `centerDistanceMeters` uses the equirectangular approximation.  
**Impact:** Inconsistent distance calculations — the export camera system uses one formula while the live camera smoothing uses another. For small distances the difference is negligible, but this duplication is a maintenance risk.  
**Fix:** Consolidate into a single utility in `interpolate.ts` with a `approximateDistanceMeters` export. `MapView` should import from `interpolate.ts`.

### [P2] Finding: `parser.ts` uses 20+ `as Record<string, unknown>` casts without validation
**File:** src/lib/parser.ts:19–259  
**Problem:** The Google Location History parsing code casts `unknown` values to `Record<string, unknown>` extensively. While these casts are necessary for parsing untyped JSON, there is no runtime validation that the cast values actually have the expected shape. If Google changes their format, the code will silently produce `undefined` coordinates rather than throwing a clear error.  
**Impact:** Silent data loss when parsing an unexpected format variant — points with missing coordinates are skipped without warning.  
**Fix:** Add a validation layer that logs warnings when expected fields are missing:
```ts
if (loc.latitudeE7 != null && typeof loc.latitudeE7 !== 'number') {
  console.warn('[Travelback] Unexpected latitudeE7 type:', typeof loc.latitudeE7)
  continue
}
```

### [P2] Finding: `computeCameraForProgress` transition blend logic has a discontinuity at scene boundaries
**File:** src/lib/camera.ts:382–397  
**Problem:** The forward-transition blend (line 392–397) computes `blendT` as `((1 - localProgress) * sceneDuration) / halfTrans`. As `localProgress` approaches `1 - halfTrans/sceneDuration`, `blendT` approaches 1.0. But when `localProgress` crosses the boundary into the next scene, the blending suddenly switches from "forward blend" to "no blend" (the main camera). This can cause a visible snap if the blend was partway through.  
**Impact:** Small but noticeable camera jerk at scene transitions when the transition duration is very short relative to the scene duration.  
**Fix:** The backward-transition (line 385–389) and forward-transition (line 392–397) blends should be symmetric. Consider blending from both sides of a boundary simultaneously, or increasing the transition duration minimum.

### [P2] Finding: `GoogleGuide` takes a Google Takeout external link without `noopener` being sufficient
**File:** src/components/GoogleGuide.tsx:336–344  
**Problem:** The "Open Google Takeout" link has `rel="noopener noreferrer"` and `target="_blank"`, which is correct. However, since this is a static site with CSP that allows `connect-src 'self'`, the external link opens in a new tab but the user's origin is exposed via `window.opener` in some older browsers. The `noopener` attribute mitigates this in modern browsers. This is a minor concern since the site is static and has no authenticated state to protect.  
**Impact:** Minimal — `noopener` is widely supported. This is more of a defense-in-depth note.  
**Fix:** No action required. The current implementation is sufficient.

### [P2] Finding: `ElevationProfile` SVG gradient has a hardcoded `id="elev-grad"` — will break if multiple instances rendered
**File:** src/components/ElevationProfile.tsx:77–81  
**Problem:** The SVG `<linearGradient id="elev-grad">` and `<clipPath id="elev-clip">` use static IDs. If two `ElevationProfile` components were ever rendered simultaneously (e.g., in a comparison view), the second instance's gradient would reference the first instance's definition, causing incorrect rendering.  
**Impact:** Currently only one instance exists, so this is a latent issue. But it violates the principle of component encapsulation.  
**Fix:** Use `useId()` from React to generate unique IDs:
```tsx
const gradientId = useId()
const clipId = useId()
```

---

## P3 Findings

### [P3] Finding: `isTouchDevice` in `FileUpload` is computed on mount but never updates
**File:** src/components/FileUpload.tsx:29–32  
**Problem:** `isTouchDevice` is memoized with `useMemo(() => ..., [])`. It checks `ontouchstart in window` once at mount time. On hybrid devices (touchscreen laptops), this value is fixed for the component's lifetime, even if the user switches between touch and mouse.  
**Impact:** Minor — the only use is showing/hiding an iOS tip, which is not critical functionality.  
**Fix:** Consider using a CSS media query `@media (hover: none)` instead, or accept the current behavior.

### [P3] Finding: `FileUpload` `basePath` is computed inside the component body on every render
**File:** src/components/FileUpload.tsx:28  
**Problem:** `const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')` is called on every render. `process.env.NEXT_PUBLIC_BASE_PATH` is inlined at build time by Next.js, so this is a constant string operation, but it's still unnecessary per-render work.  
**Impact:** Negligible — a constant string replace per render.  
**Fix:** Move to a module-level constant outside the component.

### [P3] Finding: `Controls` component uses `total * progress` for traveled distance — floating point imprecision
**File:** src/components/Controls.tsx:43  
**Problem:** `const traveled = total * progress` multiplies a haversine-computed total distance (in meters, a float) by a progress value (0–1 float). This can produce slightly inaccurate traveled distances due to floating point multiplication. The `totalDistance` function already accumulates small rounding errors from `haversineDistance` calls.  
**Impact:** Display-only — the traveled distance text may show "999 m / 1.0 km" instead of "1.0 km / 1.0 km" at 100% progress.  
**Fix:** When `progress >= 1`, display `total` instead of `total * progress`.

### [P3] Finding: `SceneEditor` `confirm()` calls block the UI thread
**File:** src/components/SceneEditor.tsx:312–316  
**Problem:** The preset buttons use `confirm(t('scenes.replaceConfirm'))` which is a blocking synchronous dialog. This freezes the entire page, including any animation, and the dialog style cannot be customized to match the Vitro design system.  
**Impact:** Jarring UX inconsistency — the rest of the app uses `ModalDialog` for all other confirmations.  
**Fix:** Replace with a custom modal confirmation dialog matching the Vitro design system.

### [P3] Finding: `JourneyCreator` `confirm()` call blocks the UI thread
**File:** src/components/JourneyCreator.tsx:519  
**Problem:** Same as above — the cancel button uses `confirm(t('journey.discardConfirm'))`.  
**Impact:** Same as above.  
**Fix:** Replace with a custom modal.

---

## Positive Observations

1. **Strong type safety**: The codebase uses TypeScript strictly throughout. The `Track`, `TrackPoint`, `Scene`, `CameraState` types are well-defined and consistently used. LSP diagnostics show 0 type errors across all files.

2. **Excellent error boundary pattern**: The `ErrorBoundary` wrapper correctly bridges React class component error boundaries with the hook-based locale system. The `ModalDialog` component properly implements focus trapping, escape key handling, and body scroll locking with a modal stack.

3. **Robust parser**: The Google Location History parser handles 4 different JSON formats with graceful fallbacks. The web worker approach with main-thread fallback is well-implemented — the worker creation is wrapped in try/catch with automatic fallback.

4. **Thoughtful camera system**: The `computeCameraForProgress` function handles scene transitions with smooth blending, look-ahead bearings, and snap detection for large jumps. The `normalizeScenes` function prevents overlapping scene ranges.

5. **Good test coverage for E2E**: The test suite covers multi-format import, camera stability, scene editing, mobile layout, accessibility (dialog focus trapping), and i18n across 5 languages. Camera stability is tested via statistical analysis of position/bearing samples.

6. **Clean separation of concerns in hooks**: `usePlaybackController`, `useExportController`, and `usePlaybackHotkeys` are well-decomposed custom hooks that encapsulate their respective domains.

7. **Proper cleanup patterns**: The `MapView` component carefully removes event listeners, map layers, and markers in cleanup functions. The worker parser correctly terminates the worker after use.

8. **Privacy-first design**: The JourneyCreator's coordinate search explicitly stays local — it parses coordinates from pasted text without making network requests. The CSP is strict with `connect-src 'self'`.

---

## Top 5 Most Critical Issues

| # | Severity | Finding | File |
|---|----------|---------|------|
| 1 | P0 | `Math.min/max(...valid)` crashes on large elevation arrays | src/components/ElevationProfile.tsx:29 |
| 2 | P0 | `normalizeScenes` called per-frame during export — GC pressure | src/lib/camera.ts:325 |
| 3 | P1 | `handleRangeChange` can produce tracks with <2 points | src/app/page.tsx:142 |
| 4 | P1 | `videoEncoder` finalizes on abort — potential corrupt output | src/lib/videoEncoder.ts:115 |
| 5 | P1 | `parseGoogleLocationHistory` sorting is wrong for mixed null-time points | src/lib/parser.ts:330 |

---

## Recommendation

**REQUEST CHANGES** — Two P0 issues must be fixed before this code is safe for production use. The `ElevationProfile` crash on large tracks is the most urgent — it affects the app's primary use case (Google Location History files, which are routinely large). The per-frame `normalizeScenes` allocation during export will cause visible jank on lower-end devices.

The P1 issues should also be addressed in the same pass, as they represent real bugs (corrupt exports, degenerate tracks, misordered points) that affect correctness.

The P2/P3 issues are maintainability improvements that can be deferred to a follow-up pass.

