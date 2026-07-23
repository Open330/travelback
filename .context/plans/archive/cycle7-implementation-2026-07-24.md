# Cycle 7 Review Remediation Plan — 2026-07-24

Status: **Completed and archived**

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

Completed all three new findings. No item was deferred and no deployment
command, workflow dispatch, or `main` push occurred.

Implementation evidence:

- P01 replaces all four imported-length point/segment spreads with bounded
  iteration. The generated worker is current. Regressions cover exactly
  250,000 flat Records through the worker, a 125,000-point KML LineString,
  semantic path/visit boundaries, and an over-budget flat input.
- P02 truncates the sanitized export name by Unicode code point. A successful
  export regression retains the complete emoji in
  `'a'.repeat(63) + '😀'`, stays within 64 code points, and is well formed.
- P03 documents the current loaded-session toolbar responsibility and splits
  parsed-file/sample ingress from direct JourneyCreator assembly before both
  converge at `loadTrackIntoSession()`.

Focused evidence:

- The pre-fix 125,000-record worker regression failed with
  `INVALID_GOOGLE_JSON` / `Maximum call stack size exceeded`; it passes after
  bounded appends.
- The direct parser plus worker suites passed 207/207 after adding the exact
  250,000-record boundary.
- The pre-fix Unicode filename regression failed with an isolated high
  surrogate; the post-fix encoder suite passed 27/27.
- Worker generation/freshness, file-scoped lint, and diff checks passed.

Gate-driven corrections: **0**.

Recorded recoverable execution errors: **4**.

- Two additional reviewer spawn attempts hit the agent thread limit. All
  required roles were immediately regrouped across the active reviewers; no
  role was dropped.
- One grouped reviewer completed its underlying scan but delayed report
  synthesis. Its turn was interrupted at a message boundary and the skill's
  single retry completed all five assigned reports.
- Development E2E exited green but left its own `.next/dev/lock`. The lock
  named exact dead PID 83406 and port 58942; the PID was absent, the port was
  free, and `lsof` found no holder. The exact generated lock was then deleted
  with `apply_patch`.

Verification:

1. `npm run lint` — passed.
2. `npm run typecheck` — passed, including Next route type generation.
3. Supervised `npm test` — passed in its single slot: 26 files / 614 unit
   tests and 40/40 process-supervisor tests.
4. `npm run build` — passed; generated-worker parity was current, Next
   produced the static export, and CSP hardening covered 3 HTML files.
5. Supervised `npm run test:e2e` — 117 passed / 1 intentional dedicated-real
   export skip across the 118-test development catalog.
6. Supervised `npm run test:e2e:static:ci` — static smoke passed, then 116
   passed / 2 intentional static-only skips across the 118-test catalog.
7. `npm audit --audit-level=high` — zero vulnerabilities.
8. Supervised `npm run test:e2e:static:real-mp4` — 1/1 passed. The downloaded
   1280×720 AVC MP4 exceeded 1 KiB, contained valid `ftyp`/`moov`/`mdat`
   top-level structure covering the complete file, held 120 packets for 5
   seconds at 24 fps, matched duration and dimensions, decoded first and last
   frames, allowed canvas readback, and shared the preview/download target.

Exact process/browser cleanup:

- The unit/process run's outer root 71207 and supervised Chromium roots
  72483/72567/72568, listener 58876, profile, five locks, marker, and
  temporary root were absent after exit.
- Development E2E used port 58942 and profile
  `playwright_chromiumdev_profile-RgEWR5`. Every recorded wrapper, server,
  worker, browser/renderer, listener, four profile locks, marker, exact stale
  Next lock, and temporary root was absent before the next gate.
- Static E2E used port 60739 and profile
  `playwright_chromiumdev_profile-TMGSLH`. Every recorded identity, listener,
  four profile locks, marker, and temporary root was absent before audit and
  the real-MP4 gate.
- Real MP4 used port 62400 and profile
  `playwright_chromiumdev_profile-GOs09S`. Every recorded identity, listener,
  four profile locks, marker, and temporary root was absent after exit.
- Ports 3099, 4173, and 4183 were clear at final cleanup.
- Protected user Chrome PID/PGID 1368 remained unchanged. A foreign
  Cherrypicker Playwright tree that temporarily owned 4173 during the
  development gate was inventoried and left untouched; it exited naturally.
