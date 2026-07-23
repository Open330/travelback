# Cycle 4 architecture review — 2026-07-23

**Role:** architect

**Reviewed revision:** `975dded34c849db4eb972221ed9483d3d64fb81d` on `review-plan-fix/no-deploy-20260723`

**Outcome:** one genuinely new actionable architecture finding

## Inventory and method

I inventoried the tracked repository before reviewing it: all current
production source, scripts, E2E/unit-test surfaces, workflow and build
configuration, public runtime assets, `README.md`, and current project
documentation. Historical `.context` reviews and plans were treated as
provenance rather than current implementation targets.

Before counting findings, I read the Cycle 3 aggregate and implementation
record, the P01 platform-boundary deferral, and the plans index. I then traced
the import, track-session, playback, MapLibre, scene, and export ownership
boundaries across their callers and tests. This finding does not repeat a
Cycle 1–3 fix or one of the explicitly deferred process-supervisor boundaries.

## Finding

### C4-ARCH-01 — A pending import can replace the track underneath an active export

- Severity: Medium
- Confidence/status: High / Confirmed by async ownership and state trace;
  resulting mixed-frame artifact is Likely and needs manual validation
- Evidence: `src/components/FileUpload.tsx:79-94,133-144,186-216`,
  `src/app/page.tsx:331-354,622-631,680-727`,
  `src/lib/useExportController.ts:120-146,147-240,242-338`,
  `src/components/MapView.tsx:406-455`

`FileUpload` privately owns the import generation and abort controller. Its
only import-start notification calls `invalidateSampleLoad`; it does not expose
the pending import to the page-level session/export coordinator. When an old
track is already loaded, the upload UI reports its own `loading` state but
leaves `TrackWorkspace` and its Export action usable.

The following reachable sequence therefore crosses two independent leases:

1. With track A loaded, select a sufficiently slow-to-parse replacement track B.
2. While B is pending, open Export and start exporting A.
3. Let B finish parsing before the export settles.

`loadTrackIntoSession` immediately calls `resetTrackWorkspace`, clears the
MapView track artifacts, and replaces the canonical track. The workspace reset
closes the export panel and calls `resetExportSession`, but that reset only
clears UI/result state; it neither aborts nor awaits the controller's live
export lease.

The still-running export captured track A for camera calculation, yet its
imperative `renderFrameAndWait` reads mutable `trackRef.current` and
`cumulDistRef.current` for every marker/trail frame. After replacement, it can
therefore combine track A's camera program with cleared or track B
marker/trail state. The old invocation can subsequently publish a blob,
filename, success toast, `done` state, and progress `1` into B's current
session. Closing the panel during replacement also removes the user's visible
Cancel control while that work continues.

This is an ownership-boundary defect, not merely a missing disabled button:
track replacement, MapView mutation, playback progress, and export result
publication lack a shared session generation or a serialized handoff.

#### Suggested fix

Make track-session replacement and export teardown one transaction. A
page-level session coordinator should abort the current export and await full
lease release—including map-presentation/progress cleanup—before committing a
new track. Gate all late export writes by the owning track-session generation.
Also bind frame rendering to the export's immutable track/cumulative-distance
snapshot instead of consulting MapView's mutable current-track refs.

Disabling Export while an import is pending is useful defense-in-depth, but it
does not replace the abort-and-settle contract. Add a deterministic regression
with a held parse and held export: resolve the parse after export starts, then
assert that the export signal aborts and settles before track B commits, and
that no track-A result, toast, progress write, or map mutation can publish into
track B's session.

## Duplicate audit and final sweep

Historical reviews had already identified `HomeInner`'s broad orchestration
surface and several now-fixed stale async writes. None documented this
reachable import/export overlap, the split private leases, or the mutable
MapView frame source. That materially new cross-boundary evidence is why this
root is counted.

The missed-issue sweep revisited parser/worker ownership, playback callbacks,
scene preview versus committed state, trim transitions, MapLibre style
generations, export cleanup, generated artifacts, static serving, CI authority,
and the Cycle 3 fixes. The XML preflight defect is counted by the critic review
as a local validation-control root; duplicating it here would not identify a
second architectural cause. No other new architecture root survived causal
tracing and historical duplicate suppression.

## Process hygiene

No browser, Playwright, Chrome, app server, E2E run, deployment, commit, push,
branch switch, source edit, or existing-review edit was performed.
