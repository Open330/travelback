# Cycle 5 architecture review — 2026-07-23

Baseline: `97f66a63b3df97bce3f349a05248ebb8fef7886e`

## Architecture coverage

I reviewed component ownership, root/session orchestration, imperative MapLibre
boundaries, playback and export controllers, parser/worker parity, local
rendering/static-export boundaries, test seams, and the active architecture and
plan records. I compared the result with every Cycle 1–4 root and the older
review ledger before reporting it.

## ARCH5-01 — The export presentation lease owns map geometry but not camera state

- Severity: **Medium**
- Confidence: **High**
- Deduplication: **Same root as CR5-01; not an additional finding**
- Regions:
  - `src/lib/map-export-presentation.ts:13-30,40-63`
  - `src/components/MapView.tsx:281-282,396-453,478-489,1063-1145`
  - `src/lib/useExportController.ts:147-203,236-265,317-367`
  - `.context/project/02-architecture.md:55-75,81-83`

The export path is intentionally an exclusive imperative owner: React camera,
trail, and marker updates stop while `isExporting` is true, and
`renderFrameAndWait()` mutates the shared live map for each encoded frame. The
cleanup transaction nevertheless snapshots and restores only width, height,
and DPR ownership. The camera is presentation state too, but it remains
outside the lease.

That omission creates two asymmetric exit policies:

- Automatic/Follow-on state happens to recover because `MapView` invalidates
  its smoothing cache and recomputes a camera when export ownership ends.
- Manual/Follow-off state has no declarative target to recompute. The export
  owner's last `jumpTo()` silently becomes the user's new interactive camera.

On abort or failure after a painted frame, progress, marker, and trail return
to the pre-export point while the viewport remains at the export frame. On
success, the route advances to the end but the user's deliberately composed
manual viewport is still discarded. This violates the existing ownership
policy used elsewhere in the system: when Follow is off, temporary Retry and
provisional Journey operations preserve a manual center/zoom/pitch/bearing
rather than substituting an automatic camera.

The durable boundary is an explicit map-presentation lease:

```text
acquire export lease
  -> capture dimensions + DPR mode + manual camera ownership/pose
  -> resize and render owned frames
  -> restore dimensions + DPR
  -> resolve camera owner
       Follow off and same session -> replay captured manual pose
       Follow on/current scene     -> recompute current progress pose
  -> release export lease
```

The capture should be generation/session scoped, and restore should occur
before the lease is released so track replacement cannot receive a stale pose.
One `MapView` begin/end API should own ordering; adding a stray `jumpTo()` in
the controller would leave failure, replacement, and teardown variants
divergent.

Regression coverage should model the real separation between cached desired
state and the actual MapLibre camera. Exercise success, injected post-frame
failure, and abort after one painted frame for both Follow modes. A browser
case should compare the Follow-off debug camera before/after cancellation and
verify that the restored marker/trail still match restored progress.

This is distinct from the excluded Journey-cancellation and Retry Map roots:
those are hydration/generation handoffs. The current defect lives in the
separate export-presentation lease on an unchanged map instance.

## Final architecture sweep

I rechecked ownership at import/export replacement, map-style generation,
scene preview/commit, playback/seek, blob/encoder lifetime, localization,
static serving/CSP, and process supervision. I found no second new
architecture failure with a concrete current-source scenario. The three
portable-supervisor limits remain explicit boundaries and were not reopened.

Fresh typecheck, lint, and the 62 focused camera/export/render unit tests all
passed; those tests do not model a Follow-off live camera across the export
lease.
