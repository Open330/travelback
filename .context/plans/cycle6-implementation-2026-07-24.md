# Cycle 6 Review Remediation Plan — 2026-07-24

Status: **Completed**

Source review: `.context/reviews/_aggregate.md`
Reviewed base: `099e85d8860456dea5e59cfa293a12defb27bd99`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment mode: **none**

## Scope and policy

- Schedule all 4 new aggregate findings. **No Cycle 6 finding is deferred.**
- Preserve the three explicit native/host-capability deferrals without
  relabeling, expanding, or attempting to solve them.
- Retain `.context/plans/user-injected/pending-next-cycle.md`; its final-loop
  cleanup task is not due during Cycle 6.
- Archive the completed Cycle 5 implementation record and update the plan
  index.
- Implement in fine-grained semantic, gitmoji-prefixed, GPG-signed commits.
  Push only `review-plan-fix/no-deploy-20260723`.
- The Pages workflow triggers only on `main`; verify that fact before every
  push, never push `main`, and do not run a deployment command.
- Ralph is unavailable. Prompt 3 uses the documented iterative fallback:
  bounded workstreams, focused regressions, complete gates, exact browser
  ownership audits, plan completion, signed commits, and branch pushes.
- A failed workstream or gate is recorded and repaired when possible, but
  never terminates this cycle or the outer 100-cycle process. Every remaining
  configured gate is still attempted.

## Process and browser hygiene

For every process-supervisor, browser, Playwright, or server execution:

1. Inventory pre-existing relevant processes and listeners, recording exact
   PID, PPID, PGID, UID, start token, command/profile, and ports 3099, 4173,
   and 4183. Check `.next/dev/lock`.
2. Give the run a cryptographically unique marker, temporary root/profile,
   and explicit unique port. Record its exact owned root, descendants,
   browser identities, listener, and profile.
3. Run the supervisor, development E2E, static E2E, and real-MP4 gate
   strictly sequentially.
4. Let each supervised command perform normal cleanup. If intervention is
   required, signal only identities whose PID, UID, start token, ancestry or
   inherited marker, and ownership were validated for that exact run.
5. Verify every exact owned identity, profile holder/lock, listener, marker,
   and temporary root is absent before starting the next browser-capable
   command.
6. Never use `agent-browser close`, a global/shared close, `pkill`, `killall`,
   name-only killing, or a broad process match.
7. Preserve user Chrome rooted at PID 1368 and every unrelated browser,
   Playwright, agent-browser, or server owner. Do not signal an unrelated
   default-port owner.

Prompt 1 launched no browser or server. Its pre/post audit found ports 3099,
4173, and 4183 free, `.next/dev/lock` absent, and protected Chrome PID 1368
unchanged.

## Implementation workstreams

### P01 — Restore route fallback after empty semantic tracks

Finding: **AGG6-01** (Medium/High)

Primary files:

- `src/lib/parser.ts`
- `src/lib/parser.test.ts`

Implementation:

- Let semantic segment ownership and validation run with the existing direct
  namespace, nesting, and early point-budget protections.
- Return `null` only when semantic extraction retained zero valid points, so
  the existing `@tmcw/togeojson` fallback can consider routes.
- Keep any nonempty valid semantic track authoritative; do not merge track,
  route, and waypoint feature families.

Acceptance:

- `<trkseg/>` followed by two valid `rtept` elements imports the route.
- An owned segment containing only invalid direct points followed by the same
  route imports the route.
- A valid semantic track still takes precedence over a sibling route.
- Empty-only GPX still produces no usable points and is rejected at the
  existing file boundary.

### P02 — Release raw wrapped geometry after renderer rebasing

Finding: **AGG6-02** (Medium/High)

Primary files:

- `src/lib/map-geometry.ts`
- `src/lib/map-geometry.test.ts`

Implementation:

- Remove `wrappedSegments` from `PreparedTrackGeometry` and the prepared
  return value.
- Keep it local only long enough to build renderer-rebased segments.
- Move raw antimeridian, disconnected-segment, and multi-wrap expectations to
  direct `precomputeWrappedSegments()` coverage.

Acceptance:

- No production prepared-track owner retains the raw coordinate graph.
- Prepared bounds, route geometry, trail chunks/collection, range metadata,
  and active-head behavior remain unchanged.
- A structural regression proves the prepared object does not expose
  `wrappedSegments`.
- Existing map-geometry behavior remains green.

### P03 — Give scene preview an explicit lifecycle terminal

Finding: **AGG6-03** (Medium/High)

Primary files:

- `src/components/SceneEditor.tsx`
- `src/components/SceneEditor.test.ts`

Implementation:

- Track whether a scheduled scene preview actually published to the parent.
- Cancel pending frames and restore only an applied preview on cancel,
  net-zero pointer settlement, blur/key terminal, Escape-driven unmount, or
  editor teardown.
- Mark applied ownership settled without an extra restore when a real scene
  commit synchronously applies the committed current-progress camera.
- Keep editor close camera-neutral when no preview was ever published.

Acceptance:

- A parameter pointer gesture that moves away and exactly back publishes no
  scene edit and ends with one committed-camera restoration when its preview
  had applied.
- A published keyboard preview followed by editor unmount emits one final
  `onPreviewScene(null)`.
- A pending but unpublished preview is canceled without a spurious camera
  restore.
- Ordinary changed commits, pointer cancellation, keyboard keyup, and blur
  retain their existing semantics.

### P04 — Preserve export state across semantic scene no-ops

Finding: **AGG6-04** (Medium/High)

Primary files:

- `src/components/SceneEditor.tsx`
- `src/components/SceneEditor.test.ts`
- `src/lib/camera.ts`
- `src/lib/camera.test.ts`
- `src/app/page.tsx`

Implementation:

- Compare a settled scene-range draft with its origin and suppress
  origin-equivalent publication.
- Add a complete scene-value equality helper covering identity, name, mode,
  range, and every camera parameter.
- At the page/session boundary, compute a `SetStateAction` once, return early
  for semantic equality, and reset export ownership only for a real change.

Acceptance:

- Away/back/release on a scene boundary produces zero `onChange` and
  `onScenesCommitted` calls.
- Value-identical scene arrays compare equal; any meaningful scene field
  change compares unequal.
- A semantic no-op cannot call `resetExportSession()` or replace scene state.
- Real range, name, mode, parameter, preset, add/delete, and Undo changes
  continue invalidating an export exactly once.

## Verification gates

Run focused regressions after each workstream. Before completion, attempt
every configured gate even if an earlier one fails:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. `npm run test:e2e`
6. `npm run test:e2e:static:ci`
7. `npm audit --audit-level=high`
8. `npm run test:e2e:static:real-mp4`

`npm test` runs exactly once in its supervised post-implementation slot
unless a gate-driven fix requires one evidence-based rerun. The focused
real-MP4 gate must retain structural box validation, AVC track, packet and
duration checks, metadata checks, first/last frame decode, canvas-read,
preview, and download assertions.

Browser-capable gates run sequentially, each with a fresh pre-run ownership
inventory and an exact survivor/profile/listener audit before the next gate.
Use explicit alternative ports and do not touch any unrelated owner.

## Completion log

Completed all four new findings. No item was deferred and no deployment
command was run.

Implementation evidence:

- P01 returns to GPX fallback only when bounded semantic extraction retained
  zero valid track points. Empty/all-invalid tracks with valid routes now
  import, while a usable semantic track remains authoritative.
- P02 removes the production-unread `wrappedSegments` field from prepared
  geometry. Raw wrapping behavior is tested directly through
  `precomputeWrappedSegments()`, and prepared output has a structural
  non-retention regression.
- P03 records whether a scene preview actually reached the map. Net-zero
  pointer settlement and editor unmount restore an applied preview exactly
  once; pending-only work is canceled without moving the camera.
- P04 suppresses origin-equivalent scene-range commits and compares complete
  scene values at the page/session boundary before revoking an export.

Gate-driven repairs: **0**.

Recorded recoverable execution errors: **1**.

- The first attempt to remove the exact supervised-test temporary root used a
  broad-style cleanup command that the command safety layer rejected before
  execution. No state changed. After exact holder, listener, path, and owner
  validation, the same run-owned root was removed with bounded
  `find -depth -delete`; every later temporary root used that safer method.

Verification:

1. `npm run lint` — passed.
2. `npm run typecheck` — passed, including Next route type generation.
3. `npm test` — passed in its single supervised slot: 26 files / 609 unit
   tests and 40/40 process-supervisor tests.
4. `npm run build` — passed; generated-worker parity was current, the static
   build completed, and CSP hardening covered 3 HTML files.
5. `npm run test:e2e` — 117 passed / 1 intentional dedicated-real-export
   skip across the 118-test development catalog.
6. `npm run test:e2e:static:ci` — static smoke passed, then 116 passed / 2
   intentional static-only skips across the 118-test catalog.
7. `npm audit --audit-level=high` — zero vulnerabilities.
8. `npm run test:e2e:static:real-mp4` — 1/1 passed. The produced 1280×720 AVC
   MP4 had `ftyp`/`moov`/`mdat` structure, 120 packets for 5 seconds at 24
   fps, matching preview/download blob ownership, first/last frame decode,
   duration/metadata checks, canvas readback, and a local download.

Exact browser/process cleanup:

- The supervised unit/process gate's owned root 23211, host 23275, browser
  23276, listener 54160, five captured profile locks, and temporary root were
  absent after exit.
- Development E2E used port 54224 and profile
  `playwright_chromiumdev_profile-kBEF7v`; every captured wrapper, server,
  worker, browser, renderer, listener, and four profile locks was absent.
  Its exact dead-PID `.next/dev/lock` residue was removed only after PID,
  port, and holder revalidation.
- Static smoke/E2E used ports 55469/55470 and profile
  `playwright_chromiumdev_profile-v2Kd0Y`; every owned identity, listener,
  profile lock, and temporary root was absent.
- Real MP4 used port 57197 and profile
  `playwright_chromiumdev_profile-Pp1N5a`; every owned identity, listener,
  profile lock, and temporary root was absent.
- An unrelated Astro preview on PID 86075/port 4173 was never signaled and
  exited independently. Final ports 3099, 4173, 4183, and every cycle-owned
  alternate port were free; `.next/dev/lock` was absent; protected user
  Chrome PID/PGID 1368 retained its original start identity.

All Cycle 6 commits are GPG-signed and pushed only to
`review-plan-fix/no-deploy-20260723`. The Pages workflow remains restricted
to pushes on `main`; no deployment occurred.
