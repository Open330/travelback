# Code Reviewer -- Cycle 7 (2026-04-21)

## Methodology

Full inventory of all 30 source files examined. Cross-file interactions analyzed. All prior fixes verified still in place.

## Prior Fix Verification

All cycle 5 and 6 fixes confirmed still applied:
- Worker buffer transfer fallback: textCopy before postMessage (parser.ts:450)
- Playback accumulator-based progress (usePlaybackController.ts:87-102)
- E2E test for map error reload button (travelback.spec.ts:334-361)
- MapView eslint-disable comment updated generically (MapView.tsx:935)

## New Findings

### C7-CR-1: TimelineSelector endDrag fires onRangeChange even when drag barely moved [LOW/MEDIUM]

**File:** src/components/TimelineSelector.tsx:206-216
**Confidence:** MEDIUM

`endDrag` always calls `onRangeChangeRef.current(startIdx, endIdx)` when `points.length > 0`, even if the user just clicked without dragging. This causes an unnecessary `handleRangeChange` callback in page.tsx, which rebuilds a filtered track, resets playback, and triggers a cascade of re-renders. When the user clicks the timeline without dragging (e.g., to focus it), this causes an unintended track reset.

**Scenario:** User clicks the timeline to give it focus. No drag occurred. `endDrag` fires, resolving the same start/end indexes, but still calls `onRangeChange`, which runs `handleRangeChange` in page.tsx, creating a new `filteredTrack` object reference. This triggers `resetPlayback` and the full re-render cascade.

**Fix:** Track whether any actual drag movement occurred (e.g., via a `dragMoved` ref similar to JourneyCreator). If `dragMoved` is false, skip the `onRangeChange` call in `endDrag`.

### C7-CR-2: ExportPanel module-level codecSupportCache never invalidated [LOW/LOW]

**File:** src/components/ExportPanel.tsx:31
**Confidence:** LOW

The `codecSupportCache` is a module-level mutable variable that persists across component mounts and even across page navigations in SPA mode. If the browser's codec support changes (e.g., after a system update or extension change), the cached values become stale. In practice this is extremely unlikely during a single session, and the cache provides a good UX benefit by avoiding re-probing on panel reopen.

**Scenario:** Browser receives an update that adds AV1 support while the page is open. The export panel still shows AV1 as unsupported because the cache was populated on first open.

**Fix:** Low priority. Could add a "refresh codec support" button in the advanced section, or invalidate the cache on visibility change. The practical impact is negligible.

### C7-CR-3: SceneEditor undoTimerRef not cleaned up on unmount [LOW/MEDIUM]

**File:** src/components/SceneEditor.tsx:276-282
**Confidence:** MEDIUM

The `undoTimerRef` cleanup only happens when `deletedScene` changes or when the effect re-runs. If the SceneEditor unmounts while the 5-second undo timer is active, the `setTimeout` callback will fire and try to call `setDeletedScene(null)` on an unmounted component. In React 18+ with concurrent mode, this is a no-op (React swallows the warning), but it represents a state-update-after-unmount pattern.

**Scenario:** User deletes a scene, then immediately closes the scene editor (or switches to a different view). The 5-second timer fires after unmount.

**Fix:** Add a cleanup in the SceneEditor's unmount that clears `undoTimerRef.current`, or use a `mountedRef` pattern.

## Convergence Assessment

The codebase remains in excellent shape. All findings this cycle are LOW severity. The TimelineSelector drag issue (C7-CR-1) is the most impactful but still minor. The code is well-structured, consistently styled, and the prior fixes are holding.
