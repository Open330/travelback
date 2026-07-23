# Cycle 5 critic review — 2026-07-23

Baseline: `97f66a63b3df97bce3f349a05248ebb8fef7886e`

## Critical challenge

I challenged the current success claims at their negative branches rather than
recounting completed Cycle 1–4 work: success versus failure/cancel, automatic
versus manual camera ownership, ordinary versus replacement sessions, dev
versus static execution, and fixture evidence versus real browser behavior.

## CT5-01 — “Cleanup restored the map” is true only for its box, not a Follow-off view

- Severity: **Medium**
- Confidence: **High**
- Deduplication: **Same root as CR5-01 / ARCH5-01; not an additional finding**
- Regions:
  - `.context/project/02-architecture.md:68-75,81-83`
  - `src/components/MapView.tsx:426-453,478-489,1063-1145`
  - `src/lib/map-export-presentation.ts:13-17,19-30,52-63`
  - `src/lib/useExportController.ts:176-203,236-265,296-367`
  - `e2e/travelback.spec.ts:3219-3260,3342-3400`

The architecture record says `resetSize()` restores original dimensions and
that ending export re-syncs trail and marker. Both claims are narrowly true,
but they conceal a visible state split when the user has explicitly disabled
camera tracking.

A real frame imperatively moves the shared interactive MapLibre camera. Export
cleanup restores the box, DPR mode, and—in failure/cancel paths—playback
progress. It never captures or restores the manual camera. The Follow-off
effect then correctly refuses to apply an automatic pose, which leaves the
export frame's camera in place. After cancellation, the red marker and traveled
trail can describe the old progress while the viewport is looking at a later
export location. After success, the user still loses the manual composition
they chose before opening Export.

The existing green evidence cannot refute this:

- Controller tests use a stateless mocked `renderFrameAndWait()` and never
  expose a live camera.
- The cancellation E2E uses the local text stub and proves focus restoration,
  not a rendered frame or camera restoration.
- The real MP4 smoke leaves camera tracking on and validates the output file,
  preview, and download path only.

The product already treats Follow-off center/zoom/pitch/bearing as state worth
preserving across Retry Map and provisional Journey cancellation. Export is
the untested third temporary owner. Fix the export transaction itself by
capturing the manual pose at lease acquisition and resolving camera ownership
before cleanup releases the lease. Prove it with a real post-frame cancel and
an injected post-frame failure, comparing the pre/post camera and the restored
progress/marker/trail.

This does not relitigate the excluded Journey-cancellation fix: no Journey
component, track removal, or hydration queue participates here. The export
snapshot on the existing map is independently incomplete.

## Final adversarial sweep

I revisited stale async completion, interrupted cleanup, same-tick re-entry,
thrown accessors, map replacement/style readiness, Follow and scene variants,
parser lexical limits, multi-wrap geometry, mobile interaction, localization,
static-output claims, and supervised-process proof. No second claim failed
with evidence strong enough to be a genuinely new Cycle 5 finding. I omitted
supervisor speculation because it lacked the mandated deterministic pre-fix
failure and exact survivor/listener/profile audit.

Fresh typecheck and lint passed. The focused export/camera/render test set also
passed 62/62, confirming that the finding is a missing ownership case rather
than an already-failing assertion.
