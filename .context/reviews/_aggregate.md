# Aggregate Review - Cycle 7

**Date:** 2026-04-19
**Aggregator:** Cycle 7 aggregate (review-plan-fix cycle 7)

## Source Reviews

| Review | Agent | Findings |
|--------|-------|----------|
| comprehensive-deep-code-review-2026-04-19-cycle7.md | Multi-angle deep code reviewer | 4 findings (1 LOW actionable, 1 LOW no-fix, 2 INFO) |

## Deduplicated Findings

All findings from this cycle are unique (no overlap with prior reviews).

| ID | Finding | Severity | Confidence | File | Source |
|----|---------|----------|------------|------|--------|
| NEW-C9-1 | `setExportState('idle')` in catch block not guarded by `mountedRef` | LOW | MEDIUM | `src/lib/useExportController.ts:155` | cycle7-review |
| NEW-C9-2 | SceneEditor undo supports only single-delete undo | LOW | HIGH | `src/components/SceneEditor.tsx:193,253-258` | cycle7-review |
| NEW-C9-3 | Redundant `computeCumulativeDistances` across components | INFO | LOW | Multiple files | cycle7-review |
| NEW-C9-4 | Theoretical hotkey race window at export start | INFO | LOW | `src/app/page.tsx:87-90`, `src/lib/usePlaybackController.ts:129-201` | cycle7-review |

## Cross-Agent Agreement

N/A - single review agent this cycle. Multi-angle analysis was performed within the single review pass (code quality, performance, security, accessibility, correctness, test coverage).

## Previously Resolved Findings (confirmed this cycle)

| ID | Finding | Status |
|----|---------|--------|
| NEW-C8-1 | Playback hotkeys not suppressed during video export | FIXED - `isExporting` early-return at line 153 |
| NEW-C8-2 | Export overlay missing `data-disable-playback-hotkeys` | FIXED - attribute added at line 311 |
| NEW-C7-1 | TimelineSelector index-based histogram | FIXED - distance-based bucketing |
| NEW-C6-1 | Redundant `!isExporting` check in E key handler | FIXED - simplified |
| NEW-C6-4 | TrackToolbar mobile menu uses incorrect ARIA roles | FIXED - changed to menu/menuitem |
| F6 | ErrorBoundary no i18n | FIXED - uses `useLocale()` and `t()` |

## Previously Deferred Findings Still Open

From `.context/plans/deferred-findings-cycle2-2026-04-19.md`:

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| F4 | Reference grid dominates sparse map | MEDIUM | Deferred |
| F5 | Nav control overlaps toolbar | LOW | Deferred |
| F7 | downloadVideo URL revocation risk | MEDIUM | Deferred (latent) |
| F8 | ElevationProfile useId SSR mismatch | LOW | Deferred |
| F9 | Worker parser large file inconsistency | MEDIUM | Deferred |
| F11 | Map interactive when aria-hidden | LOW | Deferred |
| F12 | TimelineSelector stale closure risk | MEDIUM | Deferred |
| F14 | JourneyCreator coordinate validation | LOW | Deferred |
| F16 | SceneEditor start >= end validation | MEDIUM | Deferred |
| NEW-R3-2 | Reference grid visible on empty map | LOW | Deferred |

## Action Items

1. **NEW-C9-1**: Schedule for implementation - add `mountedRef.current` guard around `setExportState('idle')` in the catch block of `exportTrack`. LOW severity but improves consistency with the existing `mountedRef` pattern used in the finally block.

2. **NEW-C9-2**: No fix needed - single-delete undo is a UX limitation, not a bug. Noted for awareness. A full undo stack would be a feature enhancement.

3. **NEW-C9-3**: No fix needed - redundant computation is mitigated by `useMemo`. Noted for awareness only.

4. **NEW-C9-4**: No fix needed - theoretical race window is unreachable in practice due to `data-disable-playback-hotkeys` defense-in-depth.
