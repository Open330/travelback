# Test Engineer — Cycle 1 (2026-04-27)

Reviewer: test-engineer
Repository: `/Users/hletrd/flash-shared/Travelback`
Scope: Full codebase including uncommitted changes, focus on test coverage and regression risk

## Findings

### TE-01 — No unit tests for parser logic (the most complex and security-critical module)

- **Severity:** HIGH
- **Confidence:** High
- **Files:** `src/lib/parser.ts` (no corresponding `*.test.ts`)
- **Detail:** The parser handles 5+ Google JSON formats, XML parsing with entity/depth/tag preflight, coordinate validation, point budgets, and worker communication. It is the most complex module in the codebase. E2E tests exercise the upload path but cannot efficiently test edge cases like malformed XML, boundary point counts, or format detection logic. Small regressions in format parsing (e.g., dropping `placeVisit` points) would pass E2E because the UI still renders.
- **Suggested fix:** Add a unit test layer (Vitest) for: `parseGPX`, `parseKML`, `parseGoogleLocationHistory`, `preflightXml`, `checkJsonDepth`, `extractPointsFromGeoJSON`, `flattenGoogleSegments`. Use existing `e2e/fixtures/` files as test data. Wire into `npm test`.

### TE-02 — No unit tests for interpolation/camera math (pure functions ideal for testing)

- **Severity:** HIGH
- **Confidence:** High
- **Files:** `src/lib/interpolate.ts`, `src/lib/camera.ts` (no corresponding `*.test.ts`)
- **Detail:** Haversine distance, bearing computation, smoothstep, scene normalization, `computeCameraForProgress`, `computeCameraForScene` — all pure functions with no DOM dependencies. These are the most testable functions in the codebase and the most critical for correct animation behavior.
- **Suggested fix:** Add unit tests for: `computeCumulativeDistances`, `interpolateAlongTrack` (edge cases: empty, single point, antimeridian, coincident points), `computeBearing`, `normalizeScenes` (overlapping, reversed, zero-span), `lerpCamera` (antimeridian crossing), `computeCameraForProgress` (gap between scenes).

### TE-03 — Google import E2E tests assert generic count instead of exact parser outcomes

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `e2e/travelback.spec.ts` (Google JSON test assertions)
- **Detail:** Some Google import E2E tests assert that at least two points exist rather than exact counts. `parseTimelineObjects` could drop `placeVisit` points or `parseTimelineEdits` could lose coordinates, and the test would still pass.
- **Suggested fix:** Replace generic count assertions with exact visible/full point counts for every Google fixture. Add fixture comments documenting expected count/order/segments.

### TE-04 — Export test stub bypasses the entire encoding pipeline in E2E

- **Severity:** HIGH
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:163-172`, `e2e/travelback.spec.ts`
- **Detail:** The `isLocalExportTestStubEnabled()` check allows E2E tests to bypass `exportVideo()` entirely, producing a 26-byte stub instead of a real MP4. CI stays green while real encoding, canvas capture, codec probing, or MP4 finalization could be broken. This is the same F05 finding from cycle 2.
- **Suggested fix:** Add at least one small real-export smoke path with very short duration/resolution/fps and deterministic local map style. Run in a focused static-export smoke job or behind explicit non-stub export test flag.

### TE-05 — No tests for `videoEncoder.estimateExportMemoryBytes` safety gate

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/lib/videoEncoder.ts:36-49`
- **Detail:** `estimateExportMemoryBytes` is used as a safety gate before encoding. Incorrect estimation could cause tab crashes (under-estimate) or unnecessarily block valid exports (over-estimate). No test validates the estimation against known resolution/duration/fps/bitrate combinations.
- **Suggested fix:** Add unit tests with known parameter combinations and expected outputs. Verify the gate correctly blocks known-too-large configurations and allows known-safe ones.

### TE-06 — Uncommitted changes introduce new code paths not covered by any test

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:486-517` (new `renderFrameAndWait`), `src/lib/useExportController.ts:179-184` (new throttle), `src/components/JourneyCreator.tsx:80-101` (new degenerate LineString guard)
- **Detail:** The uncommitted changes add: (1) `renderFrameAndWait` imperative handle with render event + abort signal wiring, (2) export progress throttle with 0.02 threshold, (3) degenerate LineString guard in `buildLineGeoJSON`, (4) `assertPointBudget` before push in GPX and GeoJSON paths, (5) bootstrap rewrite guard in `harden-static-export.mjs`. None of these have dedicated test coverage.
- **Suggested fix:** Add test assertions for: `renderFrameAndWait` resolves after `render` event, `renderFrameAndWait` rejects on abort, degenerate LineString guard produces empty coordinates, `assertPointBudget` throws before push, bootstrap rewrite guard throws on present-but-not-replaced.

## Summary

| Severity | Count |
|----------|-------|
| HIGH     | 3     |
| MEDIUM   | 3     |
| **Total** | **6** |
