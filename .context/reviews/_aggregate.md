# Cycle 19 Aggregate Review — 2026-04-28

Repository: `/Users/hletrd/flash-shared/Travelback`

## Review methodology

Comprehensive code review of all 37 source files. Full context from 18 prior aggregate reviews (50+ findings). Focus on verifying carried findings and identifying genuinely new issues. All 4 quality gates pass (lint, typecheck, build, test — 112 tests).

## Review lanes completed

- `cycle19-comprehensive-review-2026-04-28.md` — 5 findings (all LOW)

## Carried findings — resolution verification

All 17 carried findings verified against current source. 4 resolved since cycle 17.

| ID | Severity | Summary | Status |
|----|----------|---------|--------|
| N01 | HIGH | Per-frame trail geometry rebuild during playback | PARTIALLY RESOLVED — shared builder extracted |
| N02 | HIGH | No unit test layer for pure functions | STILL OPEN |
| N03 | HIGH | E2E export success path exercises only stub | STILL OPEN |
| N04 | MEDIUM-HIGH | Google JSON parser duplicated in worker vs main | STILL OPEN |
| N10 | MEDIUM | Scene normalization mutates user intent | PARTIALLY RESOLVED |
| N11 | MEDIUM | Map layer ownership split across components | STILL OPEN |
| N12 | MEDIUM | Track session state spread across 15+ atoms | STILL OPEN |
| N14 | MEDIUM | Export memory guard underestimates 4K peak | STILL OPEN |
| N17 | MEDIUM | Mobile toolbar dialog not truly modal | PARTIALLY RESOLVED |
| C13-F03 | LOW | iOS Safari download fallback | STILL OPEN |
| C13-F05 | LOW | Timeline click-to-seek on selected region | STILL OPEN |
| C15-F03 | LOW | ErrorBoundary dev error details | RESOLVED (cycle 18) |
| C15-F06 | LOW | MapView addTrackLayers called from multiple paths | STILL OPEN |
| C15-F07 | INFO | ElevationProfile SVG stroke inconsistency | STILL OPEN |
| C18-F01 | LOW | generateId() in types.ts violates SRP | RESOLVED (cycle 18) |
| C18-F03 | MEDIUM | Trail geometry duplication | RESOLVED (cycle 18) |
| C18-F04 | LOW | Export progress transition timing | RESOLVED (cycle 18) |

## New findings

| ID | Severity | Summary | File |
|----|----------|---------|------|
| C19-F01 | LOW | Module-level fallback anchor state in videoEncoder | src/lib/videoEncoder.ts:204 |
| C19-F02 | LOW | normalizeLng returns NaN for Infinity inputs | src/lib/interpolate.ts:5 |
| C19-F03 | LOW | Single-level undo design limitation in SceneEditor | src/components/SceneEditor.tsx:345-350 |
| C19-F04 | LOW | HomeInner re-renders on every state change (N12 variant) | src/app/page.tsx:86 |
| C19-F05 | LOW | checkJsonDepth full-file character scan | src/lib/parser.ts:511-528 |

## Finding count summary

| Severity | Count | New this cycle | Carried from prior cycles |
|----------|-------|----------------|--------------------------|
| HIGH | 3 | 0 | N01, N02, N03 |
| MEDIUM-HIGH | 1 | 0 | N04 |
| MEDIUM | 5 | 0 | N10, N11, N12, N14, N17 |
| LOW | 9 | 5 | C13-F03, C13-F05, C15-F06 + 5 new |
| INFO | 1 | 0 | C15-F07 |
| **Total open** | **19** | **5** | — |

## Actionable this cycle

The following new findings can be implemented this cycle:

1. **C19-F02** — Add `Number.isFinite` guard to `normalizeLng` (defensive correctness fix)
2. **C19-F05** — Optimize `checkJsonDepth` to scan only first 10MB (performance improvement)

The carried findings are architectural/infrastructure improvements appropriately deferred pending significant effort investment (unit test framework, E2E infrastructure, state management refactor, worker deduplication, etc.).
