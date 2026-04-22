# Multi-Perspective Critic Review — Cycle 1 (2026-04-23)

## Summary
Cross-cutting review examining overall system design, user-facing behavior, and cross-component interactions.

---

## Finding 1: Dual state management for theme causes consistency issues
- **Files**: `src/app/page.tsx`, `src/components/ThemeToggle.tsx`
- **Severity**: Medium | **Confidence**: High
- **Description**: Theme state is managed in three places: (1) bootstrap script sets DOM attributes; (2) `HomeInner` has `colorMode` state; (3) `ThemeToggle` has its own internal `mode` state. When parent controls `mode` via `controlledMode`, `ThemeToggle` still has internal `mode` state. The `matchMedia` listener also calls `onModeChange` creating confusing dual-state.
- **Fix**: Simplify by removing internal state from `ThemeToggle` when `controlledMode` is provided. Make `ThemeToggle` a fully controlled component.

---

## Finding 2: No undo/redo for scene edits beyond single-delete
- **File**: `src/components/SceneEditor.tsx`
- **Severity**: Medium | **Confidence**: High
- **Description**: Only supports undo of the most recent scene deletion (5-second timeout). No undo for: parameter changes, scene additions, preset applications, or range modifications. Users who accidentally apply a preset lose all custom scenes.
- **Fix**: Implement a basic undo/redo stack for scene operations.

---

## Finding 3: Timeline selector range change fires only on drag end
- **File**: `src/components/TimelineSelector.tsx` lines 209-220
- **Severity**: Medium | **Confidence**: High
- **Description**: `onRangeChangeRef.current` is only called in `endDrag`, not during `applyDrag`. The track data doesn't update while dragging — the visual selection changes but the actual filtered track doesn't update until release. This feels disconnected.
- **Fix**: Call `onRangeChangeRef.current` during drag (throttled via existing rAF mechanism).

---

## Finding 4: `export.at` translation key has empty string for Korean locale
- **File**: `src/lib/i18n.ts` line 443
- **Severity**: Low | **Confidence**: High
- **Description**: Korean translation for `'export.at'` is empty string `''`. This makes the output spec line render as "1920x1080 MP4  Mbps" (double space where "at" should be).
- **Fix**: Add appropriate Korean word for "at" in this context, or use a consistent symbol.

---

## Finding 5: SceneEditor doesn't validate overlap between scenes
- **File**: `src/components/SceneEditor.tsx`
- **Severity**: Medium | **Confidence**: High
- **Description**: `normalizeScenes` handles overlapping scenes by clamping, but SceneEditor only warns about `startPercent >= endPercent`, NOT about overlaps between different scenes. If user creates Scene A: 0-60% and Scene B: 50-80%, `normalizeScenes` silently adjusts Scene B to 60-80%, but the user isn't told.
- **Fix**: Add overlap detection to the `commitScenes` validation step.

---

## Finding 6: SceneEditor overlap warning labels exist but are never triggered
- **File**: `src/lib/i18n.ts` — keys `scenes.overlap` and `scenes.overlapSuffix`
- **Severity**: Low | **Confidence**: High
- **Description**: Translation keys `scenes.overlap` ("and") and `scenes.overlapSuffix` ("overlap") exist in all locales but are never used in the code. The overlap detection that would use these keys is missing from the SceneEditor.
- **Fix**: Implement the overlap detection that uses these keys.

---

## Finding 7: ExportPanel shows incorrect frame count display
- **File**: `src/components/ExportPanel.tsx` line 260
- **Severity**: Low | **Confidence**: Medium
- **Description**: Frame count display uses `Math.round(exportProgress * Math.ceil(duration * fps))` but `exportProgress` is `frame / (totalFrames - 1)`, causing slight inaccuracy in the displayed frame number.
- **Fix**: Use actual frame count from export controller.

---

## Final Sweep
- Cross-cutting concerns between components reviewed.
- State management patterns checked for consistency.
- i18n completeness verified for all 5 locales.
