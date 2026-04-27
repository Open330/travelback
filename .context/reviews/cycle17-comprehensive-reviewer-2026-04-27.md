# Cycle 17 Comprehensive Review — 2026-04-27

**Reviewer:** comprehensive-reviewer
**Scope:** Full codebase re-review with context from 16 prior cycles

## Methodology

Single-pass deep code review examining all source files with full context from 16 prior aggregate reviews (50+ findings across cycles 1, 2, 8-16). Focus on verifying C16 fixes, confirming carried findings remain open, and identifying genuinely new findings.

## C16 fix verification

| Fix ID | Description | Status | Evidence |
|--------|-------------|--------|----------|
| C16-F01 | Remove deprecated `addListener`/`removeListener` in MediaQuery handler | RESOLVED | page.tsx:267-270 uses only `addEventListener`/`removeEventListener`; comment notes browser support minimums |
| C16-F07 | Fix state-update-after-unmount in usePlaybackController fallback timer | RESOLVED | usePlaybackController.ts:146 `mountedRef.current = false` in cleanup; line 121 checks `mountedRef.current` before state setters |
| C16-F03 | Use ratioRef.current in TimelineSelector startDrag | RESOLVED | TimelineSelector.tsx:300-301 reads `ratioRef.current.start` and `ratioRef.current.end` |
| C16-F04 | Guard against duplicate download anchor elements | RESOLVED | videoEncoder.ts:204,233,238 `prevFallbackAnchor` module-level guard removes previous anchor before creating new one |
| C16-F05 | Use refs for SceneRangeEditor drag origin values | RESOLVED | SceneEditor.tsx:89-92 `startPercentRef`/`endPercentRef` with sync effects; lines 108-109 read from refs |

All 5 C16 fixes confirmed present and correct.

## Carried findings — status verification

The following 14 carried findings remain open and were re-verified:

| Prior ID | Severity | Summary | Still valid |
|----------|----------|---------|-------------|
| N02 | HIGH | No unit test layer for pure functions | Yes — no unit tests added |
| N03 | HIGH | E2E export success path exercises only stub | Yes — no real export E2E |
| N04 | MEDIUM-HIGH | Google JSON parser duplicated in worker vs main | Yes — parser duplication remains |
| N01 | MEDIUM-HIGH | Per-frame trail geometry rebuild (partially resolved by precomputed segments) | Yes — precomputed segments help but segment-change path still rebuilds |
| N08 | MEDIUM | Scene editor static aria-valuemin/aria-valuemax | Yes — no change |
| N11 | MEDIUM | Map layer ownership split across components | Yes — layers managed across multiple effects in MapView |
| N12 | MEDIUM | Track session state spread across 12+ atoms | Yes — page.tsx state architecture unchanged |
| N14 | MEDIUM | Export memory guard underestimates 4K peak | Yes — estimation formula unchanged |
| N17 | MEDIUM | Mobile toolbar dialog not truly modal | Yes — no modal gate added |
| C13-F03 | LOW | iOS Safari download fallback | Yes — still uses anchor fallback |
| C13-F05 | LOW | Timeline click-to-seek on selected region | Yes — no change |
| C15-F03 | LOW | ErrorBoundary does not show error details in development | Yes — ErrorBoundary unchanged (verified lines 1-85) |
| C15-F06 | LOW | MapView addTrackLayers called from multiple effect paths without deduplication | Yes — called from track effect (line 1017) and progress effect (line 1071); idempotent checks prevent double-add |
| C15-F07 | INFO | ElevationProfile SVG stroke width inconsistency (cosmetic) | Yes — no change |

## New findings

**No genuinely new findings identified in this cycle.**

The codebase has been through 16+ review cycles. All source files were examined:
- `src/app/page.tsx` (659 lines) — stable, all C16 fixes present
- `src/components/MapView.tsx` (1257 lines) — stable, no regressions
- `src/lib/parser.ts` (763 lines) — stable
- `src/lib/useExportController.ts` (334 lines) — stable
- `src/lib/usePlaybackController.ts` (249 lines) — stable, C16-F07 fix verified
- `src/lib/camera.ts` (461 lines) — stable
- `src/lib/interpolate.ts` (215 lines) — stable
- `src/lib/videoEncoder.ts` (270 lines) — stable, C16-F04 fix verified
- `src/types.ts` (122 lines) — stable
- `src/components/TimelineSelector.tsx` (583 lines) — stable, C16-F03 fix verified
- `src/components/SceneEditor.tsx` (787 lines) — stable, C16-F05 fix verified
- `src/components/JourneyCreator.tsx` (883 lines) — stable
- `src/components/ExportPanel.tsx` (443 lines) — stable
- `src/components/ModalDialog.tsx` (189 lines) — stable
- `src/components/ErrorBoundary.tsx` (85 lines) — stable
- `src/app/layout.tsx` (89 lines) — stable
- `scripts/harden-static-export.mjs` (156 lines) — stable
- `scripts/smoke-static.mjs` (327 lines) — stable

Areas checked with no new issues:
- `as unknown as` casts in videoEncoder.ts (2 occurrences) — necessary for File System Access API not in standard lib
- `dangerouslySetInnerHTML` in layout.tsx — bootstrap script, CSP-hardened by build script
- `eslint-disable` comments (10 occurrences) — all have documented justification
- `console.error`/`console.warn` calls (13 occurrences) — all in error handlers, appropriate
- No TODO/FIXME/HACK/XXX comments found
- No unguarded `eval()` or `innerHTML` patterns
- Event listener cleanup verified across all useEffect hooks
- AbortController/AbortSignal pattern verified in export pipeline

## Summary

| Category | Count |
|----------|-------|
| C16 fixes verified | 5/5 |
| Carried findings still open | 14 |
| Genuinely new findings | 0 |
| Actionable this cycle | 0 |

The codebase has reached a stable plateau. The 14 carried findings are all architectural/test-infrastructure improvements that require significant effort (unit test framework, E2E infrastructure, state management refactor) and are appropriately deferred. No regressions or new bugs identified.
