# Test Engineer -- Cycle 4 (2026-04-21)

## Summary
E2E test infrastructure exists but has gaps. Found 3 test coverage issues.

## Findings

### T4-001: No E2E test for theme toggle persistence [HIGH]
- **Issue:** The most critical user-facing feature (theme persistence across reloads) has no E2E test. The cycle 3 bug (theme broken on initial load) would have been caught by a simple test: load page, verify data-mode attribute, toggle theme, reload, verify data-mode persists.
- **Impact:** HIGH. This was a user-reported bug that could regress without an automated guard.
- **Recommended test:** Load the app -> verify `data-mode="light"` on html -> click theme toggle -> verify `data-mode="dark"` -> reload page -> verify `data-mode="dark"` persists.

### T4-002: No E2E test for map load error handling [MEDIUM]
- **Issue:** TASK-5 added `map.on('error', onMapError)` but there's no test verifying that the error UI is shown when the map fails to load. A network interception test could block the style JSON and verify the error state.
- **Impact:** MEDIUM. Map error handling is a new feature with no regression test.

### T4-003: E2E suite serialized and sleep-heavy [MEDIUM] (Carried: DF-C2-008)
- **Issue:** The E2E test suite runs tests sequentially with `sleep` calls for waiting on map load, animations, etc. This makes the suite slow and flaky.
- **Status:** Already deferred as DF-C2-008.

### T4-004: No integration test for export pipeline [LOW]
- **Issue:** The video export pipeline (`useExportController` -> `exportVideo` -> `downloadVideo`) has no integration test. The pipeline involves canvas capture, WebCodecs encoding, and file download -- all of which are difficult to unit test in isolation.
- **Impact:** LOW. The export pipeline is complex but well-structured with clear error handling. A full integration test would require mocking WebCodecs, which is non-trivial.

## Positive Observations
- Error boundary test coverage exists
- The `data-testid` attributes on key elements (global-toolbar, map-container, map-error) support testability
- The `data-travelback-app-root` attribute enables modal focus trapping to find the app root
