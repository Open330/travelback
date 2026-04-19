# Cycle 8 Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (cycle 8).

## Active findings to address this cycle

### 1. C8-AGG-001 — MEDIUM — Remove ThemeToggle mount-time `onModeChange` effect

**Files:** `src/components/ThemeToggle.tsx:33-35`

**Plan:**
- Remove the `useEffect` that calls `onModeChange?.(initialMode.mode)` on mount (lines 33-35).
- The parent (`HomeInner` in `page.tsx`) already initializes `colorMode` from `document.documentElement.getAttribute('data-mode')` and from `localStorage` (via the bootstrap script). ThemeToggle's mount-time callback is redundant.
- The `prefers-color-scheme` media query listener (lines 37-54) should remain — it correctly responds to OS theme changes. However, it also calls `onModeChange?.(newMode)` when the user hasn't set an explicit mode. This is correct behavior for live OS theme changes and should be kept.
- After removing the mount effect, verify that theme toggling still works correctly (the `toggle` callback on line 56-62 still calls `onModeChange`).
- The `initialMode` state and its `hadExplicitMode` field become unused after removing the mount effect. Clean up `detectInitialMode` to return just the mode string, or inline the detection.
- Verify that `HomeInner`'s `handleModeChange` is not called on initial render after this change (it currently is, due to ThemeToggle's mount effect).

**Status:** PENDING

---

### 2. C8-AGG-002 — LOW — Pass `cumulativeDistances` to Controls, derive total in O(1)

**Files:** `src/components/Controls.tsx:42`, `src/components/TrackWorkspace.tsx`, `src/app/page.tsx`

**Plan:**
- Add `cumulativeDistances: number[]` to the `ControlsProps` interface.
- Replace `useMemo(() => totalDistance(track.points, track.segmentStartIndices), [track.points, track.segmentStartIndices])` with a simple derivation: `const total = cumulativeDistances[cumulativeDistances.length - 1] ?? 0`.
- Remove the `totalDistance` import from Controls if no longer needed.
- Pass `cumulativeDistances` from `TrackWorkspace` to `Controls` (it already receives it as a prop).
- Remove `track` from Controls props if no longer needed (check: `track` is also used for... let me check — no, `track` is only used for `totalDistance` in Controls). Actually, looking more carefully, Controls doesn't use `track` for anything else. So we can remove `track` from ControlsProps entirely.
- Wait — need to verify. Let me re-check Controls.tsx... Controls uses `track` only in the `total` computation on line 42. The component doesn't reference `track` anywhere else. So removing `track` from props is correct.
- Actually, I need to double-check: `track` is passed as a prop. If we remove it, we need to update the call sites. `TrackWorkspace` passes `track` to `Controls`. After this change, it should pass `cumulativeDistances` instead.

**Status:** PENDING

---

### 3. C8-AGG-003 — LOW — Remove stable callbacks from MapView track-load effect dependency array

**Files:** `src/components/MapView.tsx:811`

**Plan:**
- Remove `addTrackLayers` and `ensureMarker` from the dependency array on line 811.
- Add an eslint-disable comment explaining that these are stable `useCallback([], ...)` references and including them introduces a latent risk of unnecessary re-execution if their deps ever change (same rationale as line 926).
- The effect already handles missing layers and markers through the `addTrackLayers`/`ensureMarker` function calls inside the effect body.

**Status:** PENDING

---

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
- DF-C5-001: TrackToolbar mobile menu focus trapping (partially addressed by C7-AGG-003)

No new deferrals this cycle.
