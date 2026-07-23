# Cycle 3 Debugger Review — 2026-07-23

Reviewed exact revision `7f013a207e64ca54c0864edc5aaf061ebfb36bdf`.

## Result

**New confirmed implementation defects: 1.** `DB3-01` is the same root as `TE3-01`: a tracker can satisfy the supervisor's enforced contract and still crash the cleanup error path because `describe()` is used but never required.

## DB3-01 — Forced-termination evidence is replaced by an unguarded `tracker.describe()` crash

- Classification: **[P01]**
- Severity / confidence: **Medium / High**
- Status: **Confirmed by a deterministic, no-process probe**
- Locations: `scripts/e2e-process-supervisor.mjs:405-425,509-520`; provider handoff validation at `scripts/e2e-process-supervisor.mjs:724-735,809`; incomplete branch coverage at `scripts/e2e-process-supervisor.test.mjs:1215-1231`.

### Root-cause trace

1. `assertTrackerContract()` accepts any object with callable `start`, `signalAndWait`, and `stop`.
2. `stopOwnedProcessTree()` calls `signalAndWait(initialSignal, ...)`, escalates to `signalAndWait('SIGKILL', ...)`, and receives `false` from both calls.
3. The function then formats the intended survivor error with ``tracker.describe()``.
4. A contract-valid tracker without that optional-looking method throws `TypeError: tracker.describe is not a function`; the intended “survived forced termination” result is lost.

The same secondary crash occurs if an accepted tracker exposes `cleanupError()` but not `describe()`. The built-in POSIX tracker implements `describe()`, so the current production path is unaffected; the defect is at the explicitly supported injected/atomic-provider boundary, including the future Windows Job Object handoff the contract was added to accommodate.

### Repair boundary

Make the enforced contract and all its consumers agree. Requiring `describe()` during handoff is fail-fast but must retain the already-registered provider rollback; a total internal formatter with a stable generic description is also valid. Do not weaken cleanup, infer success from root death, broaden name-based killing, or reopen the documented portable Node containment deferrals.

### Mandatory P01 proof

- Commit a **pre-fix failing** regression first. It must reproduce both `signalAndWait() === false` and `cleanupError()` diagnostic branches without `describe()`, and prove the original cleanup result/cause is retained.
- Use unique marker plus exact PID/UID/start identities and an unrelated sentinel in the handoff-level test. Preserve pre/post survivor output and prove rollback/disposal runs.
- After the fix, require a separate reviewer to audit the diff, run the focused test and the complete process suite, and repeat the exact owned-survivor/sentinel scan. A generic `pgrep chrome` or broad process-name kill is not acceptable evidence.

## Rejected hypotheses and verification

- The pre-observation marker/ancestry escape, lack of pidfd-grade signaling, and exact global marker scan are already recorded P01 deferrals; no portable-Node workaround was relitigated.
- Windows refusal without a Job Object provider is intentional. The missing user-facing platform caveat is a documentation defect (`DOC3-01`), not a request to bypass containment.
- Antimeridian bounds, empty-scene camera parity, export DPR restoration, sample-load invalidation, and MP4 box validation retained their Cycle 2 regression coverage.
- Fresh checks passed: 541/541 Vitest tests and 34/34 process-supervisor tests. No browser was launched, and the process suite left no owned fake-process survivor.

## Final debugger sweep

I traced all current source, scripts, tests, configuration, public/project documentation, and every Cycle 2 diff consumer for exception masking, stale async completion, cleanup ordering, state restoration, bounds/endpoint errors, validation gaps, and process identity loss. No second implementation failure survived source tracing and focused probes.
