# Architect Review — Cycle 5 (2026-07-16)

Reviewed revision: bdfb1d7

## Result

**New architecture findings: 1.** ARCH5-01 is the same deduplicated underlying defect as CR5-01: map construction, style readiness, and current-pose hydration are separate ownership events, so a ready style can expose incomplete session state.

## System coverage

Reviewed the client-only trust boundary, parser/worker parity, import and session replacement, full-versus-trimmed track models, segmented distance/camera math, React state ownership, MapLibre instance/style/overlay lifecycles, Journey Creator gestures, playback, scene history, export ownership/finalization, static hardening, workflow/configuration, and the active blocked/deferred register. The change-focused review covered the complete Cycle 4 implementation range through bdfb1d7.

## Finding

### ARCH5-01 — Map generation is signaled at construction while pose hydration requires style readiness

Severity: **Medium** | Confidence: **High** | Status: **Confirmed architectural ownership split**

Related code finding: CR5-01

Evidence:

- src/components/MapView.tsx:582-602 constructs a MapLibre instance and immediately announces onMapInstanceChange before its style is ready.
- src/app/page.tsx:169-172 and src/components/JourneyCreator.tsx:160,528 correctly use that generation to rebind the Journey Creator, but it is not a style-ready/current-state commit signal.
- src/components/MapView.tsx:702-817 owns source/layer creation and restores only route/trail state at saved progress while seeding the current-position source at the route start.
- src/components/MapView.tsx:844-906 owns asynchronous style attachment and retry fit/marker creation.
- src/components/MapView.tsx:914-1009 separately owns marker pose and follow/scene camera application, but style readiness is absent from its dependency model.

The boundary has three meanings of ready: the map object exists, its style owns layers, and the current session pose is committed. Consumers and tests observe the first or second state, while user-visible correctness requires the third.

Failure scenario: a paused nonzero-progress session receives an ordinary style replacement or in-app retry. The layer transaction completes later without atomically publishing the corresponding marker and camera state. Retry recreates marker and camera from initial/bounds state; ordinary replacement can split HTML and GeoJSON marker positions.

Recommended boundary: define one idempotent MapView hydration transaction that runs only after the active map generation's style owns all required sources. Commit route, trail, HTML marker, GeoJSON/export marker, and current automatic camera from the same progress snapshot. Publish readiness only afterward, or drive the pose owner with a style-generation token. Ignore stale callbacks by map/style generation identity.

Required regression: verify a nonzero paused pose across both ordinary style reload and failed-style in-app retry, including source/layer presence, both marker representations, trail agreement, and follow/scene camera state.

## Existing strategic deferrals and final sweep

B01-B04 and D01-D03 remain blocked, evidence-gated, or explicitly deferred with unchanged exit criteria. Root playback ownership, elevation downsampling, and drag-distance complexity were inspected for regressions but not reopened without new profile evidence. No second architectural finding met the threshold.
