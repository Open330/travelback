# Cycle 1 Implementation Plan — 2026-04-27 (run 2)

Repository: `/Users/hletrd/flash-shared/Travelback`

## Cycle context

- 56 raw findings across 11 review lanes
- 14 findings resolved since last aggregate (verified in committed code)
- 14 carried findings remain — all are architectural/infrastructure improvements
- No genuinely new findings this cycle

## Actionable items this cycle

All readily-fixable items have been resolved in prior commits. The 14 carried findings are:

| ID | Severity | Summary | Effort | Action |
|----|----------|---------|--------|--------|
| N01 | HIGH | Per-frame trail rebuild during playback (skip path) | Large | **RESOLVED** — precomputeWrappedSegments + segment-change check eliminates redundant rebuilds (cycle 3 verification) |
| N02 | HIGH | No unit test layer | Large | **RESOLVED** — 219 tests across 6 test files (camera, interpolate, parser, videoEncoder, i18n, env) |
| N03 | HIGH | E2E export stub only | Large | **PARTIALLY RESOLVED** — real encoding via mediabunny now in place; E2E test still uses stub |
| N04 | MEDIUM-HIGH | Google parser worker/main dedup | Large | Deferred — requires module extraction, worker bundling changes |
| N10 | MEDIUM | Scene normalization mutates intent | Medium | **CORRECTED** — normalizeScenes does NOT mutate originals (creates new objects via spread). Valid product-level concern (visual reordering) but not a code mutation bug. |
| N11 | MEDIUM | Map layer ownership boundaries | Large | Deferred — requires MapView overlay API refactor |
| N12 | MEDIUM | Session state coupling | Medium | Deferred — requires useTrackSessionController reducer |
| N14 | MEDIUM | Export memory guard 4K undercount | Small | Fixable — increase multiplier to 8x (already partially done) |
| N17 | MEDIUM | Mobile toolbar dialog not modal | Medium | Deferred — requires focus trap or semantic downgrade |
| C13-F03 | LOW | iOS Safari download fallback | Small | Deferred — low impact, hard to test |
| C13-F05 | LOW | Timeline click-to-seek on selected region | Small | Deferred — UX improvement |
| C15-F03 | LOW | ErrorBoundary no error details in dev | Small | Deferred — dev-only improvement |
| C15-F06 | LOW | addTrackLayers called from multiple effects | Small | Deferred — guarded by layer-existence check |
| C15-F07 | INFO | ElevationProfile SVG stroke width | Trivial | Deferred — cosmetic |

## Implementation this cycle

Only N14 (export memory guard) is small enough to fix in a single cycle without architectural changes. The 8x multiplier is already partially in place (videoEncoder.ts line 65 uses `rawFrameBytes * 8 * resolutionMultiplier`). Verify the estimate is correct for 4K.

All other findings require significant effort investment and are appropriately deferred.

## Commits planned

1. `perf(export): ⚡ verify 4K memory guard accuracy` — confirm N14 resolution or adjust multiplier

## Gates

- eslint (clean)
- tsc --noEmit (clean)
- next build (clean)
