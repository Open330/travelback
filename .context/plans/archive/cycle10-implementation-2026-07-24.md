# Cycle 10 Review Remediation Plan — 2026-07-24

Status: **Complete**

Source review: `.context/reviews/_aggregate.md`
Reviewed base: `570aa3510b6ca1431b47001e860d43876df39e15`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment mode: **none**

## Scope and policy

- Schedule all three new aggregate findings. **No Cycle 10 finding is
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

The Cycle 10 parent exclusively owns full-suite and browser-capable commands.
Descendants may run only explicit file-scoped Vitest, lint, typecheck, syntax,
worker-parity, and diff checks.

For every supervised full-suite, browser, Playwright, or server execution:

1. Inventory pre-existing relevant processes and listeners, recording exact
   PID, PPID, PGID, UID, start token, command/profile, and the default plus
   selected ports. Inspect `.next/dev/lock`.
2. Give each run a unique Cycle 10 marker, temporary root/profile, and
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

Prompt 1 launched no browser or server. Its baseline found ports 3099, 4173,
4183, 4310, 4311, and 4312 free, `.next/dev/lock` absent, and protected Chrome
PID 1368 unchanged.

## P01 — Give XML display names schema ownership

Finding: **AGG10-01** (Low/High)

Primary files:

- `src/lib/parser.ts`
- `src/lib/parser.test.ts`

Implementation:

- Add a bounded XML helper that selects a schema-owned parent by local name
  and document namespace, then reads only its direct schema-owned `name`
  child.
- Preserve GPX priority (`trk` before `metadata`) and KML priority (`Document`
  before `Placemark`).
- Preserve canonicalization and localized-fallback metadata when no
  schema-owned explicit name exists.

Acceptance:

- A leading foreign GPX `trk/name` or `metadata/name` cannot replace a later
  schema-owned track name.
- A leading foreign KML `Document/name` or `Placemark/name` cannot replace a
  later schema-owned document name.
- Foreign-only names produce the existing format fallback and
  `fallbackNameSource`.
- Existing geometry, name-canonicalization, and parser-budget tests remain
  green.

## P02 — Publish a duration-dependent paused camera immediately

Finding: **AGG10-02** (Low/High)

Primary files:

- `src/app/page.tsx`
- `e2e/travelback.spec.ts`

Implementation:

- Replace raw playback `setDuration` publication with a handler that stores
  the new duration.
- When a track exists and Follow owns the camera, compute the committed
  scene-camera state at current progress using the proposed duration and
  apply it immediately.
- When Follow is off, preserve the user's manual camera without an imperative
  scene-camera publication.

Acceptance:

- At paused nonzero progress inside an elapsed-sensitive scene, changing
  duration updates the bearing without waiting for progress to move.
- The preview uses the same proposed duration that was committed.
- Follow-off duration changes preserve the manual camera.
- Existing scene/transition preview and export camera behavior remain green.

## P03 — Suspend retained-trip hotkeys during Journey Creator

Finding: **AGG10-03** (Medium/High)

Primary files:

- `src/app/page.tsx`
- `e2e/travelback.spec.ts`

Implementation:

- Pass no active trip to `usePlaybackHotkeys` while Journey Creator owns the
  provisional interaction, without discarding the retained session track.
- Keep non-trip shortcuts such as Keyboard Help available.
- Extend the existing retained-session Journey regression from an explicitly
  noninteractive focus target.

Acceptance:

- Space, Left/Right, F, and E cannot play, seek, change Follow, or open Export
  for the hidden retained trip.
- Cancel restores the unchanged retained progress, playback-resume intent,
  Follow ownership, and camera.
- Trip hotkeys resume after Journey Creator closes.

## Verification gates

Run focused regressions before the complete matrix. Then attempt every gate
even if an earlier one fails:

1. `npm run lint`
2. `npm run typecheck`
3. supervised `npm test` (617-unit baseline plus 40 process tests)
4. `npm run build`
5. supervised `npm run test:e2e` (118-test catalogue before this plan)
6. supervised `npm run test:e2e:static:ci` (118-test catalogue before this plan)
7. `npm audit --audit-level=high`
8. supervised `npm run test:e2e:static:real-mp4`

The real-MP4 gate must retain picker-once behavior, preview/download identity,
1280×720 metadata, approximately five-second duration, first/last frame
decode, canvas readback, a downloaded file larger than 1 KiB, complete
top-level `ftyp`/`moov`/`mdat` structure, AVC, and 120 packets with timing.

Browser-capable gates run sequentially, each with a fresh pre-run ownership
inventory and an exact survivor/profile/listener audit before the next gate.
Use explicit alternate ports and do not touch any unrelated owner.

## Progress

- P01: Complete
- P02: Complete
- P03: Complete
- Full verification: Complete
- Signed commits and no-deploy branch push: Complete

## Completion record

- Implemented every scheduled finding with no deferral: schema-owned GPX/KML
  display names, immediate paused duration-dependent camera publication, and
  retained-trip hotkey suspension during Journey Creator.
- Focused parser coverage passed 186 tests. The combined P02/P03 browser
  regressions passed 2 tests after reproducing both product failures.
- Full gates passed: lint; typecheck; 623 unit tests; 40 process-supervisor
  tests; production build; 118 development E2E tests with 1 expected skip;
  static smoke plus 117 static E2E tests with 2 expected skips; zero audit
  vulnerabilities; and the isolated real WebCodecs MP4 export.
- Four recoverable focused-regression harness corrections were completed
  before the full gate: two scene-mode accessibility locator corrections,
  keyboard activation around the Next development overlay, and a
  clamp-safe manual-camera movement assertion. The complete gate required no
  further repair.
- Every browser-capable run used an explicit alternate listener, unique
  temporary root/profile, and exact PID/process-tree audit. Owned processes,
  generated locks, profiles, listeners, and temporary roots were absent
  after cleanup. Protected user Chrome PID/PGID 1368 was unchanged.
- All Cycle 10 commits were GPG-signed and pushed only to
  `review-plan-fix/no-deploy-20260723`. No deployment command, workflow
  dispatch, deployment-state mutation, or push to `main` occurred.
