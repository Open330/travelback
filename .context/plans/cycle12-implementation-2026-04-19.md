# Cycle 12 Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (cycle 12).

## Active findings to address this cycle

### 1. C12-AGG-001 — MEDIUM — Controls progress bar parseFloat without NaN guard

**Files:** `src/components/Controls.tsx:46`

**Plan:**
- In the `handleProgressChange` callback, add a `Number.isFinite` guard before calling `onSeek`:
  ```ts
  const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (Number.isFinite(value)) onSeek(value)
  }, [onSeek])
  ```
- This makes the input handler self-consistent with the ExportPanel duration input fix pattern.

**Status:** DONE

---

### 2. C12-AGG-002 — MEDIUM — SceneEditor percentage number inputs don't clamp typed values

**Files:** `src/components/SceneEditor.tsx:472-489`

**Plan:**
- In both the startPercent and endPercent `onChange` handlers, clamp the parsed value to [0, 100] before dividing by 100:
  ```ts
  const nextValue = Number.parseInt(e.target.value, 10)
  if (!Number.isFinite(nextValue)) return
  const clamped = Math.max(0, Math.min(100, nextValue))
  updateScene(scene.id, { startPercent: clamped / 100 })
  ```
- Same for the endPercent handler.
- This ensures the UI never shows invalid percentages even momentarily.

**Status:** DONE

---

### 3. C12-AGG-003 — LOW — ReadOnly bitrate field has meaningless min/max attributes

**Files:** `src/components/ExportPanel.tsx:331`

**Plan:**
- Remove `min={1} max={50}` from the readOnly bitrate `<input>` element.
- These attributes serve no purpose on a readOnly field and could confuse AT about interactivity.

**Status:** DONE

---

### 4. C12-AGG-004 — LOW — ModalDialog focus restoration can target detached element

**Files:** `src/components/ModalDialog.tsx:157`

**Plan:**
- In the cleanup function of the modal effect, guard `previousActiveElement.focus()` with a `document.body.contains()` check:
  ```ts
  if (previousActiveElement && document.body.contains(previousActiveElement)) {
    previousActiveElement.focus()
  }
  ```
- This prevents focus calls on elements that were removed from the DOM while the modal was open.

**Status:** DONE

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

New deferrals this cycle:
- C12-005 (LOW): TimelineSelector reset button bypasses resolveRangeIndexes — exit criterion: re-open if resolveRangeIndexes adds edge-case logic
- C12-008 (LOW): ExportPanel file size estimate accuracy — exit criterion: re-open during next UX accuracy pass
