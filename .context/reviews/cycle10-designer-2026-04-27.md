# Cycle 10 Designer Review — 2026-04-27

## Review Scope
UI/UX review — information architecture, affordances, accessibility, responsive design, perceived performance.

## Findings

### C10-D-01 — LOW — Export panel swipe-to-dismiss has no visual affordance

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/ExportPanel.tsx:111-127`
- **Detail:** The export panel supports a vertical swipe-to-dismiss gesture on mobile, but there is no visual indicator (drag handle, chevron, or hint text) that this gesture is available. Users on touch devices must discover this by accident.
- **Failure scenario:** Mobile users tap the small X button instead of swiping, or attempt to scroll the panel content and accidentally dismiss it.
- **Fix:** Add a subtle drag handle indicator at the top of the modal panel when on touch devices, consistent with bottom-sheet conventions.

### C10-D-02 — LOW — File upload area has no keyboard-accessible drag-and-drop alternative

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/FileUpload.tsx:165-307`
- **Detail:** The drag-and-drop area (`onDrop`, `onDragOver`, `onDragLeave`) is purely mouse/touch-oriented. Keyboard users must use the file input button. The `role="group"` and `tabIndex={-1}` on the drop zone make it focusable but provide no keyboard action. This is acceptable because the browse button is the keyboard-accessible alternative, but the focusable drop zone could confuse screen-reader users.
- **Fix:** Either remove `tabIndex={-1}` from the drop zone or add `aria-label` indicating it is a drop zone for mouse/touch users.

## Summary

| Severity | Count |
|----------|-------|
| LOW | 2 |
