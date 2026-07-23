# Debugger — Repository-Wide Failure-Mode Review (Cycle 2, 2026-07-23)

Reviewed revision: `279f5676eb34baa4929a536fa0c20e9cbc556f34`

## Result

**One genuinely new actionable failure-mode finding:** Windows supervision loses descendant ownership when the Playwright root exits first. No browser, Playwright, E2E, dev server, static server, or test suite was run for this review.

## Coverage

I inventoried all 970 tracked files and examined every failure-relevant source, unit/process test, E2E fixture/specification, script, configuration, workflow, package/lock entry, and current `.context` rule/plan. The debugger sweep covered malformed and maximum-size imports, worker abort/timeout/generation replacement, segmented geometry, gesture cancellation, playback teardown, map style/retry/context-loss behavior, export setup/render/finalize/save/cleanup failures, URL/resource lifetime, static server shutdown, and every E2E root/descendant exit and signal branch.

Fixed Cycle 1 findings—including interrupted-wrapper ownership, failed-run reporter behavior, map error classification, save failure retention, session preservation, queued playback cleanup, HiDPI export sizing, and responsive regressions—were rechecked but not re-reported. The three current explicit deferrals remain excluded.

## Finding

### DBG-01 — Windows supervision declares success after the root exits even if descendants survive

Severity: **Medium**
Confidence: **High**
Status: **Confirmed platform-branch ownership gap; real Playwright orphan activation remains manual**

#### Evidence

- `WindowsOwnedProcessTracker.start()` records no descendants and installs no Job Object; the tracker retains only `rootPid` (`scripts/e2e-process-supervisor.mjs:203-213`).
- Its first cleanup condition returns `true` as soon as that root PID is absent (`scripts/e2e-process-supervisor.mjs:214-216`).
- `taskkill /pid <root> /t /f` is invoked only while the root is still alive, even though the adjacent comment acknowledges that ancestry is lost after root exit (`scripts/e2e-process-supervisor.mjs:217-229`).
- On the ordinary child-first branch, `runSupervisedProcess()` waits until the root has exited and only then calls `stopOwnedProcessTree()` (`scripts/e2e-process-supervisor.mjs:323-338`). The Windows tracker therefore returns success without checking any browser, web-server, reporter, or helper descendant that outlived the root.
- All lifecycle tests for normal/nonzero exit, detached stubborn descendants, signal forwarding, escalation, and sentinel preservation are skipped off POSIX; only the spawn-error and lock tests run cross-platform (`scripts/e2e-process-supervisor.test.mjs:115-223`).

#### Concrete scenario

On Windows, the Playwright CLI exits normally or after a failure while a browser/server/helper remains alive because its own cleanup failed or was interrupted. The supervisor reaches the child-first branch, sees that the root PID no longer exists, reports the process tree clean, and returns the root’s exit status. The orphan can retain a port, profile, file lock, CPU, or memory and contaminate the next E2E run.

#### Root cause

Windows ownership is represented by a live parent PID, not by a durable containment object or an identity-stable descendant inventory. Parent/child ancestry is queried only at kill time, after the normal-exit branch has already allowed that ancestry to disappear.

#### Recommended fix

Create the Playwright root inside a Windows Job Object configured for kill-on-job-close and retain the job handle until all supervised cleanup is complete. If that cannot be introduced immediately, continuously inventory and identity-check descendants before root exit and kill the retained exact PIDs afterward, while treating that as a weaker race-prone fallback. Add a Windows CI process test equivalent to `orphan-stubborn` where the root exits before a long-lived grandchild, plus normal/nonzero, signal, escalation, and unrelated-sentinel cases. A platform-neutral injected tracker test should also assert that “root absent” is not sufficient evidence that the owned tree is empty.

## Cross-review findings not duplicated here

- A POSIX process-table failure during teardown can bypass fallback cleanup (`tracer.md`, `TRACE-01`).
- Export restoration pins a stale numeric DPR override (`tracer.md`, `TRACE-02`).
- The supervisor’s 100 ms full-process-table polling creates steady test-host churn (`perf-reviewer.md`, `PERF-01`).

## Closed hypotheses and final missed-issue sweep

- POSIX normal/nonzero exits, detached-group discovery, exact signal forwarding/escalation, and unrelated-sentinel preservation have deterministic fake-tree coverage; the remaining POSIX observation-failure path is separately reported.
- Export resize sets DPR 1 before capture, map frame failures are typed, encoder objects are canceled/closed on failure, picker write errors retain the completed result, and result URLs are lease/identity guarded.
- Playback reset, scene/Journey terminal gestures, map retry/style generations, and component unmounts synchronously revoke stale scheduled work or ownership.
- Elevation and map geometry remain finite and bounded at supported input ceilings, including segment gaps, extrema, singleton segments, antimeridian wrapping, and backward seek.
- Static inspection found no additional new uncaught rejection, double completion, stale generation write, timer/listener leak, or cleanup ordering defect introduced by the Cycle 1 remediation.

The final missed-issue sweep rechecked every changed `catch`, abort, promise race, timer, animation frame, listener, process spawn, signal, exit status, object URL, map size/DPR restore, and boundary clamp. No other new failure mode met the actionable evidence threshold.
