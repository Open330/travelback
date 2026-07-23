# Cycle 6 code review — 2026-07-24

Baseline: `099e85d8860456dea5e59cfa293a12defb27bd99`

## Coverage and deduplication

I inventoried all 67 tracked `src/` paths: 40 production modules/styles, the
app favicon, and all 26 Vitest suites. I also reviewed all 12 scripts, the
118-case Playwright catalog and its 19 route fixtures, both E2E support files,
all 19 public assets (including the generated worker and five map styles),
root configuration, the Pages workflow, README, and the active project and
review records. Cross-file traces covered import and replacement, playback,
MapLibre style/camera ownership, scene authoring and preview, timeline
trimming, export settlement and download, Journey Creator, localization,
static serving/CSP, worker generation, and supervised-process containment.

The findings below were checked against the Cycle 1–5 aggregate and plans,
the older review ledger, and the three explicit platform-capability
residuals. In particular, neither finding reopens the April 25 preview bug
where the parent ignored an emitted `null` clear signal: the current parent
does restore on `null`. The current defect is that two terminal paths fail to
emit that signal. The semantic no-op finding is in SceneEditor and was
introduced by its gesture transaction; it is not the completed Timeline
no-op fix.

## CR6-01 — Scene-camera preview ownership can end without restoring the live camera

- Severity: **Medium**
- Confidence: **High**
- Status: **Confirmed from current source; browser reproduction pending**
- Regions:
  - `src/components/SceneEditor.tsx:436-611,613-650`
  - `src/lib/usePlaybackController.ts:219-235`
  - `src/app/page.tsx:259-268,511-551`
  - `src/components/SceneEditor.test.ts:241-311`
  - `src/lib/usePlaybackController.test.ts:190-205`
  - `e2e/travelback.spec.ts:2175-2225,2713-2785`

`schedulePreview()` imperatively publishes a scene camera at the scene
midpoint. Returning to the committed camera depends on a later
`endPreview(true)`, while `endPreview(false)` assumes a scene commit will
synchronously apply the current-progress camera.

That assumption fails on two current paths:

1. During a pointer gesture, move a parameter away from its origin and back
   to the exact original notch, then release. A preview has already been
   applied, but `settlePointer('commit')` calls `onPreviewEnd(false)` and
   skips `onCommit` because `latestValue === originValue`. No committed-camera
   application and no `null` clear follows. The scene value is unchanged,
   while the map remains at the preview scene's midpoint.
2. A range input intentionally participates in the global Escape-to-close
   behavior. If an Arrow key is held long enough for its preview frame to
   publish and Escape closes the nonmodal Camera panel before that key's
   keyup/blur cleanup, unmount only cancels a still-pending animation frame.
   It does not clear an already-applied preview. Removing the focused input
   cannot be relied on to dispatch the omitted blur.

This is especially visible while playback is paused or Follow is off: no
subsequent progress camera update repairs the stale pose. The parent
`handlePreviewScene(null)` implementation is correct, so this is not the
historical ignored-clear root.

### Root fix

Give preview mutation an explicit lifecycle rather than inferring it from
individual DOM events:

- track whether a preview frame actually published;
- on net-zero pointer settlement, restore the committed camera instead of
  taking the commit handoff;
- on editor unmount or global close, cancel pending work and clear an
  already-published preview exactly once;
- on a real commit, apply the committed snapshot/current-progress camera
  before releasing preview ownership;
- do not unconditionally reset camera on an editor close that never
  published a preview, because that would overwrite a legitimate manual
  camera.

Add component regressions for move-away/move-back/pointerup and
preview-then-unmount, plus a dev-map case at non-midpoint progress that holds
an Arrow key, closes with Escape, and compares the live camera with the
committed current-progress pose.

## CR6-02 — A net-zero scene-range drag revokes a completed export

- Severity: **Medium**
- Confidence: **High**
- Status: **Confirmed from current source; browser reproduction pending**
- Regions:
  - `src/components/SceneEditor.tsx:202-267,269-326,652-704,759-783`
  - `src/app/page.tsx:502-509`
  - `src/lib/useExportController.ts:113-126`
  - `src/components/SceneEditor.test.ts:313-365`
  - `e2e/travelback.spec.ts:3648-3696`

`SceneRangeEditor` records every pointer move in `lastDragValuesRef`. On
pointerup it commits whenever that ref is non-null, even when the final range
exactly equals `originStart`/`originEnd`. `updateScene()` then constructs and
publishes a new but semantically identical scene array. The page treats every
publication as a real edit and calls `resetExportSession()`, which clears and
revokes the completed video.

Concrete failure:

1. Complete an export and close its result dialog.
2. Open Camera, customize a scene, and drag a range boundary away from its
   starting point.
3. Drag it exactly back to the starting point and release.
4. No scene percentage changed, but reopening Export no longer shows the
   completed video; the prior result was invalidated by the net-zero gesture.

The existing scene-range test proves one changed drag commits once. The
existing no-op export-preservation E2E covers Timeline handles only. Neither
tests an unchanged SceneEditor transaction. Cycle 1's deferred direct
scene/export boundary coverage mentioned risk but did not record this current
concrete failure.

### Root fix

Settle the gesture against its origin before publishing: if both final
percentages are unchanged, restore local draft state and do not call
`onCommit`. Also add a semantic-equality guard at the scene/session boundary
so future no-op editor events cannot revoke export ownership merely because
an array/object identity changed.

Add a component case for away/back/release with zero `onChange` and
`onScenesCommitted` calls, and an E2E case that creates a completed result,
performs the net-zero scene drag, and verifies the same result remains
available.

## Final missed-issue sweep

The closing pass rechecked success, failure, abort, no-op, replacement,
unmount, focus-loss, and generation changes across the major flows. No third
new actionable causal root survived deduplication. The three documented
platform-capability boundaries were not reopened.

Fresh browser-free evidence:

- `npx vitest run src/components/SceneEditor.test.ts src/lib/usePlaybackController.test.ts --reporter=dot`
  — 2 files / 30 tests passed.
- No E2E, server, supervisor, Playwright, Chromium, or browser-capable command
  ran in this workstream.
