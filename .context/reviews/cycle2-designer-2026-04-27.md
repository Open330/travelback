# Designer (UI/UX) — Cycle 2 (2026-04-27)

## Re-evaluation of carried findings

| Prior | Status | Notes |
|-------|--------|-------|
| N08 (Scene editor static aria bounds) | UNCHANGED | SceneEditor range sliders still have static `aria-valuemin`/`aria-valuemax`. TimelineSelector now has dynamic bounds (aria-valuemax on start handle, aria-valuemin on end handle) — this pattern could be replicated. |
| N13 (mesh vs reduced-motion) | UNCHANGED | Animated mesh background in layout.tsx doesn't respect `prefers-reduced-motion`. |
| N17 (mobile dialog semantics) | UNCHANGED | TrackToolbar mobile "more controls" panel still marked as dialog but not truly modal. |
| N23 (RTL unreadiness) | UNCHANGED | Locale handler never sets `dir` attribute. No logical CSS properties migration. |

## New findings

### D2-01 — Export panel swipe-to-dismiss gesture conflicts with scroll on small viewports

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/ExportPanel.tsx:110-124`
- **Detail:** The swipe-to-dismiss gesture (dy > 80px) could conflict with vertical scrolling when the panel content exceeds the viewport height (`max-h-[min(90vh,42rem)] overflow-y-auto`). If a user scrolls down past the 80px threshold, the panel could accidentally close. The `data-export-swipe-handle` attribute limits the swipe area to the header, but the handle detection only checks the touch start target, not the touch end target.
- **Impact:** Low — the handle is limited to the header area. But a fast diagonal swipe starting on the header could trigger dismissal while the user intended to scroll.

### D2-02 — TimelineSelector hint dismiss state is stored in localStorage without user awareness

- **Severity:** INFO
- **Confidence:** High
- **Files:** `src/components/TimelineSelector.tsx:8-9,107-115`
- **Detail:** The drag hint is shown on first appearance and dismissed on interaction. The dismissed state is stored in `localStorage` under key `travelback-timeline-hint-dismissed`. There's no UI to reset this state. If a user wants to see the hint again (e.g., after a long break), they must clear localStorage.
- **Impact:** Minor — hints are typically shown once by design. No accessibility issue.

## Summary

- Carried forward: 4 findings (all unchanged)
- New findings: 2 (1 LOW, 1 INFO)
