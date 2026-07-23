# Code Reviewer — Deep Review (Cycle 2, 2026-07-23)

Reviewed revision: `279f5676eb34baa4929a536fa0c20e9cbc556f34`
Comparison base: `994820a71b0b87de78fdfd2a1fd2c17e7ad3b516`

## Result

**New actionable findings: 3.**

- **CR2-01 (Medium / High):** an empty scene list still becomes the six-scene Cinematic program during export, contrary to the live preview, new UI copy, and corrected architecture document.
- **CR2-02 (Medium / High):** the Windows E2E supervisor treats a dead root PID as proof that its complete descendant tree is gone.
- **CR2-03 (Medium / High):** the shared antimeridian heuristic can expand a valid wide route from 181° to 357° and is repeated in fit, overview-camera, and reference-grid paths.

These are distinct from the three explicit Cycle 1 deferrals. No fixed Cycle 1 finding was reissued.

## Inventory and coverage

All 970 tracked paths were inventoried. The 131 current product-relevant paths are listed in `/tmp/travelback-cycle2-review-inventory.txt`; the inventory was checked against tracked files and contains no nonexistent path. Review coverage included:

- every authored production path under `src/`, including app/session state, all components, parser/worker parity, interpolation, camera, map geometry/rendering, playback, and export;
- every unit/component test, the complete Playwright specification and all 19 fixtures;
- every script and script fixture, package/lockfile, Next/TypeScript/ESLint/PostCSS/Vitest/Playwright configuration, and the Pages workflow;
- all current public text assets and map styles, plus references/delivery paths for binary assets;
- README and the governing `.context` project/development files.

The remaining tracked paths are superseded review/plan provenance, legacy planning history, screenshots, or binary payloads. They were catalogued and searched for duplicate findings rather than treated as current executable requirements.

Cross-file tracing specifically covered Cycle 1's large changes: E2E process supervision, responsive measurement ownership, Journey draft/session restoration, scene gesture publication, bounded elevation geometry, prepared route/trail geometry, map style/retry/export presentation, video finalization/download handling, static serving/hardening, and all associated regression tests.

This review ran no browser, Playwright, E2E suite, server, build, deployment, or source mutation. It used source-level control-flow tracing and a deterministic arithmetic check for CR2-03.

## Findings

### CR2-01 — Empty-scene export still substitutes a Cinematic camera program

Severity: **Medium**
Confidence: **High**
Status: **Confirmed by direct data flow**

Exact regions:

- `src/lib/useExportController.ts:8,169-176`
- `src/lib/videoEncoder.ts:179-180,236-245`
- `src/components/MapView.tsx:813-840,1193-1217`
- `src/lib/camera.ts:381-388,525-538`
- `src/lib/useExportController.test.ts:61-96,113-307`
- `src/lib/i18n.ts:89,462,835,1208,1581`
- `.context/project/02-architecture.md:98-105`

Evidence:

- The live map's no-scene branch follows the current route point with a 600 m segment-local look-ahead bearing, pitch 45, and zoom 13 (`MapView.tsx:813-840`).
- At export start, `useExportController` replaces `[]` with `generateDefaultScenes()` (`useExportController.ts:169-171`) and passes those scenes to the encoder.
- `exportVideo` normalizes that substituted list and computes every frame through it (`videoEncoder.ts:179-180,236-245`), so the result uses Opening Overview, Bird's Eye, Flyover, Orbit, Ground, and Closing Overview without a user selecting a preset.
- Cycle 1 changed all five empty-state translations and the architecture document to say exactly the opposite: no scenes means ordinary follow, while Cinematic is opt-in.
- The controller test harness always supplies `scenes: []` (`useExportController.test.ts:73-76`) but no assertion inspects the `ExportConfig` passed to `exportVideo`, allowing the contradiction to survive.
- Removing only `generateDefaultScenes()` would still leave a smaller parity defect: `computeDefaultFollowCamera` uses interpolation's immediate bearing and zoom 14 (`camera.ts:381-388`), while live playback uses the shared segment-local look-ahead helper and zoom 13. There is no single executable no-scene camera contract.

Concrete failure scenario:

A traveler imports a track, previews the default route-follow animation, never opens Camera, and starts an export. The saved video unexpectedly cuts through six cinematic modes that were never visible or selected. This is especially misleading after the Camera panel explicitly says that an empty list follows the route.

Suggested fix:

Make the camera program an explicit input and give live playback and export one resolver:

1. pass `scenesRef.current` unchanged into `ExportConfig`; never generate a preset at the export boundary;
2. keep Cinematic generation only behind the explicit Scene Editor preset action;
3. extract the no-scene follow-camera calculation, including zoom and look-ahead bearing, so `MapView` and `computeCameraForProgress` call the same function;
4. add a controller regression that asserts the encoder receives `scenes: []`, and a sampled playback/export parity test for center, zoom, pitch, and bearing.

### CR2-02 — Windows cleanup succeeds when only the root PID has exited

Severity: **Medium**
Confidence: **High**
Status: **Confirmed platform-branch defect**

Exact regions:

- `scripts/e2e-process-supervisor.mjs:31-47,203-240,311-338`
- `scripts/e2e-process-supervisor.test.mjs:115-223`
- `scripts/fixtures/fake-process-tree.mjs:28-68`

Evidence:

- The POSIX tracker inventories exact process identities and owned groups. `WindowsOwnedProcessTracker`, by contrast, stores only `rootPid`; `start()` and `stop()` do nothing (`e2e-process-supervisor.mjs:203-214`).
- `signalAndWait` returns `true` immediately when the root PID is dead (`:214-215`). It therefore cannot call `taskkill /T` after the parent/child relationship has disappeared, even though the adjacent comment acknowledges that loss (`:217-220`).
- `runSupervisedProcess` deliberately waits for the Playwright root to exit first on the ordinary child-completion branch and only then calls tree cleanup (`:323-338`). On Windows this makes a root exit indistinguishable from complete-tree exit.
- The fake fixture includes the exact adversarial case: `orphan-stubborn` exits the root while a stubborn grandchild remains (`fake-process-tree.mjs:28-36,48-56`).
- All process-tree lifecycle tests—normal/nonzero cleanup, orphan cleanup, signal forwarding, and escalation—are skipped when `!isPosix` is false (`e2e-process-supervisor.test.mjs:115,135,155,189`). Windows exercises only spawn-error and endpoint-lock logic.

Concrete failure scenario:

On Windows, Playwright exits or crashes after launching its web server or Chromium, but a descendant remains alive. The supervisor observes that the Playwright PID is gone, reports cleanup success, and mirrors the root's status. The leaked server/browser can retain a port, profile, CPU, or memory and destabilize the next run.

Suggested fix:

Give the Windows implementation durable ownership independent of the root PID. Prefer launching the owned tree in a Windows Job Object configured to terminate members when the job closes; otherwise inventory descendant PIDs plus creation identities while the root is live and reap those exact identities after root exit. Do not fall back to process-name matching. Add a Windows CI contract for normal, nonzero, orphan-stubborn, interrupt, escalation, and unrelated-sentinel cases. If durable ownership is unavailable, fail explicitly rather than reporting a false cleanup guarantee.

### CR2-03 — The antimeridian shift can make wide routes almost twice as wide

Severity: **Medium**
Confidence: **High**
Status: **Confirmed by deterministic counterexample**

Exact regions:

- `src/lib/map-geometry.ts:34-72,113-127`
- `src/lib/camera.ts:207-268`
- `src/components/MapView.tsx:173-181,222-251`
- `src/lib/map-geometry.test.ts:21-48`
- `e2e/travelback.spec.ts:2339-2393`

Evidence:

- Fit bounds, overview-camera bounds, and reference-grid bounds independently use the same rule: if raw longitude span exceeds 180°, add 360° to every negative longitude.
- That rule identifies a two-point dateline cluster such as `[179, -179]`, but `rawSpan > 180` does not prove that this fixed shift selects the correct world copy for a wider, multi-stop route.
- For longitudes `[-179, -1, 2]`, the route's sequentially unwrapped extent is `[-179, 2]` (181°). The current shift produces `[181, 359, 2]`, bounds `[2, 359]` (357°), and a normalized center of `-179.5°` instead of `-88.5°`.
- Route/trail geometry already has the more relevant abstraction: `precomputeWrappedSegments` uses `wrapLngNear` in route order (`map-geometry.ts:113-127`). The three viewport consumers ignore it and recompute a weaker point-set heuristic.
- Unit coverage checks only an ordinary local pair, a simple `[179, -179]` pair, and degenerate latitude padding. The E2E case also covers only the simple dateline hop.

Concrete failure scenario:

A multi-country history contains a long east-west leg plus a nearby follow-up point. Initial fit may zoom almost to the full world, the local reference grid becomes excessively coarse, and an Overview scene centers on the wrong world copy, leaving much of the actual route at the edge or outside the intended frame.

Suggested fix:

Move longitude/world-copy resolution into one shared geometry helper based on the same ordered, segmented unwrapping used to render the route. Derive fit bounds, reference-grid extent, and overview center/zoom from that result; for disconnected segments, align each segment's world copy explicitly rather than assuming all negative values shift together. Add counterexamples such as `[-179, -1, 2]`, both traversal directions, multiple wraps, and segmented histories, then assert all three consumers receive the same bounds.

## Final missed-issue sweep

The final pass rechecked all timer/listener/worker/object-URL owners, parser size/point budgets and worker fallbacks, track replacement and accepted-trim restoration, scene normalization/Undo/preview commits, map generation/style/pose ownership, Journey drag settlement, export abort/finalization/cleanup, static path/CSP behavior, and test-runner process ownership.

Cycle 1's three explicit deferrals—root playback commit frequency, session-wide `preserveDrawingBuffer`, and offline geographic context—were not relabeled. Fixed Cycle 1 findings were checked at their new boundaries and not repeated. No fourth code finding met the evidence and impact threshold.
