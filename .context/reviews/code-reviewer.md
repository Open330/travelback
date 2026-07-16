# Code Reviewer — Deep Review (Cycle 5, 2026-07-16)

Reviewed revision: bdfb1d7

## Result

**New findings: 1.** CR5-01 is a Medium-severity, High-confidence regression gap in the Cycle 4 map-generation fix. No fixed parser, export, gesture, keyboard, trim, scene-editor, or test-harness finding was reopened.

## Inventory and coverage

Reviewed all 53 tracked src files, including 15 unit-test files; the Playwright specification and all 18 fixtures; 19 public assets; 7 scripts; package, TypeScript, lint, Next, Vitest, and Playwright configuration; the Pages workflow; README; and active project, development, review, and plan context. The change-focused pass covered every file changed from e3f21ba through bdfb1d7 and traced import/session replacement, parser and worker parity, segmented interpolation, MapLibre construction/style readiness, Journey Creator ownership, playback, scenes, export, static hardening, and regression assertions.

The source at bdfb1d7 is identical to the exact source revision c6eec45 for which the Cycle 4 plan records lint, typecheck, 366 unit tests, audit, build, static smoke, and both 92-test E2E suites as passing. This review used those results as existing evidence and did not claim a new independent full-matrix run.

## Finding

### CR5-01 — Style readiness restores layers but not the current playback pose

Severity: **Medium** | Confidence: **High** | Status: **Confirmed by deterministic source control flow**

Evidence:

- src/components/MapView.tsx:791-809 initializes the GeoJSON current-position source at track.points[0].
- src/components/MapView.tsx:812-817 reapplies only the traveled trail at progressRef.current; it does not update either marker representation or the camera.
- src/components/MapView.tsx:865-881 runs after a replacement style becomes ready, fits the whole route, removes the old HTML marker, and recreates it at track.points[0].
- src/components/MapView.tsx:914-1009 is the only transaction that places the HTML and GeoJSON markers at the interpolated point and applies follow/scene camera state. On map retry it runs before the new style owns route/trail sources and returns at line 924. Style readiness changes none of its dependencies, so it does not run again while playback is paused.
- src/components/MapView.tsx:676-700 has the same readiness split for an ordinary setStyle call: the later style-load handler adds sources at the route start without causing the pose effect to rerun.
- e2e/travelback.spec.ts:429-442 asserts only one canvas and one HTML marker after retry. It never seeks to nonzero progress or checks marker coordinates, the GeoJSON marker, trail/marker agreement, or follow-camera parity.

Failure scenario: pause a trip at 50% with camera follow enabled, then trigger a style failure and use Retry Map. Once the new style loads, the route and progressed trail are present, but both markers are at the first point and the camera is fit to route bounds instead of the 50% follow/scene pose. They remain stale until progress, seek, follow, export, or another listed dependency changes. With an ordinary style switch at paused nonzero progress, the HTML marker can remain current while the recreated GeoJSON marker resets to the first point, leaving the two render paths inconsistent.

Suggested fix: make post-style hydration one idempotent transaction. After sources and layers exist, interpolate using progressRef.current, update the HTML marker, GeoJSON marker, and trail together, then reapply the current follow/scene camera when automatic camera ownership is active. Alternatively publish a style-ready generation token and key the existing pose transaction to it; a constructor-only generation signal is insufficient.

Required regression: seek and pause at a nonzero progress value, record current marker/camera state, force a style failure, use the actual Retry Map button, and assert route/trail presence plus matching current HTML and GeoJSON marker positions and current follow/scene camera. Add an ordinary paused style-switch variant because it reaches the same split transaction.

## Carryovers and final sweep

B01-B04 and D01-D03 retain the blocked/evidence/performance statuses recorded in the Cycle 4 plan and are not new findings. A final pass rechecked all Cycle 4 implementation commits, effect dependency boundaries, cleanup identities, parser fallback precedence, export lease ownership, theme deferral, drag settlement, scene Undo, and direct/worker parity. No second new correctness issue met the reporting threshold.
