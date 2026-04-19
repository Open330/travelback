# Cycle 14 Aggregate Review — 2026-04-19

Generated after comprehensive full-repo review of current `main` branch.

## Review lanes considered
- Fresh comprehensive review (`cycle14-comprehensive-2026-04-19.md`)
- All prior cycle reviews and aggregates reviewed for carried-forward items
- Prior deferred findings reviewed for items that should re-open

## Aggregation method
- Re-verified every prior finding against the current codebase.
- All C13 active findings confirmed FIXED in prior cycle.
- Deduped overlapping findings and kept the highest severity / confidence.
- Carried forward still-valid deferred items as-is.
- New findings from this cycle are prefixed C14-AGG.

## Merged findings (active, to be addressed this cycle)

### C14-AGG-001 — LOW — ExportPanel selects (resolution, fps) lack NaN guards

**Cross-agent agreement:** cycle14-comprehensive
**Primary locations:**
- `src/components/ExportPanel.tsx:268` (resolution select)
- `src/components/ExportPanel.tsx:329` (fps select)

**Why it matters:**
Both selects pass `parseInt(e.target.value)` directly to state setters without NaN guards. If NaN propagated, it would crash resolution/fps-dependent renders and export frame calculations. This is inconsistent with the NaN guard pattern established for Controls speed/duration selects (C13-AGG-003) and SceneEditor blend duration (C13-AGG-001).

**Suggested fix:**
Add `Number.isFinite` guards to both handlers:
```ts
// Resolution select
onChange={e => {
  const value = parseInt(e.target.value, 10)
  if (Number.isFinite(value)) setResolutionIdx(value)
}}

// FPS select
onChange={e => {
  const value = parseInt(e.target.value, 10)
  if (Number.isFinite(value)) setFps(value)
}}
```

**Confidence:** Low (selects with hardcoded options are unlikely to produce NaN, but consistency matters)

---

### C14-AGG-002 — LOW — SceneEditor camera param range inputs parseFloat lack NaN guards

**Cross-agent agreement:** cycle14-comprehensive
**Primary locations:**
- `src/components/SceneEditor.tsx:513` (zoom)
- `src/components/SceneEditor.tsx:527` (pitch)
- `src/components/SceneEditor.tsx:544` (bearingOffset)
- `src/components/SceneEditor.tsx:558` (rotationSpeed)

**Why it matters:**
All four camera parameter range inputs pass `parseFloat(e.target.value)` directly into scene params without NaN guards. If NaN propagated, it would break camera computations. Same consistency concern as the other NaN guard fixes.

**Suggested fix:**
Add `Number.isFinite` guards to each handler:
```ts
onChange={e => {
  const value = parseFloat(e.target.value)
  if (Number.isFinite(value)) updateScene(scene.id, { params: { ...scene.params, zoom: value } })
}}
```

**Confidence:** Low

---

### C14-AGG-003 — LOW — ExportPanel canShare recomputed on every render

**Cross-agent agreement:** cycle14-comprehensive
**Primary location:**
- `src/components/ExportPanel.tsx:169-178`

**Why it matters:**
The `canShare` value is computed on every render by creating `new File([new ArrayBuffer(1)], ...)` and calling `navigator.canShare`. This allocates objects unnecessarily on each render. Should be memoized.

**Suggested fix:**
Wrap in `useMemo`:
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

**Confidence:** Low (minor perf, not correctness)

---

## Carried-forward deferred items (not re-opened this cycle)

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

## Recommended implementation order for this cycle

1. **C14-AGG-001 (LOW)**: Add NaN guards to ExportPanel resolution and fps selects
2. **C14-AGG-002 (LOW)**: Add NaN guards to SceneEditor camera param range inputs
3. **C14-AGG-003 (LOW)**: Memoize canShare in ExportPanel
