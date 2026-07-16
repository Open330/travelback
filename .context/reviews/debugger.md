# Debugger — Root-Cause Report (Cycle 5, 2026-07-16)

Reviewed revision: bdfb1d7

## Result and diagnostic coverage

**Actionable root causes: 1 Medium / High-confidence.** DB5-01 isolates the incomplete current-pose portion of the Cycle 4 map-generation fix. Inspected all source, tests, fixtures, static assets/worker, scripts, workflow/configuration, README, and active context. No deployment or production mutation was performed.

## Finding

### DB5-01 — Pose update runs before asynchronous style hydration and has no later trigger

Severity: **Medium** | Confidence: **High** | Status: **Confirmed by source-order analysis**

Deterministic trigger:

1. Load a track, seek to a nonzero point, pause, and enable camera follow.
2. Either change map style while progress remains stable, or force a style failure and recover with Retry Map.
3. Let the replacement style finish loading without changing playback state.

Root-cause chain:

1. src/components/MapView.tsx:582-602 constructs a retry map, stores it, and signals instance generation while its style is still loading.
2. The track effect at src/components/MapView.tsx:844-906 sees that the style is not ready and subscribes to style.load/styledata/idle.
3. In the same React pass, the pose effect at src/components/MapView.tsx:914-1009 evaluates the new map but returns at line 924 because route/trail sources do not exist.
4. When style readiness arrives, attachTrackToReadyStyle calls addTrackLayers, fitBounds, and ensureMarker at lines 865-881.
5. addTrackLayers seeds POSITION_MARKER_SOURCE with track.points[0] at lines 791-809. It uses progressRef.current only to restore trail geometry at lines 812-817.
6. ensureMarker creates the HTML marker at the supplied start point at lines 820-842. No style-ready callback interpolates and moves it afterward.
7. The pose effect is the only code at lines 928-1002 that synchronizes both markers and follow/scene camera. Style readiness changes none of its dependencies, so paused progress leaves it dormant.
8. Ordinary setStyle reaches the same broken edge through the later handler at lines 676-700: layers and the GeoJSON marker are recreated, but no current-pose trigger fires.

Resulting state:

- Retry: trail reflects saved progress, both markers are at the first point, and camera reflects fitBounds instead of the current follow/scene pose.
- Ordinary style reload: trail and persistent HTML marker can reflect current progress while the recreated GeoJSON/export marker is at the first point.

Why green tests miss it: e2e/travelback.spec.ts:429-442 starts from progress zero and asserts only one canvas and one HTML marker. At progress zero, the incorrect coordinate is indistinguishable, and neither GeoJSON marker data nor camera parity is asserted.

Fix boundary: after style attachment, invoke one current-pose function that reads the latest refs and atomically updates trail, both markers, and automatic camera. It must reject stale map/style generations. A style-ready generation dependency is also viable if it cannot race stale callbacks.

Verification target: pause at 50%, capture marker/camera state, run ordinary style reload and failed-style retry, then assert both marker representations and camera remain at the current pose without an extra seek.

## Diagnostic conclusion and final sweep

The defect is temporal rather than a bad interpolation calculation: current state exists, but the only consumer runs before its destination resources. Rechecked map cleanup, generation rebinding, style listeners, export ownership/theme deferral, parser fallbacks, gesture settlement, and scene Undo. No second root cause met the confidence threshold.
