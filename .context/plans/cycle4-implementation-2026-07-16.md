# Cycle 4 Implementation Plan — 2026-07-16

Source: `.context/reviews/_aggregate.md` (6 new or newly confirmed actionable findings against `4917d39`, 3 unresolved correctness carryovers, 4 blocked/evidence-gated carryovers, and 3 existing performance deferrals).

## Objective

Fix all six actionable Cycle 4 findings and all three unblocked correctness carryovers without deployment. Preserve only work that genuinely requires CI/CD authorization, legal input, representative hardware, or a separately profiled performance redesign.

## Rules and constraints

- No deployment command, manual workflow dispatch, production mutation, or CI/CD edit.
- Use `apply_patch` for authored edits and build tools only for mechanical generated output.
- Preserve unrelated user changes and the already-running local development/static processes; do not stop or kill them without explicit confirmation.
- Create GPG-signed Conventional Commit + gitmoji commits, one coherent fix per commit. Before every push, run `git pull --rebase`, then push.
- Run focused regressions for every fix and the complete final gate matrix: lint, typecheck, unit, high-severity audit, build, static smoke, dev E2E, and static E2E.
- Run artifact-mutating final gates from an isolated exact-HEAD copy so the existing Next dev server cannot race `.next` generation and is not disturbed.
- `.github/workflows/deploy-pages.yml` remains read-only until the user explicitly authorizes CI/CD modification.
- Do not invent license ownership, year, or legal terms.
- Do not claim representative-device performance evidence from browser emulation.
- The requested Ralph helper is not installed in this environment; execute this approved plan directly with equivalent regression-first sequencing.

## Wave 0 — Map and export resource ownership

### P01 — Rehydrate every MapLibre generation (AG4-01)

- Severity/confidence: Medium / High
- Files: `src/app/page.tsx`, `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`, `e2e/travelback.spec.ts`, focused component tests as needed
- Work: expose a monotonically changing map-ready/generation signal. Key MapView's complete track/progress hydration to map generation so a replacement instance receives route/trail sources, current-position marker, fit/current camera, and current progress. Rebind Journey Creator layers/listeners on the new generation without clearing its existing waypoints. Keep cleanup idempotent across a removed old map, ordinary style reload, retry, deactivation, and unmount.
- Acceptance: after a loaded-track style failure and in-app Retry Map, there is exactly one live canvas and marker, the route/current-position state is restored, and the camera is no longer the constructor world view. If retry occurs while Journey Creator is active, existing waypoints remain, a post-retry canvas click adds a new point, Undo becomes enabled, and no listener remains on the destroyed map. Both paths use the actual Retry Map button in E2E.
- Status: Pending.

### P02 — Freeze theme-derived map style for the export lease (AG4-02)

- Severity/confidence: Medium / High
- Files: `src/app/page.tsx`, `e2e/travelback.spec.ts`
- Work: make the implicit system-theme listener export-aware. While export owns the map, do not apply color-mode or theme-derived map-style mutations that can call `setStyle`; retain the media query's latest state and synchronize it immediately after export cleanup. Preserve explicit theme/map-style precedence and the existing first-render behavior.
- Acceptance: a deterministic held export stays on its original document/map style after a light→dark media event, makes no dark-style request, and never shows map error. Once export ends, the latest implicit system mode/style applies. Existing explicit-choice and first-render theme tests remain green.
- Status: Pending.

### P03 — Give export startup one synchronous owner (CR4-CARRY-01)

- Severity/confidence: Medium / High
- Files: `src/lib/useExportController.ts`, `src/lib/useExportController.test.ts`
- Work: acquire the abort-controller/export lease before the first asynchronous boundary, ignore same-tick re-entry while a lease exists, and release the shared ref only if it still belongs to that invocation. Keep cancellation, unmount abort, progress restoration, URL cleanup, and map-size cleanup scoped to the owner.
- Acceptance: two same-tick `exportTrack()` calls invoke the encoder exactly once; cancellation reaches that owner; no non-owner can clear its ref or run competing map cleanup; a later export after completion/cancellation can start normally.
- Status: Pending.

## Wave 1 — Parser and interaction transactions

### P04 — Fall back after empty or invalid preferred Google paths (CR4-CARRY-02)

- Severity/confidence: Medium / High
- Files: `src/lib/googleJsonParser.ts`, `src/lib/parser.test.ts`, `src/workers/trackParser.worker.test.ts`, `public/workers/trackParser.worker.js`
- Work: decode semantic activity representations in priority order but select the first one that contributes accepted points. If `simplifiedRawPath.points` is empty or entirely invalid, try `waypointPath.waypoints`; if that also contributes none, use valid start/end locations. Preserve point budgets, segment breaks, timestamps, and valid preferred-path precedence. Regenerate the checked-in worker mechanically.
- Acceptance: empty and all-invalid preferred arrays no longer suppress valid fallback paths; a partly valid preferred path still wins without mixing representations; direct and worker paths match; `npm run check:worker` passes.
- Status: Pending.

### P05 — Settle active waypoint drags before toolbar/session mutations (CR4-CARRY-03)

- Severity/confidence: Medium / High
- Files: `src/components/JourneyCreator.tsx`, `src/components/JourneyCreator.test.ts`
- Work: expose the existing idempotent drag settlement through a stable component-owned ref/controller. Invoke it before Undo, Clear, Cancel/discard, Done/create completion, style teardown, and unmount. Settlement must remove transient map/window/document listeners, clear both input/index ownership, restore the cursor, re-enable `dragPan`, and prevent a later move from recreating cleared data.
- Acceptance: keyboard activation of Undo during a mouse drag and Clear during a touch drag each settles exactly once; later movement cannot update or recreate a waypoint; cursor/pan/listener state is restored; outside-map release and ordinary drag tests stay green.
- Status: Pending.

### P06 — Respect focused map keyboard ownership (AG4-03)

- Severity/confidence: Medium / High
- Files: `src/lib/usePlaybackController.ts`, `e2e/travelback.spec.ts`, focused hook tests if practical
- Work: classify MapLibre's interactive canvas as a playback-hotkey exclusion without broadly disabling neutral page shortcuts. Leave MapLibre's own keyboard handler free to receive arrows and retain global playback seek outside interactive owners.
- Acceptance: with the map canvas focused, ArrowLeft/ArrowRight do not change playback and focus stays on the map. After focus leaves interactive controls, the same arrows still seek by the documented step. Slider/button/input/dialog behavior remains unchanged.
- Status: Pending.

### P07 — Ignore semantically unchanged accepted trim ranges (AG4-04)

- Severity/confidence: Medium / High
- Files: `src/app/page.tsx`, `e2e/travelback.spec.ts`, `src/components/TimelineSelector.test.ts` if needed
- Work: at the page transaction boundary, compare proposed start/end indices with the accepted range before scene invalidation, export reset, track rebuilding, or playback reset. Treat equivalent index pairs as no-ops even if a local ratio was clamped or rounded differently.
- Acceptance: after trimming and authoring a scene, ArrowLeft/Home at an already-0% start leaves the discard dialog absent, scene intact, point count and playback/export state unchanged, and focus on the start handle. Real range changes still prompt and Cancel/Discard retain current behavior.
- Status: Pending.

## Wave 2 — Verification signal and contributor guidance

### P08 — Remove FileUpload's React act-harness warnings (AG4-05)

- Severity/confidence: Low / High
- Files: `src/components/FileUpload.test.ts`
- Work: set the supported React act-environment flag in the createRoot-based harness, matching the other component suites. Do not suppress `console.error` or weaken assertions.
- Acceptance: the focused FileUpload suite and full `npm run test` pass without act-environment warnings.
- Status: Pending.

### P09 — Document the canonical test matrix (AG4-06)

- Severity/confidence: Low / High
- Files: `README.md`, `.context/project/01-overview.md`
- Work: describe testing as Vitest plus Playwright. Add `npm test`, recommend the lock-aware `npm run test:e2e` wrapper, retain `npm run test:e2e:static`, and label the direct dev command only if useful. Keep install/build/static-preview instructions intact.
- Acceptance: contributor and project-context commands match `package.json`; following the primary path exercises the 352-test unit suite and avoids the direct Next dev-lock pitfall.
- Status: Pending.

## Carried-forward blocked work

### B01 — Add the unit test gate to Pages CI

- Original severity/confidence: High / High
- Exact file/scope: `.github/workflows/deploy-pages.yml:26-32`
- Block reason: the user-level destructive-action rule classifies CI/CD modification as destructive and requires explicit confirmation before the specific edit. “No deployment” does not grant CI modification authority.
- Exit criterion: the user explicitly authorizes editing the workflow; add `npm test` to the build job and validate syntax without dispatching or deploying.
- Status: Blocked; no file edit authorized.

### B02 — Narrow Pages workflow permissions

- Original severity/confidence: Medium / High
- Exact file/scope: `.github/workflows/deploy-pages.yml:8-45`
- Block reason: same explicit CI/CD authorization boundary as B01.
- Exit criterion: explicit authorization; remove inherited build-job writes and grant Pages/OIDC writes only to deploy, validating without dispatch or deployment.
- Status: Blocked; no file edit authorized.

### B03 — Resolve the missing license grant

- Original severity/confidence: Medium / High
- Exact file/scope: `README.md:224-226`, absent root `LICENSE`
- Block reason: intended license, holder, and year/range are legal facts unavailable in the repository.
- Exit criterion: the user supplies exact license and attribution, then add that grant or correct the README claim.
- Status: Blocked by required legal input.

### B04 — Measure `preserveDrawingBuffer` on representative hardware

- Original severity/confidence: Medium / Medium
- Exact file/scope: `src/components/MapView.tsx:582-592`
- Block reason: desktop/mobile emulation cannot establish real GPU, memory, battery, or thermal cost.
- Exit criterion: record comparative p50/p95 frame time and memory on representative low-end/mobile hardware; isolate export capture if the impact is material.
- Status: Evidence-blocked; no production change justified.

## Existing performance deferrals

### D01 — Move playback progress off root-owned per-frame React state

- Original severity/confidence: High / High
- Exact scope: `src/lib/usePlaybackController.ts:98-155`, root consumers in `src/app/page.tsx`
- Reason: a broad state-ownership redesign requires profiling and coordinated map/controls/scene/export regressions; no current correctness failure is attributed to it.
- Exit criterion: a dedicated performance cycle profiles the current budget and introduces an imperative/external-store boundary while preserving seek, scenes, camera follow, and export.
- Status: Deferred to documented performance architecture work.

### D02 — Downsample large elevation SVG paths

- Original severity/confidence: Medium / High
- Exact scope: `src/components/ElevationProfile.tsx:20-60`
- Reason: evidence needs a large-track rendering profile and visual fidelity criteria.
- Exit criterion: reproduce large-track profile cost, choose distance-aware sampling, and add visual/endpoint regressions.
- Status: Deferred to measured large-track work.

### D03 — Avoid O(n) total-distance scans on every waypoint drag move

- Original severity/confidence: Medium / High
- Exact scope: `src/components/JourneyCreator.tsx:192-196,360-369`
- Reason: interaction performance refactor needs measured route-size targets and exact terminal reconciliation; correctness settlement P05 is intentionally smaller.
- Exit criterion: a Journey Creator performance pass implements incremental adjacent-segment updates or throttled preview plus exact terminal commit.
- Status: Deferred to measured interaction work.

## Closed review watch

### W01 — Timeline keyboard propagation retry watch

- Original observation: Low / Low.
- Evidence: the exact static test passed 10/10 consecutive runs with retries disabled during Cycle 4 Prompt 1.
- Disposition: Closed; its Cycle 3 reopen criterion was not met.

## Planned commit sequence

1. Cycle 4 review aggregate, role artifacts, plan, and plan index.
2. Map-generation hydration and Journey Creator rebinding.
3. Export-time system-theme deferral.
4. Synchronous export ownership.
5. Google semantic-path fallback plus generated worker.
6. Journey Creator action-driven drag settlement.
7. Map keyboard ownership.
8. Semantic no-op trim transaction.
9. FileUpload act-harness signal cleanup.
10. Contributor testing documentation.
11. Gate-driven repairs, each in its own signed commit if any gate uncovers a distinct defect.
12. Final plan/gate completion record.

Each implementation commit is pushed only after focused checks pass and `git pull --rebase` runs immediately before `git push`, as required by the repository-wide instructions.

## Required final gate matrix

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm audit --audit-level=high`
5. `npm run build`
6. `npm run smoke:static`
7. `npm run test:e2e`
8. `npm run test:e2e:static:ci`

The matrix must pass from an isolated exact-HEAD copy. Any failure, error, or actionable warning is fixed at root cause and rerun before completion. No deployment command is part of the matrix.
