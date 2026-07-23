# Deferred P01 Platform Boundaries — Cycle 2 — 2026-07-23

These evidence-gated items were found while reconciling the implementation of
AGG2-01 through AGG2-03. They do not defer the original practical fixes:
marker-retaining descendants and markerless descendants observed through an
owned PPID/PGID are inventoried, cached by process identity, and receive
bounded exact-PID cleanup. Windows refuses before target launch unless an
atomic containment provider is supplied.

The records below prevent those practical guarantees from being overstated as
portable kernel containment. None may be closed by faster polling, broader
process-name matching, or an assertion that only the root PID exited.

## Governing repository rules

- `.context/development/01-conventions.md` fixes the supported runtime at
  **Node.js 24 LTS**.
- The same file requires a **minimal dependency footprint**.

Node 24 provides PID-based signaling but no macOS containment/process-handle
API. A native helper, privileged cgroup delegation, Job Object host, or
disposable runner would expand the repository's runtime/dependency/host
contract. Until that capability is approved and available, the supervisor
must keep the narrower contract below and explicitly refuse unsupported
launches; it may not compensate with broad cleanup.

## DF-C2-20260723-P01-01 — Pre-observation identity erasure needs an OS boundary

- **Citation:** `scripts/e2e-process-supervisor.mjs`
  (`PosixOwnedProcessTracker.refreshNow`, `runSupervisedProcess`);
  `scripts/fixtures/fake-process-tree.mjs`;
  `scripts/e2e-process-supervisor.test.mjs`
  (`reaps a cached descendant after it strips the inherited ownership marker`)
- **Original severity/confidence:** AGG2-01 High / High
- **Current supported contract:** Cleanup covers processes that retain the
  unguessable inherited run marker and markerless processes observed through
  an owned PPID/PGID before detaching. Exact cached identities remain eligible
  after reparenting, process-group changes, and later snapshot failures.
- **Reason for deferral:** A process that removes the marker, creates a new
  session/group, and reparents before any observation is indistinguishable to
  portable polling from an unrelated same-user process. Pure Node 24 on macOS
  exposes no cgroup, Job Object, subreaper, or equivalent descendant
  containment handle. Killing by name, user, or an unvalidated PID would
  violate the unrelated-process safety contract.
- **Evidence required to reopen:** An approved native/platform provider or
  disposable-runner boundary. Linux support may use a delegated cgroup-v2
  subtree only after a capability probe proves pre-exec membership and
  `cgroup.kill`; macOS needs a separate containment provider or an isolated
  runner whose destruction is the boundary.
- **Exit criterion:** A fixture clears the marker, calls `setsid`, double-forks,
  and exits its parent before the first snapshot. Cleanup must still terminate
  it under PID churn while leaving an unrelated sentinel alive, without broad
  matching or host-wide environment enumeration.

## DF-C2-20260723-P01-02 — PID signaling is not pidfd-grade on portable Node/macOS

- **Citation:** `scripts/e2e-process-supervisor.mjs`
  (`parsePosixProcessTable`, `sameProcessIdentity`,
  `PosixOwnedProcessTracker.signalProcessesOnce`)
- **Original severity/confidence:** P01 follow-up review Medium / High
- **Current mitigation:** Cached targets must match PID, UID, and `ps lstart`,
  and every target is revalidated before signaling. Unsafe wrapper/system
  identities and groups are rejected.
- **Reason for deferral:** macOS `ps lstart` has whole-second precision, Node
  24 exposes PID-based `process.kill`, and macOS has no Linux-style pidfd.
  Native `proc_pidinfo` can expose a finer start timestamp, but Node has no
  bundled libproc binding and read-then-kill still has a PID-reuse time-of-check
  to time-of-use race.
- **Evidence required to reopen:** An approved native process-handle provider,
  a platform containment backend that removes individual PID signaling, or a
  Node runtime API that supplies stable process handles.
- **Exit criterion:** A deterministic same-second PID-reuse/churn test proves
  the owned handle is signaled and a replacement process plus unrelated
  sentinel are not. Validation and signaling must be one handle-safe
  operation, not two PID-based calls.

## DF-C2-20260723-P01-03 — Exact global marker recovery still reads host environments

- **Citation:** `scripts/e2e-process-supervisor.mjs`
  (`readPosixMarkerSnapshot`, `readPosixProcessIdentities`,
  `PosixOwnedProcessTracker.start`, `PosixOwnedProcessTracker.refreshNow`)
- **Original severity/confidence:** AGG2-02 Medium / High
- **Current mitigation:** Steady-state topology scans omit environments;
  cached identity reads are targeted and environment-free; full marker scans
  are restricted to bounded discovery/recovery boundaries, never logged, and
  parsed only to the run marker.
- **Reason for deferral:** Standard macOS `ps -E` appends the complete
  environment and cannot select a single key. Eliminating global environment
  reads while retaining exact discovery of an already reparented marker-only
  process requires an OS membership/containment provider. Dropping marker
  recovery silently would reopen AGG2-01.
- **Evidence required to reopen:** The same containment backend as
  DF-C2-20260723-P01-01, or a platform API that enumerates only members of the
  pre-established run boundary.
- **Exit criterion:** Process supervision and forced teardown pass the
  immediate-orphan and unrelated-sentinel matrix with no full-host `ps -E`,
  `/proc/*/environ`, process-name scan, or secret-bearing buffer.
