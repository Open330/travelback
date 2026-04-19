# Cycle 12 Aggregate Review — 2026-04-19

Generated after comprehensive full-repo review of current `main` branch.

## Review lanes considered
- Fresh comprehensive review (`cycle12-comprehensive-2026-04-19.md`)
- All prior cycle reviews and aggregates reviewed for carried-forward items
- Prior deferred findings reviewed for items that should re-open

## Aggregation method
- Re-verified every prior finding against the current codebase.
- All C11 active findings confirmed FIXED in prior cycle.
- Deduped overlapping findings and kept the highest severity / confidence.
- Carried forward still-valid deferred items as-is.
- New findings from this cycle are prefixed C12-AGG.

## Merged findings (active, to be addressed this cycle)

### C12-AGG-001 — MEDIUM — Controls progress bar parseFloat without NaN guard

**Cross-agent agreement:** cycle12-comprehensive
**Primary locations:**
- `src/components/Controls.tsx:46`

**Why it matters:**
The progress range input passes `parseFloat(e.target.value)` directly to `onSeek` without a NaN guard. While `seekTo` in `usePlaybackController` does guard against NaN internally, the input handler should be self-consistent — same pattern as the ExportPanel duration input fix (C11-AGG-001). In edge cases (browser extensions, programmatic value changes), `parseFloat` could return NaN.

**Suggested fix:**
```ts
const value = parseFloat(e.target.value)
if (Number.isFinite(value)) onSeek(value)
```

**Confidence:** Medium

---

### C12-AGG-002 — MEDIUM — SceneEditor percentage number inputs don't clamp typed values

**Cross-agent agreement:** cycle12-comprehensive
**Primary locations:**
- `src/components/SceneEditor.tsx:472-489`

**Why it matters:**
The `min={0} max={100}` HTML attributes only constrain the spinner UI, not typed input. A user can type `-50` or `150`, which passes the `Number.isFinite` check and produces invalid percentages like `-0.5` or `1.5`. While `normalizeScenes` later clamps these, the intermediate state shows invalid percentages in the UI and could cause visual glitches (coverage bars extending beyond bounds).

**Suggested fix:**
```ts
const nextValue = Number.parseInt(e.target.value, 10)
if (!Number.isFinite(nextValue)) return
const clamped = Math.max(0, Math.min(100, nextValue))
updateScene(scene.id, { startPercent: clamped / 100 })
```

**Confidence:** High

---

### C12-AGG-003 — LOW — ReadOnly bitrate field has meaningless min/max attributes

**Cross-agent agreement:** cycle12-comprehensive
**Primary locations:**
- `src/components/ExportPanel.tsx:331`

**Why it matters:**
The readOnly bitrate input has `min={1} max={50}` which serve no purpose and could confuse assistive technology about the field's interactivity.

**Suggested fix:**
Remove `min={1} max={50}` from the readOnly bitrate input.

**Confidence:** Medium

---

### C12-AGG-004 — LOW — ModalDialog focus restoration can target detached element

**Cross-agent agreement:** cycle12-comprehensive
**Primary locations:**
- `src/components/ModalDialog.tsx:157`

**Why it matters:**
When a modal closes, it restores focus to `previousActiveElement`. If that element was removed from the DOM while the modal was open, calling `focus()` on it could throw in edge cases.

**Suggested fix:**
```ts
if (previousActiveElement && document.body.contains(previousActiveElement)) {
  previousActiveElement.focus()
}
```

**Confidence:** Low

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

## Additional findings deferred this cycle

- C12-002 (LOW): Controls elapsed floating-point wobble — already deferred as C11-009; keeping existing deferral
- C12-005 (LOW): TimelineSelector reset button bypasses resolveRangeIndexes — exit criterion: re-open if resolveRangeIndexes adds edge-case logic
- C12-006 (LOW): ElevationProfile RTL comment clarity — already deferred as C11-007; keeping existing deferral
- C12-008 (LOW): ExportPanel file size estimate accuracy — exit criterion: re-open during next UX accuracy pass
- C12-009 (INFO): Abort signal race — verified safe, not a real issue

## Recommended implementation order for this cycle

1. **C12-AGG-001 (MEDIUM)**: Add NaN guard to Controls progress parseFloat
2. **C12-AGG-002 (MEDIUM)**: Clamp SceneEditor percentage input values
3. **C12-AGG-003 (LOW)**: Remove meaningless min/max from readOnly bitrate input
4. **C12-AGG-004 (LOW)**: Guard ModalDialog focus restoration against detached elements
