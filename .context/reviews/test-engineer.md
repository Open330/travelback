# Test Engineer Review — Cycle 1

Date: 2026-07-23
Reviewed revision: `994820a71b0b`
Deployment: not performed

## Result

Five actionable testing defects were found. The most important are that deployment does not run the 472-test Vitest suite, the real MP4 pipeline is skipped by the required CI path, and the E2E wrappers have no interrupted-run descendant cleanup.

## Inventory and execution

Reviewed all 21 Vitest files and their 472 test declarations, every declaration in the 3,240-line Playwright suite, all 19 fixtures, both Playwright configs, Vitest config, all build/smoke/server/E2E scripts, package commands, Pages CI, and source paths tied to the assertions. No Playwright run was started by this review because another reviewer owned the active E2E tree and the user explicitly required exact process hygiene.

Fresh evidence:

- `npm test -- --reporter=dot`: 21 test files passed, 472 tests passed.
- `npm run check:worker`: passed.

## Findings

### TEST-01 — A deployment can proceed while the entire unit/component suite is failing

Severity: **High**
Confidence: **High**
Status: **Confirmed**

Evidence:

- `package.json:16` defines the 472-test Vitest gate as `npm test`.
- `.github/workflows/deploy-pages.yml:26-32` runs install, lint, typecheck, audit, build, and static E2E, but never runs `npm test`.
- `package.json:19` confirms `test:e2e:static:ci` contains only static smoke plus the Playwright wrapper.

Concrete failure scenario: a camera interpolation, parser edge case, worker protocol, export cancellation, or component focus regression makes Vitest red while the smaller set of production E2E journeys remains green. A push to `main` still uploads and deploys `out/`.

Suggested fix: add `npm test` before the build/deploy artifact step. Keep it a separately named CI step so failures are visible and cannot be mistaken for E2E failures.

### TEST-02 — The required CI path never exercises the real WebCodecs/mediabunny export

Severity: **High**
Confidence: **High**
Status: **Confirmed**

Evidence:

- `e2e/travelback.spec.ts:2955-3017` contains the sole real-MP4 browser smoke but skips it unless `TRAVELBACK_REAL_EXPORT=1`.
- `.github/workflows/deploy-pages.yml:32` invokes static E2E without that variable.
- The ordinary export journeys at `e2e/travelback.spec.ts:2794-2953` and `e2e/travelback.spec.ts:3028-3076` enable the local 22-byte export stub.
- `src/lib/videoEncoder.test.ts:14-72` mocks mediabunny, VideoFrame, and sample encoding; those tests validate orchestration, not compatibility with the installed encoder/runtime.

Concrete failure scenario: a mediabunny API upgrade, codec mapping change, CSP chunk-loading regression, canvas/WebGL capture failure, or invalid MP4 finalization ships even though the deployment’s headline feature no longer produces a playable file.

Suggested fix: add one required, isolated, lowest-cost H.264 real-export static test on a known WebCodecs-capable Chromium runner, with its own bounded timeout and exact process cleanup. Keep the broader UI cases stubbed for speed. Optionally schedule capability-gated H.265/AV1 probes separately.

### TEST-03 — Interrupted E2E wrappers can leave Playwright, web-server, and Chromium descendants alive

Severity: **Medium**
Confidence: **High**
Status: **Confirmed design gap**

Evidence:

- `scripts/run-dev-e2e.mjs:60-76` and `scripts/run-static-e2e.mjs:44-60` spawn Playwright without signal forwarding or cleanup.
- There are no tests for either wrapper.
- `scripts/smoke-static.mjs:62-72` already has an exact-child TERM/wait/KILL lifecycle, highlighting the missing behavior in the E2E entry points.

Concrete failure scenario: a failed/repeated cycle terminates the wrapper but not its child tree. Stale Chrome and server processes consume resources and contaminate later E2E timing or ports.

Suggested fix/test: move subprocess ownership into a shared helper and test parent-only `SIGTERM`, graceful child exit, forced escalation, exit-code propagation, and unrelated-process preservation with a fake child tree. Use exact PIDs/process groups, never broad browser-name termination.

### TEST-04 — Tests miss the broken “Export Again” integration contract

Severity: **Medium**
Confidence: **High**
Status: **Confirmed gap with a confirmed product failure**

Evidence:

- `src/components/ExportPanel.tsx:358-366` emits `onResetExport` from “Export Again.”
- `src/app/page.tsx:482-485` resets and closes the panel.
- `src/components/ExportPanel.test.ts:120-200` never activates the completion action.
- The export E2E block completes, closes, reopens, and edits tracks, but never asserts the “Export Again” path.

Concrete failure scenario: the callback remains type-correct and all current tests pass while the user-visible action contradicts its label.

Suggested fix/test: after a stub export completes, click “Export Again” and assert the same dialog remains visible in idle state, the previous blob URL/result is cleared, codec controls are available, and focus moves to the expected heading/control.

### TEST-05 — Automatic retries can hide flakes, and CI retains no retry diagnostics

Severity: **Medium**
Confidence: **High**
Status: **Confirmed**

Evidence:

- `playwright.config.ts:14` and `playwright.static.config.ts:20` set `retries: 1` unconditionally.
- Both configs collect trace-on-first-retry, failure screenshots, retained failure video, and an HTML report (`playwright.config.ts:16-21`, `playwright.static.config.ts:22-27`).
- `.github/workflows/deploy-pages.yml:33-35` uploads only `out/` and only after tests pass; it never uploads `playwright-report/` or `test-results/`.

Concrete failure scenario: a test fails once and passes on retry. Playwright exits successfully, deployment proceeds, and the trace that proves the first failure disappears with the runner. Repeated-cycle stability degrades without a durable signal.

Suggested fix: make the authoritative CI gate retries-free, or explicitly fail on flaky outcomes. If retries remain for diagnostics, upload `playwright-report/` and `test-results/` with `if: always()` and short retention so both terminal failures and recovered flakes are inspectable.

## Missed-issue sweep

The final sweep mapped untested source paths against component/unit coverage, searched all skips/fixed waits/retry branches, checked static-versus-dev assertion downgrades, and reviewed fixture coverage for every supported import family. Fixed waits remain worth gradual cleanup, but no additional instance was promoted without a concrete failure contract.
