# Critic Review — Cycle 2 (2026-07-23)

Reviewed revision: `279f5676eb34baa4929a536fa0c20e9cbc556f34`
Deployment: not performed

## Result

**Three new actionable product/operational findings were confirmed.**

- **CRIT2-01 (Medium / High):** a default export is not the animation the traveler previewed.
- **CRIT2-02 (Medium / High):** Windows test runs can report successful cleanup while their server/browser remains alive.
- **CRIT2-03 (Medium / High):** some legitimate multi-country routes are framed using almost a whole-world span and the wrong center.

No browser or E2E process was started under the task's source-review constraint. Findings are based on deterministic control flow and, for CRIT2-03, a reproducible longitude calculation.

## Inventory and method

All 970 tracked paths were inventoried. The review read/traced all 131 current runtime, component, test, fixture, public-text-asset, script, configuration, workflow, and governing-context paths. Historical review/plan artifacts were searched for already-known roots and explicit deferrals. Cross-file walkthroughs covered landing/import, map/playback, Camera authoring, trim/session replacement, export/save/share, responsive layouts, map recovery, static delivery, and local/CI test operation.

Fixed Cycle 1 findings were not repeated. The three retained Cycle 1 deferrals were not relabeled.

## Findings

### CRIT2-01 — “No scenes” export is not what the traveler previewed

Severity: **Medium**
Confidence: **High**
Status: **Confirmed**

Exact regions:

- `src/lib/i18n.ts:89,462,835,1208,1581`
- `src/lib/useExportController.ts:169-176`
- `src/components/MapView.tsx:813-840`
- `src/lib/camera.ts:381-388,394-445,525-538`
- `src/lib/useExportController.test.ts:61-96`

What the traveler is told:

The Camera empty state now says that without scenes the camera follows the route and that Cinematic is something to choose. The live map does follow the route.

What the product does:

At export time, an empty list is silently replaced with the six-scene Cinematic preset. The resulting video opens and closes on overviews and switches through Bird's Eye, Flyover, Orbit, and Ground modes even though the traveler selected none of them. The local E2E export stub cannot reveal this because it skips real frame computation, and the controller unit harness never inspects the scene list passed to the encoder.

Concrete failure scenario:

A traveler likes the simple preview, presses Export, waits through an expensive browser-side render, and discovers only afterward that the saved video uses a different camera program. Re-exporting does not help unless they understand that they must enter Camera and author an explicit replacement.

Recommendation:

Export the exact selected camera program. Empty must stay empty, Cinematic must remain opt-in, and preview/export should use one shared default-follow camera calculation. Add a cheap controller assertion plus sampled camera parity coverage so this promise does not depend on slow visual review.

### CRIT2-02 — Windows can leave an E2E server or browser behind and still report cleanup success

Severity: **Medium**
Confidence: **High**
Status: **Confirmed platform control flow; runtime consequence conditional on a surviving descendant**

Exact regions:

- `scripts/e2e-process-supervisor.mjs:203-240,323-341`
- `scripts/e2e-process-supervisor.test.mjs:115-223`
- `scripts/fixtures/fake-process-tree.mjs:28-68`

What happens:

The Windows supervisor remembers only Playwright's root PID. If that PID has exited, cleanup immediately succeeds without checking the web server or Chromium descendants. The repository already contains an `orphan-stubborn` fixture representing this exact case, but the test and every other lifecycle assertion are skipped on Windows.

Concrete failure scenario:

A Windows contributor runs the canonical E2E command. Playwright exits unexpectedly while a server or Chromium child survives. The command returns the Playwright status and says nothing about the leak. The next run sees an occupied port, stale browser state, or unexplained CPU/memory usage and appears flaky for reasons outside the test that failed.

Recommendation:

Contain the Windows tree in a durable Job Object (or equivalent exact-identity owner) so descendants remain reachable after the root exits. Run the fake-tree lifecycle contract on Windows CI. Until that ownership exists, do not claim successful tree cleanup based only on the root PID.

### CRIT2-03 — A wide route can be centered 91° away from its actual midpoint

Severity: **Medium**
Confidence: **High**
Status: **Confirmed by counterexample**

Exact regions:

- `src/lib/map-geometry.ts:36-72,113-127`
- `src/lib/camera.ts:214-268`
- `src/components/MapView.tsx:222-251`
- `src/lib/map-geometry.test.ts:21-48`
- `e2e/travelback.spec.ts:2339-2393`

What happens:

Whenever raw longitude span is over 180°, three different code paths add 360° to every negative longitude. This works for the test fixture's simple `179° → -179°` hop, but not for every multi-stop trip.

For `[-179, -1, 2]`:

- the route-ordered extent is 181° with center `-88.5°`;
- the current shifted extent is 357° with center normalized to `-179.5°`.

The product can therefore zoom initial fit almost to the whole world, use a coarse background grid, and center an Overview scene far from the route's meaningful midpoint.

Concrete failure scenario:

A traveler imports a long multi-country or global history rather than a short dateline hop. The map initially looks mostly empty, and the “Overview” camera—the mode meant to establish geographic context—places the journey near an edge or outside the expected frame.

Recommendation:

Use the same route-ordered, segment-aware longitude unwrapping for rendering, fit, grid, and Overview camera. Add multi-stop and multi-wrap fixtures, not just a two-point dateline fixture, and assert bounds/center directly before relying on visual E2E.

## Missed-issue sweep

The final sweep rechecked the complete import-to-export flow, error and cancellation recovery, modal/focus ownership, track replacement, trim/scenes, map retry/style hydration, export cleanup/save states, responsive interaction ownership, local static delivery, and test process lifecycle.

The root playback commit-frequency, session-wide `preserveDrawingBuffer`, and offline-geographic-context items remain explicit evidence-gated deferrals. No fourth critic finding met the actionable-evidence threshold.
