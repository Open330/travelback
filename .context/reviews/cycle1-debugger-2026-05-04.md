# Latent Bug Review — Travelback (Cycle 1, 2026-05-04)

**Reviewer**: debugger
**Scope**: Failure modes, edge cases, crash scenarios

## Findings

### DB-01: Track change during playback preserves progress (correct behavior)
**Confidence**: Medium
**File**: `src/lib/usePlaybackController.ts:98-151`
**Description**: When track changes while playing, the effect re-runs with new track but preserves progress (0-1 normalized). Since progress is normalized, this is valid across tracks.
**Risk**: Low.

### DB-02: Export abort during waitForIdle leaves cleanup to finally block
**Confidence**: Medium
**File**: `src/lib/useExportController.ts:274-305`
**Description**: If abort fires during waitForIdle, the rejection is caught. resetSize() in finally block restores the map. Errors in cleanup are logged but swallowed (intentional).
**Risk**: Low — cleanup failures are non-fatal by design.

### DB-03: confirmTrimClear clears scenes with no undo
**Confidence**: High
**File**: `src/app/page.tsx:338-351`
**Description**: Trimming with active scenes shows a confirmation dialog. Confirming clears all scenes permanently. The SceneEditor's undo only works for individual scene deletions, not bulk clears.
**Risk**: Medium — the confirmation dialog warns about this, so UX is acceptable.

### DB-04: buildFilteredTrack removes segment boundary at trimmed start
**Confidence**: Medium
**File**: `src/app/page.tsx:40-55`
**Description**: `.filter((index) => index > 0)` removes segment boundaries that map to the start of the trimmed range. If the user trims exactly to a segment boundary, that break is lost in the filtered track.
**Risk**: Low — preserved in fullTrack, restored on trim reset.

### DB-05: Race between handleRangeChange and scene modifications
**Confidence**: High
**File**: `src/app/page.tsx:319-336`
**Description**: `handleRangeChange` checks `scenes.length > 0` to show trim confirmation. If scenes change between dialog show and confirm, the trim proceeds with old range but current scenes. The stale pendingTrimRange cleanup on line 434-438 handles the emptied-scenes case.
**Risk**: Medium — partially mitigated by the cleanup effect.

### DB-06: seekTo doesn't pause playback (intentional)
**Confidence**: Low
**File**: `src/lib/usePlaybackController.ts:83-88`
**Description**: Seeking during playback updates position but doesn't pause. This is likely desired UX (seek while playing).
**Risk**: None.

### DB-07: renderFrameAndWait 5-second timeout as safety net
**Confidence**: Medium
**File**: `src/components/MapView.tsx:650-653`
**Description**: If MapLibre never fires render event (background tab), the timeout resolves anyway. Could capture stale frame. For 30fps export, a 5s stall is a significant number of duplicate frames.
**Risk**: Low — primary render-event path is reliable.

### DB-08: mountedRef in usePlaybackController is set inside effect
**Confidence**: Medium
**File**: `src/lib/usePlaybackController.ts:101`
**Description**: `mountedRef.current = true` inside the playback effect. The ref is module-level but only one instance exists in this app.
**Risk**: Low — single-instance app.

## Summary

| Confidence | Count |
|------------|-------|
| High       | 2     |
| Medium     | 5     |
| Low        | 1     |
