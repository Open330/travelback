# Cycle 13 Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (cycle 13).

## Active findings to address this cycle

### 1. C13-AGG-001 — MEDIUM — SceneEditor blend duration parseInt without NaN guard

**Files:** `src/components/SceneEditor.tsx:385`

**Plan:**
- In the blend duration range input's `onChange` handler, extract `parseInt` into a variable and add a `Number.isFinite` guard before calling `onTransitionDurationChange`:
  ```tsx
  onChange={e => {
    const value = parseInt(e.target.value, 10)
    if (Number.isFinite(value)) onTransitionDurationChange(value / 100)
  }}
  ```
- This makes the handler self-consistent with the NaN guard pattern established in Controls.tsx and ExportPanel.tsx.

**Status:** TODO

---

### 2. C13-AGG-002 — MEDIUM — ExportPanel duration prop sync overwrites user edits

**Files:** `src/components/ExportPanel.tsx:65-68`

**Plan:**
- Replace the current prop-sync effect with one that only syncs `playbackDuration` into local `duration` state when the panel first opens, not on every prop change.
- Add a `panelOpenedRef` to track whether the panel has been opened for the current session.
- When `isOpen` transitions to true and the ref is false, sync the prop. Set the ref to true. When `isOpen` transitions to false, reset the ref.
- Keep the initial `useState` value derived from `playbackDuration ?? 30` as-is.
  ```tsx
  const panelOpenedRef = useRef(false)
  useEffect(() => {
    if (isOpen) {
      if (!panelOpenedRef.current && playbackDuration != null) {
        setDuration(playbackDuration)
      }
      panelOpenedRef.current = true
    } else {
      panelOpenedRef.current = false
    }
  }, [isOpen, playbackDuration])
  ```
- Remove the existing prop-sync effect (lines 65-68).

**Status:** TODO

---

### 3. C13-AGG-003 — LOW — Controls duration/speed selects lack NaN guards

**Files:** `src/components/Controls.tsx:98, 112`

**Plan:**
- In the speed select `onChange`, add a `Number.isFinite` guard:
  ```tsx
  onChange={(e) => {
    const value = parseFloat(e.target.value)
    if (Number.isFinite(value)) onSpeedChange(value)
  }}
  ```
- In the duration select `onChange`, add a `Number.isFinite` guard:
  ```tsx
  onChange={(e) => {
    const value = parseInt(e.target.value, 10)
    if (Number.isFinite(value)) onDurationChange(value)
  }}
  ```
- This establishes consistency with the NaN guard pattern used for the progress input.

**Status:** TODO

---

## Quality gates
- `eslint` — must pass with 0 errors
- `tsc --noEmit` — must pass with 0 errors
- `next build` — must pass

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
- DF-C5-001: TrackToolbar mobile menu focus trapping

From cycle 11:
- C11-007 (LOW): ElevationProfile RTL click handling — exit criterion: re-open when RTL support is explicitly scoped
- C11-009 (LOW): Controls elapsed floating point wobble — exit criterion: re-open if user reports visible display glitch
- C11-005 (LOW): TrackWorkspace title overlap with scene editor — exit criterion: re-open during next layout polish pass

From cycle 12:
- C12-005 (LOW): TimelineSelector reset button bypasses resolveRangeIndexes — exit criterion: re-open if resolveRangeIndexes adds edge-case logic
- C12-008 (LOW): ExportPanel file size estimate accuracy — exit criterion: re-open during next UX accuracy pass
