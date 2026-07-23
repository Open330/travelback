# Code Reviewer — Deep Review (Cycle 1, 2026-07-23)

Reviewed revision: `994820a71b0b87de78fdfd2a1fd2c17e7ad3b516`

## Result

**New findings: 1.** CR1-01 is a Medium-severity, High-confidence process-lifecycle defect in both canonical E2E wrappers. An interrupted wrapper can exit without shutting down or waiting for the Playwright process tree it started, allowing Playwright, Next, and Chromium descendants to leak into later runs.

## Inventory and coverage

All 961 tracked paths were inventoried. The authored review covered:

- all 39 production paths under `src/`: the app shell/layout/styles, every component, all parser/camera/interpolation/map/export/playback utilities, shared types, and the worker entry;
- all 21 unit/component test files, the complete 3,240-line Playwright specification, and all 19 E2E fixtures;
- all 19 public assets, with textual SVG/CSS/JSON/GPX assets read directly and the generated worker checked against its TypeScript source;
- all 7 scripts; package/lockfile, TypeScript, ESLint, Next, PostCSS, Vitest, and both Playwright configurations; the Pages workflow and `.gitignore`;
- README plus current project, architecture, development, reviewer, plan-index, and user-injected context.

The 804 tracked `.context` paths and 39 legacy root `plan/` paths were catalogued and searched for prior provenance and duplicate roots rather than treated as current product requirements. Historical screenshots, the WOFF2 payload, and the favicon binary were not decoded; their references and delivery paths were checked. Cross-file tracing covered import cancellation and parser/worker parity, segmented track math, trim/session resets, scene normalization and camera commits, MapLibre style/pose hydration, Journey Creator interaction ownership, playback/export separation, static hardening/serving, and test-runner lifecycle.

Fresh non-browser evidence at this revision:

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm test` — passed, 21 files / 472 tests
- `npm run check:worker` — passed

No Playwright, browser, Chrome/Chromium, server, build, deployment, or production process was started by this review.

## Finding

### CR1-01 — Terminating an E2E wrapper does not terminate the Playwright tree it owns

Severity: **Medium**
Confidence: **High**
Status: **Confirmed by deterministic source control flow**

Evidence:

- `package.json:17-20` makes `scripts/run-dev-e2e.mjs` and `scripts/run-static-e2e.mjs` the canonical development and static E2E entry points.
- `scripts/run-dev-e2e.mjs:60-68` spawns Playwright. Its only lifecycle handler, at `scripts/run-dev-e2e.mjs:70-76`, reacts after the child exits. The wrapper registers no `SIGINT`, `SIGTERM`, or `SIGHUP` handler, never signals the child when the wrapper is terminated, and never waits for or escalates shutdown of the descendants it owns.
- `scripts/run-static-e2e.mjs:44-52` and `scripts/run-static-e2e.mjs:54-60` repeat the same one-way ownership.
- `playwright.config.ts:44-49` and `playwright.static.config.ts:50-55` let that child start a Next/static web server, while the configured Chromium project starts browser descendants. Graceful Playwright shutdown can clean those resources, but these wrappers do not relay a wrapper-only termination to Playwright.
- The repository already uses the required bounded pattern for its simpler child in `scripts/smoke-static.mjs:62-72`: TERM, wait, then KILL only if the exact owned child remains live. There is no equivalent around either E2E tree.
- No unit or script-level test covers wrapper termination or descendant cleanup.

Concrete failure scenario:

An agent runner, CI timeout, terminal supervisor, or later review cycle sends `SIGTERM` to the Node wrapper PID rather than broadcasting to its complete foreground process group. Node takes its default termination path, while the Playwright child continues running with the server and Chromium processes it launched. The leaked tree can keep `.next/dev/lock`, a selected port, browser profiles, renderers, and CPU/memory alive. A later E2E cycle then collides with the stale state or mistakes it for a pre-existing server. Repeating the suite compounds the leak.

Suggested fix:

Create one shared, lifecycle-owning E2E runner used by both target modes. Register idempotent wrapper signal handlers before or immediately after spawn; forward the received signal to the exact Playwright child; wait for natural cleanup; and after a bounded deadline escalate only the still-live process group/tree created by that runner. Preserve the existing rule that a detected, pre-existing Next server is not owned and must not be killed. Also handle `child.once('error')`, remove handlers after settlement, and mirror the final child exit code or signal without double-exiting.

Required regression:

Exercise the shared runner with a small fake child/descendant fixture, not Playwright or Chrome. Terminate the wrapper, assert the owned child and descendant both exit within the deadline, assert an unrelated sentinel process remains alive, and run the same contract for development and static modes. Also cover normal zero/nonzero exit propagation. Browser E2E remains an integration gate after this no-browser lifecycle test passes.

## Final missed-issue sweep

The final pass rechecked every timer/listener/worker/object-URL owner, parser budget and fallback boundary, accepted trim restoration, scene gaps/Undo, map construction/style/pose generations, export abort/finalization cleanup, CSP/static-server ownership, base-path consumers, and test harness entry points.

Known authority/evidence items B01-B04 and measured performance deferrals D01-D04 in the current aggregate were not relabeled. The long-standing `page.tsx`/`MapView.tsx` size and prop-coupling concerns also remain historical architecture debt rather than new findings. No second code-quality or correctness issue met the reporting threshold.
