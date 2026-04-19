# Cycle 14 Comprehensive Code Review — 2026-04-19

Full repo review against current `main` branch. Every source file examined (28 files in `src/`, plus scripts and config).

## Review methodology
- Read every file in `src/` end-to-end
- Cross-referenced against prior cycle aggregate (`_aggregate.md`) and cycle 13 review to avoid re-reporting already-fixed issues
- Checked all prior deferred findings for re-openability
- Searched systematically for: NaN guards, parseInt/parseFloat without validation, effect deps, prop-sync overwrites, a11y gaps, memory leaks, race conditions

## Prior findings verified as FIXED
All C13-AGG-001 through C13-AGG-003 confirmed fixed in current codebase:
- C13-AGG-001: SceneEditor blend duration parseInt now has `Number.isFinite` guard (SceneEditor.tsx:386-387)
- C13-AGG-002: ExportPanel duration prop sync only fires once on panel open via `panelOpenedRef` (ExportPanel.tsx:65-76)
- C13-AGG-003: Controls speed and duration selects now have `Number.isFinite` guards (Controls.tsx:99-100, 116-117)

## New findings

### C14-001 — LOW — ExportPanel resolution select parseInt without NaN guard

**File:** `src/components/ExportPanel.tsx:268`
**Code:** `onChange={e => setResolutionIdx(parseInt(e.target.value))}`

**Why it matters:**
The resolution index select passes `parseInt(e.target.value)` directly to `setResolutionIdx` without a NaN guard. If `parseInt` returns `NaN`, `setResolutionIdx(NaN)` would break the resolution index and cause `RESOLUTION_PRESETS[NaN]` to be `undefined`, crashing the render. While extremely unlikely for a select with hardcoded numeric options, this is inconsistent with the NaN guard pattern established for Controls speed/duration selects (C13-AGG-003).

**Confidence:** Low (selects with hardcoded options are unlikely to produce NaN, but consistency matters)

**Suggested fix:**
```ts
onChange={e => {
  const value = parseInt(e.target.value, 10)
  if (Number.isFinite(value)) setResolutionIdx(value)
}}
```

---

### C14-002 — LOW — ExportPanel fps select parseInt without NaN guard

**File:** `src/components/ExportPanel.tsx:329`
**Code:** `onChange={e => setFps(parseInt(e.target.value))}`

**Why it matters:**
Same pattern as C14-001. The FPS select passes `parseInt(e.target.value)` directly to `setFps`. If `NaN` propagated, `setFps(NaN)` would break the export frame count calculation (`Math.ceil(duration * fps)` = NaN). Same consistency concern.

**Confidence:** Low

**Suggested fix:**
```ts
onChange={e => {
  const value = parseInt(e.target.value, 10)
  if (Number.isFinite(value)) setFps(value)
}}
```

---

### C14-003 — LOW — SceneEditor camera param range inputs parseFloat without NaN guard

**Files:**
- `src/components/SceneEditor.tsx:513` (zoom)
- `src/components/SceneEditor.tsx:527` (pitch)
- `src/components/SceneEditor.tsx:544` (bearingOffset)
- `src/components/SceneEditor.tsx:558` (rotationSpeed)

**Code:** `onChange={e => updateScene(scene.id, { params: { ...scene.params, zoom: parseFloat(e.target.value) } })}`

**Why it matters:**
All four camera parameter range inputs pass `parseFloat(e.target.value)` directly into scene params without NaN guards. If `parseFloat` returned `NaN` (edge case with programmatic value changes or browser extensions), `NaN` would propagate into the scene's camera parameters and then into the camera computation functions. While range inputs with hardcoded min/max/step are extremely unlikely to produce NaN, this is inconsistent with the NaN guard pattern established for other inputs in the codebase.

**Confidence:** Low (range inputs with hardcoded values are unlikely to produce NaN, but consistency matters)

**Suggested fix:**
For each range input:
```ts
onChange={e => {
  const value = parseFloat(e.target.value)
  if (Number.isFinite(value)) updateScene(scene.id, { params: { ...scene.params, zoom: value } })
}}
```

---

### C14-004 — LOW — ExportPanel canShare recomputed on every render

**File:** `src/components/ExportPanel.tsx:169-178`

**Why it matters:**
The `canShare` value is computed on every render by creating a `new File([new ArrayBuffer(1)], ...)` and calling `navigator.canShare`. While the computation is cheap, it allocates a small `ArrayBuffer` and `File` object on every render of the export panel. This could be memoized with `useMemo` to avoid unnecessary allocations.

**Confidence:** Low (minor perf, not a correctness issue)

**Suggested fix:**
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

---

## Summary of actionable new findings

| ID | Severity | File | Description |
|----|----------|------|-------------|
| C14-001 | LOW | ExportPanel.tsx:268 | Resolution select parseInt lacks NaN guard |
| C14-002 | LOW | ExportPanel.tsx:329 | FPS select parseInt lacks NaN guard |
| C14-003 | LOW | SceneEditor.tsx:513,527,544,558 | Camera param range parseFloat lacks NaN guard |
| C14-004 | LOW | ExportPanel.tsx:169-178 | canShare recomputed on every render (minor perf) |

## Deferred items reviewed (not re-opened)

All prior deferred items remain deferred per their existing exit criteria. No items met their re-open criteria this cycle.
