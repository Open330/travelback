# Cycle 2 Review Remediation Plan — 2026-07-23

Status: **Completed**

Source review: `.context/reviews/_aggregate.md`
Reviewed base: `279f5676eb34baa4929a536fa0c20e9cbc556f34`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment mode: **none**

## Scope and policy

- Schedule all 13 new aggregate findings. **No original Cycle 2 finding is
  deferred.** The post-implementation P01 audit identified three narrower
  kernel-capability boundaries; they are recorded with evidence and exit
  criteria in
  `deferred-p01-platform-boundaries-cycle2-2026-07-23.md`.
- Correct the uncounted README residue without treating it as a new finding.
- Preserve the three existing Cycle 1 deferrals; this cycle neither relabels
  nor expands them.
- Use Node 24, Next 16, React 19, and strict TypeScript under the current
  `.context/` rules.
- Implement in fine-grained, semantic, gitmoji-prefixed, GPG-signed commits.
  Push only `review-plan-fix/no-deploy-20260723`.
- The Pages workflow triggers only on `main`; never push this cycle to `main`
  and do not run any deployment command.
- Ralph is not installed in this environment. Prompt 3 will use a faithful
  iterative fallback: implement one bounded workstream, run focused
  regressions, update this plan, commit and push, then repeat.

## Process and browser hygiene

For every browser/E2E execution:

1. Inventory pre-existing relevant processes, exact PID/PPID/PGID/start token,
   profiles, and listeners.
2. Give the run unique session/server/profile identifiers and record its exact
   owned root plus descendants.
3. Run browser gates strictly sequentially.
4. Close the run's own contexts/drivers naturally, then terminate only
   validated exact owned identities with TERM → bounded wait → KILL.
5. Verify the exact owned tree/profile and the relevant port are gone before
   starting another browser gate.
6. Never use `agent-browser close`, a shared/global close, `pkill`, `killall`,
   process-name killing, or any broad match.
7. Leave every per-run pre-existing identity untouched, including user Chrome
   PID/PGID 1368, each inventoried shared agent-browser tree/profile, and
   unrelated xylolabs processes.

Protected configured gate ports are 3099, 4173, and 4183. A failed gate does
not end the outer review-plan-fix loop; record the failure, perform exact
owned cleanup, and allow the orchestrator to continue to the next cycle.

## Implementation workstreams

### P01 — Make E2E process ownership durable, bounded, and failure-safe

Findings: **AGG2-01**, **AGG2-02**, **AGG2-03**

Severity/confidence: High/High for AGG2-01; Medium/High for AGG2-02 and
AGG2-03.

Primary files:

- `scripts/e2e-process-supervisor.mjs:10-348`
- `scripts/e2e-process-supervisor.test.mjs:115-223`
- `scripts/fixtures/fake-process-tree.mjs:28-68`
- platform-specific helper/fixture files under `scripts/` if required

Implementation:

- Establish a run-scoped ownership boundary before launching the command.
  Membership must remain discoverable after PPID and process-group changes;
  ancestry polling alone is not an acceptable authority.
- Use an OS-backed containment primitive where the platform exposes one. A
  platform that cannot establish the promised ownership contract must fail
  explicitly at startup or return an honest unsupported/error result; it must
  never report complete-tree success from root-PID death alone.
- Preserve exact PID start identities and refuse unsafe wrapper/system groups.
  An unrelated sentinel must remain alive.
- Replace the ten-per-second steady-state full-table scan with event-driven
  containment or a bounded adaptive fallback. Snapshot work during bounded
  teardown may remain when necessary, but idle browser runs must not fork
  thousands of `ps` processes.
- Retain the last validated ownership snapshot. If a later snapshot fails,
  use only those still-valid exact identities for TERM and escalation, and
  surface the original cleanup error after the bounded attempt.
- Make process snapshot/containment operations injectable for deterministic
  tests.
- State the portable POSIX ownership boundary exactly: an inherited marker or
  an observed owned PPID/PGID is required before a descendant deliberately
  erases every relationship. Do not claim kernel containment on macOS.
- Refuse Windows before target launch unless an atomic provider creates the
  child inside containment and returns its already-armed tracker.

Acceptance:

- A stubborn detached descendant whose root exits immediately is reaped on
  every supported platform; delayed-orphan, signal-forwarding, escalation,
  nonzero-exit, and sentinel-preservation contracts continue to pass.
- Windows no longer skips complete-tree conformance coverage or claims success
  solely because the root died.
- Injected snapshot failures before TERM, between TERM polls, and before KILL
  cannot bypass bounded exact cleanup.
- A steady-state frequency regression proves process-table snapshots are
  bounded and materially below ten per second.
- Preflight signals are latched before the probe, startup failures attempt
  bounded cached cleanup plus exact root-group fallback, and partial batched
  identity reads retain their successful chunks.

Post-implementation limits that require native/host capability are tracked in
`deferred-p01-platform-boundaries-cycle2-2026-07-23.md`; none permits broad
cleanup or false complete-tree success.

### P02 — Unify no-scene camera behavior across preview and export

Finding: **AGG2-04** (Medium/High correctness and product-contract mismatch)

Primary files:

- `src/lib/camera.ts:381-388,525-538`
- `src/components/MapView.tsx:813-840,1193-1217`
- `src/lib/useExportController.ts:169-176`
- `src/lib/useExportController.test.ts`
- `src/lib/camera.test.ts`

Implementation:

- Export one pure default-follow resolver from `camera.ts`: interpolated
  center, 600 m segment-local look-ahead bearing, zoom 13, pitch 45.
- Route `computeCameraForProgress` and MapView's no-active-scene target
  through it. Keep preview smoothing after the shared target calculation.
- Pass `scenesRef.current` to export unchanged. Keep
  `generateDefaultScenes()` only behind the explicit Cinematic preset action.

Acceptance:

- Empty scenes reach the encoder as `[]`; authored scenes retain identity and
  ordering.
- Curved, segmented, antimeridian, and duplicate-point tracks produce finite,
  equal preview/export target center, zoom, pitch, and shortest-angle bearing
  at sampled progress points.

### P03 — Give viewport consumers one segment-aware display-bounds contract

Finding: **AGG2-05** (Medium/High correctness)

Primary files:

- `src/lib/map-geometry.ts:34-240`
- `src/lib/map-geometry.test.ts`
- `src/lib/camera.ts:207-268`
- `src/lib/camera.test.ts`
- `src/components/MapView.tsx:173-293,843-924`

Implementation:

- Add a `TrackDisplayBounds` value computed during route-ordered
  `wrapLngNear` preparation. Select each disconnected segment's nearest
  equivalent world copy without adding a connecting edge.
- Store the bounds on `PreparedTrackGeometry` and expose a small pure
  `computeTrackDisplayBounds` helper for camera purity.
- Make fit, reference-grid, and Overview-camera paths consume that contract;
  remove every sign-based longitude rewrite.
- Preserve current degenerate-axis padding and latitude clamping.

Acceptance matrix:

- `[126,128] → [126,128]`
- `[179,-179] → [179,181]`
- `[-179,179] → [-181,-179]`
- `[-179,-1,2] → [-179,2]`, center `-88.5°`
- segmented `[179|-179]` remains two parts with bounds `[179,181]`
- `[0,120,-120,0,120] → [0,480]`
- polar/single-point fit remains finite
- fit, grid, and Overview all use the same bounds.

### P04 — Restore automatic DPR ownership after export

Finding: **AGG2-06** (Medium/High correctness)

Primary files:

- `src/lib/map-export-presentation.ts:3-43`
- `src/lib/map-export-presentation.test.ts`
- `src/components/MapView.tsx:580-620`

Implementation:

- Represent the pre-export pixel-ratio ownership mode, not just its numeric
  sample.
- Force ratio 1 only for export and restore MapLibre automatic mode with
  `setPixelRatio(null)` on success, cancellation, failure, and unmount.
- Keep explicit override restoration available only if the application
  actually owns such an override.

Acceptance:

- After cleanup, changing simulated device DPR resizes the interactive canvas
  automatically.
- Export still renders physical dimensions at ratio 1 and every cleanup path
  restores container/canvas/style state.

### P05 — Prove that the required real export is structurally valid and decodable

Finding: **AGG2-07** (Medium/High test coverage)

Primary file: `e2e/travelback.spec.ts:3149-3209`

Implementation:

- Extend the existing single real-export case rather than adding another
  expensive encode.
- Parse normal, extended-size, and EOF-size top-level boxes with strict
  bounds; require a complete traversal containing nonempty `ftyp`, `moov`,
  and `mdat`.
- Use the already-installed Mediabunny input APIs to assert one AVC video
  track, 1280×720 coded dimensions, 120 packets for 5 s × 24 fps, and duration
  within two frame intervals.
- Assert the completion video and download link use the same object URL.
- In Chromium, require loaded metadata and decoded/drawn frames near the start
  and end via `requestVideoFrameCallback`.

Acceptance:

- Truncated, overrun, metadata-only, or undecodable output fails the gate.
- The real-export run remains one isolated, retries-free browser test.

### P06 — Separate compact-phone map controls and expose own-file onboarding

Findings: **AGG2-08**, **AGG2-09** (both Medium/High UX correctness)

Primary files:

- `src/app/globals.css:250-339`
- `src/components/TrackWorkspace.tsx:193-199`
- `src/components/FileUpload.tsx:179-278`
- `e2e/travelback.spec.ts:1508-1608`

Implementation:

- At compact portrait heights, keep the mobile title and the three-button
  MapLibre navigation group in distinct non-overlapping regions with at least
  4 px separation on either axis. Do not mask the collision with z-index or
  pointer-event changes.
- Reorder the existing FileUpload content so Browse Files appears before the
  long format explanation while preserving all guidance and the logical
  Sample → Browse → Draw → Help order.

Acceptance:

- At 320×480 and 320×568, title/navigation boxes do not overlap, controls
  remain in-viewport, hit-owned, at least 44×44, and clear of the bottom stack.
- At initial scroll position 320×480, Sample and Browse are fully visible and
  center-hit-owned; after scrolling, Draw and Help remain reachable.
- The 844×390 and 1440×1000 responsive matrix remains collision-free.

### P07 — Give sample loading an owned, localized pending state

Finding: **AGG2-10** (Medium/High UX and async-state correctness)

Primary files:

- `src/app/page.tsx:146-154,412-443,620`
- `src/components/FileUpload.tsx:143-147,232-245`
- `src/components/FileUpload.test.ts`
- `src/lib/i18n.ts`
- `e2e/travelback.spec.ts:991-1077`

Implementation:

- Let `page.tsx`, which owns fetch/parse/generation/abort, own
  `isSampleLoading`.
- Split ref-only unmount abort from user-intent invalidation that also clears
  visible state. Guard `finally` by both generation and controller identity so
  stale requests cannot clear a newer pending state.
- Disable only the sample trigger; Browse and Draw must remain able to
  supersede it.
- Show localized visible progress in a stable overlay, expose `role=status`
  and appropriate busy semantics, and add text in all five locales.

Acceptance:

- A held route produces exactly one request, immediate visible/live progress,
  busy semantics, and a disabled sample trigger.
- Success, failure, competing manual intent, and unmount restore the correct
  idle state without stale results or compact-layout height shift.

### P08 — Minimize workflow credentials and audit the graph CI executes

Findings: **AGG2-11**, **AGG2-12** (both Low/High security)

Primary file: `.github/workflows/deploy-pages.yml:17-35`

Implementation:

- Set `persist-credentials: false` on the pinned checkout action.
- Replace the sole production-only audit gate with
  `npm audit --audit-level=high` after the full install.
- Retain immutable action SHAs, job-scoped permissions, diagnostics, and the
  existing push trigger unchanged.

Acceptance:

- Workflow source proves checkout credentials are not persisted.
- The complete installed dependency graph is audited at High severity and is
  currently clean.
- The workflow still deploys only from `main`; this branch push triggers no
  Pages run.

### P09 — Finish terminology and public camera documentation

Finding: **AGG2-13** (Low/High localization)
Uncounted residue: Cycle 1 AGG-29/P15 at `README.md:48`

Primary files:

- `src/lib/i18n.ts:403`
- `src/components/FileUpload.test.ts:62-82`
- `README.md:48,74-83`

Implementation:

- Replace Korean recovery `Google Timeline` with `Google 타임라인` and assert
  the literal rendered phrase, including absence of the English spelling.
- Replace the residual README “Street View” with “Ground-level Follow” and
  align the camera table label without changing the no-imagery description.

Acceptance:

- Korean import/recovery terminology is exact and consistent.
- Public docs contain no `Street View` claim and match the five-locale product
  contract.

## Mandatory complete gates

Run after implementation against the complete repository:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. `npm run test:e2e`
6. `npm run test:e2e:static:ci`

Also run `node scripts/build-worker.mjs --check`,
`npm audit --audit-level=high`, and
`npm run test:e2e:static:real-mp4`. P08 changes the first two contracts, while
P05 requires the isolated real-export lane in addition to the static CI
command. Record static smoke and real-MP4 results individually.

Gate errors are blocking for this cycle's completed status and must be fixed
at the root. A recoverable browser/test failure must still receive exact owned
cleanup before any rerun. If a final gate cannot be recovered, record the
error and leave this plan In Progress rather than silently marking it done;
the outer loop must continue as the user requested.

## Completion evidence

All **13** fresh findings were implemented. No original Cycle 2 finding was
deferred or silently dropped. The three narrower P01 host/kernel boundaries
remain explicitly active in
`deferred-p01-platform-boundaries-cycle2-2026-07-23.md`; they do not weaken the
implemented exact-identity cleanup contract.

Implemented outcomes:

- P01 now seeds inherited ownership before launch, discovers marker and
  markerless observed descendants through bounded topology scans, caches exact
  PID/UID/start identities and observed groups, preserves partial validation
  successes, composes startup/cleanup errors, latches preflight signals, and
  refuses Windows before launch without an atomic containment provider.
  Focused process-supervisor coverage passes **34/34**.
- P02 and P03 share the no-scene camera target and segment-aware display-bounds
  contracts across interactive preview, export, fit, grid, and Overview paths.
- P04 restores MapLibre automatic DPR ownership with `setPixelRatio(null)` on
  every export cleanup path.
- P05 parses strict MP4 top-level boxes, inspects the AVC track and packet
  timing, and proves browser metadata plus first/last-frame decode in the
  existing isolated real-export case.
- P06 and P07 separate compact-phone title/navigation hit regions, put Browse
  before long guidance, and expose a localized sample-owned pending overlay
  without disabling superseding Browse or Draw intents.
- P08 disables checkout credential persistence and audits the complete
  installed dependency graph at High severity while leaving the Pages trigger
  restricted to `main`.
- P09 aligns Korean recovery terminology and public Ground-level Follow
  documentation.

Complete non-browser gates at the final implementation revision:

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm test` — Vitest **25 files / 541 tests** plus process-supervisor
  **34/34**, all passed (**575** total assertions/tests across the two lanes).
- `node scripts/build-worker.mjs --check` — passed.
- `npm audit --audit-level=high` — zero vulnerabilities.
- `npm run build` — Next.js 16.2.11 compiled, type-checked, generated four
  static pages, and hardened three generated HTML files for CSP.

Sequential browser evidence:

- The first development matrix completed despite one compact title/navigation
  failure. After the gate repair and exact cleanup, the final development
  matrix passed **114**, skipped the isolated real-export case once, and had
  zero failures.
- The first static matrix completed despite one geometry assertion that
  sampled the card during the deliberate desktop-to-compact transition. After
  exact cleanup, the focused repair passed **1/1**, and the final static matrix
  passed **114**, skipped the isolated real-export case once, and had zero
  failures.
- `npm run test:e2e:static:real-mp4` passed **1/1** with structural, track,
  timing, metadata, and decode validation.

Three gate-driven root repairs were retained: durable cleanup of the
markerless Next listener and late descendants, compact map-title/navigation
separation, and stable compact-viewport initialization for the sample-loading
geometry assertion.

Every browser execution used a fresh exact PID/PPID/PGID/start/profile/port
inventory. Each run-owned tree, ownership marker, Playwright profile, and
listener was absent before the next lane; ports **3099**, **4173**, and
**4183** were clear. No `agent-browser close`, `pkill`, `killall`, broad
process match, or broad deletion was used. External baselines changed
naturally during the long run (including unrelated xylolabs and shared
agent-browser restarts), so each transition was re-inventoried and excluded
from cleanup. User Chrome PID/PGID 1368 and the final external agent-browser
PID/PGID 91551 with Chrome root 91554 and its profile were alive after the
last gate.

Deployment remained **none**. Only
`review-plan-fix/no-deploy-20260723` was pushed; `main` was not pushed and no
deployment command was run.

## Finding map

| Finding | Plan |
|---|---|
| AGG2-01 | P01 |
| AGG2-02 | P01 |
| AGG2-03 | P01 |
| AGG2-04 | P02 |
| AGG2-05 | P03 |
| AGG2-06 | P04 |
| AGG2-07 | P05 |
| AGG2-08 | P06 |
| AGG2-09 | P06 |
| AGG2-10 | P07 |
| AGG2-11 | P08 |
| AGG2-12 | P08 |
| AGG2-13 | P09 |

Scheduled: **13**
Original findings deferred: **0**
Evidence-gated P01 platform boundaries: **3**
Silently dropped: **0**
