# Tracer — Repository-Wide Causal Flow Review (Cycle 1, 2026-07-23)

Reviewed revision: `994820a`

## Result

**Three actionable causal findings:** two independent failure modes in the E2E launcher lifecycle and one export error-classification defect. No browser, Playwright, Chrome, dev server, or static server was started for this review.

## Coverage

I inventoried the complete tracked repository and traced producer → state owner → asynchronous boundary → consumer → cleanup across:

- track import, parser/worker parity, replacement generations, trim, segmented interpolation, Journey Creator, scenes, playback, and map/style hydration;
- frame rendering, map-idle waits, canvas staging, encoder backpressure/finalization, cancellation, download/result ownership, and localized export errors;
- React components and hooks, every unit-test suite, the complete Playwright specification and fixtures, both Playwright configurations, all seven scripts, static serving/hardening, package/build/type/lint configuration, public assets/styles, README, and current `.context` architecture/convention material.

`npm run check:worker` passed, confirming the generated parser worker matches its source. Static inspection was used for process-lifecycle findings so this reviewer would not create or disturb a browser tree owned by another review.

## Findings

### TRACE-01 — Interrupting an E2E wrapper does not terminate the process tree it owns

Severity: **Medium**
Confidence: **High**
Status: **Confirmed design defect; activation requires a wrapper-only interrupt**

#### Causal trace

1. The ordinary E2E entry points route through `scripts/run-dev-e2e.mjs` and `scripts/run-static-e2e.mjs` (`package.json:17-20`).
2. Each wrapper spawns the Playwright CLI with inherited stdio (`scripts/run-dev-e2e.mjs:60-68`; `scripts/run-static-e2e.mjs:44-52`).
3. Playwright then owns a Next/static web server and Chromium (`playwright.config.ts:25-49`; `playwright.static.config.ts:31-55`).
4. The wrappers listen only for the Playwright child’s eventual `exit` (`scripts/run-dev-e2e.mjs:70-76`; `scripts/run-static-e2e.mjs:54-60`). They register no `SIGINT`, `SIGTERM`, or `SIGHUP` handler, do not forward parent termination, do not wait for graceful descendant cleanup, and do not escalate an exact owned tree.
5. Consequently, a controller that times out or cancels the wrapper PID can remove the wrapper while leaving Playwright, its web server, and Chromium descendants alive. A later cycle can inherit CPU/GPU pressure, occupied ports, or a Next development lock from that stale tree.

#### Competing hypothesis

Playwright normally cleans up its server and browser after an ordinary completed run, and a controller that deliberately signals the entire process group may also clean up. Neither behavior covers the wrapper-PID-only termination path: POSIX does not automatically forward a signal from a terminated parent to its child, and the wrappers provide no supervision for that case.

#### Suggested fix

Extract one shared subprocess supervisor for both wrappers. Give each run an exact ownership boundary, forward `INT`/`TERM`/`HUP`, wait for graceful exit, then escalate only still-live owned descendants. On POSIX, a dedicated child process group can provide that boundary; use a scoped Windows tree/job equivalent there. Preserve the original signal/exit status and never use broad browser-name or port-based killing. Add deterministic fake-child integration tests for normal exit, failed exit, each parent signal, bounded escalation, and unrelated-process preservation.

### TRACE-02 — A failed interactive E2E run can intentionally stay open in the HTML reporter

Severity: **Medium**
Confidence: **High**
Status: **Confirmed against the installed Playwright 1.61.1 behavior; TTY-dependent**

#### Causal trace

1. Both configurations select the HTML reporter without setting its `open` policy (`playwright.config.ts:16`; `playwright.static.config.ts:22`).
2. Both wrappers inherit the caller environment and terminal through `stdio: 'inherit'`, but neither sets `PLAYWRIGHT_HTML_OPEN` (`scripts/run-dev-e2e.mjs:53-68`; `scripts/run-static-e2e.mjs:37-52`).
3. The installed `@playwright/test` version is 1.61.1 (`package.json:34`). Its HTML reporter defaults `open` to `on-failure` and, for a failed TTY run outside CI/coding-agent detection, awaits `showHTMLReport` before reporter exit (`node_modules/playwright/lib/runner/index.js:3282,3320-3322`).
4. The wrapper therefore never receives the child `exit` it is waiting for while that report server is open. A failed local/review cycle can block instead of returning a nonzero result so the next cycle can proceed; an external timeout then reaches TRACE-01’s orphan path.

#### Competing hypothesis

CI and reliably noninteractive invocations generally suppress automatic report opening. That narrows activation but does not make the repository entry points deterministic: their behavior changes with TTY/agent detection, and the intended repeated-cycle contract requires failure to return without an interactive server.

#### Suggested fix

Configure both reporters explicitly as `[['html', { open: 'never' }]]`, or set `PLAYWRIGHT_HTML_OPEN=never` in the noninteractive wrapper entry points while retaining an explicit opt-in command for manual report viewing. Add a failing wrapper integration test under a pseudo-TTY and assert prompt nonzero exit plus no live report-server descendant.

### TRACE-03 — A map-frame timeout is reported as unsupported WebCodecs

Severity: **Medium**
Confidence: **High**
Status: **Confirmed reachable error-classification defect**

#### Causal trace

1. Every export frame calls `MapView.renderFrameAndWait` through the export controller (`src/lib/useExportController.ts:215-220`).
2. `renderFrameAndWait` delegates to `mutateMapAndWaitForRender` without translating its failures (`src/components/MapView.tsx:490-516`).
3. If a frame does not emit/render within five seconds, the map helper rejects a plain `Error('Timed out waiting for the map frame to render')` (`src/lib/map-render.ts:14,79-81`).
4. `exportVideo` cancels its output and rethrows that error unchanged (`src/lib/videoEncoder.ts:272-274`).
5. The controller recognizes only selected `ExportError` codes; every other error falls back to `app.exportFailedSuffix` (`src/lib/useExportController.ts:17-23,273-285`).
6. That fallback tells the traveler that their browser may not support WebCodecs for the selected codec (`src/lib/i18n.ts:315-320`), even though the failed subsystem was map rendering. Changing codecs does not address the failure. The same misleading fallback is used for the distinct staging-canvas allocation error `EXPORT_CAPTURE_CANVAS` (`src/lib/videoEncoder.ts:190-203`), which is absent from the mapping.

#### Competing hypothesis

The controller already maps its resize/idle failures to `app.exportMapRenderFailed` (`src/lib/useExportController.ts:180-197`). That mapping does not catch the separate per-frame render timeout because the error is created later as a plain `Error`; it therefore follows the generic codec path.

#### Suggested fix

Preserve cancellation, but translate non-abort failures from `renderFrameAndWait` into a typed map-render export error before they cross into the encoder. Add a localized resource/canvas failure key for `EXPORT_CAPTURE_CANVAS` rather than treating it as codec incompatibility. Unit-test the complete helper → map handle → controller message chain for a per-frame timeout and a null staging context.

## Closed traces and final missed-issue sweep

The final sweep challenged stale parser completions, worker termination, segmented trim boundaries, scene mutation/undo ownership, drag terminal events, map-style and retry generations, playback frame cleanup, export cancellation/finalization, object-URL lifetime, static base paths/CSP, port fallback, and tests that could pass on the wrong state. Current generation guards, owner-identity checks, listener cleanup, bounded parser limits, and worker parity closed those paths. The known non-cancellable mediabunny finalization limitation is already documented and was not duplicated as a new finding. No additional causal chain met the actionable evidence threshold.
