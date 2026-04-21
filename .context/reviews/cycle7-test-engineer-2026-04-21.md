# Test Engineer -- Cycle 7 (2026-04-21)

## Methodology

Reviewed E2E test coverage (e2e/travelback.spec.ts, 1087 lines, 40+ tests). Analyzed test gaps, flaky test risks, and TDD opportunities.

## Current Coverage Assessment

The E2E suite covers:
- Homepage loading, file upload UI
- GPX, KML, JSON (6 Google formats) import
- Playback controls
- Scene editor (add scene, change mode)
- Export panel (open, close, resolution select)
- Theme persistence (dark/light, reload)
- Map error handling and reload button
- Map style cycling
- Keyboard shortcuts and focus management
- Mobile layout tests (390x844)
- Journey creator (icon options, coordinate jump)
- Segmented track stats
- Camera stability during playback
- Language switching (5 locales)
- Timeline trimming
- Layout overlap tests

## New Findings

### C7-TE-1: No E2E test for TimelineSelector drag interaction [LOW/MEDIUM]

**File:** e2e/travelback.spec.ts
**Confidence:** MEDIUM

The `timeline trimming never collapses to a one-point track` test (line 626-642) tests the end-handle drag, but there's no test for:
- Dragging the start handle
- Dragging the selected region (middle drag)
- Verifying that trimmed playback stats update correctly after drag
- Verifying that the timeline resets to full range when the reset button is clicked

**Fix:** Add E2E tests for start-handle drag, region drag, and reset button functionality.

### C7-TE-2: No unit test for camera.ts lerpCamera antimeridian wrapping [LOW/LOW]

**File:** src/lib/camera.ts:102-131
**Confidence:** LOW

The `lerpCamera` function handles antimeridian crossing by shifting longitudes into [0,360) domain when the absolute difference exceeds 180. This is a critical correctness path for routes that cross the Pacific, but there are no unit tests for it.

**Fix:** Add unit tests for lerpCamera with antimeridian-crossing camera states. This is noted as a variant of DF-C4-017.

## Deferred Items

DF-C2-008 (E2E suite serialized and sleep-heavy) carries forward. The current suite uses some `waitForTimeout` calls which could be replaced with `waitFor` patterns, but the existing `expect.poll` approach in layout tests is a good pattern.

## Summary

Test coverage is comprehensive for a single-page app. The main gaps are in timeline drag interactions and unit-level camera math tests.
