# Cycle 13 Aggregate Review — 2026-04-19

Generated after comprehensive full-repo review of current `main` branch.

## Review lanes considered
- Fresh comprehensive review (`cycle13-comprehensive-2026-04-19.md`)
- All prior cycle reviews and aggregates reviewed for carried-forward items
- Prior deferred findings reviewed for items that should re-open

## Aggregation method
- Re-verified every prior finding against the current codebase.
- All C12 active findings confirmed FIXED in prior cycle.
- Deduped overlapping findings and kept the highest severity / confidence.
- Carried forward still-valid deferred items as-is.
- New findings from this cycle are prefixed C13-AGG.

## Merged findings (active, to be addressed this cycle)

### C13-AGG-001 — MEDIUM — SceneEditor blend duration parseInt without NaN guard

**Cross-agent agreement:** cycle13-comprehensive
**Primary locations:**
- `src/components/SceneEditor.tsx:385`

**Why it matters:**
The blend duration range input passes `parseInt(e.target.value) / 100` to `onTransitionDurationChange` without a NaN guard. If `parseInt` returns `NaN`, it propagates to `transitionDuration` state, breaking the range input rendering (`Math.round(NaN * 100) = NaN`). Same pattern that was fixed in Controls.tsx (C12-AGG-001) and ExportPanel.tsx (C11-AGG-001).

**Suggested fix:**
```ts
const value = parseInt(e.target.value, 10)
if (Number.isFinite(value)) onTransitionDurationChange(value / 100)
```

**Confidence:** High

---

### C13-AGG-002 — MEDIUM — ExportPanel duration prop sync overwrites user edits

**Cross-agent agreement:** cycle13-comprehensive
**Primary locations:**
- `src/components/ExportPanel.tsx:65-68`

**Why it matters:**
The effect syncs `playbackDuration` into local `duration` state every time the prop changes. If the user has manually edited the duration input in the export panel and then the playback duration changes (e.g., the animation duration is adjusted via the Controls dropdown while the export panel is open), the user's edit is silently overwritten. This is a UX bug: the user sees their value replaced without warning.

**Suggested fix:**
Only sync the prop value once when the panel opens, not on every prop change. Use a ref to track whether the panel has been opened:
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

**Confidence:** Medium

---

### C13-AGG-003 — LOW — Controls duration/speed selects lack NaN guards

**Cross-agent agreement:** cycle13-comprehensive
**Primary locations:**
- `src/components/Controls.tsx:98` (speed select)
- `src/components/Controls.tsx:112` (duration select)

**Why it matters:**
Both selects pass parsed values directly to state setters without NaN guards. While extremely unlikely for select elements with hardcoded numeric options, this is inconsistent with the NaN guard pattern established for the progress input (C12-AGG-001) and ExportPanel duration input (C11-AGG-001). If NaN somehow propagated, it would break the animation loop.

**Suggested fix:**
Add `Number.isFinite` guards to both handlers for consistency:
```ts
// Speed select
onChange={(e) => {
  const value = parseFloat(e.target.value)
  if (Number.isFinite(value)) onSpeedChange(value)
}}

// Duration select
onChange={(e) => {
  const value = parseInt(e.target.value, 10)
  if (Number.isFinite(value)) onDurationChange(value)
}}
```

**Confidence:** Low (selects with hardcoded options are unlikely to produce NaN, but consistency matters)

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
- C12-002 (LOW): Controls elapsed floating-point wobble — already deferred as C11-009; keeping existing deferral
- C12-005 (LOW): TimelineSelector reset button bypasses resolveRangeIndexes — exit criterion: re-open if resolveRangeIndexes adds edge-case logic
- C12-006 (LOW): ElevationProfile RTL comment clarity — already deferred as C11-007; keeping existing deferral
- C12-008 (LOW): ExportPanel file size estimate accuracy — exit criterion: re-open during next UX accuracy pass

## Recommended implementation order for this cycle

1. **C13-AGG-001 (MEDIUM)**: Add NaN guard to SceneEditor blend duration parseInt
2. **C13-AGG-002 (MEDIUM)**: Fix ExportPanel duration prop sync to not overwrite user edits
3. **C13-AGG-003 (LOW)**: Add NaN guards to Controls speed/duration selects for consistency
