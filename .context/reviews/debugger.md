# Debugger — Root-Cause Report (Cycle 4, 2026-07-16)

## Result and diagnostic coverage

**Actionable root causes: 2 Medium / High-confidence.** DB4-01 confirms and reopens an older split-ownership risk that lacked a failing path; DB4-02 isolates a system-event variant that remains after direct export-time controls became inert. Inspected all current source, tests, fixtures, static assets/worker, scripts, workflow/config/package files, README, and active context at revision 4917d39. npm test passed 352/352 and npm audit reported zero vulnerabilities. No build, deployment, or production mutation was performed.

## Findings

### DB4-01 — Recovery changes map identity, but React dependencies model only data identity

Severity: **Medium** | Confidence: **High** | Status: **Deterministically reproduced**

Reproduction 1 — loaded trip:

1. Load a track and observe one HTML map marker.
2. Force a style load error, unblock it, and use the in-app Retry Map button.
3. Wait for the recovered style.

Result: the new canvas exists and route layers are recreated, but the HTML marker count is zero and the camera remains at the new Map constructor default until another progress mutation.

Reproduction 2 — manual route editor:

1. Fail the initial style and activate Journey Creator while the failed MapLibre object exists.
2. Unblock the style and use Retry Map.
3. After the replacement canvas settles, click its center.

Result: the creator stays at zero points and Undo remains disabled. A no-retry control with the same delayed click accepts one location.

Root-cause chain:

1. src/components/MapView.tsx:1027-1032 increments mapRetryNonce.
2. The initialization effect at src/components/MapView.tsx:577-671 cleans up map A and creates map B.
3. map B's global style-load callback at lines 632-639 restores only reference and track layers.
4. The complete attachment transaction at lines 841-903 is keyed to track/cumulative-distance identity. Those props did not change, so fitBounds and ensureMarker do not run for map B.
5. The progress/camera transaction at lines 911-1006 is also not keyed to map identity, so unchanged progress does not reapply camera or recreate the HTML marker.
6. Journey Creator's setup effect at src/components/JourneyCreator.tsx:284-517 captured map A. The retry counter is only advanced when no map existed at entry; map A existed, so replacing the ref with map B creates no React dependency change. All creator layers and click/drag listeners remain owned by the destroyed map.
7. The current E2E recovery at e2e/travelback.spec.ts:392-427 uses page.reload, which remounts all owners and therefore cannot expose the identity gap.

Why the bug persists behind green tests: data state is correct and map B is visibly alive. Existing assertions focus on error visibility, full reload, and ordinary style reload where map identity stays constant. No test observes the in-app replacement generation.

Historical provenance: cycle2-code-reviewer-2026-04-26.md:74-82 predicted map-retry staleness as a Risk; cycle-c2-aggregate-2026-04-24.md:89-94 deferred readiness work pending a reproduced active panel without layers. The manual-route reproduction above triggers that reopen criterion.

Fix boundary: introduce an explicit monotonically increasing map generation or onReady(map, generation) event. Make one idempotent hydration transaction consume current track, cumulative distances, progress, camera, marker, and overlay state for every generation. Journey Creator must rebind to the generation without clearing existing waypoints. Test both initial-load and later-style failures through the actual Retry Map button.

### DB4-02 — Theme preference owns map.setStyle outside the export transaction

Severity: **Medium** | Confidence: **High** | Status: **Concurrent mutation confirmed**

Reproduction:

1. Start in light mode with no explicit theme or map-style override.
2. Load a track and hold an export in data-travelback-exporting=true.
3. Change prefers-color-scheme to dark.

Result: data-mapstyle changes to dark while exporting remains true. When dark.json is intercepted, map-error becomes visible during the same export state.

Root-cause chain:

1. src/app/page.tsx:265-291 installs a MediaQueryList change listener whenever theme choice is implicit.
2. applySystemMode updates mapStyleKey at lines 277-285 with no export lease check.
3. The export modal makes the app root inert, but a media-query callback bypasses DOM interaction restrictions.
4. src/components/MapView.tsx:673-697 receives the new key and calls map.setStyle on the same instance held by useExportController.
5. MapLibre removes style-owned sources/layers while it reloads. Meanwhile src/components/MapView.tsx:452-478 can render/capture a frame; missing sources are optional-chained, so a frame can complete without route/trail/marker data rather than necessarily failing fast.
6. src/lib/useExportController.ts:205-234 then waits/captures under an invariant that the map style was stable. Depending on timing, output gets partial frames or the render/idle path times out.

Why the bug persists behind green tests: e2e/travelback.spec.ts:1577-1604 correctly proves live system-theme synchronization, while export tests correctly prove modal interaction and frame sequencing. Neither composes the two independently correct features.

Historical distinction: tracer-2026-04-27.md:20-30 covered direct style-control interaction. Modal inertness now blocks that action; the MediaQueryList callback does not use the control path and remains live.

Fix boundary: treat map style as part of the export lease. Snapshot it at acquisition, defer theme-derived style mutations, and apply the newest queued preference only after map-size/render cleanup completes. A deterministic test should hold the frame renderer between mutation and capture, deliver a media change, and assert that no setStyle/style request occurs until release.

## Diagnostic conclusion and final sweep

Both defects are ownership problems across independently keyed effects: retry changes the resource without changing consumer dependencies, and export changes state without acquiring ownership over all map mutators. Rechecked map/style listener cleanup, marker/source recreation, creator polling, export abort/finally, theme explicit-choice logic, and current browser/unit coverage. No third new root cause met the reproduction and confidence threshold.
