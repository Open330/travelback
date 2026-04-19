# Cycle 8 Aggregate Review — 2026-04-19

Generated after comprehensive full-repo review of current `main` branch.

## Review lanes considered
- Fresh comprehensive review (`cycle8-comprehensive-2026-04-19.md`)
- All prior cycle reviews and aggregates reviewed for carried-forward items
- Prior deferred findings reviewed for items that should re-open

## Aggregation method
- Re-verified every prior finding against the current codebase.
- All C7 active findings confirmed FIXED in prior cycle.
- Deduped overlapping findings and kept the highest severity / confidence.
- Carried forward still-valid deferred items as-is.
- New findings from this cycle are prefixed C8-AGG.

## All cycle 7 active findings verified as FIXED

| Prior ID | Description | Fix verification |
|----------|-------------|------------------|
| C7-AGG-001 | `ElevationProfile` memo depends on `track` object reference | `ElevationProfile.tsx:22` uses `[track.points]` |
| C7-AGG-002 | `MapView` animation effect has stable callbacks in deps | `MapView.tsx:926` excludes them, has eslint-disable |
| C7-AGG-003 | TrackToolbar mobile menu lacks ARIA roles | `TrackToolbar.tsx:137` has `role="menu"`, buttons have `role="menuitem"` |
| C7-AGG-004 | MapView style-change effect has `track` in deps | `MapView.tsx:663` excludes `track`, has eslint-disable |
| C7-AGG-005 | `export.videoSaved` i18n key missing | Verified present in all 5 locales |
| C7-AGG-006 | `cumulDistRef` may be stale | `MapView.tsx:927` includes `cumulativeDistancesProp` in deps |

## Merged findings (active, to be addressed this cycle)

### C8-AGG-001 — MEDIUM — ThemeToggle fires `onModeChange` on mount, causing redundant side effects

**Cross-agent agreement:** cycle8-comprehensive
**Primary locations:**
- `src/components/ThemeToggle.tsx:33-35` — `useEffect(() => { onModeChange?.(initialMode.mode) }, [initialMode, onModeChange])`

**Why it matters:**
The bootstrap script in `layout.tsx` already sets `data-mode` and `data-mapstyle` on `<html>` before React hydrates. `HomeInner` initializes `colorMode` from the same DOM attribute. When ThemeToggle mounts, it calls `onModeChange` with the same mode value already set, triggering `handleModeChange` in `page.tsx`, which:
1. Calls `applyDocumentMode(mode)` — redundant, attribute already set
2. Writes to `localStorage` — redundant, same value
3. May call `setMapStyleKey` + `applyDocumentMapStyle` — redundant if map style already initialized

While `setColorMode` with the same value is a no-op, the side effects in `handleModeChange` still execute. This wastes work on every page load.

**Suggested fix:**
Remove the mount-time `onModeChange` effect entirely. The parent (`HomeInner`) already initializes `colorMode` and `mapStyleKey` from the DOM before ThemeToggle renders. ThemeToggle already communicates user-initiated toggles via the `toggle` callback.

**Confidence:** High

---

### C8-AGG-002 — LOW — Controls recomputes `totalDistance` when parent already has `cumulativeDistances`

**Cross-agent agreement:** cycle8-comprehensive
**Primary locations:**
- `src/components/Controls.tsx:42` — `useMemo(() => totalDistance(track.points, track.segmentStartIndices), [track.points, track.segmentStartIndices])`

**Why it matters:**
The parent (`page.tsx`) already computes `cumulativeDistances` via `computeCumulativeDistances`, and passes it to sibling components. The total distance is simply `cumulativeDistances[cumulativeDistances.length - 1]`. Controls recomputes the same total via `totalDistance()`, which is an O(n) haversine iteration. This is redundant work that duplicates a value already computed upstream.

**Suggested fix:**
Pass `cumulativeDistances` as a prop to `Controls` and derive total from `cumulativeDistances[cumulativeDistances.length - 1] ?? 0` in O(1) time.

**Confidence:** High

---

### C8-AGG-003 — LOW — MapView track-load effect includes stable `useCallback` refs in dependency array (latent risk)

**Cross-agent agreement:** cycle8-comprehensive
**Primary locations:**
- `src/components/MapView.tsx:811` — `[track, addTrackLayers, ensureMarker, cumulativeDistancesProp]`

**Why it matters:**
Same pattern as C7-AGG-002 (which was fixed for the animation effect). `addTrackLayers` and `ensureMarker` are stable `useCallback([], ...)` references. Including them introduces a latent risk: if a future refactor adds a dependency to either callback, the track-load effect would re-run unnecessarily on every track change.

The track-load effect is less sensitive than the animation effect (it doesn't run per-frame), so practical impact is lower. But the same defensive principle applies.

**Suggested fix:**
Remove `addTrackLayers` and `ensureMarker` from the dependency array and add an eslint-disable comment explaining why (same rationale as line 926).

**Confidence:** Medium (latent risk, not a current bug)

---

## Carried-forward deferred items (not re-opened this cycle)

These remain in their existing files and are NOT scheduled for this cycle:

From `deferred-findings-cycle1-2026-04-19.md`:
- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring

From `deferred-findings-cycle2-2026-04-19.md`:
- DF-C2-001: Mobile information architecture gaps
- DF-C2-002: Playback progress drives whole-app rerenders (HIGH/HIGH — still the most impactful perf issue)
- DF-C2-003: Large GPX/KML imports parse on main thread
- DF-C2-004: Manual route dragging is O(n) on pointer move
- DF-C2-005: Export settings permit browser-hostile combinations
- DF-C2-006: Locale/help content eagerly bundled
- DF-C2-007: Large default variable font payload
- DF-C2-008: E2E suite serialized and sleep-heavy
- DF-C2-009: Residual CSP allows inline styles
- DF-C2-010: Local-only bundled styles ship without real basemap layer

From cycle 4:
- DF-C4-001: `preserveDrawingBuffer: true` always on, wasting GPU resources

From cycle 5:
- DF-C5-001: TrackToolbar mobile menu focus trapping (partially addressed by C7-AGG-003 — added ARIA roles, but not full focus trap)

## Items verified as already fixed or not actual issues

| Prior ID | Description | Why closed |
|----------|-------------|------------|
| (none new this cycle) | | |

## Recommended implementation order for this cycle

1. **C8-AGG-001 (MEDIUM)**: Remove ThemeToggle mount-time `onModeChange` effect — eliminates redundant side effects on page load
2. **C8-AGG-002 (LOW)**: Pass `cumulativeDistances` to Controls and derive total in O(1) — performance
3. **C8-AGG-003 (LOW)**: Remove stable callbacks from track-load effect deps — latent risk defense
