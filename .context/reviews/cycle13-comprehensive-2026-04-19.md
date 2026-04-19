# Cycle 13 Comprehensive Code Review — 2026-04-19

Full repo review against current `main` branch. Every source file examined (28 files in `src/`, plus scripts and config).

## Review methodology
- Read every file in `src/` end-to-end
- Cross-referenced against prior cycle aggregate (`_aggregate.md`) and cycle 12 review to avoid re-reporting already-fixed issues
- Checked all prior deferred findings for re-openability
- Searched systematically for: NaN guards, parseInt/parseFloat without validation, effect deps, prop-sync overwrites, a11y gaps, memory leaks, race conditions

## Prior findings verified as FIXED
All C12-AGG-001 through C12-AGG-004 confirmed fixed in current codebase:
- C12-AGG-001: Controls progress parseFloat now has `Number.isFinite` guard (Controls.tsx:46-47)
- C12-AGG-002: SceneEditor percentage inputs now clamp with `Math.max(0, Math.min(100, nextValue))` (SceneEditor.tsx:477, 489)
- C12-AGG-003: ReadOnly bitrate input no longer has `min={1} max={50}` (ExportPanel.tsx:331)
- C12-AGG-004: ModalDialog focus restoration now guards with `document.body.contains` (ModalDialog.tsx:157-159)

## New findings

### C13-001 — MEDIUM — SceneEditor blend duration parseInt without NaN guard

**File:** `src/components/SceneEditor.tsx:385`
**Code:** `onChange={e => onTransitionDurationChange(parseInt(e.target.value) / 100)}`

**Why it matters:**
The blend duration range input passes `parseInt(e.target.value) / 100` to `onTransitionDurationChange` without a NaN guard. If `parseInt` returns `NaN` (possible in edge cases with programmatic value changes or browser extensions), `NaN / 100 = NaN` propagates to `transitionDuration` state. This would make `Math.round(NaN * 100) = NaN` for the value prop, breaking the range input rendering. This is the same pattern that was fixed in Controls.tsx (C12-AGG-001) and ExportPanel.tsx (C11-AGG-001).

**Confidence:** High

**Suggested fix:**
```ts
const value = parseInt(e.target.value, 10)
if (Number.isFinite(value)) onTransitionDurationChange(value / 100)
```

---

### C13-002 — MEDIUM — ExportPanel duration prop sync can overwrite user edits

**File:** `src/components/ExportPanel.tsx:65-68`
**Code:**
```tsx
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentionally sync derived state from prop
  if (playbackDuration != null) setDuration(playbackDuration)
}, [playbackDuration])
```

**Why it matters:**
The effect syncs `playbackDuration` into the local `duration` state every time the prop changes. If the user has manually edited the duration input in the export panel and then the playback duration changes (e.g., the animation duration is adjusted via the Controls dropdown while the export panel is open), the user's edit is silently overwritten. This is a UX bug: the user sees their value replaced without warning.

**Confidence:** Medium

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

---

### C13-003 — LOW — Controls duration select parseInt without NaN guard

**File:** `src/components/Controls.tsx:112`
**Code:** `onChange={(e) => onDurationChange(parseInt(e.target.value))}`

**Why it matters:**
The duration select passes `parseInt(e.target.value)` directly to `onDurationChange` (which is `setDuration`). If `parseInt` returns `NaN`, `setDuration(NaN)` would break the duration state and cause NaN propagation in the animation loop (`increment = (dt * speedRef.current) / durationRef.current` would produce NaN, breaking playback). While extremely unlikely for a select with hardcoded numeric options, this is inconsistent with the NaN guard pattern established for the progress input (C12-AGG-001) and ExportPanel duration input (C11-AGG-001).

**Confidence:** Low (extremely unlikely for select elements, but consistency matters)

**Suggested fix:**
```ts
onChange={(e) => {
  const value = parseInt(e.target.value, 10)
  if (Number.isFinite(value)) onDurationChange(value)
}}
```

---

### C13-004 — LOW — Controls speed select parseFloat without NaN guard

**File:** `src/components/Controls.tsx:98`
**Code:** `onChange={(e) => onSpeedChange(parseFloat(e.target.value))}`

**Why it matters:**
Same pattern as C13-003. The speed select passes `parseFloat(e.target.value)` directly to `onSpeedChange` (which is `setSpeed`). If `parseFloat` returns `NaN`, `setSpeed(NaN)` would break playback. Same consistency concern.

**Confidence:** Low

**Suggested fix:**
```ts
onChange={(e) => {
  const value = parseFloat(e.target.value)
  if (Number.isFinite(value)) onSpeedChange(value)
}}
```

---

## Summary of actionable new findings

| ID | Severity | File | Description |
|----|----------|------|-------------|
| C13-001 | MEDIUM | SceneEditor.tsx:385 | Blend duration parseInt lacks NaN guard |
| C13-002 | MEDIUM | ExportPanel.tsx:65-68 | Duration prop sync overwrites user edits |
| C13-003 | LOW | Controls.tsx:112 | Duration select parseInt lacks NaN guard |
| C13-004 | LOW | Controls.tsx:98 | Speed select parseFloat lacks NaN guard |

## Deferred items reviewed (not re-opened)

All prior deferred items remain deferred per their existing exit criteria. No items met their re-open criteria this cycle.
