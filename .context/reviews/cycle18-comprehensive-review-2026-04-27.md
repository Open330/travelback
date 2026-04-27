# Cycle 18 Comprehensive Review — 2026-04-27

**Reviewer**: comprehensive-reviewer
**Date**: 2026-04-27
**Scope**: Full repository — all `src/` files, scripts, configuration
**Prior context**: 17 aggregate reviews (50+ findings), 14 carried forward

---

## Carried Findings — Current State Verification

All 14 carried findings were verified against current source code:

| ID | Severity | Summary | Status |
|----|----------|---------|--------|
| N01 | HIGH | Per-frame trail geometry rebuild (partially resolved by precomputed segments, skip path still uses `buildTrackGeometry`) | STILL OPEN — MapView:585-591 fallback path |
| N02 | HIGH | No unit test layer for pure functions | STILL OPEN — only parser/camera/interpolate/env/videoEncoder have tests |
| N03 | HIGH | E2E export success path exercises only stub | STILL OPEN — e2e tests use isLocalExportTestStubEnabled |
| N04 | MEDIUM-HIGH | Google JSON parser duplicated in worker vs main | STILL OPEN — worker runs same parseGoogleLocationHistory |
| N10 | MEDIUM | Scene normalization mutates user intent; UI warns after the fact | PARTIALLY RESOLVED — normalization deferred to commit (C13-F08), warnings show specific adjustments |
| N11 | MEDIUM | Map layer ownership split across components | STILL OPEN — addTrackLayers called from MapView, JourneyCreator manages own layers |
| N12 | MEDIUM | Track session state spread across 12+ atoms in page.tsx | STILL OPEN — 15+ useState calls in HomeInner |
| N14 | MEDIUM | Export memory guard underestimates 4K peak | STILL OPEN — estimateExportMemoryBytes uses 8x multiplier + 1.5x for >1080p |
| N17 | MEDIUM | Mobile toolbar dialog not truly modal | PARTIALLY RESOLVED — focus trap added (TrackToolbar:79-94), uses role="dialog" |
| C13-F03 | LOW | iOS Safari download fallback | STILL OPEN |
| C13-F05 | LOW | Timeline click-to-seek on selected region | STILL OPEN |
| C15-F03 | LOW | ErrorBoundary dev error details | STILL OPEN |
| C15-F06 | LOW | MapView addTrackLayers called from multiple paths | STILL OPEN |
| C15-F07 | INFO | ElevationProfile SVG stroke inconsistency | STILL OPEN |

## New Findings

### Finding 1: `generateId()` in types.ts violates SRP
**File**: `src/types.ts:1-8`
**Severity**: LOW
**Confidence**: High

`generateId()` is a utility function placed in `types.ts` alongside type definitions. While it was improved with a counter (cycle 5), it still lives in a module that should contain only types and constants. The `Toast.tsx` and `SceneEditor.tsx` both import from `@/types` just for `generateId`, creating an unnecessary dependency on the types module.

**Fix**: Move `generateId()` to `src/lib/id.ts` and re-export from `@/types` for backward compatibility.

### Finding 2: `buildTrackGeometry` fallback path in renderFrameAndWait is unreachable with precomputed segments
**File**: `src/components/MapView.tsx:585-591`
**Severity**: LOW
**Confidence**: Medium

The `else if (trailSource && segmentIndexChanged)` branch in `renderFrameAndWait` calls `buildTrackGeometry` as a fallback when `precomputedSegmentsRef.current.length === 0`. However, `precomputedSegmentsRef` is populated in the track-loading effect (line 1009) at the same time as `cumulDistRef`. If `cumulDistRef` is populated (checked at line 533), then `precomputedSegmentsRef` will also be populated. The only case where it wouldn't be is if `track.points` is empty, but the length check at line 533 would also fail.

This is dead code that adds complexity but is not harmful.

**Fix**: Add a comment explaining why the fallback exists (defensive), or remove it.

### Finding 3: Trail geometry duplication between renderFrameAndWait and progress effect
**File**: `src/components/MapView.tsx:533-591` (export) and `1061-1137` (playback)
**Severity**: MEDIUM
**Confidence**: High

The trail GeoJSON update logic (building trail segments from precomputed data, handling partial segments, wrapping interpolated points) is duplicated nearly line-for-line between `renderFrameAndWait` and the progress `useEffect`. Both follow the same pattern:
1. Iterate precomputed segments
2. Check range.start > segmentIndex
3. Handle full vs partial segments
4. Wrap interpolated point longitude

This is the same N01 finding. Extracting a shared `buildTrailGeoJSON(segments, segmentIndex, point)` function would reduce duplication and ensure both paths stay in sync.

### Finding 4: Export progress throttle uses 100ms interval but progress bar transition is 100ms
**File**: `src/lib/useExportController.ts:216-219,227-229` and `src/components/ExportPanel.tsx:305`
**Severity**: LOW
**Confidence**: Medium

The export progress throttle updates at ~10 Hz (every 100ms), and the progress bar CSS transition is also `100ms linear`. This means the bar transition may not fully complete before the next update arrives, causing a slight visual lag where the bar appears to chase the target width. The prior fix (cycle 12) set the throttle to 100ms and the transition to 100ms, but the transition should be shorter than the throttle interval for smooth animation.

**Fix**: Reduce progress bar transition to `50ms linear` or increase throttle to `150ms`.

### Finding 5: `usePlaybackController` speed/duration effect resets startProgress on every change
**File**: `src/lib/usePlaybackController.ts:41-49`
**Severity**: LOW
**Confidence**: High

The `useEffect` for `[speed, duration]` resets `startTimestampRef` and `startProgressRef` whenever speed or duration changes while playing. This is correct behavior (it recalibrates the accumulator). However, it also sets `awaitingFirstFrameRef.current = false`, which means the next animation frame will use the *new* startProgress immediately instead of waiting for a timestamp reference point. This could cause a tiny visual jump when changing speed during playback.

**Fix**: This is a minor issue; the recalibration is necessary and the jump is imperceptible. No action needed.

## Summary

| # | Finding | Severity | Confidence | Category |
|---|---------|----------|------------|----------|
| 1 | generateId() in types.ts | LOW | High | maintainability |
| 2 | buildTrackGeometry fallback likely unreachable | LOW | Medium | dead code |
| 3 | Trail geometry duplication (N01 variant) | MEDIUM | High | maintainability |
| 4 | Export progress transition/throttle timing mismatch | LOW | Medium | UX |
| 5 | Speed change recalibration micro-jump | LOW | High | UX |

## Overall Assessment

The codebase is in good shape after 17 prior review cycles. All 4 quality gates pass cleanly (lint, typecheck, build, test). The 14 carried findings are architectural/infrastructure improvements that require significant effort investment. This review found only 5 findings, all LOW or MEDIUM severity, with 3 being refinements of existing carried items.

No security vulnerabilities, correctness bugs, or data-loss risks were identified. The code is well-documented with clear comments explaining design decisions.
