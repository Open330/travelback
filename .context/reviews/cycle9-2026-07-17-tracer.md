# Cycle 9 cross-file tracer review — 2026-07-17

## Result

**New trace findings: 1.** TRACE9-01 is the shared CR9-01 camera-transition defect. It propagates unchanged from scene authoring/default presets into both live MapLibre playback and encoded video. No other broken producer→state→consumer chain survived the final trace sweep.

## Coverage and method

Traced exact HEAD `342b8c13` against baseline `81342b7`. Enumerated all 913 tracked files and semantically read every current review-relevant source, unit test, E2E spec/fixture, public text/map/worker asset, script, delivery/configuration file, README section, and active project/development/plan/review document. The 39 legacy `plan/` documents and 747 non-active `.context` documents were catalogued and searched for duplicate/provenance signals. Binary font/favicon payloads were excluded from semantic tracing while their references were verified.

Primary flows traced end to end:

1. FileUpload → size policy → parser/worker → Google adapter → normalized Track/segments → timeline trimming/interpolation.
2. Scene preset/editor → root scene state/transition duration → normalized scene cache → MapView camera target → MapLibre camera smoothing.
3. The same scene/config state → export controller → video encoder → per-frame camera → idle/render/capture → URL/file output.
4. Map constructor generation → style revision/readiness → track layers/marker/fit → Journey Creator ownership and cleanup.
5. Static English snapshot → locale preference effect → translated provider tree/document language.
6. Source worker → generated public worker → build/static delivery and parser parity tests.

## TRACE9-01 — Scene timeline → camera resolver → playback/export carries a discontinuous state

- **Producer:** multi-scene presets are contiguous and intentionally change modes/parameters (`src/lib/camera.ts:394-445,475-519`). SceneEditor normalizes authored ranges but allows touching scenes and real gaps, including gaps left by deletion (`src/components/SceneEditor.tsx:356-405,430-490`). Root state stores the transition duration and forwards it (`src/app/page.tsx:130,224,495-517,590-659`).
- **Resolver:** `computeCameraForProgress` first assigns shared endpoints to the earlier scene (`src/lib/camera.ts:540-547`), separately owns gaps (`549-576`), then applies incoming/outgoing transitions based solely on selected-scene index (`604-631`). It does not ask whether the neighboring scenes touch or whether another branch already owns the interval.
- **Live consumer:** MapView normalizes scenes into refs and calls the resolver for current progress/duration/transition state (`src/components/MapView.tsx:449-458,803-817`). Subsequent map smoothing cannot restore continuity after the target itself reverses.
- **Export consumer:** video encoding normalizes the same scenes once and invokes the resolver for every output frame (`src/lib/videoEncoder.ts:180,223-237`), so the glitch is deterministic in the artifact rather than limited to live render timing.
- **Missing detector:** camera unit tests use identical default parameters and assert only defined/positive fields at one midpoint/boundary (`src/lib/camera.test.ts:255-265,285-295`). The scene browser trace switches to the one-scene Simple preset (`e2e/travelback.spec.ts:1856-1884`).
- **Confirmed failure:** touching A/B reaches B at their boundary then resets to A immediately after. Internal-gap A/B reaches B before A ends, resets to A for the gap lerp, reaches B before B starts, then resets to A for B's incoming lerp. With A `[0,.4]`, B `[.6,1]` on the existing straight test track, both gap-endpoint resets are about 22 km; distinct params also produce 8 zoom, 50° pitch, and 90° bearing reversals in the controlled example.
- **Fix:** centralize exclusive interval ownership in the resolver: one boundary-centered transition for touching ranges, one full interpolation for a real gap, ordinary scene evaluation elsewhere. Add numeric continuity/monotonicity regressions around a touching boundary and both gap endpoints with unequal parameters and a rotation mode.
- **Severity:** Medium.
- **Confidence:** High.
- **Status:** Confirmed across producer, resolver, and both consumers.

## Cycle 8 trace comparison

- Untimed semantic observations now flow A→B→A through `googleJsonParser.ts`, parser facade, generated worker, and upload E2E fixture without segment-local coordinate deletion.
- A real drag now establishes one bounded suppression deadline; both generic and point-layer click handlers consult it, terminal settlement clears movement state, and delayed intentional deletion passes.
- Static markup and hydration both begin with English; the mounted provider then resolves stored/browser locale and updates `document.lang`. Real-provider hydration coverage passes without mismatch diagnostics.
- Corrected Spanish strings flow through the same key-complete dictionary and reviewed phrase assertions.
- A track arriving during transient style unreadiness now remains owned while revision-scoped `style.load`, `styledata`, and `idle` listeners retry hydration; success/staleness/cleanup removes all listeners.

No Cycle 8 trace regression was found.

## Dependency/delivery trace

The lock has 579 integrity-bearing registry artifacts and audit reports zero vulnerabilities. Source worker parity is current. Tailwind's compatible 4.3.3 patch is newer than the locked 4.3.2, but declared ranges admit it and no current failure/advisory was established; major tool updates have LTS/peer constraints. Known B01 (unit tests absent from CI), B02 (workflow-wide Pages/OIDC writes), B03 (license input), B04, and D01-D04 remain ledger-only.

## Validation and final sweep

Fresh lint, no-emit typecheck, 17 suites/400 tests, worker parity, and dependency audit passed. No build, server, browser, deployment, or destructive cleanup ran. The final trace sweep included error/abort/cleanup paths, storage/bootstrap, parser budget/parity, segmented interpolation, style revision ownership, camera preview/playback/export, static hardening, and dependency provenance. Only TRACE9-01 remains actionable.
