# Cycle 6 Causal Trace — 2026-07-24

Reviewed revision: `099e85d8860456dea5e59cfa293a12defb27bd99`
Branch: `review-plan-fix/no-deploy-20260723`
Role: tracer
Outcome: **one actionable causal root, corroborating PERF6-01**

## Coverage

I traced current user events and retained data across import/session
replacement, full/trimmed tracks, geometry preparation, MapLibre style
hydration, playback/camera updates, Journey and scene editing, export
ownership/finalization/download, modal/error recovery, worker fallback, and
static delivery. Relevant source, tests, configuration, current project
records, Cycle 1–5 findings/plans, and older provenance were inventoried and
searched before the final missed-issue sweep.

No browser, Chrome, Playwright, E2E suite, server, build, full test suite,
supervisor file, process fixture, deployment, or process-cleanup command was
used.

## Trace TRACE6-01 — Renderer rebasing leaves its source graph reachable after the handoff

- Severity: **Medium**
- Confidence: **High**
- Status: **Confirmed cross-file retention path**
- Aggregate handling: **same causal root as PERF6-01; count once**
- Evidence:
  - `src/lib/map-geometry.ts:202-211,274-360,489-506`
  - `src/components/MapView.tsx:296,338-361,558-687,740-835,999-1023`
  - `src/lib/map-geometry.test.ts:243-244,273-280,345,459,491`

The ownership trace is:

```text
accepted Track (up to 250,000 points)
  → MapView track effect
  → prepareTrackGeometry()
      → precomputeWrappedSegments()
          allocates original coordinate tuple graph
      → buildRendererSegments(original)
          allocates bounded renderer tuple graph
      → bounds / route / trail chunks derive from renderer graph
      → returned object nevertheless includes original graph
  → preparedTrackRef.current
      strongly retains the complete returned object for the track session
  → playback / style hydration / export
      read routeGeometry, trailChunks, trailChunkCollection, displayBounds
      never read wrappedSegments
```

The violated invariant is that a preparation handoff should retain only state
required by a later consumer. Here the source graph has finished its only
production responsibility once `buildRendererSegments()` returns, yet the
public prepared contract extends its lifetime to track replacement.

Four alternatives were challenged:

1. **The graphs may share coordinate tuples.** They do not:
   `buildRendererSegments()` constructs new coordinate arrays for every
   output singleton/edge.
2. **The active trail may still need the original graph.** It reads
   `preparedTrack.geometry.trailChunks`; route publication and fitting likewise
   read renderer-derived fields.
3. **The value may be transient.** It is a field of the object held by
   `preparedTrackRef`, which is cleared only on track removal/replacement or
   MapView teardown.
4. **An unseen production consumer may depend on it.** Complete member-access
   search finds only test reads. The underlying unwrapping helper is exported,
   so those tests do not require lifetime production exposure.

For a maximum accepted track, the stale branch contains exactly 250,000
otherwise unreachable coordinate tuple arrays before accounting for segment
containers and ranges. The causal consequence is sustained heap and GC
pressure throughout playback/export, not merely temporary preparation cost.

**Required ownership change:** end the handoff after renderer construction.
Remove `wrappedSegments` from `PreparedTrackGeometry` and the returned value;
test `precomputeWrappedSegments()` directly. This lets normal reachability
collect the obsolete graph while keeping renderer geometry, segmentation,
fit bounds, and active-head behavior unchanged.

## Provenance and duplicate rejection

Historical `C4-L06` accepted the memory cost of
`precomputedWrappedSegments` when that graph itself powered route and trail
rendering. Commit `0d3d433` subsequently introduced renderer rebasing,
allocated a second graph, and redirected every production output to the new
one without retiring the former contract field. TRACE6-01 is therefore a
post-disposition ownership change, not a renamed request to remove the
previously necessary cache.

The Cycle 1–5 records contain no finding for the now-unread field. Known
root-level playback publication, `preserveDrawingBuffer`, XML main-thread
cost, export-memory policy, finalization limitations, and the documented
process-platform boundaries were not reopened.

## Passing paths and final sweep

- Import replacement still invalidates stale parse/sample work and waits for
  an export lease before committing the next session.
- Playback, map-style revisions, and export frame mutation retain current
  identity/generation checks; no distinct stale-publication survivor was
  confirmed.
- Journey cancel/complete camera handoffs clear or consume their queued state
  on the intended track path.
- Parser worker abort/timeout cleanup, map render waits, modal ownership, and
  error-boundary export settlement exposed no second new causal root.
- No supervisor hypothesis was investigated or reported without the required
  deterministic failing regression and survivor evidence.

The final sweep produced no additional issue that was simultaneously current,
reachable, actionable, and non-duplicate.
