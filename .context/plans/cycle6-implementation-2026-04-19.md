# Cycle 6 Implementation Plan

**Date:** 2026-04-19
**Source review:** `comprehensive-deep-code-review-2026-04-19-cycle6.md`

## Finding: NEW-C6-1 — Redundant `!isExporting` check in E key handler

- **Severity:** INFO
- **Confidence:** HIGH
- **File:** `src/lib/usePlaybackController.ts:175-179`
- **Status:** DONE

### Problem

After the C8-1 fix added `if (isExporting) return` at line 153, the E key handler at line 175-179 still has its own `!isExporting` guard, which is now dead code:

```typescript
case 'e':
case 'E':
  if (track && !isExporting) {   // <-- !isExporting is always true here
    onToggleExport()
  }
  break
```

### Plan

1. Remove the `!isExporting` condition from the E key handler
2. Simplify to `if (track) { onToggleExport() }`
3. Keep `isExporting` in the `PlaybackHotkeysOptions` interface since it is used by the early-return
4. Verify typecheck passes

### Exit criteria

- E key handler no longer contains redundant `!isExporting` check
- `tsc --noEmit` passes
- Behavior unchanged (E key still suppressed during export via early-return)

### Implementation

- Removed `!isExporting` from E key handler condition
- Simplified to `if (track) { onToggleExport() }`
- `tsc --noEmit` passes clean

---

## Finding: NEW-C6-4 — TrackToolbar mobile menu uses incorrect ARIA roles

- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/components/TrackToolbar.tsx:138-141`
- **Status:** DONE

### Problem

The mobile overflow menu uses `role="listbox"` on the container and `role="option"` on the buttons inside it. A listbox is for selectable items with tracked selection state, not for action buttons. The correct pattern is `role="menu"` with `role="menuitem"`, or simply removing the explicit roles since the buttons are semantically sufficient.

### Plan

1. Change `role="listbox"` to `role="menu"` on the container div (line 138)
2. Change `role="option"` to `role="menuitem"` on each button inside (lines 149, 159, 169)
3. Verify the menu still functions correctly
4. Verify typecheck passes

### Exit criteria

- Mobile menu uses `role="menu"` and `role="menuitem"` ARIA roles
- Screen reader users hear "menu" instead of "listbox"
- `tsc --noEmit` passes
- Menu interaction behavior unchanged

### Implementation

- Changed `role="listbox"` to `role="menu"` on the container
- Changed all three `role="option"` to `role="menuitem"` on action buttons
- `tsc --noEmit` passes clean

---

## Deferred Findings Update

All previously deferred findings remain unchanged. No new deferred items from this cycle.
