# Cycle 8 Comprehensive Deep Code Review — 2026-04-19

Reviewer: integrated multi-perspective review (code quality, performance, security, a11y, architecture)

## Review scope
All source files under `src/` (28 files: 2 lib modules, 14 components, 1 app page, 1 layout, types, env).

## Method
Full file-by-file read of every source file. Cross-referenced with prior cycle aggregates (C1-C7). Focused on finding NEW issues not previously identified or fixed.

## Prior cycle findings verification
All C7-AGG-001 through C7-AGG-006 confirmed FIXED in current codebase:
- C7-AGG-001: `ElevationProfile` memo uses `[track.points]` (line 22) — FIXED
- C7-AGG-002: Animation effect deps exclude `addTrackLayers`/`ensureMarker` (line 926) — FIXED
- C7-AGG-003: TrackToolbar mobile menu has `role="menu"` + `role="menuitem"` — FIXED
- C7-AGG-004: Style-change effect deps exclude `track` (line 663) — FIXED
- C7-AGG-005: `export.videoSaved` key exists in all locales — VERIFIED
- C7-AGG-006: `cumulativeDistancesProp` added to animation effect deps (line 927) — FIXED

## New findings

### C8-001 — MEDIUM — ThemeToggle fires `onModeChange` on mount, causing redundant side effects

**File:** `src/components/ThemeToggle.tsx:33-35`

**Code:**
```ts
useEffect(() => {
  onModeChange?.(initialMode.mode)
}, [initialMode, onModeChange])
```

**Why it matters:**
The bootstrap script in `layout.tsx` already sets `data-mode` and `data-mapstyle` on `<html>` before React hydrates. `HomeInner` then initializes `colorMode` from the same DOM attribute. When ThemeToggle mounts, it calls `onModeChange` with the same mode value that was already set, triggering `handleModeChange` in `page.tsx`, which:
1. Calls `applyDocumentMode(mode)` — redundant, attribute already set
2. Writes to `localStorage` — redundant, same value
3. May call `setMapStyleKey` + `applyDocumentMapStyle` if `!hasExplicitMapStyleChoice` — redundant if the map style was already initialized

While `setColorMode(mode)` with the same value is a no-op (React batches), the side effects in `handleModeChange` still execute. This wastes work on every page load and creates a subtle coupling where ThemeToggle assumes the parent hasn't already initialized the mode.

**Suggested fix:**
Remove the mount-time `onModeChange` effect entirely. The parent (`HomeInner`) already initializes `colorMode` and `mapStyleKey` from the DOM before ThemeToggle renders. If ThemeToggle needs to communicate its detected mode, it should do so only when the user explicitly toggles (which it already does via the `toggle` callback).

**Confidence:** High

---

### C8-002 — LOW — Controls recomputes `totalDistance` when parent already has `cumulativeDistances`

**File:** `src/components/Controls.tsx:42`

**Code:**
```ts
const total = useMemo(() => totalDistance(track.points, track.segmentStartIndices), [track.points, track.segmentStartIndices])
```

**Why it matters:**
The parent (`page.tsx`) already computes `cumulativeDistances` via `computeCumulativeDistances`, and passes it to `TrackWorkspace`, `ElevationProfile`, and `MapView`. The total distance is simply `cumulativeDistances[cumulativeDistances.length - 1]`. Controls recomputes the same total via `totalDistance()`, which is an O(n) haversine iteration over all track points. This is redundant work that duplicates a value already computed upstream.

**Suggested fix:**
Pass `cumulativeDistances` as a prop to `Controls` and derive total from `cumulativeDistances[cumulativeDistances.length - 1] ?? 0` in O(1) time.

**Confidence:** High

---

### C8-003 — LOW — MapView track-load effect includes stable `useCallback` refs in dependency array (latent risk)

**File:** `src/components/MapView.tsx:811`

**Code:**
```ts
}, [track, addTrackLayers, ensureMarker, cumulativeDistancesProp])
```

**Why it matters:**
Same pattern as C7-AGG-002 (which was fixed for the animation effect). `addTrackLayers` and `ensureMarker` are stable `useCallback([], ...)` references. Including them in the dependency array is technically correct but introduces a latent risk: if a future refactor adds a dependency to either callback, the track-load effect would re-run unnecessarily on every track change, re-adding layers, re-fitting bounds, and re-creating the marker.

The track-load effect is less sensitive than the animation effect (it doesn't run on every frame), so the practical impact is lower. But the same defensive principle applies.

**Suggested fix:**
Remove `addTrackLayers` and `ensureMarker` from the dependency array and add an eslint-disable comment explaining why (same rationale as line 926).

**Confidence:** Medium (latent risk, not a current bug)

---

## No-issue verifications (explicitly checked, confirmed not bugs)

| Area | Finding | Why not an issue |
|------|---------|-------------------|
| MapView init effect | Empty deps `[]` but reads `mapStyleKey` | Correct: only runs on mount, style changes handled by separate effect |
| FileUpload double size check | Both `handleFile` and `parseTrackFile` check file size | Defense-in-depth: FileUpload gives i18n error, parseTrackFile is safety net for direct callers |
| `buildTrackGeometry` single-point segments | Duplicates coordinate for zero-length segment | MapLibre handles this gracefully, no visible artifact |
| `downloadVideo` setTimeout cleanup | `<a>` element stays 100ms | Harmless, page would be navigating away |
| ElevationProfile double-pass | Separate passes for elevations and min/max | Already cached via `useMemo`, O(n) on cached array is fine |
| TrackToolbar outside-click | Uses `mousedown` + `touchstart` | Both fire on touch devices but `setMenuOpen(false)` is idempotent |

## Carried-forward deferred items (unchanged)

All prior deferred items remain deferred per their existing exit criteria. No new deferrals this cycle.
