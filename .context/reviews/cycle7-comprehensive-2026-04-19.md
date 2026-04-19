# Cycle 7 Comprehensive Deep Code Review — 2026-04-19

Generated from a fresh full-repo read of the current `main` branch after cycle 6 fixes.

## Review scope

All source files under `src/`, `public/workers/`, `scripts/`, and configuration files were read in their entirety. This review focuses on new findings not caught in prior cycles, and re-evaluates deferred items for changes in severity.

## Prior-cycle finding verification

### Verified FIXED from cycle 6
| Prior ID | Description | Evidence |
|----------|-------------|----------|
| C6-AGG-001 | `cumulativeDistances` memo depends on `track` reference | `page.tsx:87-88` now uses `[track?.points, track?.segmentStartIndices]` with eslint-disable comment |
| C6-AGG-002 | `MapView` recomputes `cumulDist` internally | `MapView.tsx:767-769` now uses `cumulativeDistancesProp` with fallback |
| C6-AGG-003 | `useExportController` recomputes `cumulDist` despite parameter | `useExportController.ts:133-135` now uses `cumulativeDistancesProp` with fallback |
| C6-AGG-004 | Main-thread `parseSemanticSegments` `continue` skips segment-start | `parser.ts:305` now uses `if` guard instead of `continue` |
| C6-AGG-005 | `buildReferenceGridData` uses `expandedMinLng` instead of `expandedMinLat` | Already verified as false positive in cycle 6 |
| C6-AGG-006 | GlobalToolbar select missing dropdown indicator | `GlobalToolbar.tsx:53` no longer has `appearance-none` |
| C6-AGG-007 | Toast redundant `aria-live` with `role="status"` | `Toast.tsx:66` now has `role="status"` without redundant `aria-live="polite"` |

---

## New findings

### C7-001 — MEDIUM — `ElevationProfile` `elevations` memo depends on `track` object reference

**Severity:** MEDIUM / Confidence: HIGH

**Primary location:**
- `src/components/ElevationProfile.tsx:20-22` — `useMemo(() => track.points.map(...), [track])`

**Why it matters:**
Same pattern as the previously-fixed C6-AGG-001. The `elevations` memo depends on the entire `track` object reference, so it recomputes on every parent re-render even when the points data is unchanged. This is an O(n) array allocation + `.map()` over all track points. The same issue exists for the `hasElevation` memo on line 26 which depends on `elevations` (which itself recomputes unnecessarily).

**Suggested fix:**
Change `[track]` to `[track.points]` on line 22.

**Confidence:** High

---

### C7-002 — MEDIUM — `MapView` animation effect has `addTrackLayers` and `ensureMarker` in dependency array but they are stable `useCallback([], ...)`

**Severity:** MEDIUM / Confidence: MEDIUM

**Primary location:**
- `src/components/MapView.tsx:926` — `[progress, track, followCamera, suspendAutoCamera, seekNonce, addTrackLayers, ensureMarker]`

**Why it matters:**
Both `addTrackLayers` and `ensureMarker` are created with `useCallback` and empty dependency arrays (lines 665 and 728), so they are stable references that never change. Including them in the dependency array is technically correct but introduces a latent risk: if a future refactor adds a dependency to either callback, the animation effect will re-execute on every animation frame (60fps), causing a severe performance regression. The effect calls these functions as a fallback for missing layers — it doesn't need to re-run when they change.

This was previously flagged as C5-AGG-004 and DF-C5-002. It remains a latent risk.

**Suggested fix:**
Remove `addTrackLayers` and `ensureMarker` from the dependency array and add an eslint-disable comment explaining why. The effect already handles the case where layers are missing via the `if (!map.getLayer(...))` guard on line 824.

**Confidence:** Medium (latent risk, not a current bug)

---

### C7-003 — LOW — `ExportPanel` success message correctly differentiates between picker and fallback paths, but `export.videoSaved` i18n key may not exist

**Severity:** LOW / Confidence: MEDIUM

**Primary location:**
- `src/components/ExportPanel.tsx:208` — `downloadMethod === 'picker' ? t('export.videoSaved') : t('export.savedToDownloads')`

**Why it matters:**
The C4R-005 finding recommended differentiating the success message between picker and fallback paths. The code now does this correctly. However, the `export.videoSaved` i18n key is used here and must exist in the i18n translations. If it doesn't exist, the fallback behavior of the `t()` function would display the raw key to the user. This needs verification that the key exists in `i18n.ts`.

**Suggested fix:**
Verify that `export.videoSaved` exists in all locale objects in `i18n.ts`. If not, add it.

**Confidence:** Medium (depends on i18n key existence)

---

### C7-004 — LOW — `TrackToolbar` mobile menu uses `aria-label` on the container div instead of `role` semantics

**Severity:** LOW / Confidence: HIGH

**Primary location:**
- `src/components/TrackToolbar.tsx:137` — `<div aria-label={t('app.moreControls')} ...>`

**Why it matters:**
The mobile menu dropdown has `aria-label` on its container div but no `role` attribute. Without a role, screen readers may not announce the element properly. The `aria-expanded` is on the trigger button (line 129), which is correct, but the menu panel itself lacks menu/listbox role semantics. This was partially addressed in prior cycles but the menu panel still uses a plain `<div>`.

**Suggested fix:**
Add `role="menu"` to the mobile menu container div, or restructure as a proper menu pattern with `role="menuitem"` on the child buttons.

**Confidence:** High (a11y gap)

---

### C7-005 — LOW — `SceneEditor` `commitScenes` calls `normalizeScenes` which can silently modify scene boundaries, making the `normalizationWarnings` potentially misleading

**Severity:** LOW / Confidence: MEDIUM

**Primary location:**
- `src/components/SceneEditor.tsx:229-242` — `commitScenes` validates then normalizes

**Why it matters:**
The `commitScenes` function validates raw scenes (checking `startPercent >= endPercent`) and produces warnings. Then it calls `normalizeScenes` which can further modify scene boundaries (sorting, clamping overlap, removing zero-length scenes). The warnings shown to the user reflect the pre-normalization state, but the actual scenes applied are the normalized versions. This can create a disconnect: a warning says "Scene X has start >= end" but after normalization the scene might be removed entirely or have different bounds.

This is a minor UX inconsistency, not a bug. The warnings are informational and the normalization is correct behavior.

**Suggested fix:**
Consider running the validation against the normalized result instead, or add a note in the warning that "scenes will be automatically adjusted."

**Confidence:** Medium (minor UX polish)

---

### C7-006 — LOW — `usePlaybackController` animation frame callback captures stale `isPlayingRef` pattern

**Severity:** LOW / Confidence: LOW

**Primary location:**
- `src/lib/usePlaybackController.ts:77-106` — `useEffect` with `isPlaying` dependency

**Why it matters:**
The playback animation loop uses `isPlayingRef.current` to check if it should continue (line 83), which is kept in sync via the effect on lines 32-37. This pattern is correct — the ref is always updated before the animation frame callback can fire. However, the `useEffect` on line 77 has `[isPlaying, track, setPlaybackProgress]` as dependencies, meaning it re-runs whenever `isPlaying` changes. This is correct behavior (it starts/stops the animation loop). No actual bug exists here.

**Revised assessment:** NOT AN ISSUE. The ref-sync pattern is correctly implemented.

---

### C7-007 — LOW — `JourneyCreator` `handleConfirmCreate` creates a track without `segmentStartIndices` — this is correct for manually-created routes but means the track cannot have segments

**Severity:** LOW / Confidence: HIGH

**Primary location:**
- `src/components/JourneyCreator.tsx:521-527` — `handleConfirmCreate` creates `Track` without `segmentStartIndices`

**Why it matters:**
When a user creates a journey by placing waypoints, the resulting track has no `segmentStartIndices`. This is correct because the waypoints are connected by straight lines and represent a single continuous route. However, if a user creates a journey and then trims it using the timeline selector, the `handleRangeChange` in `page.tsx` creates segment indices from `fullTrack.segmentStartIndices`, which would be `undefined` for a manually-created journey. The `filter` on line 169 would produce an empty array, and the `map` on line 170 would produce an empty array — so `segmentStartIndices` would be `{}` which means `undefined`. This is correct behavior (no segments for a single-segment route).

**Revised assessment:** NOT AN ISSUE. The behavior is correct for single-segment routes.

---

### C7-008 — MEDIUM — `MapView` track-load effect (line 753) depends on `cumulativeDistancesProp` but the animation effect (line 820) reads from `cumulDistRef.current` which may be stale when `cumulativeDistancesProp` changes

**Severity:** MEDIUM / Confidence: MEDIUM

**Primary location:**
- `src/components/MapView.tsx:767-769` — `cumulDistRef.current` is set from `cumulativeDistancesProp`
- `src/components/MapView.tsx:830` — animation effect reads `cumulDistRef.current`

**Why it matters:**
The track-load effect (line 753) sets `cumulDistRef.current` when `cumulativeDistancesProp` changes. The animation effect (line 820) reads from `cumulDistRef.current`. However, the animation effect's dependency array is `[progress, track, followCamera, suspendAutoCamera, seekNonce, addTrackLayers, ensureMarker]` — it does NOT include `cumulativeDistancesProp` or `cumulDistRef`.

This means: if `cumulativeDistancesProp` changes (e.g., when the track object changes but points/segmentStartIndices stay the same, causing the memo in `page.tsx` to skip recomputation), the animation effect will continue using the old `cumulDistRef.current` until some other dependency (like `progress`) triggers a re-run.

In practice, when `track` changes, both the track-load effect and the animation effect re-run because `track` is in both dependency arrays. And `progress` changes on every animation frame, so the animation effect runs frequently. The stale-ref window is therefore very small — at most one animation frame.

However, there is a specific scenario where this matters: when `cumulativeDistancesProp` changes but `track` does not (e.g., if the memo deps change but the track object reference is the same). This currently cannot happen because the memo deps are `track?.points` and `track?.segmentStartIndices`, and if those change, `track` also changes. So this is a theoretical concern only given the current data flow.

**Suggested fix:**
Add `cumulativeDistancesProp` to the animation effect's dependency array, or (preferably) use the prop directly instead of the ref, since the effect already re-runs on `track` changes.

**Confidence:** Medium (theoretical risk given current data flow, but would be a real bug if data flow changes)

---

### C7-009 — LOW — `parser.ts` `parseGoogleLocationHistory` dedup step uses `toFixed(7)` for coordinate comparison, which can miss near-duplicate points with sub-E7 precision differences

**Severity:** LOW / Confidence: LOW

**Primary location:**
- `src/lib/parser.ts:396` — `const key = \`${p.lat.toFixed(7)},${p.lng.toFixed(7)},${p.time?.getTime() ?? ''}\``

**Why it matters:**
The dedup key uses `toFixed(7)` (7 decimal places) for coordinate comparison. This means two points that differ by less than ~1.1cm (0.0000001 degrees) would be treated as duplicates. This is a reasonable precision for GPS data. However, if a file contains points that were snapped to slightly different precisions (e.g., E7 vs decimal), they could fail to dedup. This is a very minor concern.

**Confidence:** Low (the 7-decimal precision is appropriate for GPS data)

---

### C7-010 — MEDIUM — `MapView` style-change effect depends on `track` but reads from `trackRef.current`

**Severity:** MEDIUM / Confidence: MEDIUM

**Primary location:**
- `src/components/MapView.tsx:642-663` — style-change `useEffect`

**Why it matters:**
The style-change effect has `[mapStyleKey, track]` as dependencies (with an eslint-disable comment on line 662). It reads `trackRef.current` inside the effect handler (line 652). If `track` changes and `mapStyleKey` also changes in the same render, the effect will re-run for both changes, but the `trackRef.current` may point to the latest track. This is actually correct behavior — the ref is updated in a separate effect (line 430-432) that runs before the style-change effect.

However, the style-change effect has a subtle issue: when `track` is in the dependency array, the effect re-runs on every track change. This means every time the user seeks (which changes `progress` and causes `handleRangeChange` to create a new track object), the style-change effect re-runs. Inside the effect, `styleKeyRef.current === mapStyleKey` check (line 644) short-circuits when the style hasn't changed, so no actual style reload happens. But the effect still registers a new `style.load` listener and returns a cleanup function, causing unnecessary listener churn.

**Suggested fix:**
Remove `track` from the dependency array and rely solely on `trackRef.current` inside the handler. The handler correctly reads from the ref. Add an eslint-disable comment explaining why `track` is intentionally omitted.

**Confidence:** Medium (correct behavior today, but unnecessary listener churn on track changes)

---

## Re-evaluation of deferred items

### DF-C2-002 — Playback progress drives whole-app rerenders
- **Current status:** Still valid and remains the most impactful perf issue. The `usePlaybackController` hook uses `setProgress` (React state) on every animation frame, causing the entire `HomeInner` component tree to re-render at ~60fps during playback.
- **Severity unchanged:** HIGH / HIGH

### DF-C4-001 — `preserveDrawingBuffer: true` always on
- **Current status:** Still valid. Comment at `MapView.tsx:556-560` explains the trade-off.

### DF-C5-001 — TrackToolbar mobile menu focus trapping
- **Current status:** Still valid. The mobile dropdown (line 135-220) uses `aria-expanded` on the trigger but no focus trap on the panel.

### DF-C5-002 — MapView animation effect stable callback dependencies
- **Current status:** Still valid. See C7-002 above.

### All other deferred items (DF-C2-001 through DF-C2-010, DF-C1-001, DF-C1-002)
- **Current status:** Still valid, unchanged.

## Items verified as already fixed or not actual issues

| Prior ID | Description | Why closed |
|----------|-------------|------------|
| C6-005 | ElevationProfile SVG `useId()` colons | `useId()` is the correct React pattern; verified not an issue |
| C6-009 | `downloadVideo` fallback URL race condition | The URL is held in React state by the caller; risk is negligible |
| C7-006 | `usePlaybackController` stale ref pattern | Ref-sync is correctly implemented |
| C7-007 | JourneyCreator track without segmentStartIndices | Correct for single-segment routes |

## Summary of new actionable findings

| ID | Severity | Confidence | Category | Description |
|----|----------|------------|----------|-------------|
| C7-001 | MEDIUM | HIGH | Performance | `ElevationProfile` elevations memo depends on `track` reference |
| C7-002 | MEDIUM | MEDIUM | Perf/Latent | `MapView` animation effect has unnecessary stable callbacks in deps |
| C7-003 | LOW | MEDIUM | i18n | `export.videoSaved` key may not exist in all locales |
| C7-004 | LOW | HIGH | Accessibility | TrackToolbar mobile menu lacks `role` on panel |
| C7-005 | LOW | MEDIUM | UX | SceneEditor normalization warnings may not match final state |
| C7-008 | MEDIUM | MEDIUM | Correctness/Latent | `cumulDistRef` may be stale in animation effect |
| C7-009 | LOW | LOW | Correctness | Parser dedup `toFixed(7)` precision edge case |
| C7-010 | MEDIUM | MEDIUM | Performance | MapView style-change effect unnecessary listener churn on track changes |
