# Cycle 4 Verification Review — 2026-07-23

Reviewed revision: `975dded34c849db4eb972221ed9483d3d64fb81d`
Branch: `review-plan-fix/no-deploy-20260723`
Role: verifier
Result: **0 genuinely new actionable findings**

## Scope and evidence standard

I inventoried the current source, scripts and process fixtures, tests,
configuration, public runtime assets, workflow, README, and current
`.context/project`, `.context/development`, review aggregate, active-plan
index, completed Cycle 3 plan, and explicit Cycle 2 platform-boundary plan. I
traced stated behavior through its implementation and nearest regression
evidence instead of accepting documentation or test names alone.

Historical review and plan archives were treated as provenance after
inventory. Only a current, reproducible failure distinct from the fixed Cycle
1/2/3 roots or an explicit deferred boundary could qualify as a new finding.

Per the assignment, I did not use the network and did not launch a browser or
run E2E. The exact reviewed HEAD already has recorded passing evidence for
lint, strict typecheck, 551 unit tests, 37 process tests, worker parity,
dependency audit, hardened production build, 115-test development and static
matrices, and the isolated real-MP4 gate in
`.context/plans/cycle3-implementation-2026-07-23.md:239-280`.

## Behavior verification

- **Local-data and network claims — verified:** file parsing is browser-side;
  JSON work is transferred to the bundled worker with a bounded fallback;
  GPX/KML stay in the main-thread parser; the only application fetch is the
  same-origin sample. Local map-style JSON has no tile, glyph, sprite, or
  symbol dependency. Journey coordinate jumps are parsed locally. This agrees
  with `README.md:211-218` and
  `.context/project/02-architecture.md:118-131`.
- **Import contracts — verified:** `.gpx`, `.kml`, and `.json` are the only
  accepted extensions; XML and JSON have distinct enforced byte limits; every
  successful track is bounded to 2–250,000 valid points. Google branch
  detection, segment preservation, time parsing/sorting, timed-observation
  deduplication, and worker-result validation align across
  `src/lib/googleJsonParser.ts`, `src/lib/parser.ts`, and the generated worker.
- **Track/session behavior — verified:** loading a file, sample, or completed
  manual journey resets playback, export, scenes, trim ownership, artifacts,
  and focus through `loadTrackIntoSession` in `src/app/page.tsx:331-416`.
  Trimming remaps segment starts and asks before invalidating authored scenes
  (`src/app/page.tsx:31-56,365-405`). Sample and file import requests have
  generation/abort ownership.
- **Playback, trimming, and scenes — verified:** playback uses elapsed
  wall-clock progress with bounded seeking and hidden-tab fallback scheduling
  (`src/lib/usePlaybackController.ts:17-207`). Distance-based interpolation
  respects segment breaks. Timeline ratio/index conversion, minimum selection
  width, final drag flush, cancellation, and accepted-range restoration are
  consistent in `src/components/TimelineSelector.tsx:26-479`. Scene editing
  normalizes ranges, prevents overlap, commits camera changes, preserves
  pointer cancellation, and handles delete/undo conflicts in
  `src/components/SceneEditor.tsx:31-809`.
- **Map and camera behavior — verified:** prepared geometry preserves segment
  discontinuities and route-order antimeridian display space. Completed trail
  chunks are immutable and the active head is bounded. Reference grids retain
  ordinary spacing while enforcing 128 features per axis. Scene transitions
  have one owner per boundary/gap, and default/scene camera look-ahead remains
  segment-local (`src/lib/map-geometry.ts`,
  `src/lib/interpolate.ts`, and `src/lib/camera.ts`).
- **Export behavior — verified:** export owns an abortable session, suspends
  React-driven map updates, resizes and restores the map, paints before
  capture, stages GPU frames into CPU-backed canvas storage, closes frame/sample
  resources, applies memory/config bounds, and preserves a completed Blob when
  saving cannot be confirmed (`src/lib/useExportController.ts` and
  `src/lib/videoEncoder.ts`). Object URLs are identity-owned and revoked. Share
  failure state now resets on Export Again in
  `src/components/ExportPanel.tsx:225-257,360-399`. The current real-MP4 gate
  arms frame decoding before a paused seek in
  `e2e/travelback.spec.ts:3395-3420`, matching its asserted sample.
- **Static deployment behavior — verified:** Next uses static export and a
  normalized shared base path. The build postprocessor replaces the production
  placeholder CSP with literal hashes and rejects malformed output. The
  preview server enforces the mount path, safe canonical file resolution,
  GET/HEAD semantics, cache policy, and hardening headers. GitHub Pages deploys
  only from `main`; the reviewed branch and plan remain no-deploy.
- **Supervised E2E behavior — verified within its stated boundary:** POSIX
  ownership preflight occurs before target spawn; marker/topology discovery and
  cached identity validation feed bounded TERM/KILL cleanup; cleanup errors
  remain authoritative; Windows refuses without an atomic contained-launch
  provider. README and project overview now disclose the POSIX requirement and
  distinguish the unsupervised lower-level command.

## Exclusions and final sweep

The seven Cycle 3 aggregate roots are fixed at current HEAD and were not
re-reported. The three process-containment limits in
`.context/plans/deferred-p01-platform-boundaries-cycle2-2026-07-23.md` still
lack their required native/host capability and have no material new evidence.
The localhost export stub is an already-reviewed developer mechanism, and the
current workflow now has a separate real-MP4 gate; it is not a fresh coverage
finding.

The final sweep compared README/project claims with constants, UI controls,
parsers, static assets, workflow scripts, regression names and assertions, the
recent Cycle 3 patch, and current-head completion evidence. No claim produced a
distinct reproducible correctness failure.

## Findings

None.
