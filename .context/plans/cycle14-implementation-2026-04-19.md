# Cycle 14 Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (cycle 14).

## Active findings to address this cycle

### 1. C14-AGG-001 — LOW — ExportPanel selects (resolution, fps) lack NaN guards

**Files:** `src/components/ExportPanel.tsx:268, 329`

**Plan:**
- In the resolution index select `onChange`, add a `Number.isFinite` guard:
  ```tsx
  onChange={e => {
    const value = parseInt(e.target.value, 10)
    if (Number.isFinite(value)) setResolutionIdx(value)
  }}
  ```
- In the fps select `onChange`, add a `Number.isFinite` guard:
  ```tsx
  onChange={e => {
    const value = parseInt(e.target.value, 10)
    if (Number.isFinite(value)) setFps(value)
  }}
  ```
- This makes the selects self-consistent with the NaN guard pattern established in Controls.tsx and SceneEditor.tsx.

**Status:** PENDING

---

### 2. C14-AGG-002 — LOW — SceneEditor camera param range inputs parseFloat lack NaN guards

**Files:** `src/components/SceneEditor.tsx:513, 527, 544, 558`

**Plan:**
- In each of the four camera param range input `onChange` handlers, extract `parseFloat` into a variable and add a `Number.isFinite` guard before calling `updateScene`:
  - Zoom (line 513):
    ```tsx
    onChange={e => {
      const value = parseFloat(e.target.value)
      if (Number.isFinite(value)) updateScene(scene.id, { params: { ...scene.params, zoom: value } })
    }}
    ```
  - Pitch (line 527):
    ```tsx
    onChange={e => {
      const value = parseFloat(e.target.value)
      if (Number.isFinite(value)) updateScene(scene.id, { params: { ...scene.params, pitch: value } })
    }}
    ```
  - Bearing offset (line 544):
    ```tsx
    onChange={e => {
      const value = parseFloat(e.target.value)
      if (Number.isFinite(value)) updateScene(scene.id, { params: { ...scene.params, bearingOffset: value } })
    }}
    ```
  - Rotation speed (line 558):
    ```tsx
    onChange={e => {
      const value = parseFloat(e.target.value)
      if (Number.isFinite(value)) updateScene(scene.id, { params: { ...scene.params, rotationSpeed: value } })
    }}
    ```
- This makes all range inputs self-consistent with the NaN guard pattern.

**Status:** PENDING

---

### 3. C14-AGG-003 — LOW — ExportPanel canShare recomputed on every render

**Files:** `src/components/ExportPanel.tsx:169-178`

**Plan:**
- Wrap the `canShare` computation in `useMemo` with an empty dependency array, since the result depends only on browser capabilities that don't change during a session:
  ```tsx
  const canShare = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    if (typeof navigator.share !== 'function') return false
    try {
      const testFile = new File([new ArrayBuffer(1)], 'test.mp4', { type: 'video/mp4' })
      return navigator.canShare?.({ files: [testFile] }) ?? false
    } catch {
      return false
    }
  }, [])
  ```
- Add `useMemo` to the import from 'react' (already imported as `useState, useCallback, useEffect, useRef` — need to add `useMemo`).

**Status:** PENDING

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
