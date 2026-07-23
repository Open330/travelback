# Critic Review — Cycle 1

Date: 2026-07-23
Reviewed revision: `994820a71b0b`
Deployment: not performed

## Result

Three actionable product/operational findings were confirmed: two user-facing workflow defects and one interrupted-test process-lifecycle defect. No browser process was started by this review.

## Inventory and method

The review inventoried the current implementation with `rg --files`, then read the governing README and `.context` project/development instructions before tracing the application end to end. The reviewed surface includes all 60 files under `src/` (including all 21 Vitest files), all 111 Playwright test declarations and 19 fixtures, all 7 scripts, all 19 public assets, package/build/lint/typecheck/Playwright/Vitest configuration, the Pages workflow, and cross-file state ownership. Historical review/plan artifacts were excluded from fresh evidence except the governing indexes and current pending-user-instruction ledger.

Fresh non-browser verification:

- `npm test -- --reporter=dot`: 21 files and 472 tests passed.
- `npm run check:worker`: generated worker is current.

## Findings

### CRIT-01 — “New Route” destroys the current session before the replacement exists

Severity: **Medium**
Confidence: **High**
Status: **Confirmed**

Evidence:

- `src/components/TrackToolbar.tsx:145` and `src/components/TrackToolbar.tsx:232` invoke `onStartNewTrack` directly from the desktop and mobile actions.
- `src/app/page.tsx:324-330` clears the export result, scene editor, all scenes, and transition configuration.
- `src/app/page.tsx:349-360` then clears `track`, `fullTrack`, trim state, playback, and the rendered map before opening Journey Creator.
- `src/app/page.tsx:462-464` handles Journey Creator cancellation only by closing the creator; it cannot restore the session that was already discarded.
- `e2e/travelback.spec.ts:2026-2067` codifies immediate artifact clearing, but there is no confirmation or restoration assertion.

Concrete failure scenario: a user trims an imported track and authors several camera scenes, clicks “New Route” accidentally, then clicks Cancel in Journey Creator. They return to the landing state with the track, trim, scenes, and completed export result irrecoverably gone. The same loss is worse for a manually created route because there may be no source file to reload.

Suggested fix: keep the current workspace intact while a replacement journey is drafted, then swap sessions only after “Create Route.” At minimum, show a clear discard confirmation when the current session contains authored state and make Cancel return to it. Add E2E coverage for both confirmation cancellation and successful replacement.

### CRIT-02 — “Export Again” closes the export panel instead of starting another export flow

Severity: **Low**
Confidence: **High**
Status: **Confirmed**

Evidence:

- `src/components/ExportPanel.tsx:358-366` labels the completion-state action “Export Again” and invokes `onResetExport`.
- `src/app/page.tsx:482-485` implements that callback by resetting the export session and immediately calling `setShowExport(false)`.
- The user must reopen Export to reach the idle form, so the action behaves like “Close and clear,” not “Export Again.”
- `src/components/ExportPanel.test.ts:120-200` verifies completion copy and focus transitions but never clicks this action; the export E2E block at `e2e/travelback.spec.ts:2794-3076` also omits it.

Concrete failure scenario: after a successful export, a user clicks “Export Again” expecting to adjust codec or duration. The dialog disappears, focus is restored outside it, and a second Export click is required.

Suggested fix: reset the export result while leaving `showExport` true, return the panel to its idle form, and focus the export heading or first setting. If closing is intentional, relabel the action accordingly.

### CRIT-03 — The E2E wrappers do not supervise descendants when the wrapper itself is interrupted

Severity: **Medium**
Confidence: **High**
Status: **Confirmed design defect; orphan scenario is conditional on a parent-only signal**

Evidence:

- `scripts/run-dev-e2e.mjs:60-76` and `scripts/run-static-e2e.mjs:44-60` spawn Playwright and handle only the child’s eventual `exit`.
- Neither wrapper registers `SIGINT`, `SIGTERM`, uncaught-error, or normal-exit cleanup that forwards termination and waits for the exact child tree.
- Playwright in turn owns a Next/static web server and Chromium processes through `playwright.config.ts:44-49` or `playwright.static.config.ts:50-55`.
- `scripts/smoke-static.mjs:62-72` already demonstrates the safer local pattern: TERM, bounded wait, then KILL for the exact still-live owned child.

Concrete failure scenario: a repeated review cycle or CI controller terminates only the Node wrapper PID after a timeout/failure. The Playwright CLI remains alive and retains its web server and Chromium descendants. Later cycles encounter occupied ports, `.next/dev/lock` contention, higher CPU/GPU load, and misleading flaky results.

Suggested fix: extract a shared subprocess supervisor for both E2E wrappers. On wrapper termination, forward the original signal to the exact owned process group/tree, wait for graceful exit, escalate only the still-live owned descendants, and preserve the child exit code. Add a deterministic integration test using a fake long-lived child; never use broad `pkill`/name matching.

## Missed-issue sweep

A final pass rechecked track replacement, modal ownership, scene mutation, import cancellation, export cleanup, static serving/hardening, generated-worker parity, CI gates, public asset locality, and the complete test-name inventory. No additional finding met the evidence threshold for this critic report.
