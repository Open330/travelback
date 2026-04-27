# Cycle 18 Aggregate Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Review methodology

Comprehensive code review of all source files. Full context from 17 prior aggregate reviews (cycles 1-17, 50+ findings). Focus on verifying carried findings and identifying genuinely new issues. All 4 quality gates pass (lint, typecheck, build, test).

## Review lanes completed

- `cycle18-comprehensive-review-2026-04-27.md` — 5 findings (1 MEDIUM, 4 LOW)

## Carried findings — resolution verification

All 14 carried findings verified against current source. No new resolutions since cycle 17.

| ID | Severity | Summary | Status |
|----|----------|---------|--------|
| N01 | HIGH | Per-frame trail geometry rebuild during playback (partially resolved) | STILL OPEN |
| N02 | HIGH | No unit test layer for pure functions | STILL OPEN |
| N03 | HIGH | E2E export success path exercises only stub | STILL OPEN |
| N04 | MEDIUM-HIGH | Google JSON parser duplicated in worker vs main | STILL OPEN |
| N10 | MEDIUM | Scene normalization mutates user intent | PARTIALLY RESOLVED |
| N11 | MEDIUM | Map layer ownership split across components | STILL OPEN |
| N12 | MEDIUM | Track session state spread across 12+ atoms | STILL OPEN |
| N14 | MEDIUM | Export memory guard underestimates 4K peak | STILL OPEN |
| N17 | MEDIUM | Mobile toolbar dialog not truly modal | PARTIALLY RESOLVED |
| C13-F03 | LOW | iOS Safari download fallback | STILL OPEN |
| C13-F05 | LOW | Timeline click-to-seek on selected region | STILL OPEN |
| C15-F03 | LOW | ErrorBoundary dev error details | STILL OPEN |
| C15-F06 | LOW | MapView addTrackLayers called from multiple paths | STILL OPEN |
| C15-F07 | INFO | ElevationProfile SVG stroke inconsistency | STILL OPEN |

## New findings

| ID | Severity | Summary | File |
|----|----------|---------|------|
| C18-F01 | LOW | `generateId()` in types.ts violates SRP | src/types.ts:1-8 |
| C18-F02 | LOW | `buildTrackGeometry` fallback likely unreachable | src/components/MapView.tsx:585-591 |
| C18-F03 | MEDIUM | Trail geometry duplication between export and playback paths | src/components/MapView.tsx:533-591,1061-1137 |
| C18-F04 | LOW | Export progress transition/throttle timing mismatch | src/lib/useExportController.ts, src/components/ExportPanel.tsx |
| C18-F05 | LOW | Speed change recalibration micro-jump | src/lib/usePlaybackController.ts:41-49 |

## Finding count summary

| Severity | Count | New this cycle | Carried from prior cycles |
|----------|-------|----------------|--------------------------|
| HIGH | 3 | 0 | N01, N02, N03 |
| MEDIUM-HIGH | 1 | 0 | N04 |
| MEDIUM | 5 | 1 (C18-F03) | N10, N11, N12, N14, N17 |
| LOW | 7 | 4 | C13-F03, C13-F05, C15-F03, C15-F06 |
| INFO | 1 | 0 | C15-F07 |
| **Total open** | **17** | **5** | — |

## Actionable this cycle

The following items from the new findings can be implemented this cycle:

1. **C18-F03** — Extract shared trail geometry builder to reduce duplication (also addresses N01 partially)
2. **C18-F04** — Fix export progress bar transition timing
3. **C18-F01** — Move `generateId()` to dedicated utility file

The carried findings are architectural/infrastructure improvements appropriately deferred pending significant effort investment (unit test framework, E2E infrastructure, state management refactor, worker deduplication, etc.).
