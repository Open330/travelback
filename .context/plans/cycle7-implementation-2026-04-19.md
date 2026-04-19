# Cycle 7 Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (cycle 7).

## Active findings to address this cycle

### 1. C7-AGG-001 — MEDIUM — Fix `ElevationProfile` `elevations` memo dependency

**Files:** `src/components/ElevationProfile.tsx:20-22`

**Plan:**
- Change `useMemo(() => track.points.map(...), [track])` to `useMemo(() => track.points.map(...), [track.points])`.
- Also check the `hasElevation` memo (line 26) — it depends on `elevations` which is correctly derived, so it will automatically benefit.

**Status:** DONE — Commit `7f32686`

---

### 2. C7-AGG-002 — MEDIUM — Remove stable callbacks from `MapView` animation effect dependency array

**Files:** `src/components/MapView.tsx:926`

**Plan:**
- Remove `addTrackLayers` and `ensureMarker` from the animation effect's dependency array on line 926.
- Add an eslint-disable comment explaining that these are stable `useCallback([], ...)` references and including them introduces a latent risk of per-frame re-execution if their deps ever change.
- The effect already handles missing layers via the `if (!map.getLayer(...))` guard on line 824.

**Status:** DONE — Commit `14bd944`

---

### 3. C7-AGG-003 — LOW — Add ARIA role to TrackToolbar mobile menu panel

**Files:** `src/components/TrackToolbar.tsx:137`

**Plan:**
- Add `role="menu"` to the mobile menu container div.
- Add `role="menuitem"` to each button inside the menu.

**Status:** DONE — Commit `cf32b1f`

---

### 4. C7-AGG-004 — MEDIUM — Remove `track` from MapView style-change effect dependency array

**Files:** `src/components/MapView.tsx:642-663`

**Plan:**
- Remove `track` from the style-change effect's dependency array.
- The effect already reads `trackRef.current` inside the handler (line 652), which is the correct pattern.
- Add an eslint-disable comment explaining that `track` is intentionally omitted because the effect reads from `trackRef.current` and including `track` causes unnecessary listener churn on every track change.
- This also aligns with the existing eslint-disable comment on line 662.

**Status:** DONE — Commit `c554fd0`

---

### 5. C7-AGG-005 — LOW — Verify `export.videoSaved` i18n key existence

**Files:** `src/components/ExportPanel.tsx:208`, `src/lib/i18n.ts`

**Status:** NOT AN ISSUE — verified that `export.videoSaved` exists in all 5 locales (en, ko, ja, zh, es) in `i18n.ts`.

---

### 6. C7-AGG-006 — MEDIUM — Add `cumulativeDistancesProp` to animation effect dependency array

**Files:** `src/components/MapView.tsx:926`

**Plan:**
- Add `cumulativeDistancesProp` to the animation effect's dependency array on line 926.
- This ensures the animation effect re-runs when cumulative distances change independently of the track object, making the effect more robust against future data flow changes.
- In the current data flow this is a no-op (cumulativeDistances changes together with track), but it's a defensive improvement.

**Status:** DONE — Commit `dba6665`

---

## Additional fixes

- Removed unnecessary eslint-disable directive from ElevationProfile — Commit `8949633`

## Quality gates
- `eslint` — PASS (0 errors, 0 warnings)
- `tsc --noEmit` — PASS (0 errors)
- `next build` — PASS (compiled successfully, static export)

## Deployed
- Pushed to `main` at `8949633`

## Deferred findings (not scheduled this cycle)

All prior deferred items remain deferred per their existing exit criteria:

From `deferred-findings-cycle1-2026-04-19.md`:
- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring

From `deferred-findings-cycle2-2026-04-19.md`:
- DF-C2-001: Mobile information architecture gaps
- DF-C2-002: Playback progress drives whole-app rerenders (HIGH/HIGH)
- DF-C2-003: Large GPX/KML imports parse on main thread
- DF-C2-004: Manual route dragging is O(n) on pointer move
- DF-C2-005: Export settings permit browser-hostile combinations
- DF-C2-006: Locale/help content eagerly bundled
- DF-C2-007: Large default variable font payload
- DF-C2-008: E2E suite serialized and sleep-heavy
- DF-C2-009: Residual CSP allows inline styles
- DF-C2-010: Local-only bundled styles ship without real basemap layer

From cycle 4:
- DF-C4-001: `preserveDrawingBuffer: true` always on

From cycle 5:
- DF-C5-001: TrackToolbar mobile menu focus trapping (partially addressed by C7-AGG-003 this cycle — added ARIA roles, but not full focus trap)
- DF-C5-002: MapView animation effect stable callback dependencies (ADDRESSED by C7-AGG-002 this cycle — stable callbacks removed from deps)

No new deferrals this cycle.
