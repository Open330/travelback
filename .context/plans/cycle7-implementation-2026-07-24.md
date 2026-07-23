# Cycle 7 Review Remediation Plan — 2026-07-24

Status: **Planned**

Source review: `.context/reviews/_aggregate.md`
Reviewed base: `216001ff2bc4ff8c31da333e50e6d0e982816b5b`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment mode: **none**

## Scope and policy

- Schedule all 3 new aggregate findings. **No Cycle 7 finding is deferred.**
- Preserve the three explicit native/host-capability deferrals without
  relabeling, expanding, or attempting to solve them.
- Retain `.context/plans/user-injected/pending-next-cycle.md`; its final-loop
  cleanup task is not due during Cycle 7.
- Archive the completed Cycle 6 implementation record and update the plan
  index.
- Implement in fine-grained semantic, gitmoji-prefixed, GPG-signed commits.
  Push only `review-plan-fix/no-deploy-20260723`.
- The Pages workflow triggers only on `main`; never push `main`, run a
  deployment command, or dispatch a workflow.
- Ralph is unavailable. Prompt 3 uses the established iterative fallback:
  bounded implementation workstreams, focused regressions, complete gates,
  exact browser/process ownership audits, plan completion, signed commits,
  and branch-only pushes.
- A failed workstream or gate is recorded and repaired when possible, but
  never terminates this cycle or the outer loop. Every remaining gate is
  still attempted.

## Process and browser hygiene

The Cycle 7 parent exclusively owns full-suite and browser-capable commands.
Descendants may run only explicit file-scoped Vitest, lint, typecheck, syntax,
and diff checks.

For every supervised full-suite, browser, Playwright, or server execution:

1. Inventory pre-existing relevant processes and listeners, recording exact
   PID, PPID, PGID, UID, start token, command/profile, and ports 3099, 4173,
   and 4183. Inspect `.next/dev/lock`.
2. Give the run a cryptographically unique marker, temporary root/profile,
   and explicit unique port. Record the exact run root, descendants, browser
   identities, listener, profile, and locks.
3. Run the unit/process suite, development E2E, static E2E, and real-MP4 gate
   strictly sequentially. Run `npm test` once unless a gate-driven correction
   requires one supervised rerun.
4. Let supervised cleanup finish. If intervention is required, revalidate
   exact PID, UID, start token, ancestry/marker, and ownership; signal only
   those identities with TERM, bounded wait, then KILL only if necessary.
5. Prove the exact marker, identities, profile holders/locks, listener,
   temporary root, and any generated Next lock are absent before the next
   browser-capable command.
6. Never use `agent-browser close`, `pkill`, `killall`, name-only signaling,
   broad process matching/deletion, or shared browser control.
7. Preserve protected user Chrome PID/PGID 1368 and every unrelated browser,
   Playwright, agent-browser, and server process. Never signal an unrelated
   default-port owner.

Prompt 1 launched no browser or server. Its pre-review audit found ports
3099, 4173, and 4183 free, `.next/dev/lock` absent, and protected Chrome 1368
unchanged.

## Implementation workstreams

### P01 — Replace parser argument spreading with bounded collection

Finding: **AGG7-01** (High/High)

Primary files:

- `src/lib/googleJsonParser.ts`
- `src/lib/parser.ts`
- `src/lib/parser.test.ts`
- `src/workers/trackParser.worker.test.ts`
- `public/workers/trackParser.worker.js` (generated)

Implementation:

- Replace every point- or segment-array spread whose length derives from an
  imported file with ordinary bounded iteration.
- Preserve accepted producer order, timed-observation deduplication,
  segment-start indexes, and point-budget enforcement.
- Regenerate the checked-in worker from source.
- Avoid changing the advertised byte or point limits merely to mask the VM
  argument ceiling.

Acceptance:

- A flat Google Records input at the accepted high-cardinality boundary
  returns all points without `RangeError`.
- Large semantic segment collections append without a call-sized argument
  list and retain segment starts.
- A large single KML `LineString` below the XML cap imports successfully.
- Existing direct and worker parser behavior remains green, and the first
  point over budget still reports `TOO_MANY_POINTS`.
- The generated worker contains no corresponding user-sized spread and
  passes parity checks.

### P02 — Truncate export filenames by Unicode code point

Finding: **AGG7-02** (Low/High)

Primary files:

- `src/lib/videoEncoder.ts`
- `src/lib/videoEncoder.test.ts`

Implementation:

- Keep the export-specific 64-character cap while defining its unit as
  Unicode code points.
- Preserve NFKC normalization, reserved/control-character removal,
  whitespace normalization, trailing dot/space cleanup, fallback name,
  prefix, and `.mp4` suffix.

Acceptance:

- A successful export named `'a'.repeat(63) + '😀'` retains the complete
  emoji and publishes a well-formed filename.
- The sanitized name is at most 64 code points.
- Existing non-Latin, reserved-character, fallback, and download behavior
  remains unchanged.

### P03 — Correct architecture ownership and ingress diagrams

Finding: **AGG7-03** (Low/High)

Primary file:

- `.context/project/02-architecture.md`

Implementation:

- Describe `TrackToolbar` as loaded-session actions plus mobile settings,
  naming the current primary actions without claiming a Reset control.
- Split file/sample parsing and direct JourneyCreator assembly into separate
  ingress branches that converge at `loadTrackIntoSession()`.

Acceptance:

- Every documented edge is supported by the current page/component call
  graph.
- The diagram no longer presents `parser.ts` as a universal manual-journey
  validation boundary.

## Verification gates

Run focused regressions after each workstream. Before completion, attempt
every configured gate even if an earlier one fails:

1. `npm run lint`
2. `npm run typecheck`
3. supervised `npm test` (609 unit baseline + 40 process tests)
4. `npm run build`
5. supervised `npm run test:e2e` (118-test catalog)
6. supervised `npm run test:e2e:static:ci` (118-test catalog)
7. `npm audit --audit-level=high`
8. supervised `npm run test:e2e:static:real-mp4`

The focused real-MP4 gate must retain `ftyp`/`moov`/`mdat` validation, AVC,
120 packet/timing assertions, duration, metadata/dimensions, first/last frame
decode, canvas readback, preview/download target, and downloaded-file
assertions.

Browser-capable gates run sequentially, each with a fresh pre-run ownership
inventory and an exact survivor/profile/listener audit before the next gate.
Use explicit alternative ports and do not touch any unrelated owner.

## Completion log

Pending implementation and verification.
