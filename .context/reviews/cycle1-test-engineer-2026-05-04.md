# Test Coverage Review — Travelback (Cycle 1, 2026-05-04)

**Reviewer**: test-engineer
**Scope**: Test coverage gaps, flaky patterns, TDD opportunities

## Test Infrastructure

- **Unit tests**: vitest (src/lib/*.test.ts)
- **E2E tests**: Playwright (e2e/travelback.spec.ts)
- **Config**: vitest.config.ts includes `src/**/*.test.ts`

## Existing Test Coverage

| Module | Test File | Coverage |
|--------|-----------|----------|
| parser.ts | parser.test.ts | GPX/KML/JSON parsing, edge cases |
| camera.ts | camera.test.ts | Camera modes, scene normalization, blending |
| interpolate.ts | interpolate.test.ts | Haversine, bearing, cumulative distances |
| videoEncoder.ts | videoEncoder.test.ts | Memory estimation, codec mapping |
| env.ts | env.test.ts | Base path detection |

## Coverage Gaps

### TE-01: No unit tests for usePlaybackController
**Severity**: High
**File**: `src/lib/usePlaybackController.ts` (no test file)
**Description**: The playback animation loop, speed changes, duration changes, seek operations, and keyboard shortcuts have no unit tests. This is a complex stateful hook with timing-dependent behavior.
**Recommended tests**:
- Toggle play/pause state transitions
- Seek to specific progress (0, 0.5, 1.0, out of bounds)
- Speed changes during playback
- Duration changes during playback
- Reset playback session
- Progress accumulation accuracy

### TE-02: No unit tests for useExportController
**Severity**: High
**File**: `src/lib/useExportController.ts` (no test file)
**Description**: Export lifecycle, abort handling, map resize/restore, and error recovery have no unit tests.
**Recommended tests**:
- Export state transitions (idle -> exporting -> done)
- Abort during export
- Map resize and resetSize
- Error handling for different ExportError codes
- Memory limit enforcement

### TE-03: No unit tests for i18n module
**Severity**: Medium
**File**: `src/lib/i18n.ts` (no test file)
**Description**: Locale detection, translation function, and context provider have no tests.
**Recommended tests**:
- `detectLocale()` with various navigator.language values
- `t()` key lookup and fallback to English
- Translation completeness (all en keys present in all locales)

### TE-04: No unit tests for googleJsonParser
**Severity**: Medium
**File**: `src/lib/googleJsonParser.ts` (no test file)
**Description**: All Google Location History format variants are tested indirectly through parser.test.ts, but the parser module itself has no dedicated tests for:
- `checkJsonDepth` boundary conditions
- `flattenGoogleSegments` deduplication logic
- `parseSemanticPoint` regex matching
- Edge cases in each format parser

### TE-05: E2E tests don't cover export completion
**Severity**: Medium
**File**: `e2e/travelback.spec.ts`
**Description**: E2E tests verify export panel UI (resolution, codec, start button) but don't verify actual MP4 generation due to WebCodecs limitations in headless Chromium.
**Recommendation**: Add a test stub mode (already exists via `isLocalExportTestStubEnabled`) to verify the full export state machine without actual encoding.

### TE-06: No visual regression tests
**Severity**: Low
**File**: N/A
**Description**: No screenshot-based visual regression testing exists. Theme switching, responsive layouts, and map rendering could regress without detection.
**Recommendation**: Consider Playwright visual comparison tests for key screens.

### TE-07: No accessibility tests
**Severity**: Medium
**File**: N/A
**Description**: No automated accessibility testing (axe-core, WCAG assertions). ARIA roles, keyboard navigation, and focus management are verified manually.
**Recommendation**: Add @axe-core/playwright to E2E tests.

## Summary

| Severity | Count |
|----------|-------|
| High     | 2     |
| Medium   | 4     |
| Low      | 1     |
