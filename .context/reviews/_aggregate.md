# Aggregate Review - Cycle 8

**Date:** 2026-04-19
**Aggregator:** Cycle 8 aggregate (review-plan-fix cycle 5)

## Source Reviews

| Review | Agent | Findings |
|--------|-------|----------|
| comprehensive-deep-code-review-2026-04-19-cycle8.md | Deep code reviewer | 4 |

## Deduplicated Findings

All findings from this cycle are unique (no overlap with prior reviews).

| ID | Finding | Severity | Confidence | File | Source |
|----|---------|----------|------------|------|--------|
| NEW-C8-1 | Playback hotkeys not suppressed during video export | MEDIUM | HIGH | `src/lib/usePlaybackController.ts:140-196` | cycle8-review |
| NEW-C8-2 | Export overlay missing `data-disable-playback-hotkeys` | MEDIUM | HIGH | `src/app/page.tsx:310-326` | cycle8-review |
| NEW-C8-3 | `harden-static-export.mjs` walk() untyped parameter | LOW | HIGH | `scripts/harden-static-export.mjs:27` | cycle8-review |
| NEW-C8-4 | serve-static uses 302 instead of 301 for canonical redirects | INFO | HIGH | `scripts/serve-static.mjs:135` | cycle8-review |

## Cross-Agent Agreement

N/A - single review agent this cycle.

## Previously Resolved Findings (confirmed this cycle)

| ID | Finding | Status |
|----|---------|--------|
| F6 | ErrorBoundary no i18n | FIXED - now uses `useLocale()` and `t()` |
| NEW-C7-1 | TimelineSelector index-based histogram | FIXED - now uses distance-based bucketing |

## Previously Deferred Findings Still Open

From `.context/plans/deferred-findings-cycle2-2026-04-19.md`:

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| F4 | Reference grid dominates sparse map | MEDIUM | Deferred - grid less dominant with 93-layer styles |
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

1. **NEW-C8-1 + NEW-C8-2**: Schedule for implementation - add `isExporting` guard to hotkey handler and `data-disable-playback-hotkeys` to export overlay. These are related and should be fixed together.
2. **NEW-C8-3**: No fix needed - noting for completeness
3. **NEW-C8-4**: No fix needed - noting for awareness
