# Cycle 3 architecture review — 2026-07-23

**Role:** architect
**Reviewed revision:** `7f013a207e64ca54c0864edc5aaf061ebfb36bdf`
**Outcome:** no genuinely new actionable architecture finding

## Scope

I independently reviewed the complete repository inventory and traced the
current boundaries between:

- `HomeInner` session orchestration and the track workspace;
- playback/export controllers and the imperative MapLibre surface;
- canonical track parsing, worker execution, segment metadata, interpolation,
  camera policy, and prepared render geometry;
- scene authoring, temporary camera preview, committed camera refresh, trim
  invalidation, and exported scene programs;
- local preference/localization providers and responsive toolbar consumers;
- generated-worker ownership, static export hardening, file serving, smoke
  checks, E2E wrappers, and CI deployment authority.

I also compared those boundaries with the current architecture document, the
Cycle 2 aggregate and implementation record, historical architecture findings,
and the three explicit Cycle 2 platform-boundary deferrals.

## Assessment

The principal boundaries are coherent at this revision:

- browser input is normalized into one `Track` contract before reaching
  playback, map, scene, and export consumers;
- `MapView` owns MapLibre lifecycle and prepared geometry, while controllers
  use a bounded imperative interface for export and committed camera refresh;
- route, trail, fit, reference-grid, and overview consumers now share the
  segment-aware display-bounds contract introduced in Cycle 2;
- generated parser code has one TypeScript source of truth and a checked build
  artifact;
- static hardening, serving, smoke validation, and workflow authority remain
  separated and fail closed at their intended boundaries.

The broad session state surface in `HomeInner`, the forwarding surface in
`TrackWorkspace`, and trim/session transition duplication are real maintenance
costs, but they are longstanding, repeatedly documented roots rather than new
Cycle 3 findings. The process-supervisor limits around pre-observation marker
erasure, portable PID signaling, and host-wide marker discovery are also
explicitly deferred; this review found no materially new evidence that meets
their reopen criteria.

The code review's finite multi-wrap issue is a local algorithmic-complexity
defect in the shared longitude primitive, not evidence of a second ownership or
layering failure. Treating it as another architecture finding would duplicate
the same root.

## Verification and final sweep

No browser, Playwright, Chrome, dev server, deployment, commit, or push command
was run.

- `npm run test:unit` — passed, 25 files / 541 tests
- `npm run lint` — passed
- `npm run typecheck` — passed
- `node scripts/build-worker.mjs --check` — passed

The missed-issue sweep revisited state authority, stale refs/effects, async
ownership, map generation/style replacement, scene/trim/export transactions,
generated artifacts, static-server containment, and configuration drift. No
new independent architecture root survived causal tracing and historical
duplicate suppression.
