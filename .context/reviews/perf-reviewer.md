# Performance Reviewer — Repository-Wide Review (Cycle 2, 2026-07-23)

Reviewed revision: `279f5676eb34baa4929a536fa0c20e9cbc556f34`

## Result

**One genuinely new actionable performance finding.** The repaired application hot paths now have bounded or coalesced work as intended; the remaining finding is newly introduced test-infrastructure process churn. No browser, Playwright, E2E, dev server, static server, or test suite was run for this review.

## Coverage

I inventoried all 970 tracked files and examined every performance-relevant runtime, test, script, configuration, workflow, and current-context file. The focused sweep covered:

- parser/worker limits and transfer ownership, cumulative-distance reuse, camera interpolation, and supported-size ceilings;
- playback scheduling and synchronous cancellation;
- Journey Creator, timeline, scene-range, and camera-slider gesture publication;
- bounded elevation geometry and segmented/extrema preservation;
- prepared map geometry, chunked trail publication, style hydration, and map render waits;
- export resize/DPR behavior, canvas staging, encoder backpressure/finalization, progress throttling, and object lifetimes;
- E2E wrapper ownership, process-table tracking, static serving, CI entry points, and the changed Playwright coverage.

Cycle 1’s fixed findings were re-traced rather than re-counted. The explicitly deferred root-level playback publication, session-wide `preserveDrawingBuffer`, and offline geographic-context decisions remain excluded.

## Finding

### PERF-01 — The E2E supervisor scans the full host process table up to ten times per second

Severity: **Medium**
Confidence: **High**
Status: **Confirmed structural work; host-level latency/CPU magnitude requires profiling**

#### Evidence

- Every POSIX refresh forks `ps -axo pid=,ppid=,pgid=,lstart=`, copies the environment, buffers up to 4 MiB of output, splits every row, and constructs a complete `Map` (`scripts/e2e-process-supervisor.mjs:49-82`).
- `PosixOwnedProcessTracker.start()` schedules that refresh every 100 ms for the full lifetime of Playwright, not only during spawn or teardown (`scripts/e2e-process-supervisor.mjs:98-104`).
- Each successful snapshot is then walked to rebuild active PID/group sets and may be walked repeatedly while descendant closure expands (`scripts/e2e-process-supervisor.mjs:120-163`).
- Both ordinary E2E entry points use this supervisor (`scripts/run-dev-e2e.mjs:19-31`; `scripts/run-static-e2e.mjs:17-29`; `package.json:18-23`).

At the configured cadence, a stable run can request up to 600 full process-table scans per minute. `refreshPromise` prevents overlapping `ps` children, but it does not avoid the steady fork/exec and parse work when a prior scan finishes within 100 ms.

#### Concrete scenario

A multi-minute 100-plus-test run executes on a developer machine or shared CI host with a large process table. The supervisor continuously forks and parses `ps` while Chromium, MapLibre, and video-export assertions are competing for CPU. This adds avoidable host noise to responsiveness-sensitive tests and can amplify the very process-table timeouts handled elsewhere in the supervisor.

#### Root cause

The 100 ms discovery interval was chosen as a global steady-state policy even though topology changes are bursty. Exact descendant ownership and observation cadence are coupled in one polling loop.

#### Recommended fix

Prefer an OS ownership primitive that does not require continuous whole-host scans. If a portable containment backend is not immediately practical, use adaptive polling: a short discovery burst around spawn and known browser launches, a materially slower stable cadence, and immediate refreshes on wrapper signal/root exit. Preserve the last successful exact ownership snapshot for teardown. Add an injected-clock/process-reader unit test that bounds scans over a representative long run, and profile supervisor CPU/process creation on both a quiet laptop and a process-heavy CI host before selecting the cadence.

## Closed hypotheses and final missed-issue sweep

- Journey waypoint previews are animation-frame coalesced, adjacent distance is updated in constant work, and the exact route is committed at the terminal event.
- Scene range/camera gestures retain draft state locally, bound preview publication to animation frames, and commit root state at terminal events.
- Elevation output is bounded by 2,048 selected coordinates while preserving endpoints, extrema, segment boundaries, and missing-elevation gaps.
- Route wrapping is prepared once per track identity; completed trail geometry is static and the active payload is bounded to one 512-coordinate chunk.
- Playback pause/reset synchronously revokes queued animation/timer work. The remaining root-state-per-frame architecture is the documented Cycle 1 deferral, not a new finding.
- Export uses an exact-size staging canvas, closes transient frames/samples, observes encoder backpressure, and throttles visible progress. The DPR restoration defect is reported once in `tracer.md`, not duplicated here.
- Static source inspection found no additional unbounded loop, per-frame whole-track rebuild, runaway listener/timer, or retained large-object path introduced by the Cycle 1 fixes.

The final sweep rechecked every changed loop, animation/timer site, listener cleanup, large-array/string construction, process spawn, and supported-size boundary. No other new performance issue met the actionable evidence threshold.
