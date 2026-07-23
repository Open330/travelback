# Cycle 11 Review Remediation Plan — 2026-07-24

Status: **Complete**

Source review: `.context/reviews/_aggregate.md`
Reviewed base: `a7adcdc1ff2b9a296a77f125c39a538320dd22f7`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment mode: **none**

## Scope and policy

- Schedule the single new aggregate finding. **No Cycle 11 finding is
  deferred.**
- Preserve the three explicit native/host-capability deferrals without
  relabeling, expanding, or attempting to solve them.
- Retain `.context/plans/user-injected/pending-next-cycle.md`; its cleanup
  task is due only when the outer loop reaches its final stop condition.
- Implement in fine-grained semantic, gitmoji-prefixed, GPG-signed commits.
  Push only `review-plan-fix/no-deploy-20260723`.
- Never push `main`, run a deployment command, dispatch a workflow, or change
  deployment/access state.
- Ralph is unavailable. Prompt 3 uses the established iterative fallback:
  focused regression first, bounded implementation, full gates, exact
  browser/process ownership audits, plan completion, signed commits, and
  branch-only pushes.
- A failed workstream or gate is recorded and repaired when possible, but
  never terminates this cycle or the outer loop. Every remaining gate is still
  attempted.

## Process and browser hygiene

The Cycle 11 parent exclusively owns full-suite and browser-capable commands.
Descendants may run only explicit file-scoped Vitest, lint, typecheck, syntax,
worker-parity, and diff checks.

For every supervised full-suite, browser, Playwright, or server execution:

1. Inventory pre-existing relevant processes and listeners, recording exact
   PID, PPID, PGID, UID, start token, command/profile, and the default plus
   selected ports. Inspect `.next/dev/lock`.
2. Give each run a unique Cycle 11 marker, temporary root/profile, and
   explicit alternate port. Record exact identities, listener, profile, and
   locks.
3. Run the unit/process suite, development E2E, static E2E, and real-MP4 gate
   strictly sequentially.
4. Let supervised cleanup finish. If intervention is required, revalidate
   exact PID, UID, start token, ancestry/marker, and ownership; signal only
   those exact identities with TERM, bounded wait, then KILL only if needed.
5. Prove the exact marker, identities, profile/lock holders, listener,
   temporary root, and generated Next lock are absent before the next
   browser-capable command.
6. Never use `agent-browser close`, `pkill`, `killall`, name-only signaling,
   broad process matching/deletion, or shared browser control.
7. Preserve protected user Chrome PID/PGID 1368 and every unrelated browser,
   Playwright, agent-browser, and server process.

Prompt 1 launched no browser or server. Its baseline found the default and
Cycle 11 candidate ports free, `.next/dev/lock` absent, and protected Chrome
PID 1368 unchanged. A slow read-only reviewer inventory PID was revalidated,
terminated with exact-PID TERM, and proved absent before Prompt 2.

## P01 — Reconcile imperative camera publication with smoothing ownership

Finding: **AGG11-01** (Low/High)

Primary files:

- `src/components/MapView.tsx`
- `e2e/travelback.spec.ts`

Implementation:

- When `applyCameraState` publishes a camera through MapLibre `jumpTo`, store
  an owned clone of that exact state in `lastCameraStateRef`.
- Preserve explicit-seek, large-jump snapping, Follow-off manual ownership,
  export isolation, and the existing scene-preview exit contract.
- Extend the paused Orbit duration regression to resume playback after a
  duration change whose bearing delta remains below the large-jump threshold.

Acceptance:

- The paused duration change still updates the visible camera immediately.
- Resuming playback continues forward from the published proposed-duration
  pose instead of smoothing backward from the pre-change authority.
- The smoothing ref cannot retain a caller-owned mutable center tuple.
- Follow-off duration changes continue to preserve the manual camera.
- Existing scene preview, transition edit, seek, and export camera behavior
  remain green.

## Verification gates

Run focused regression evidence before the complete matrix. Then attempt every
gate even if an earlier one fails:

1. `npm run lint`
2. `npm run typecheck`
3. supervised `npm test` (623-unit baseline plus 40 process tests)
4. `npm run build`
5. supervised `npm run test:e2e` (119-test catalog: 118 pass, 1 expected skip)
6. supervised `npm run test:e2e:static:ci` (119-test catalog: 117 pass,
   2 expected skips)
7. `npm audit --audit-level=high`
8. supervised `npm run test:e2e:static:real-mp4`

The real-MP4 gate must retain picker-once behavior, shared preview/download
blob identity, 1280×720 metadata, approximately five-second duration,
first/last frame decode, canvas readback, a downloaded file larger than
1 KiB, complete top-level `ftyp`/`moov`/`mdat` structure, AVC, and 120 packets
with timing.

Browser-capable gates run sequentially, each with a fresh pre-run ownership
inventory and an exact survivor/profile/listener audit before the next gate.
Use explicit alternate ports and do not touch any unrelated owner.

## Progress

- P01: Complete
- Full verification: Complete (all eight gates)
- Signed commits and no-deploy branch push: Complete

## Completion record

- Implemented the single scheduled finding with no deferral:
  `applyCameraState` now gives the published imperative camera state ownership
  of the smoothing reference through an exact clone, so resumed declarative
  playback advances from the visible duration-adjusted pose.
- Extended the existing paused Orbit duration regression through resume and
  reproduced the old backward handoff as a signed bearing step of about
  -140 degrees before the production fix. The corrected focused regression
  passed while retaining the Follow-off manual-camera checks.
- Full gates passed: lint; typecheck; 623 unit tests; 40 process-supervisor
  tests; production build; 118 development E2E tests with 1 expected skip;
  static smoke plus 117 static E2E tests with 2 expected skips; zero audit
  vulnerabilities; and the isolated real WebCodecs MP4 export. A final-HEAD
  development E2E reconciliation repeated the 118-pass/1-skip result with no
  retries.
- Two gate-driven test-harness repairs were completed: the camera sampler now
  stops at the first resumed publication instead of crossing a later scene
  boundary, and the retained-session New Route regression now waits for the
  Journey Creator's scheduled Cancel autofocus before moving focus to the app
  root. The repaired complete static matrix and final development matrix both
  passed.
- Every browser-capable run used an explicit alternate listener, unique
  temporary root/profile, and exact PID/process-tree audit. Owned processes,
  generated locks, profiles, listeners, and temporary roots were absent
  after cleanup. Protected user Chrome PID/PGID 1368 was unchanged, and
  unrelated browser/server owners were left untouched.
- All Cycle 11 commits were GPG-signed and pushed only to
  `review-plan-fix/no-deploy-20260723`. No deployment command, workflow
  dispatch, deployment-state mutation, or push to `main` occurred.
