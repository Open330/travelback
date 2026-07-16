# Tracer — Causal Flow Review (Cycle 5, 2026-07-16)

Reviewed revision: bdfb1d7

## Result

**New causal findings: 1.** TRACE5-01 traces the same unique current-pose hydration defect reported as CR5-01, ARCH5-01, DB5-01, and VR5-01.

## Coverage

Traced producer → owner → mutation → readiness → consumer/cleanup across import parsing, session replacement, segmented interpolation, map instance/style generations, Journey Creator gestures, playback, scenes, export, and static gates. The missed-issue sweep also traced every Cycle 4 fix from its initiating event through cleanup and regression coverage.

## Finding

### TRACE5-01 — Stable progress → asynchronous style replacement → split visual pose

Severity: **Medium** | Confidence: **High** | Status: **Confirmed causal chain**

Related finding: CR5-01

Ordinary style-reload trace:

1. A paused session has progress greater than zero; HTML marker, trail, GeoJSON marker, and camera initially agree.
2. mapStyleKey changes and src/components/MapView.tsx:676-700 calls map.setStyle. Style-owned sources disappear asynchronously.
3. Progress and seekNonce do not change, so the pose effect at lines 914-1009 has no reason to rerun after readiness.
4. style.load calls addTrackLayers. Lines 791-809 seed the recreated GeoJSON marker at track.points[0], while lines 812-817 restore trail geometry from progressRef.current.
5. The HTML marker persists outside the style and remains at the current point; the camera generally persists; the GeoJSON/export marker now disagrees until another pose dependency changes.

Retry trace:

1. Retry increments mapRetryNonce; cleanup removes the old marker/map and construction creates a world-view map.
2. The track effect subscribes for style readiness, while the pose effect immediately returns at src/components/MapView.tsx:924 because sources are absent.
3. The later callback at lines 865-881 creates route/trail sources, calls fitBounds, and recreates the HTML marker from track.points[0].
4. addTrackLayers restores the trail at saved progress but seeds the GeoJSON marker at the same first point.
5. No readiness state reaches the pose effect. The session therefore displays saved trail progress with start-point markers and a bounds camera until another dependency wakes the effect.

Coverage-gap trace:

1. e2e/travelback.spec.ts:429-442 uploads a fresh track at progress zero.
2. It retries and counts one canvas plus one HTML marker.
3. A start-point bug satisfies those assertions, while GeoJSON marker data and camera state are never observed.

Fix boundary: route every style-ready generation through the same latest-progress pose commit, or publish a style-ready generation consumed by that commit. Guard against callbacks from superseded map/style generations.

## Closed-path traces and final sweep

The parser fallback now selects by accepted result; export acquisition releases by owner identity; implicit theme changes defer during export; drag terminal actions share settlement; map keyboard ownership and trim no-op boundaries are intact; scene deletion Undo has stable lifetime. No other producer-to-cleanup chain broke under the reviewed changes.
