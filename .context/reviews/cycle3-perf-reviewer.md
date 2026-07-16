# Cycle 3 — Performance Reviewer

Reviewed current HEAD `3b6750f` on 2026-07-16. The pass covered playback/render loops, map source publication, geometry and distance derivation, component rerender paths, global listeners, rAF/timer use, parser/worker budgets, export staging/memory/finalization, style loading, and performance-oriented unit/E2E coverage. Known `preserveDrawingBuffer` hardware measurement work remains `CARRY-04` and is not counted again.

## Findings

### C3-PR-01 — Idle pointer movement schedules timeline rAF work globally

- Severity: **Low**
- Confidence: **High**
- Evidence: `src/components/TimelineSelector.tsx:291-347`, `src/components/TimelineSelector.tsx:413-435`
- `TimelineSelector` installs `mousemove` and `touchmove` listeners on `window` for the component's entire mounted lifetime. `applyDrag()` always stores the coordinate, cancels any prior frame, and schedules a new rAF; only inside that rAF does `applyDragNow()` discover that no drag is active.
- Failure scenario: after a track loads, ordinary mouse movement anywhere in the application creates one cancel/schedule/callback cycle per input burst (up to a frame), even when the timeline has never been touched. This competes with MapLibre/playback work on the main thread and is especially wasteful during high-frequency pointer motion.
- Required fix: return before touching the rAF when `dragState.current.dragging` is null, or attach transient move/end listeners only while a captured pointer owns an active drag. Add a unit test proving idle global movement schedules no frame.

### C3-PR-02 — Playback rerenders reinstall the global hotkey listener

- Severity: **Low**
- Confidence: **High**
- Evidence: `src/app/page.tsx:230-244`, `src/lib/usePlaybackController.ts:177-251`
- `HomeInner` passes three new inline callbacks into `usePlaybackHotkeys` on every render. The hook effect depends on those callback identities, so every playback progress update tears down and re-adds the same window `keydown` listener.
- Failure scenario: normal 60 fps playback performs listener cleanup/setup and allocates new handler closures every frame in addition to map rendering. JavaScript dispatch remains correct because cleanup/setup is synchronous, but the work is pure churn on the hottest UI path.
- Required fix: memoize the toggle/close callbacks in `page.tsx`, or install one stable listener whose callback refs are updated separately. A focused hook test can assert add/remove counts stay constant across progress-only rerenders.

## Positive controls

The completed-trail geometry path is chunk-bounded, cumulative distances and normalized scenes are memoized/precomputed, export UI progress is throttled, frame staging is reused, parsing has size/point budgets, and generated map styles do not initiate remote tile traffic. No additional high- or medium-severity performance defect was confirmed in the final sweep.
