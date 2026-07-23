# Cycle 4 Test Engineer Review — 2026-07-23

Reviewed exact revision `975dded34c849db4eb972221ed9483d3d64fb81d`
on `review-plan-fix/no-deploy-20260723`.

## Outcome

Two new, still-actionable test-engineering findings remain:

1. A throwing optional `cleanupError()` accessor can still replace the
   supervisor's TERM/KILL survivor evidence, despite Cycle 3 making
   `describe()` total.
2. The repository has no automated failure-path integration that launches the
   configured Playwright Chromium and proves the real browser/server tree is
   absent after a nonzero or interrupted run.

Neither finding reopens the three explicit Cycle 2 native/host-capability
boundaries. They concern error preservation inside the supported contract and
regression evidence for the actual configured browser topology.

## Current repository and test inventory

- Inventoried all 66 tracked files under `src/`: 41 current production/style
  files and all 25 Vitest files. This included the app shell, every component,
  parser/worker and generated-worker ownership, camera/interpolation/map/export
  libraries, hooks, shared types, CSS, and favicon.
- Inventoried all 11 tracked `scripts/` files, including the 1,631-line
  process-supervisor suite and its fake-tree/harness fixtures, worker build,
  static hardening/server/smoke, map-style generation, and both supervised E2E
  launchers.
- Inventoried both E2E TypeScript files and all 19 fixtures, including GPX/KML,
  every supported Google JSON shape, segment/revisit, antimeridian, trim, XML
  entity/attribute, and invalid-elevation cases. The single Playwright spec
  contains 116 declared cases, including the isolated real-MP4 lane.
- Inventoried all 19 public assets, including the generated parser worker,
  five local map styles, guide art, sample GPX, font assets, icons, and preview
  art. All five map-style JSON files parsed successfully.
- Reviewed `package.json`/lockfile, Vitest, both Playwright configs,
  TypeScript, ESLint, Next, PostCSS, the Pages workflow, `README.md`, and the
  current `.context` rules/project documentation.
- Compared the current tree with the latest aggregate, completed Cycle 3 plan,
  active platform-boundary deferrals, and plan index. Historical review/plan
  archives were treated as provenance rather than current findings.
- Fresh safe evidence: `npm run test:unit -- --reporter=dot` passed **25 files /
  551 tests**. Two expected `Share failed` console-error lines were emitted by
  the deliberate ExportPanel rejection regression.
- Per review constraints, no Playwright command, browser, application/static
  server, process-supervisor suite, build, deploy, commit, push, or branch
  operation was run.

## Findings

### TE4-01 — A throwing cleanup-evidence accessor still masks forced-termination evidence

- **Severity / confidence:** Medium / High
- **Status:** Confirmed by source trace and two deterministic no-process probes
- **Classification:** Cleanup contract correctness plus missing regression
- **Locations:** `scripts/e2e-process-supervisor.mjs:405-427`,
  `scripts/e2e-process-supervisor.mjs:430-438`,
  `scripts/e2e-process-supervisor.mjs:521-533`;
  nearest tests at `scripts/e2e-process-supervisor.test.mjs:1147-1190` and
  `scripts/e2e-process-supervisor.test.mjs:1260-1354`

`stopOwnedProcessTree()` now calls the total `describeTracker()` helper, so a
missing or throwing `describe()` no longer replaces cleanup evidence. It still
calls the optional `tracker.cleanupError?.()` directly. If that accessor
throws after both `signalAndWait()` calls return `false`, its exception escapes
and the authoritative "`... survived forced termination`" result is lost.
`cleanupError` is not part of `assertTrackerContract()`, and no test covers a
throwing accessor.

A direct helper probe returned the exact injected `Error("diagnostic accessor
failed")` after recording TERM and KILL, rather than the survivor error. A
second probe exercised the full accepted atomic-provider path without spawning
a process. It recorded:

```text
start → SIGTERM → SIGKILL → stop → dispose
```

but still rejected with the exact accessor exception
`"cleanup accessor failed"`, omitting that the contained target reported
survival after both signals.

**Concrete failure scenario:** a future atomic Job Object provider or a
refactored POSIX tracker fails while reading its retained cleanup diagnostic
after reporting that Chromium survived TERM and KILL. The wrapper disposes the
provider but surfaces only the secondary accessor failure. Logs no longer say
that the browser tree survived, so the next cycle starts with misleading
cleanup evidence.

**Suggested fix:** make cleanup-evidence retrieval total as well as diagnostic
formatting. Preserve a forced-survivor error whenever TERM and KILL both
return false, and attach or aggregate any `cleanupError()` exception instead
of replacing it. Add both a direct-helper regression and a full
`runSupervisedProcess()` provider regression that assert signal order,
survivor wording/cause, tracker stop, and provider disposal.

### TE4-02 — No real-Chromium negative-path regression proves cleanup between failed E2E runs

- **Severity / confidence:** Medium / High
- **Status:** Confirmed coverage gap; risk requires an integration regression
- **Classification:** Browser-process cleanup evidence
- **Locations:** supervised entries at `package.json:18-23`,
  `scripts/run-dev-e2e.mjs:21-35`, and
  `scripts/run-static-e2e.mjs:19-33`; configured browser/server topology at
  `playwright.config.ts:9-49` and `playwright.static.config.ts:15-55`;
  synthetic process coverage at
  `scripts/e2e-process-supervisor.test.mjs:239-397`;
  CI lanes at `.github/workflows/deploy-pages.yml:27-45`

The process suite deeply exercises real Node fixture trees and injected
snapshots, and ordinary development/static matrices incidentally exercise the
current Playwright topology when their assertions pass. No committed test,
however, deliberately launches the configured Chromium plus its Playwright
driver/server, forces a nonzero result or interruption after the browser is
live, and then makes absence of that exact tree a test assertion. The
completion plans record manual PID/profile/listener inventories after failed
gates, but those observations are not executable repository regressions.

**Concrete failure scenario:** a Playwright/Chromium update changes a launcher,
utility-process, or server relationship while all synthetic fake-tree tests
remain green. A failing E2E assertion returns nonzero, the next loop cycle
starts, and an orphaned Chromium process, profile lock, or development/static
listener contaminates that cycle. Successful E2E matrices do not exercise the
same forced cleanup path.

**Suggested fix:** add one serialized, POSIX-only integration lane that uses a
minimal dedicated Playwright fixture to launch the repository's configured
Chromium, proves the browser and owned server are live, then deliberately
fails or interrupts the supervised command. After the wrapper returns
nonzero, assert that every exact run-owned PID/UID/start-token/marker identity,
profile, and listener is absent while an unrelated sentinel remains alive.
Use a unique port/profile/marker, never broad process-name matching, and make
the fixture's own emergency teardown exact and bounded so a regression test
cannot itself leave stale Chrome. Windows should retain its current safe
pre-launch refusal until an atomic provider exists.

## Final missed-issue sweep

- Rechecked skipped/retry masking, fixed-time waits, fixture reachability,
  generated-worker parity ownership, static-build gates, share-session state,
  Cycle 3 longitude/grid boundaries, More-menu component/E2E coverage,
  real-MP4 metadata/decode assertions, provider rollback/disposal, signal
  forwarding, snapshot fallback, and unrelated-process preservation.
- The Cycle 3 regressions cover the implemented roots they claim: constant-time
  wrapping, bounded grid allocation, Share reset through Export Again,
  responsive More scrolling/focus release, total `describe()` formatting, and
  the accepted tracker method list.
- The three native/host P01 boundaries in
  `.context/plans/deferred-p01-platform-boundaries-cycle2-2026-07-23.md` remain
  accurately scoped and were not duplicated or relabeled.
- No additional new actionable test gap was retained after checking the
  remaining app, parser, camera, export, accessibility, static-host, asset, and
  documentation contracts. No browser or server process was created by this
  review.
