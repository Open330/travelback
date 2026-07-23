# Cycle 3 Test Engineer Review — 2026-07-23

Reviewed exact revision `7f013a207e64ca54c0864edc5aaf061ebfb36bdf` on `review-plan-fix/no-deploy-20260723`.

## Outcome

One new P01 regression gap is confirmed. The supervisor accepts a tracker without `describe()`, but its forced-termination and cleanup-verification error branches call `describe()` unconditionally. Existing tests cover a provider cleanup exception, not the accepted tracker reaching either diagnostic branch. This is the same implementation root as `DB3-01` and should be counted once.

## Test and repository inventory

- Mapped all 25 Vitest files under `src`, `scripts/e2e-process-supervisor.test.mjs`, the complete Playwright specification, all 21 E2E fixtures/helpers, package scripts, both Playwright configurations, Vitest/TypeScript/ESLint/Next configuration, worker generation, static hardening/server/smoke scripts, workflow, public assets, README, and project documentation.
- Traced the Cycle 2 changes and their regressions for process ownership, teardown snapshot failure, polling rate, DPR restoration, antimeridian camera geometry, empty-scene export behavior, real MP4 validation, compact layout, sample loading, checkout-token persistence, dependency audit, and camera terminology.
- Fresh non-browser checks passed: `npm run test:unit -- --reporter=dot` reported **25 files / 541 tests**, and `npm run test:processes` reported **34/34 tests**.
- No browser or E2E command was started. Exact post-process-test inspection found no `TRAVELBACK_OWNED`, `fake-process-tree`, or `supervisor-harness` survivor. Browser trees already owned by other concurrent reviewers were left untouched.

## Finding

### TE3-01 — No regression exercises an accepted tracker that cannot prove termination

- Classification: **[P01]**
- Severity / confidence: **Medium / High**
- Status: **Confirmed regression gap with deterministic source failure**
- Locations: contract validation at `scripts/e2e-process-supervisor.mjs:509-520`; cleanup diagnostics at `scripts/e2e-process-supervisor.mjs:405-425`; nearest provider-cleanup test at `scripts/e2e-process-supervisor.test.mjs:1215-1231`.
- Concrete gap: `assertTrackerContract()` requires only `start`, `signalAndWait`, and `stop`. The nearest failing-cleanup provider test makes `signalAndWait()` throw immediately, so it never reaches the later diagnostic code. No test supplies a contract-valid tracker whose two `signalAndWait()` calls return `false`.
- Deterministic pre-fix probe: an injected tracker with `start()`, `stop()`, and `signalAndWait() { return false }` is accepted, receives `SIGTERM` and `SIGKILL`, and then rejects with `TypeError: tracker.describe is not a function` instead of the intended forced-termination failure.
- Failure scenario: a future atomic containment provider or injected tracker reports that owned processes remain after KILL. The supervisor masks that P01 cleanup result with a secondary contract crash, making the provider contract false and obscuring the evidence needed to investigate the survivor.

#### Required P01 implementation evidence

1. **Before production edits**, add and preserve a failing regression that passes a tracker satisfying the currently advertised contract, returns `false` for TERM and KILL, and asserts a stable forced-termination error rather than `TypeError`. Exercise the `runSupervisedProcess()` handoff as well as the helper so rollback/disposal behavior is visible.
2. Give that regression unique owned-process identities and an unrelated sentinel. Record an exact PID/UID/start/ownership-marker survivor scan before and after the failed cleanup; broad name matching is not acceptable.
3. Fix the root contract once: either validate `describe()` before accepting the handoff or make diagnostic formatting total with a stable fallback. Retain the original cleanup cause and TERM/KILL evidence.
4. Have an independent reviewer run the focused regression, all process-supervisor tests, and the same exact survivor/sentinel scan after the fix. The audit must confirm that no owned process survives and the unrelated sentinel remains alive.

## Final test sweep

The final pass checked skipped/retry masking, test-stub leakage, async abort races, stale locators, fixture parity, export container validation, camera endpoint assertions, compact geometry, process-provider rollback, signal forwarding, snapshot failure, marker discovery, Windows refusal, and foreign-process preservation. The three documented portable-containment limits remain explicit deferrals and were not reopened. The overview's “Ground Follow” wording is accurate shorthand for the internal preset and does not warrant a regression test.
