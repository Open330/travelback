# Cycle 5 code review — 2026-07-23

Baseline: `97f66a63b3df97bce3f349a05248ebb8fef7886e`

## Coverage and deduplication

I inventoried the tracked application, component, library, worker, script,
configuration, unit-test, E2E, fixture, workflow, public-asset, README, and
active context surfaces. I then traced the principal cross-file flows for
import/session replacement, playback/camera updates, style hydration and
retry, Journey Creator, scene/timeline edits, export/render/download/cleanup,
localization, static serving/CSP, worker parity, and supervised E2E cleanup.

The review was deduplicated against the Cycle 1–4 reports, `_aggregate.md`,
their implementation plans, and the older review ledger. In particular, I did
not reopen bounded multi-wrap renderer geometry, import/export settlement,
lexical XML scanning, throwing cleanup-accessor precedence, the real-Chromium
negative cleanup fixture, Journey-cancellation camera restoration,
Closeup/Download copy, mobile forced-click stability, or any of the three
documented supervisor portability boundaries. No supervisor claim met the
required pre-fix regression plus exact survivor/listener/profile evidence and
independent post-fix audit threshold, so none is reported.

## CR5-01 — A Follow-off export permanently overwrites the user's manual camera

- Severity: **Medium**
- Confidence: **High**
- Regions:
  - `src/components/MapView.tsx:281-282,396-453,478-489`
  - `src/components/MapView.tsx:1063-1145`
  - `src/lib/map-export-presentation.ts:13-30,40-63`
  - `src/lib/useExportController.ts:147-176,181-203,236-265,296-367`
  - `src/lib/videoEncoder.ts:231-245`
  - `src/lib/useExportController.test.ts:48-58,114-334`
  - `e2e/travelback.spec.ts:3219-3260,3342-3400`

### Evidence

`MapView.resize()` starts a temporary export-presentation transaction, but its
snapshot contains only inline width, inline height, and pixel-ratio ownership.
It does not capture the live center, zoom, pitch, or bearing. Each real export
frame then calls `renderFrameAndWait()`, which imperatively `jumpTo()`s the
shared interactive map to the encoded camera.

Cleanup calls `resetSize()` and restores progress on abort/failure, but it has
no camera handoff. When Follow is enabled, this is masked correctly:
`suspendAutoCamera` clears `lastCameraStateRef`, and the progress effect reruns
after `isExporting` becomes false and recomputes the automatic pose. When
Follow is disabled, the same effect updates the marker/trail and enters its
non-follow branch at `MapView.tsx:1141-1143`; it deliberately performs no
camera jump. The last export-frame pose therefore becomes the new manual pose.

Deterministic failure scenario:

1. Load a track, pause at a nonzero progress, disable camera tracking, and pan,
   zoom, pitch, and rotate to a recognizable manual composition.
2. Start a real export so at least one `renderFrameAndWait()` mutation occurs.
3. Cancel the export, or inject a failure after that first painted frame.
4. Cleanup restores the pre-export progress and interactive dimensions. The
   trail and marker return to the pre-export point, but the viewport stays at
   the export frame's camera and can be centered on a different part of the
   route.

The success path has the same ownership loss: progress is intentionally moved
to `1`, while closing the result panel reveals the last encoded camera rather
than the Follow-off pose the user composed before export.

The controller unit tests replace `MapView` with a handle whose
`renderFrameAndWait()` has no independent live-camera state. The cancellation
E2E uses the text export stub and checks focus, and the real-MP4 smoke leaves
Follow enabled and checks only the MP4/download/preview. None can observe this
loss.

### Root fix

Make the camera part of the export lease's presentation ownership:

1. Snapshot the live `CameraState` when export first acquires the map,
   explicitly tagged as a manual/Follow-off pose.
2. Keep export-frame camera writes owned by that lease.
3. Before releasing the lease, restore the snapshot after size/DPR restoration
   when Follow is still off. If Follow was enabled or changed during the
   transaction, invalidate the smoothing cache and let the current progress
   camera win.
4. Keep capture and restore behind one `MapView` begin/end export-presentation
   API (or extend its presentation snapshot) so success, failure, cancellation,
   replacement, and thrown cleanup all use the same ordering.

Add a deterministic regression with two independent camera variables: a
captured manual pose and a live map pose mutated by one export frame. Assert
that success, failure, and abort restore the manual pose only for Follow-off,
while Follow-on still recomputes from final/restored progress. Add a real-map
browser case that compares `__travelbackDebug.getCamera()` before and after a
cancel occurring after an actual frame mutation and also verifies the restored
marker/trail.

This is not a reopening of the Cycle 4 Journey-cancellation fix or the earlier
Retry Map handoff. Those paths tear down or rehydrate track presentation and
use the one-shot hydration camera queue. Export keeps the same live map and
uses a separate export-presentation snapshot whose schema independently omits
camera state.

## Final missed-issue sweep

The closing pass rechecked successful, failed, aborted, same-tick, replacement,
and unmount export settlement; Follow-on versus Follow-off ownership; style
replacement/retry; scene preview/commit; track/import generation races;
segmented and antimeridian geometry; XML/JSON limits and worker parity; modal
focus/inertness; responsive pointer cleanup; URL/encoder cleanup; static
base-path/CSP behavior; and supervisor evidence requirements. No second issue
was both genuinely new and supported by a concrete current-source failure.

Fresh checks passed:

- `npm run typecheck`
- `npm run lint`
- `npx vitest run src/lib/useExportController.test.ts src/lib/map-export-presentation.test.ts src/lib/camera.test.ts src/lib/map-render.test.ts` — 4 files, 62 tests
