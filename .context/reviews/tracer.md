# Tracer — Causal Flow Review (2026-07-16)

## Scope

Traced ownership and timing across file import, session replacement, full/filtered tracks, timeline UI, playback, MapLibre source mutation, export synchronization, scene undo, and worker parsing. Each trace follows the actual producer → state boundary → consumer chain.

## Traces

### TR-01 — Playback progress → interpolated point → trail source

Severity: High | Confidence: High | Status: Confirmed defect

Flow:

1. usePlaybackController changes progress.
2. MapView.tsx:1061 computes a new interpolated point and segmentIndex.
3. Marker state updates at lines 1064-1067.
4. Trail state updates at lines 1069-1080 only if segmentIndex differs from the previous frame.

The point changes continuously while segmentIndex changes only at route vertices. The marker and trail therefore diverge during every vertex interval.

Fix boundary: retain precomputed completed geometry but treat the interpolated endpoint as uncached frame state.

### TR-02 — Export progress → source mutation → frame capture

Severity: High | Confidence: High | Status: Confirmed race

Flow:

1. useExportController.ts:208 asks MapView to render a frame.
2. MapView.tsx:563-578 calls marker/trail setData.
3. If camera state compares equal, MapView.tsx:581-603 resolves before installing a render listener.
4. videoEncoder.ts:158-164 sees an already-idle map and captures the canvas.

MapView.waitForIdle at lines 736-738 checks movement and tiles, not whether the just-mutated sources have painted. A stationary camera can therefore capture the preceding visual frame.

Fix boundary: make renderFrameAndWait own one complete source/camera mutation-to-paint transaction.

### TR-03 — Full-track trim proposal → pending confirmation → cancellation

Severity: Medium | Confidence: High | Status: Confirmed state divergence

Flow:

1. TimelineSelector.tsx:274-322 updates its private ratios and emits indexes.
2. page.tsx:319-327 detects scenes, stores pendingTrimRange, and leaves active track unchanged.
3. page.tsx:353-355 cancels by clearing only pendingTrimRange.
4. TimelineSelector retains proposed ratios because its key and internal state are unchanged.

The UI presents the rejected full-track selection while playback/map still use the previously accepted track.

Fix boundary: parent-owned accepted selection, or an explicit reject/revert signal.

### TR-04 — Full-track click ratio → filtered-track playback

Severity: Medium | Confidence: High | Status: Confirmed coordinate-space bug

Flow:

1. TrackWorkspace.tsx:138-146 supplies fullTrack to TimelineSelector.
2. TimelineSelector.tsx:323-329 derives clickRatio in full-track coordinates.
3. onSeek passes that number unchanged to playback for the filtered track.

The value crosses a state boundary without coordinate conversion. The visual midpoint of full-track range 25–50% becomes active progress 37.5%, not 50%.

Fix boundary: normalize at the TimelineSelector/TrackWorkspace API boundary and name values fullTrackRatio versus activeTrackProgress.

### TR-05 — File parse → component unmount → stale session replacement

Severity: Medium | Confidence: High | Status: Confirmed race

Flow:

1. FileUpload.tsx:53-61 starts parseTrackFile and retains onTrackLoaded.
2. The draw-route button at lines 263-274 remains enabled while loading.
3. page.tsx:309-317 starts a fresh journey and unmounts FileUpload.
4. The old promise resolves and still calls loadTrackIntoSession at page.tsx:297-307.

The stale import wins over the newer user action because neither operation carries a session generation or abort signal.

Fix boundary: generation-check every async completion against the active session and cancel the worker/read when invalidated.

### TR-06 — Scene delete → intervening edit → undo

Severity: Medium | Confidence: High | Status: Confirmed lost update

Flow:

1. SceneEditor.tsx:368-371 stores the entire preDeletionScenes snapshot and removes one item.
2. Another edit commits against the new current scenes.
3. Undo at lines 374-378 replaces current scenes with the old snapshot.

Undo restores the deleted item but also reverses unrelated work performed after deletion.

Fix boundary: record one inverse operation, deleted scene plus index, and apply it to the latest state.

### TR-07 — Google segments → local budgets → aggregate rejection

Severity: Medium | Confidence: High | Status: Likely memory amplification

Flow:

1. googleJsonParser.ts:74-192 creates one array per timeline/semantic segment.
2. assertPointBudget sees only each local array.
3. flattenGoogleSegments at lines 229-270 retains, sorts, deduplicates, and copies all segments.
4. Only then does the aggregate points array enforce MAX_TRACK_POINTS.

The validation boundary occurs after the costly retained representation. A rejected file can consume multiples of the intended point budget.

Fix boundary: pass one parse budget object through every segment parser and decrement it before allocation.

## Summary

7 causal defects/risks traced: 2 High and 5 Medium. The principal pattern is state expressed in one coordinate/time domain crossing into another without an explicit conversion or completion token.
