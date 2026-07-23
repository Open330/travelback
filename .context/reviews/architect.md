# Architect Review — Cycle 1 (2026-07-23)

Reviewed revision: `994820a71b0b87de78fdfd2a1fd2c17e7ad3b516`

## Result

**New architecture findings: 1.** ARCH1-01 is the architectural root of CR1-01: E2E process ownership is duplicated across two leaf scripts, and neither boundary owns shutdown in both directions.

## System coverage

The review traced the client-only trust boundary, static delivery/base path, parser and generated-worker ownership, full/trimmed track models, segmented interpolation and camera flow, app-shell/session state, MapLibre construction/style/pose generations, Journey Creator gestures, scene authoring/preview/commit, playback/export leases, modal/toast composition, build hardening, and development/static test orchestration. All authored source, tests, fixtures, scripts, configuration, workflow, public text assets, and current architecture/development context were covered. Superseded plans and reviews were searched for provenance and duplicate suppression.

Fresh lint, no-emit typecheck, all 472 unit/component tests, and generated-worker parity passed. This role started no browser, Playwright, Chrome/Chromium, server, build, or deployment process.

## Finding

### ARCH1-01 — The E2E harness has no single bidirectional process owner

Severity: **Medium**
Confidence: **High**
Status: **Confirmed architecture boundary defect**
Related code finding: **CR1-01**

Evidence:

- `scripts/run-dev-e2e.mjs:6-33` and `scripts/run-static-e2e.mjs:5-32` separately implement the same port validation/reservation policy.
- `scripts/run-dev-e2e.mjs:52-76` and `scripts/run-static-e2e.mjs:36-60` separately resolve/spawn Playwright and propagate only child-to-parent exit.
- `playwright.config.ts:9-50` and `playwright.static.config.ts:15-56` repeat the worker/project/Chromium launch policy around target-specific server details.
- In both target paths, ownership flows downward—wrapper → Playwright → server/browser—but shutdown ownership is assumed to flow upward without an explicit contract. A signal received only by the wrapper crosses no boundary.
- The same missing cleanup appears in both wrappers today, demonstrating that this is not merely hypothetical future drift. Fixing only one entry point would leave the other capable of leaking the same descendants.

Concrete failure scenario:

A repeated verification cycle interrupts the wrapper process on timeout. Because no common orchestrator owns the complete child lifecycle, Playwright remains live and retains its Next/static server and Chromium descendants. The next cycle sees occupied ports, a dev lock, stale browser resources, or a misleading reusable-server candidate. Static and development suites can fail differently depending on which duplicated runner was interrupted.

Recommended boundary:

Introduce a shared `runPlaywrightTarget`-style orchestration module with explicit ownership metadata:

1. reserve or discover the target port;
2. distinguish reused external resources from processes created by this run;
3. spawn one Playwright child;
4. relay wrapper termination to that exact owned child/tree;
5. wait for natural teardown, then perform bounded exact-tree escalation;
6. settle once and mirror child status.

Keep target-specific values—config path, environment, and optional active-Next reuse—as data passed to that owner. A shared base Playwright configuration can also hold the common Chromium/project policy, but lifecycle consolidation is the correctness-critical boundary.

Required regression:

Use a fake process tree to test the orchestration contract without launching a browser. Verify normal completion, nonzero exit, wrapper `SIGINT`/`SIGTERM`, bounded escalation, and preservation of a reused/unrelated sentinel. Then retain the existing sequential one-browser development/static suites as integration coverage.

## Existing architecture debt and final sweep

The broad app-shell prop surface and large `MapView` remain known deferred architecture debt with existing exit criteria; the playback/elevation/drag/export performance boundaries remain evidence-gated. Parser semantics now have a generated worker source of truth, base-path consumers share one normalizer, and map style/pose hydration has an explicit generation model. No second new architecture root met the reporting threshold.
