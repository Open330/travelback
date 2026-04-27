# Cycle 10 Test Engineer Review — 2026-04-27

## Review Scope
Test coverage, test quality, flaky-test risk, TDD opportunities.

## Findings

### C10-TE-01 — LOW-MEDIUM — Parser unit tests exist but camera/interpolation tests lack edge-case coverage for antimeridian crossing

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/interpolate.test.ts`, `src/lib/camera.test.ts`
- **Detail:** The existing unit tests for `interpolate.test.ts` and `camera.test.ts` cover basic functionality, but neither has test cases for tracks that cross the antimeridian (e.g., a flight from Tokyo to Honolulu). The `wrapLngNear` and `shortestLngDelta` functions have subtle behavior near +-180 longitude, and `buildFitBounds` has explicit antimeridian handling. These code paths should have targeted unit tests.
- **Failure scenario:** A refactor to `wrapLngNear` or `buildFitBounds` breaks antimeridian handling silently because no test exercises those paths.
- **Fix:** Add test cases with coordinates near +-180 and tracks that cross the antimeridian. Cover `wrapLngNear`, `shortestLngDelta`, `buildFitBounds`, and `buildTrackGeometry` with antimeridian-crossing fixtures.

### C10-TE-02 — LOW — No unit test for `buildFilteredTrack` segment-remapping logic

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:310-326`
- **Detail:** The segment-start-index remapping logic in `handleRangeChange` (and duplicated in `confirmTrimClear`) is currently only tested through E2E. It handles edge cases like filtering indices at the start boundary and mapping them. This pure-logic function should be extracted and unit-tested.
- **Failure scenario:** A change to the remapping logic breaks segment boundaries for trimmed tracks without being caught by E2E (which may not test multi-segment tracks with trimming).
- **Fix:** Extract `buildFilteredTrack` and add unit tests for segment index remapping with various trim ranges.

## Summary

| Severity | Count |
|----------|-------|
| LOW-MEDIUM | 1 |
| LOW | 1 |
