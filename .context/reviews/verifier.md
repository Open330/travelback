# Verifier Review — Cycle 5

Date: 2026-07-16
Reviewed revision: bdfb1d7
Deployment: **not run**, per the explicit constraint

## Result

**Verified actionable findings: 1 Medium / High-confidence.** VR5-01 confirms from exact source ordering that the Cycle 4 retry regression stops at source/layer existence and does not preserve a paused nonzero current pose.

## Inventory and evidence

Reviewed all 53 src files, including 15 Vitest files; e2e/travelback.spec.ts and all 18 fixtures; 7 scripts; 19 public assets; package/configuration; workflow; README; and active context. Historical reports were used for duplicate suppression.

| Check | Result | Evidence |
| --- | --- | --- |
| Source identity | Confirmed | bdfb1d7 differs from exact-source c6eec45 only in Cycle 4 context documentation |
| Prior full matrix | Existing green evidence | Cycle 4 plan records lint, typecheck, 366 unit tests, audit, build, smoke, 92 dev E2E, and 92 static E2E |
| Current-pose hydration | Fails source invariant | Style-ready callbacks install layers/start marker but do not rerun pose/camera logic |
| Current retry E2E | Insufficient assertion | e2e/travelback.spec.ts:429-442 checks counts at progress zero only |
| Independent browser reproduction | Not claimed | Shared active server state did not provide a clean isolated run during this role pass |
| Deployment | Not run | Explicit constraint |

## Finding

### VR5-01 — Retry/style regressions prove existence, not state parity

Severity: **Medium**
Confidence: **High**
Status: **Confirmed from deterministic source control flow; runtime assertion still required**

Source proof:

- src/components/MapView.tsx:791-809 always initializes POSITION_MARKER_SOURCE from track.points[0].
- src/components/MapView.tsx:812-817 restores trail progress but not marker position.
- src/components/MapView.tsx:865-881 waits for readiness, then adds layers, fits bounds, and ensures an HTML marker at track.points[0].
- src/components/MapView.tsx:921-924 lets the progress/camera effect exit when sources are absent.
- src/components/MapView.tsx:928-1002 is the only code that updates both marker representations and follow/scene camera.
- No style-ready state appears in the dependency list at src/components/MapView.tsx:1009.
- Ordinary style reload at src/components/MapView.tsx:676-700 reaches the same late layer installation without a pose trigger.

Acceptance contradiction: the Cycle 4 plan at .context/plans/cycle4-implementation-2026-07-16.md:24-30 requires complete track/progress hydration, current-position state, and current camera on every map generation. Current code restores route and saved trail, but retry resets both markers to the first point and applies fitBounds. An ordinary paused style reload resets the GeoJSON marker while the HTML marker can remain current.

Test-gap proof: e2e/travelback.spec.ts:429-442 uploads at progress zero, forces failure, clicks Retry Map, and checks one canvas plus one HTML marker. Because the correct and incorrect marker coordinate are both the first point at progress zero, this test cannot distinguish full hydration from the defect. It also does not inspect GeoJSON marker data or camera state.

User-visible scenario: seek to 50%, pause with follow camera enabled, trigger the same failure, and click Retry Map. Without another state change, the traveled trail and start-position markers disagree and the camera shows route bounds instead of the current scene/follow pose.

Required fix verification:

1. Expose current marker source coordinates and camera through the existing development debug surface, or assert via rendered pixel/DOM projection with stable tolerances.
2. Seek and pause at a nonzero point; save HTML marker, GeoJSON marker, trail, and camera state.
3. Exercise an ordinary style reload and a failed-style actual Retry Map recovery.
4. Assert one canvas, one HTML marker, route/trail sources, both marker coordinates at current progress, and the correct follow/scene camera without issuing another seek.
5. Add a superseded-style callback case if hydration is keyed by a generation token.

## Carryovers and final sweep

B01-B04 and D01-D03 retain their prior statuses and are not recounted. Rechecked all Cycle 4 fixes, tests, cleanup paths, worker parity, and blocked/evidence registers after drafting. No additional verifier finding met the threshold. Actionable count: **1 Medium**.
