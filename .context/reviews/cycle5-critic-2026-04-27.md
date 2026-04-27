# Critic — Cycle 5 (2026-04-27)

Repository: `/Users/hletrd/flash-shared/Travelback`
Reviewer: critic

## Findings

### C5-01 — Export "done" state persists stale video blob across track changes
- **Severity:** MEDIUM-HIGH
- **Confidence:** High
- **File:** `src/lib/useExportController.ts:56-57, 91-96`, `src/app/page.tsx:258-264`
- **Description:** When a user exports a video and then loads a new track, `resetTrackWorkspace()` calls `resetExportSession()` which clears the export state. However, the `useEffect` cleanup that revokes the blob URL only fires on unmount, not when `resetExportSession` is called. The revoked URL is correctly cleaned up, but the export state machine transitions through `idle -> exporting -> done` for each track. If `resetExportSession` is called while `exportState === 'done'`, the UI still briefly shows the "done" state before resetting. More importantly, if the user starts a new export for a different track and it fails, `setExportState(hadExistingExport ? 'done' : 'idle')` at line 222 uses `hadExistingExport` captured at the START of the export. If the previous export was for track A and the current one is for track B, `hadExistingExport` is `true`, so a failed export of track B shows the "done" state with track A's video still visible.
- **Failure scenario:** User exports track A successfully. Loads track B. Starts exporting track B. Track B export fails. The UI shows "done" state with track A's video preview, suggesting track B's export succeeded when it didn't.
- **Suggested fix:** Clear `exportedVideoUrl`, `exportedVideoBlob`, and `exportedVideoFilename` at the start of each new export attempt (before setting `isExporting`). Or compute `hadExistingExport` based on whether the current (not previous) export produced a video.

---

### C5-02 — Timeline range trim silently fails when resulting slice has <2 points
- **Severity:** MEDIUM
- **Confidence:** High
- **File:** `src/app/page.tsx:288-321`
- **Description:** `handleRangeChange` has an early return if `slicedPoints.length < 2`. However, the `TimelineSelector` doesn't prevent the user from dragging the handles to a range that would result in <2 points. The user drags the handle, sees the UI update, but nothing happens — the range appears to reset silently. There's no feedback explaining why the trim didn't apply.
- **Failure scenario:** User on a sparse track drags the end handle very close to the start handle. The drag appears to work in the timeline UI, but the actual track and map don't update. User is confused about why the trim didn't take effect.
- **Suggested fix:** Either prevent the TimelineSelector from selecting ranges that would result in <2 points (enforce a minimum range), or show a brief toast message explaining why the trim was rejected.

---

### C5-03 — Scene editor normalization warnings can show stale/incorrect messages
- **Severity:** MEDIUM
- **Confidence:** High
- **File:** `src/components/SceneEditor.tsx:266-285`
- **Description:** `commitScenes` computes normalization warnings by comparing raw input scenes to the normalized output. However, the warning for `"${s.name} has start >= end"` is checked on the raw scenes, but `normalizeScenes()` already fixes this by clamping. If the user sets start=50% and end=50%, the warning says "has start >= end" but the scene is silently removed by `normalizeScenes` (because `endPercent > startPercent` filter at line 43). The user sees a warning about a scene that no longer exists in the list.
- **Failure scenario:** User creates a scene with equal start and end. A warning appears about a scene they can no longer see or edit. The scene was silently deleted.
- **Suggested fix:** Show the warning BEFORE normalizing, and present it as "Scene X was removed because start >= end" rather than just "has start >= end". Or, prevent the UI from allowing start >= end in the first place.

---

### C5-04 — `formatDistance` and `formatElevation` called on every render in Controls and TrackWorkspace
- **Severity:** LOW-MEDIUM
- **Confidence:** Medium
- **File:** `src/components/Controls.tsx:42-43, 151-153`, `src/lib/interpolate.ts:190-205`
- **Description:** Every render of the Controls component calls `formatDistance(traveled, units)`, `formatDistance(total, units)`, `formatDuration(elapsed)`, and `formatDuration(duration)`. During playback, Controls re-renders on every progress change (via the `progress` prop). While the formatting functions themselves are lightweight, they're called on every frame of playback. The `progress` value changes at ~60fps, causing 4 format calls * 60fps = 240 format calls/second. The formatted strings rarely change between frames (distance only changes when the numeric value crosses a rounding boundary).
- **Failure scenario:** Not a critical performance issue, but contributes to unnecessary per-frame GC pressure from string allocations on mobile devices during long playback sessions.
- **Suggested fix:** Memoize the formatted strings with a debounce threshold — only reformat when the numeric value changes enough to produce a different formatted string.

---

### C5-05 — HomeInner component is 590+ lines with deeply nested state logic
- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **File:** `src/app/page.tsx:61-594`
- **Description:** `HomeInner` manages 15+ `useState` hooks, 20+ `useCallback` handlers, and multiple `useEffect` hooks. It serves as the central orchestrator for the entire application state. While the individual pieces are well-implemented, the component's size and coupling make it fragile to modify. Any new feature must thread state through this single component.
- **Failure scenario:** A developer adding a new feature (e.g., annotation layers) must touch HomeInner, increasing the risk of accidentally breaking existing state transitions or forgetting to reset state in one of the many `reset*` callbacks.
- **Suggested fix:** Extract state machines into dedicated hooks: `useTrackSession`, `useThemeState`, `usePanelState`. This is a continuation of F08 from the cycle2 aggregate and remains a valid architectural concern.

---

## Summary

| ID | Severity | Confidence | File |
|----|----------|------------|------|
| C5-01 | MEDIUM-HIGH | High | useExportController.ts |
| C5-02 | MEDIUM | High | page.tsx / TimelineSelector.tsx |
| C5-03 | MEDIUM | High | SceneEditor.tsx |
| C5-04 | LOW-MEDIUM | Medium | Controls.tsx |
| C5-05 | LOW-MEDIUM | High | page.tsx |
