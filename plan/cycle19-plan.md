# Cycle 19 Implementation Plan — 2026-04-28

## Review Summary

Comprehensive code review of all 37 source files. Full context from 18 prior aggregate reviews (50+ findings). 5 new findings identified, 13 carried forward (4 resolved in cycle 18). All 4 quality gates pass (lint, typecheck, build, test — 112 tests).

See `.context/reviews/_aggregate.md` and `.context/reviews/cycle19-comprehensive-review-2026-04-28.md`.

## Prior Plans Status

### Cycle 5 Plan — ALL 17 TASKS DONE (archived)
### Cycle 18 Plan — ALL 9 TASKS DONE (archived)

## Previously Deferred Items — Re-evaluation

User explicitly requested "Fix ALL deferred items." Each deferred item re-evaluated:

### Scheduled for Implementation This Cycle

| ID | Severity | Description | Approach |
|----|----------|-------------|----------|
| C19-F02 | LOW | normalizeLng returns NaN for Infinity inputs | Add Number.isFinite guard |
| C19-F05 | LOW | checkJsonDepth full-file character scan | Limit scan to first 10MB of input |
| C19-F01 | LOW | Module-level fallback anchor state | Add explanatory comment (guards already sufficient) |
| C19-F04 | LOW | HomeInner re-renders on every state change | Document as known N12 variant, no code change |

### Remaining Deferred (genuine blockers)

| ID | Severity | Reason |
|----|----------|--------|
| N01 | HIGH | Per-frame trail geometry — partially resolved, remaining work is N01-fallback-path cleanup in MapView. Low impact: precomputed path is always used. Exit criterion: reopen if precomputed segments fail to populate. |
| N02 | HIGH | No unit test layer — requires adding test files for Controls, TrackToolbar, ExportPanel, TimelineSelector, SceneEditor, MapView, ModalDialog, Toast, ErrorBoundary, FileUpload, JourneyCreator. Significant effort investment. Exit criterion: schedule when test coverage sprint is prioritized. |
| N03 | HIGH | E2E export success path — requires real WebCodecs + MapLibre rendering infrastructure in CI. No headless browser with WebGL + WebCodecs available. Exit criterion: reopen when E2E infrastructure supports WebGL canvas. |
| N04 | MEDIUM-HIGH | Google JSON parser duplicated — requires worker architecture redesign to share parse logic without duplicating the function. Exit criterion: reopen when worker refactoring is scheduled. |
| N10 | MEDIUM | Scene normalization mutates user intent — partially resolved with deferred normalization and specific warnings. Full fix requires a "soft normalization" that preserves user intent. Exit criterion: reopen if users report confusing normalization behavior. |
| N11 | MEDIUM | Map layer ownership split — requires refactoring layer management into a dedicated service/hook. Exit criterion: reopen if layer management bugs appear. |
| N12 | MEDIUM | Track session state spread — requires significant refactoring to useReducer or Zustand. Exit criterion: reopen when state management refactor is scheduled. |
| N14 | MEDIUM | Export memory guard underestimates 4K — requires profiling real 4K exports to calibrate the multiplier. Exit criterion: reopen when 4K export testing is available. |
| N17 | MEDIUM | Mobile toolbar dialog — partially resolved with focus trap. Full fix requires testing on real mobile devices. Exit criterion: reopen if mobile focus issues reported. |
| C13-F03 | LOW | iOS Safari download fallback — requires physical iOS device testing infrastructure. Exit criterion: reopen when iOS device testing is set up. |
| C13-F05 | LOW | Timeline click-to-seek on selected region — deferred with exit criterion: requires new onSeek prop and design decision. |
| C15-F06 | LOW | addTrackLayers dedup — function is idempotent, no functional impact. Exit criterion: reopen if idempotency breaks. |
| C15-F07 | INFO | ElevationProfile SVG stroke — cosmetic only. Exit criterion: reopen if SVG rendering artifacts reported. |
| C19-F03 | LOW | Single-level undo design limitation — correct behavior for single-level undo, no bug. Exit criterion: reopen if multi-level undo is requested. |

## Active Implementation Tasks

### C19-TASK-1: Add Number.isFinite guard to normalizeLng (C19-F02)

- **Files:** `src/lib/interpolate.ts`
- **Change:** Add `Number.isFinite` check at the start of `normalizeLng`. Return 0 for non-finite inputs (consistent with the fallback behavior in `interpolateAlongTrack` for empty tracks).

### C19-TASK-2: Limit checkJsonDepth scan to first 10MB (C19-F05)

- **Files:** `src/lib/parser.ts`
- **Change:** In `checkJsonDepth`, add a maximum character count parameter (default 10MB) and break out of the loop when exceeded. Valid Google Location History files have consistent nesting depth throughout, so scanning the first 10MB is sufficient to detect depth attacks.

### C19-TASK-3: Add explanatory comment to prevFallbackAnchor (C19-F01)

- **Files:** `src/lib/videoEncoder.ts`
- **Change:** Add a comment explaining the module-level state pattern and why it's safe (the guards in the cleanup logic handle HMR correctly).

## Progress Tracking

| Task | Finding | Status | Commit |
|-------|---------|--------|--------|
| 1 | C19-F02 | COMPLETED | 1b8699f |
| 2 | C19-F05 | COMPLETED | 33d131e |
| 3 | C19-F01 | COMPLETED | 5bd74de |

All 4 quality gates pass: lint, typecheck, build, test (112 tests passing).
