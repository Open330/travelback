# Cycle 3 — Critic

Reviewed current HEAD `3b6750f` with emphasis on whether the implementation's visible behavior matches the product model: segmented trips, camera modes, local-only map presentation, timeline semantics, journey editing, export affordances, localized guidance, and documented claims.

## Finding

### C3-CT-01 — Camera anticipation crosses route discontinuities that the product deliberately does not draw

- Severity: **Medium**
- Confidence: **High**
- Evidence: `src/lib/interpolate.ts:31-40`, `src/lib/interpolate.ts:54-72`, `src/lib/camera.ts:274-288`, `src/components/MapView.tsx:945-958`; contrast `src/lib/map-geometry.ts:23-57`
- Segment breaks are first-class in distance and geometry: the break edge contributes zero distance, and route/trail geometry remains disconnected. Both camera look-ahead implementations ignore that boundary. Basic follow performs a global cumulative-distance search from `segmentIndex + 1`; bird's-eye adds a global progress fraction and interpolates anywhere later in the track.
- Failure scenario: a GPX/Google trip contains a local route followed by a disconnected route in another city. During the last 600 m of the first segment (or the last 5% before the boundary in bird's-eye mode), the camera bearing turns toward the later city even though no connecting line exists. The marker follows one route while the camera visually predicts an impossible cross-gap journey.
- Required fix: derive the current segment's inclusive point bounds and clamp forward look-ahead inside them. At a segment end, use the last distinct in-segment direction (or hold the current bearing) until playback snaps to the next segment. Cover a fixture whose next segment lies in a deliberately different bearing and assert both default follow and bird's-eye stay segment-local.

### C3-CT-02 — A final singleton visit is visible in the trip model but unreachable in playback

- Severity: **Medium**
- Confidence: **High**
- Evidence: `src/lib/googleJsonParser.ts:161-196`, `src/lib/googleJsonParser.ts:258-276`, `src/lib/interpolate.ts:31-40`, `src/lib/interpolate.ts:115-145`, `src/components/MapView.tsx:925-933`
- Google semantic parsing intentionally separates a timeline path and a visit into distinct segments. When that final visit is a singleton, its incoming break has zero distance and contributes no positive interval to the distance-normalized playback domain. `interpolateAlongTrack(..., progress = 1)` returns the preceding point rather than the last point on that plateau.
- Failure scenario: a trip ending with a stationary visit reports/imports the visit in its point count, but playback, the trail head, marker, camera, and exported final frame stop at the preceding path endpoint. A user cannot see the trip actually arrive at its recorded destination.
- Required fix: guarantee that progress `1` maps to the final point, then define an index/time fallback for tracks made entirely from zero-length segments. Regression-test the existing path-plus-visit shape, not just ordinary positive-distance endpoints.

## Product assessment

The rest of the reviewed copy and behavior aligns with the current implementation: bundled maps and coordinate jumps are local-only, format guidance matches parser families, segment gaps are excluded from reported distance, export limits are surfaced, and localized key parity is tested. No further independent product-truth finding met the threshold.
