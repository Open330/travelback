# Architect — Cycle 6 (2026-07-17)

Reviewed revision: `1d2755c` on `codex/review-plan-fix-2026-07-16`

## Result

**One new Medium/High architecture finding**, aliasing CR6-01. The remaining subsystem boundaries are internally consistent, and no additional architectural rewrite is justified by current evidence.

## Architecture coverage

- Traced top-level ownership from `src/app/page.tsx` through playback/export controllers, `TrackWorkspace`, `MapView`, Journey Creator, timeline/elevation/scene editor, parser/worker, camera/interpolation/map-geometry/map-render helpers, and static deployment scripts.
- Read all 53 source files, 34 test/fixture files, seven scripts, configuration/workflow files, 19 public assets, README, full current project/development context, Cycle 4/5 plans, the current aggregate, and Cycle 5 provenance.
- Evaluated generation/revision identities, transactional state handoff, cancellation and listener/resource ownership, data invariants, worker/main-thread trust boundaries, static base-path/CSP contracts, and dependency API seams.

## Finding

### ARCH6-01 — Camera ownership is not included in the map-generation state-transfer contract

- Root alias: **CR6-01**
- Severity: **Medium**
- Confidence: **High**
- Classification: **Confirmed architecture/state-model gap**

The replacement-map transaction correctly distinguishes durable application state from ephemeral MapLibre state for route geometry, progress, marker, trail, and automatic camera pose, but it has no durable representation for a manual camera:

- The durable `followCamera` flag lives in `src/lib/usePlaybackController.ts:17-23` and is passed down from the app.
- The only manual pose lives inside the current MapLibre object. Teardown at `src/components/MapView.tsx:999-1017` removes that object without taking a snapshot.
- A new generation is born at a hard-coded world pose (`src/components/MapView.tsx:899-914`).
- Automatic ownership has a rehydration writer (`:868-878`). Initial-track ownership has a one-shot fit writer (`:879-885,1072-1077`). Same-track manual ownership has neither.
- Retry changes the generation identity at `:1197-1200`, so the missing handoff is reached through the supported recovery UI rather than an impossible internal state.

Concrete failure scenario: with a same track and Follow off, an error-driven generation replacement transfers all durable route state but not the only copy of the camera. The new map is internally “ready” while displaying a view unrelated to the route.

Recommended design:

1. Define a small `MapCameraSnapshot` (center, zoom, pitch, bearing) owned by the generation handoff, not by playback smoothing state.
2. Capture it from the outgoing current map when a retry replacement is requested (or immediately before generation teardown), tagged with the outgoing generation/track identity.
3. During hydration, choose one explicit camera owner in priority order: export/authored scene, automatic follow, valid manual handoff, new-track fit, safe fallback.
4. Consume a handoff only for the intended replacement generation and clear it on track removal/replacement to avoid replaying a stale trip view.
5. Add a black-box Retry Map regression with manual ownership plus focused state-selection tests if the priority logic is extracted.

A blanket fit-on-every-generation patch would prevent the world view but erase user-authored manual state. It is acceptable only if product semantics explicitly define retry as a reset-to-overview operation and the UI communicates that reset.

## Verified boundaries and rejected redesigns

- Style revision checks and map-instance identity guards form a coherent stale-callback boundary. Installed MapLibre's abort behavior plus the superseded-style E2E means a second URL-request token layer is not currently justified.
- Parser validation is shared between direct/worker paths through generated worker source checks; worker output is shape-validated before becoming app state.
- Export has a single synchronous lease owner, bounded in-memory admission, encoder backpressure, abort/deadline handling, and identity-scoped cleanup.
- Static base-path normalization is consistently consumed by Next config, runtime asset URLs, worker URL, scripts, and E2E variants.
- Broad root playback ownership and other known hot paths remain performance deferrals D01-D04, not newly confirmed architecture defects.

## Final sweep and explicit skips

The missed-issue pass revisited track replacement during async work, style/generation supersession, unmount/cancel, creator rebind, segment discontinuities, export cleanup, locale/theme authority, and dev/static server ownership. No second architecture root cause was confirmed.

Of 721 tracked `.context/` files, 21 current/provenance files were used and 700 superseded artifacts skipped. All 39 legacy root `plan/` documents were skipped. The binary font and generated lock boilerplate were inspected only through integration/metadata. Every tracked source, configuration, script, textual public asset, unit test, E2E test, and fixture was reviewed.
