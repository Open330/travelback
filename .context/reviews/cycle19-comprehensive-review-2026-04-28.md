# Cycle 19 Comprehensive Review — 2026-04-28

**Reviewer**: comprehensive-reviewer
**Date**: 2026-04-28
**Scope**: Full repository — all `src/` files (37 source files), scripts, configuration
**Prior context**: 18 aggregate reviews (50+ findings), 17 open findings carried forward
**Quality gates**: All 4 pass (lint, typecheck, build, 112 tests)

---

## Carried Findings — Current State Verification

All 17 carried findings verified against current source code:

| ID | Severity | Summary | Status |
|----|----------|---------|--------|
| N01 | HIGH | Per-frame trail geometry rebuild during playback (partially resolved by precomputed segments + buildTrailGeoJSONFromSegments) | PARTIALLY RESOLVED — shared builder extracted (C18-TASK-2), skip path fallback still in MapView:592-600 |
| N02 | HIGH | No unit test layer for pure functions beyond parser/camera/interpolate/env/videoEncoder | STILL OPEN — 5 test files, 112 tests; Controls, Controls, TrackToolbar, ExportPanel, TimelineSelector, SceneEditor, MapView, ModalDialog, Toast, ErrorBoundary, FileUpload, JourneyCreator untested |
| N03 | HIGH | E2E export success path exercises only stub | STILL OPEN — e2e tests use isLocalExportTestStubEnabled |
| N04 | MEDIUM-HIGH | Google JSON parser duplicated in worker vs main | STILL OPEN — worker runs same parseGoogleLocationHistory |
| N10 | MEDIUM | Scene normalization mutates user intent | PARTIALLY RESOLVED — normalization deferred to commit (C13-F08), warnings show specific adjustments |
| N11 | MEDIUM | Map layer ownership split across components | STILL OPEN — addTrackLayers called from MapView, JourneyCreator manages own layers |
| N12 | MEDIUM | Track session state spread across 15+ useState calls in HomeInner | STILL OPEN |
| N14 | MEDIUM | Export memory guard underestimates 4K peak | STILL OPEN — 8x multiplier + 1.5x for >1080p |
| N17 | MEDIUM | Mobile toolbar dialog not truly modal | PARTIALLY RESOLVED — focus trap added (TrackToolbar:79-94), role="dialog" |
| C13-F03 | LOW | iOS Safari download fallback | STILL OPEN — no iOS testing infrastructure |
| C13-F05 | LOW | Timeline click-to-seek on selected region | STILL OPEN — deferred with exit criterion |
| C15-F03 | LOW | ErrorBoundary dev error details | COMPLETED — implemented in cycle 18 |
| C15-F06 | LOW | MapView addTrackLayers called from multiple paths | STILL OPEN — idempotent, no functional impact |
| C15-F07 | INFO | ElevationProfile SVG stroke inconsistency | STILL OPEN — cosmetic |
| C18-F01 | LOW | generateId() in types.ts violates SRP | COMPLETED — moved to src/lib/id.ts in cycle 18 |
| C18-F03 | MEDIUM | Trail geometry duplication | COMPLETED — shared builder extracted in cycle 18 |
| C18-F04 | LOW | Export progress transition/throttle timing | COMPLETED — transition reduced to 50ms in cycle 18 |

## New Findings

### Finding 1: `prevFallbackAnchor` in videoEncoder.ts is module-level mutable state that leaks across React remounts
**File**: `src/lib/videoEncoder.ts:204`
**Severity**: LOW
**Confidence**: High

The `prevFallbackAnchor` variable is module-scoped (`let prevFallbackAnchor: HTMLAnchorElement | null = null`). While the code correctly removes the previous anchor before creating a new one (line 233), this is a module-level side effect that persists across HMR and React component remounts. In the unlikely event that the delayed `setTimeout` cleanup (line 249) fires after the module is re-evaluated by HMR, the old reference would be stale. The existing code handles this gracefully via the `prevFallbackAnchor === a` guard, so this is a minor code smell rather than a bug.

**Fix**: No action needed — the existing guards are sufficient. Recording for completeness.

### Finding 2: `normalizeLng` returns NaN for Infinity inputs
**File**: `src/lib/interpolate.ts:5`
**Severity**: LOW
**Confidence**: High

`normalizeLng` uses modulo arithmetic: `((lng + 180) % 360 + 360) % 360 - 180`. If `lng` is `Infinity` or `NaN`, the result is `NaN` rather than a clamped value. The callers generally guard against this (track points are validated during parsing), but `lerpCamera` in camera.ts passes interpolated values through `normalizeLng` without checking for Infinity. If two camera states produce an infinite delta (which would require an infinite bearing), the result could propagate. This is a theoretical edge case since all camera values are bounded by construction.

**Fix**: Add a `Number.isFinite` guard at the start of `normalizeLng`, returning the input unchanged (or 0) for non-finite values. Low priority.

### Finding 3: `SceneEditor` undo timer can accumulate stale timers on rapid deletes
**File**: `src/components/SceneEditor.tsx:345-350`
**Severity**: LOW
**Confidence**: Medium

The `useEffect` for the undo timer correctly clears the previous timer before setting a new one. However, if a user rapidly deletes multiple scenes (each triggering a new `deletedScene` state), the `undoDelete` callback restores `deletedScene.preDeletionScenes` which may contain scenes that were deleted in a subsequent operation. For example, delete scene A (saves [A,B,C]), then delete scene B (saves [A,C]), then undo — restores [A,C] not [A,B,C]. This is correct behavior for single-level undo, but could be confusing.

**Fix**: This is a design limitation of single-level undo, not a bug. No action needed.

### Finding 4: `HomeInner` has no React.memo and re-renders on every state change
**File**: `src/app/page.tsx:86`
**Severity**: LOW
**Confidence**: High

`HomeInner` manages 15+ useState hooks and multiple useEffect callbacks. Every state change (e.g., progress updates during playback at ~60fps) triggers a re-render of `HomeInner` and all its children. While MapView is forwardRef (not re-rendered on prop changes), components like Controls, TrackWorkspace, and ExportPanel receive many props and will re-render. The playback progress effect in MapView is already optimized with `lastTrailSegmentIndexRef`, but the React reconciliation cost of re-rendering the parent tree on every progress tick is measurable.

**Fix**: Consider wrapping `HomeInner` with `React.memo` (though with 15+ states this may not help) or extracting the playback state into a context/ref pattern. This is a N12 variant (track session state spread) and is appropriately deferred as an architectural improvement.

### Finding 5: `checkJsonDepth` in parser.ts iterates every character of potentially large JSON
**File**: `src/lib/parser.ts:511-528`
**Severity**: LOW
**Confidence**: Medium

The `checkJsonDepth` function iterates character-by-character through the entire JSON text to validate nesting depth. For the main thread path, this function is correctly skipped (JSON.parse handles depth limits). For the worker path, this scan runs on the full file content. A 100MB JSON file would require iterating ~100M characters. While this is a simple loop (fast in V8), it could take 100-200ms on a large file before the worker starts parsing.

**Fix**: Consider sampling only the first N characters (e.g., 10MB) for depth validation, since valid Google Location History files have consistent nesting depth throughout. Or limit the scan to the first 1M characters with a reasonable depth threshold. This is a performance micro-optimization.

## Summary

| # | Finding | Severity | Confidence | Category |
|---|---------|----------|------------|----------|
| 1 | Module-level fallback anchor state | LOW | High | code quality |
| 2 | normalizeLng NaN propagation | LOW | High | correctness |
| 3 | Single-level undo design limitation | LOW | Medium | UX |
| 4 | HomeInner re-renders on every state change | LOW | High | performance |
| 5 | checkJsonDepth full-file scan | LOW | Medium | performance |

## Overall Assessment

The codebase is in excellent shape after 18 prior review cycles. All 4 quality gates pass cleanly. Of the 17 carried findings, 3 were resolved in cycle 18 (C15-F03, C18-F01, C18-F03, C18-F04). The remaining 13 carried findings are architectural/infrastructure improvements that require significant effort investment.

This review found only 5 new findings, all LOW severity. No security vulnerabilities, correctness bugs, data-loss risks, or performance-critical issues were identified. The code is well-documented with clear comments explaining design decisions and defensive programming patterns.

The most impactful open items for future investment remain:
1. **N02**: Unit test coverage expansion (the most actionable HIGH item)
2. **N04**: Worker parser deduplication
3. **N12**: State management consolidation (useReducer or Zustand)
4. **N03**: Real E2E export testing
