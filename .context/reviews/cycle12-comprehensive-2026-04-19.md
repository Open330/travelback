# Cycle 12 Comprehensive Code Review — 2026-04-19

Full repo review against current `main` branch. Every source file examined.

## Review methodology
- Read every file in `src/` (28 files total)
- Cross-referenced against prior cycle aggregate (`_aggregate.md`) to avoid re-reporting already-fixed issues
- Checked all prior deferred findings for re-openability
- Searched for common issue patterns: NaN guards, parseInt/parseFloat without validation, effect deps, memory leaks, a11y gaps, security concerns

## Prior findings verified as FIXED
All C11-AGG-001 through C11-AGG-006 confirmed fixed in current codebase:
- C11-AGG-001: ExportPanel duration now uses EXPORT_LIMITS constants and handles NaN from empty input (ExportPanel.tsx:274-278)
- C11-AGG-002: Abort check added after renderFrame in videoEncoder.ts:112-114
- C11-AGG-003: Fallback download message correctly differentiates (ExportPanel.tsx:208)
- C11-AGG-004: Home/End key handlers added to SceneRangeEditor (SceneEditor.tsx:203-221)
- C11-AGG-005: Toast always renders container with role="log" (Toast.tsx:63-68)
- C11-AGG-006: resolveRangeIndexes wrapped in useMemo (TimelineSelector.tsx:243)

## New findings

### C12-001 — MEDIUM — Controls progress bar parseFloat without NaN guard

**File:** `src/components/Controls.tsx:46`
**Code:** `onSeek(parseFloat(e.target.value))`

**Why it matters:**
The progress range input passes `parseFloat(e.target.value)` directly to `onSeek`, which is `seekTo` from `usePlaybackController`. While `seekTo` does have a NaN guard (`const safe = Number.isFinite(nextProgress) ? nextProgress : 0`), this is a defensive depth issue — any future caller of `onSeek` without the guard would get NaN. The pattern in ExportPanel was just fixed for the same reason (C11-AGG-001). More importantly, in edge cases where the browser emits unusual input events (programmatically set values, browser extensions, etc.), `parseFloat` could return NaN.

**Confidence:** Medium (seekTo already guards, but the input handler should be self-consistent)

**Suggested fix:** Add `Number.isFinite` guard before calling `onSeek`, same pattern as the ExportPanel duration input fix:
```ts
const value = parseFloat(e.target.value)
if (Number.isFinite(value)) onSeek(value)
```

---

### C12-002 — MEDIUM — Controls elapsed time can show floating-point wobble during playback

**File:** `src/components/Controls.tsx:43`
**Code:** `const elapsed = duration * progress`

**Why it matters:**
During playback, `progress` is a floating-point number updated every animation frame. `duration * progress` can produce values like `29.999999999999996` instead of `30`. When passed to `formatDuration`, this gets `Math.floor`ed, so the display is usually correct — but the `elapsed` value itself is used nowhere else currently. However, if it were ever used for display comparisons or calculations, the floating-point imprecision would cause visible wobble (e.g., "0:30" flickering to "0:29" near the end). This is a latent risk.

**Confidence:** Low (current code floors it in formatDuration so display is stable)

**Suggested fix:** Round elapsed to a reasonable precision: `const elapsed = Math.round(duration * progress * 1000) / 1000` or simply note that formatDuration handles it.

---

### C12-003 — MEDIUM — ExportPanel bitrate input is readOnly but has min/max that suggest editability

**File:** `src/components/ExportPanel.tsx:331`
**Code:** `<input type="number" min={1} max={50} value={bitrate} className="vitro-input min-h-11 w-full px-3 py-2 text-sm opacity-60 cursor-not-allowed" readOnly aria-disabled="true" />`

**Why it matters:**
The input has `min={1} max={50}` attributes which are meaningless for a readOnly field. More importantly, `aria-disabled="true"` is applied but the native `disabled` attribute is not used (intentionally, to allow focus for a11y). This is correct per ARIA patterns. However, the `readOnly` attribute without `disabled` means the field IS focusable and CAN receive keyboard input (even though it won't change the value) — some screen readers may announce this as editable. The `aria-disabled="true"` should be sufficient for most AT, but the mixed signals between `readOnly` and `aria-disabled` could confuse some assistive technologies.

**Confidence:** Low (cosmetic/a11y edge case)

**Suggested fix:** Remove the `min`/`max` attributes from the readOnly bitrate field since they serve no purpose. Consider using `tabIndex={-1}` to remove from tab order since the field provides no interactive value.

---

### C12-004 — MEDIUM — SceneEditor percentage number inputs don't clamp to valid range

**File:** `src/components/SceneEditor.tsx:472-489`
**Code:**
```tsx
<input type="number" min={0} max={100} step={1}
  value={Math.round(scene.startPercent * 100)}
  onChange={e => {
    const nextValue = Number.parseInt(e.target.value, 10)
    if (!Number.isFinite(nextValue)) return
    updateScene(scene.id, { startPercent: nextValue / 100 })
  }}
```

**Why it matters:**
The `min={0} max={100}` HTML attributes only constrain the spinner UI, not typed input. A user can type `-50` or `150`, and `nextValue` will be `-50` or `150`, which passes the `Number.isFinite` check and gets divided by 100 to produce `-0.5` or `1.5`. While `normalizeScenes` later clamps via `clampUnit`, the intermediate state shows invalid percentages in the UI and could cause visual glitches (scene range bars extending beyond 0-100%). The same issue exists for the end percent input.

**Confidence:** High

**Suggested fix:** Clamp the parsed value before calling updateScene:
```ts
const nextValue = Number.parseInt(e.target.value, 10)
if (!Number.isFinite(nextValue)) return
const clamped = Math.max(0, Math.min(100, nextValue))
updateScene(scene.id, { startPercent: clamped / 100 })
```

---

### C12-005 — LOW — TimelineSelector reset button calls onRangeChange with hardcoded indices

**File:** `src/components/TimelineSelector.tsx:456-459`
**Code:**
```tsx
onClick={() => {
  setStartRatio(0)
  setEndRatio(1)
  if (points.length > 0) onRangeChange(0, points.length - 1)
}}
```

**Why it matters:**
The reset button calls `onRangeChange(0, points.length - 1)` directly, bypassing the `resolveRangeIndexes` function. This is correct for the simple case (ratio 0 and 1 always map to indices 0 and points.length-1). However, if `resolveRangeIndexes` ever adds special handling for edge cases (e.g., when cumulativeDistances has a zero total distance), this direct call would bypass that logic. Currently safe but fragile.

**Confidence:** Low (currently correct, just fragile coupling)

**Suggested fix:** Consider using `resolveRangeIndexes()` after setting ratios, or document the invariant that 0/1 ratios always map to 0/lastIndex.

---

### C12-006 — LOW — ElevationProfile click handler doesn't account for RTL layout

**File:** `src/components/ElevationProfile.tsx:65-66`
**Code:** `const clickFraction = (e.clientX - rect.left) / rect.width`

**Why it matters:**
In an RTL layout, the SVG's visual left-to-right rendering matches LTR (SVG coordinates don't flip), but the click position calculation using `clientX - rect.left` would still be correct since the SVG's coordinate system is always LTR. However, the comment says "No binary search conversion is needed" which is correct but doesn't mention RTL. This is a documentation/correctness concern only — the actual behavior is correct even in RTL since SVG viewBox coordinates are independent of document direction.

**Confidence:** Low (behavior is correct, comment could be clearer)

**Suggested fix:** No code change needed. Could add a comment clarifying that SVG coordinates are always LTR regardless of document direction.

---

### C12-007 — LOW — ModalDialog previousActiveElement.focus() can throw if element was removed

**File:** `src/components/ModalDialog.tsx:157`
**Code:** `previousActiveElement?.focus?.()`

**Why it matters:**
When a modal closes, it tries to restore focus to `previousActiveElement`. If that element was removed from the DOM while the modal was open (e.g., a button that triggered a conditional render), calling `focus()` on a detached element silently fails in most browsers but could throw in edge cases. The optional chaining `?.` protects against `null` but not against calling `focus()` on a detached element.

**Confidence:** Low (most browsers silently ignore focus on detached elements)

**Suggested fix:** Wrap in try/catch or check `document.body.contains(previousActiveElement)` before focusing:
```ts
if (previousActiveElement && document.body.contains(previousActiveElement)) {
  previousActiveElement.focus()
}
```

---

### C12-008 — LOW — ExportPanel estimated file size doesn't account for codec efficiency

**File:** `src/components/ExportPanel.tsx:341`
**Code:** `~{((bitrate * duration) / 8).toFixed(0)} MB`

**Why it matters:**
The estimated file size calculation `bitrate * duration / 8` assumes constant bitrate equal to the configured value. This is a rough estimate and will be significantly off for:
- Short videos (container overhead)
- AV1 codec (much more efficient at same bitrate)
- Complex scenes vs static content

The estimate could be misleading but is labeled with "~" prefix, so users should understand it's approximate.

**Confidence:** Low (cosmetic/UX accuracy)

**Suggested fix:** No urgent fix needed. Consider adding a disclaimer or adjusting for codec efficiency in a future UX pass.

---

### C12-009 — MEDIUM — useExportController abort signal race: cancelExport can abort a new export

**File:** `src/lib/useExportController.ts:80-82`
**Code:**
```ts
const cancelExport = useCallback(() => {
  exportAbortRef.current?.abort()
}, [])
```

**Why it matters:**
`cancelExport` aborts whatever controller is currently in `exportAbortRef.current`. There's a subtle race: if the user starts export A, then quickly cancels and starts export B, the abort from canceling A could theoretically affect B if the ref hasn't been updated yet. Looking at the actual flow in `exportTrack`, the abort controller is created at the start (`const abortController = new AbortController(); exportAbortRef.current = abortController`), so if a new export starts, it immediately replaces the ref. The old abort signal would only affect the old export. This is actually safe because:
1. `cancelExport` calls `.abort()` on whatever was in the ref at that moment
2. A new export immediately replaces the ref

However, there's no guard against double-abort: if the user clicks cancel twice quickly, the second call is a no-op (aborting an already-aborted signal is safe per spec). This is fine.

After deeper analysis, this finding is actually safe. The ref is replaced synchronously at the start of `exportTrack`, so the race window doesn't exist.

**Confidence:** Re-analyzed — NOT a real issue. Downgrading to informational.

---

## Summary of actionable new findings

| ID | Severity | File | Description |
|----|----------|------|-------------|
| C12-001 | MEDIUM | Controls.tsx:46 | parseFloat in progress handler lacks NaN guard |
| C12-004 | MEDIUM | SceneEditor.tsx:472-489 | Percentage inputs don't clamp typed values |
| C12-002 | LOW | Controls.tsx:43 | Elapsed floating-point wobble (latent) |
| C12-003 | LOW | ExportPanel.tsx:331 | ReadOnly bitrate field has meaningless min/max |
| C12-005 | LOW | TimelineSelector.tsx:456-459 | Reset button bypasses resolveRangeIndexes |
| C12-006 | LOW | ElevationProfile.tsx:65 | RTL comment clarity (behavior correct) |
| C12-007 | LOW | ModalDialog.tsx:157 | Focus restoration on detached element |
| C12-008 | LOW | ExportPanel.tsx:341 | File size estimate doesn't account for codec |
| C12-009 | INFO | useExportController.ts:80 | Abort signal race — verified safe on re-analysis |
