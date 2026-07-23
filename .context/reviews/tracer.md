# Tracer — Repository-Wide Causal-Flow Review (Cycle 2, 2026-07-23)

Reviewed revision: `279f5676eb34baa4929a536fa0c20e9cbc556f34`

## Result

**Two genuinely new actionable causal findings:** one cleanup-failure branch in POSIX E2E supervision and one export-restoration state transition that disables future device-DPR tracking. No browser, Playwright, E2E, dev server, static server, or test suite was run for this review.

## Coverage

I inventoried all 970 tracked files and traced relevant producer → owner → asynchronous boundary → consumer → cleanup paths across:

- import/worker generations, trim/replacement, Journey Creator, scenes, playback, and map/style generations;
- pointer/keyboard gesture drafts, animation-frame publication, terminal commit/cancel, unmount, blur, visibility loss, and pointer-capture loss;
- prepared route/elevation geometry, trail filters/head data, camera state, render/idle waits, and retry ownership;
- export validation, temporary DPR/size override, frame capture, encoder finalization/cancellation, save fallback, result URL ownership, repeated export, and teardown;
- dev/static E2E launch, POSIX/Windows process ownership, signals, normal/nonzero exits, escalation, lock reuse, wrapper error handling, and platform-gated tests.

Cycle 1 findings that are fixed at this revision were not re-counted. The three documented evidence/product deferrals were also excluded.

## Findings

### TRACE-01 — A teardown-time `ps` failure bypasses the supervisor’s fallback cleanup

Severity: **Medium**
Confidence: **High**
Status: **Confirmed control-flow defect; inducing the host/process-table failure remains manual**

#### Causal trace

1. POSIX ownership refresh depends on a separate `ps` process and rejects on command failure, timeout, or output-buffer failure (`scripts/e2e-process-supervisor.mjs:49-82`).
2. `signalAndWait()` awaits a fresh snapshot before it signals or verifies any owned group (`scripts/e2e-process-supervisor.mjs:187-195`), and `stopOwnedProcessTree()` propagates that rejection (`scripts/e2e-process-supervisor.mjs:237-240`).
3. The exact-root fallback is wrapped only around the initial `tracker.start()` call (`scripts/e2e-process-supervisor.mjs:315-321`, using `243-254`).
4. If refresh instead fails after Playwright has run—on wrapper signal or after the root child exits—the outer `finally` only stops polling and unregisters handlers (`scripts/e2e-process-supervisor.mjs:323-347`). It does not signal the root group or the last successfully inventoried descendant groups.
5. Both wrappers catch the rejection, log it, and set an exit code without a second cleanup attempt (`scripts/run-dev-e2e.mjs:19-35`; `scripts/run-static-e2e.mjs:17-33`).

#### Concrete scenario

Playwright has spawned a detached Chromium or report/server group. Its root exits, and the supervisor begins normal cleanup, but the final `ps` call exceeds the two-second deadline under host load. The wrapper reports that it could not stop the tree and exits while the already-inventoried detached group remains alive. A signal-first failure can similarly leave the live root/tree attached until a later external timeout.

#### Root cause

Process-table observation is both the ownership-discovery mechanism and a hard prerequisite for every cleanup step. The code preserves no teardown path based on the last successful ownership snapshot, and its tracking-failure fallback is scoped only to startup.

#### Recommended fix

Make cleanup failure-safe across the entire supervised lifecycle. Retain the last validated owned PID/group identities and, if a final refresh fails after bounded retries, best-effort signal those cached exact groups plus the root group before returning the tracking error. A stronger fix is an OS containment primitive whose close/kill behavior does not depend on a fresh process-table read. Inject the process-table reader and add deterministic tests for failure on normal-exit cleanup, wrapper-signal cleanup, and forced escalation; assert that the fake root/grandchild exit and an unrelated sentinel remains alive.

### TRACE-02 — Export restoration converts automatic device-DPR tracking into a stale numeric override

Severity: **Medium**
Confidence: **High**
Status: **Confirmed state transition; visible/resource impact requires a post-export DPR change**

#### Causal trace

1. `MapView` creates MapLibre without a `pixelRatio` option, so the interactive map begins in MapLibre’s automatic `devicePixelRatio` mode (`src/components/MapView.tsx:928-947`).
2. Export capture stores only the numeric result of `map.getPixelRatio()` (`src/lib/map-export-presentation.ts:7-21`).
3. Export correctly installs a temporary numeric override of `1` for deterministic output size (`src/lib/map-export-presentation.ts:24-34`).
4. Restoration calls `map.setPixelRatio(snapshot.pixelRatio)` with the old numeric value (`src/lib/map-export-presentation.ts:36-44`). In locked MapLibre 5.24.0, `getPixelRatio()` returns `_overridePixelRatio ?? devicePixelRatio`, while `setPixelRatio()` assigns the override; `null` is the documented way to return to device tracking (`package.json:30`; `package-lock.json:6537-6550`; installed `maplibre-gl/src/ui/map.ts:1089-1108`).
5. The unit harness models pixel ratio as one mutable number, so it verifies immediate restoration but cannot detect the lost automatic mode or a later DPR change (`src/lib/map-export-presentation.test.ts:11-49`).

#### Concrete scenario

A traveler exports on a DPR-2 display, then moves the browser to a DPR-1 display or changes browser zoom. MapLibre remains pinned at 2 after subsequent resizes, allocating roughly four physical pixels per CSS pixel instead of one. The reverse transition leaves the map pinned at 1 and visibly soft on the higher-DPR display. The stale mode lasts until the map is recreated.

#### Root cause

The snapshot captures the current numeric value, not whether that value came from an explicit override or the device-derived default. Restoring a value is not equivalent to restoring the prior mode.

#### Recommended fix

Track pixel-ratio ownership/mode explicitly. Because this application creates the map in automatic mode and owns the only temporary override, reset the override to `null` after export (with a local type adaptation for MapLibre’s narrower TypeScript signature), then resize. If explicit interactive overrides are added later, snapshot a separate application-owned mode rather than inferring it from `getPixelRatio()`. Replace the test harness with separate `devicePixelRatio` and nullable override state; change the simulated device DPR after restoration and assert that the map follows it. Cover success, cancellation, failure, and repeated export.

## Closed traces and final missed-issue sweep

- Missing-map and per-frame render failures now cross the map boundary as typed `EXPORT_MAP_RENDER` failures; cancellation remains tied to the active abort signal.
- Export result/save ownership retains a completed blob after picker write failure, revokes superseded URLs, and keeps repeated-export cleanup lease-scoped.
- Journey, timeline, and scene gestures flush exact terminal state and clean queued frames/listeners on cancel, blur, visibility change, capture loss, style replacement, and unmount.
- Prepared track identity, style revision, marker/trail source state, and retry camera state remain generation-guarded through map replacement.
- Playback pause/reset synchronously clears authorization and queued frame/timer handles.
- POSIX startup fallback, normal observed cleanup, and unrelated-process preservation are covered; the Windows root-exit blind spot is reported once in `debugger.md`.

The final sweep revisited every changed async boundary, swallowed error, abort lease, timer/frame handle, listener pair, process exit/signal branch, map generation, export restore path, and object URL. No other new causal defect met the actionable evidence threshold.
