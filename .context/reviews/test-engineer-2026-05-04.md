# Test Engineer Review — Travelback (2026-05-04)

## Summary

Test coverage exists at unit level (vitest) and E2E level (Playwright). Key gaps are in unit test coverage for newer modules and in export pipeline testing.

## Findings

### 1. No unit tests for camera.ts scene blending — MEDIUM risk, HIGH confidence
**File**: `src/lib/camera.ts`
**Issue**: While `camera.test.ts` exists, the complex scene blending logic in `computeCameraForProgress` (lines 356-466) — especially gap interpolation and transition blending — needs targeted unit tests. Edge cases: empty scenes, single scene, overlapping scenes, progress at exact scene boundaries.
**Suggestion**: Add tests for `computeCameraForProgress` with various scene configurations.

### 2. No unit tests for usePlaybackController — MEDIUM risk, HIGH confidence
**File**: `src/lib/usePlaybackController.ts`
**Issue**: The playback animation loop, speed/duration changes during playback, and progress reset logic are untested at unit level. E2E tests cover basic play/pause but not edge cases like changing speed mid-playback.
**Suggestion**: Add React hook tests for speed transitions, duration changes, and progress clamping.

### 3. No unit tests for useExportController — MEDIUM risk, HIGH confidence
**File**: `src/lib/useExportController.ts`
**Issue**: The export lifecycle (idle -> exporting -> done/error), abort handling, and video URL cleanup are complex state machines without unit coverage.
**Suggestion**: Add tests with mocked MapViewHandle for export state transitions.

### 4. No unit tests for videoEncoder.ts — MEDIUM risk, HIGH confidence
**File**: `src/lib/videoEncoder.ts`
**Issue**: `estimateExportMemoryBytes`, `estimateEncodedBytes`, and filename sanitization are pure functions that are easily testable but have no tests.
**Suggestion**: Add unit tests for memory estimation edge cases and filename sanitization.

### 5. No unit tests for i18n.ts — LOW risk, HIGH confidence
**File**: `src/lib/i18n.ts`
**Issue**: Translation key completeness (all locales have the same keys) is not verified by tests. Adding a new key in `en` without adding it to other locales would silently fall back to English.
**Suggestion**: Add a test that verifies all locale objects have the same set of keys.

### 6. No unit tests for interpolate.ts format functions — LOW risk, HIGH confidence
**File**: `src/lib/interpolate.ts:193-217`
**Issue**: `formatDistance`, `formatElevation`, `formatDuration` are pure functions with clear inputs/outputs but no tests.
**Suggestion**: Add tests for edge cases: negative values, infinity, zero, imperial/metric.

### 7. No unit tests for MapView geometry builders — LOW risk, HIGH confidence
**File**: `src/components/MapView.tsx:95-279`
**Issue**: `buildSegmentRanges`, `precomputeWrappedSegments`, `buildTrackGeometry`, `buildTrailGeoJSONFromSegments`, and `buildFitBounds` are pure functions embedded in the component file. They have no tests.
**Suggestion**: Extract to a utility module and add tests, especially for antimeridian-crossing tracks.

### 8. E2E tests cover core flow but not all camera modes — LOW risk, HIGH confidence
**File**: `e2e/travelback.spec.ts`
**Issue**: E2E tests verify upload, playback, and export panel visibility. They don't test individual camera mode rendering or scene switching.
**Suggestion**: Add E2E tests for scene editor: add a scene, change camera mode, verify playback behavior.

### 9. No regression test for CSP hardening — LOW risk, HIGH confidence
**File**: `scripts/smoke-static.mjs`
**Issue**: The smoke test verifies CSP directives exist. It doesn't verify that script hashes match actual inline scripts. A build change could produce mismatched hashes.
**Suggestion**: Add a test that loads the built HTML, extracts script content, computes SHA-256, and verifies against the CSP meta tag.

### 10. parser.test.ts covers GPX/KML but not all Google JSON formats — MEDIUM risk, HIGH confidence
**File**: `src/lib/parser.test.ts`
**Issue**: Tests exist for some Google JSON formats but the test coverage for newer formats (Timeline Edits, semantic segments with visit.topCandidate.placeLocation.latLng) may be incomplete.
**Suggestion**: Add fixture-based tests for each Google JSON format variant listed in the architecture doc.

## Test Infrastructure Assessment

- **vitest.config.ts**: Present, configured for jsdom environment
- **playwright.config.ts**: Present, 120s timeout, port 3099
- **Coverage**: No coverage reporting configured
- **CI**: No CI configuration visible in repo root