# Aggregate Deep Review — Cycle 11

Date: 2026-07-24
Reviewed revision: `a7adcdc1ff2b9a296a77f125c39a538320dd22f7`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment: prohibited and not attempted

## Result

The grouped 12-role review plus the registered non-technical-traveler
perspective produced **1 genuinely new, deduplicated finding**:

- 0 Critical
- 0 High
- 0 Medium
- 1 Low

The finding is actionable in Cycle 11 and is not deferred. Cycle 1–10 roots,
prior execution errors, and the three explicit native/host process boundaries
were excluded.

No reviewer ran a full suite, process-supervisor test, E2E, Playwright,
Chromium/browser, server, build, deployment, commit, push, or process signal.
One architecture inventory command accidentally searched above the repository
and remained slow. The cycle parent revalidated its exact PID, PGID, UID,
start token, and command, sent TERM only to that PID, and proved it absent.

## Review provenance

- `cycle11-2026-07-24-core.md` — code quality, correctness, security,
  performance, concurrency, tracing, debugging, and architecture;
- architecture/tests/documentation lane — architecture, verification, tests,
  parsers/workers, export/MP4, scripts, process-supervisor code, and docs; and
- UX/critic lane — critic, verifier, designer, accessibility, i18n, and
  non-technical-traveler perspectives.

The zero-finding lanes created no provenance artifact, as required for the
convergence path. Each group inventoried its complete relevant surface and
performed a final missed-file sweep.

## Deduplicated finding

### AGG11-01 — Imperative camera publication leaves smoothing authority stale

Severity: **Low**
Confidence: **High**
Agreement: core reviewer and cycle-parent causal validation

Evidence:

- `src/app/page.tsx:513-533`
- `src/components/MapView.tsx:287`
- `src/components/MapView.tsx:432-441`
- `src/components/MapView.tsx:1127-1165`
- `e2e/travelback.spec.ts:2590-2710`

Cycle 10 correctly made a paused duration change publish its proposed camera
immediately through `MapViewHandle.applyCameraState`. That imperative handle
moves MapLibre with `jumpTo`, but it does not reconcile
`lastCameraStateRef`, which remains the declarative camera effect's smoothing
origin.

At paused progress 0.55 in an Orbit scene, changing duration from 30 to 35
seconds advances the correct visible bearing by 99 degrees. When playback
resumes, the first progress-driven update sees a delta below the 120-degree
snap threshold and blends from the stale pre-change ref. It therefore moves
roughly 30 degrees backward before converging on the new-duration path.
Cycle 10's E2E test proves the paused update but stops before resume, so it
does not cover the ownership handoff.

Fix: make `applyCameraState` update the smoothing authority with an owned
clone of the state it publishes, then extend the paused duration regression
through resume with a sub-threshold duration delta.

This is distinct from Cycle 10's missing immediate paused-camera publication
and Cycle 6's scene-preview exit settlement. Those lifecycle fixes now expose
the shared imperative-to-declarative handoff; they did not reconcile the
smoothing origin.

## Exclusions and final sweep

- Cycle 10 schema-owned GPX/KML display names, paused duration publication,
  and retained-trip hotkey isolation remain fixed.
- Cycle 9 prospective export-duration eligibility, social metadata, and
  export-presentation documentation remain fixed.
- Cycle 8 MapLibre live localization remains intact.
- Cycle 7 collection bounds, Unicode filenames, and architecture ownership
  remain intact.
- Cycle 1–6 parser, scene, export, map, focus, layout, and process roots were
  deduplicated from their archived plans and current code.
- Static English landing art remains Cycle 7's localization root.
- Same-namespace XML structure challenges reopen Cycle 10's display-name
  ownership family and were not counted as a distinct root.
- FileUpload settlement, parser budgets, partial-time ordering, singleton
  distance behavior, export finalization, and `preserveDrawingBuffer` remain
  historical accepted boundaries.
- Pre-observation identity erasure, pidfd-grade signaling, and exact global
  marker discovery without native/host support remain excluded platform
  boundaries.

The final missed-file sweep found no second distinct root. No deployment
occurred.
