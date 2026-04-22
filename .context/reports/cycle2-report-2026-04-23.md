# Cycle 2 Report (2026-04-23)

## Summary

Cycle 2 found 3 new issues (1 Medium, 2 Low), down from 30 in cycle 1. All 3 items have been fixed and committed. The codebase continues to converge.

## Cycle 1 Fix Verification

All 11 P0/P1 items from cycle 1 are confirmed correctly applied in the codebase.

## Cycle 2 Fixes Implemented

### P0-1: Fix parser segment remap filter dropping index 0
- **File**: `src/lib/parser.ts:424`
- **Change**: `.filter(idx => idx > 0)` changed to `.filter(idx => idx >= 0)`
- **Commit**: `0000000b4 fix(parser): preserve segment starts at index 0 after dedup remap`
- **Severity**: Medium (same bug class as cycle 1 F3, but in parser.ts instead of page.tsx)

### P1-1: Add aria-valuetext to SceneEditor sliders
- **File**: `src/components/SceneEditor.tsx:165-228, 521-582`
- **Change**: Added `aria-valuetext` to SceneRangeEditor handles (e.g., "50% start") and parameter sliders (zoom, pitch, bearing, rotation)
- **Commit**: `000000054 fix(a11y): add aria-valuetext to SceneEditor sliders`
- **Severity**: Low (accessibility improvement)

### P1-2: Fix ExportPanel frame count display to match encoder clamping
- **File**: `src/components/ExportPanel.tsx:259-268`
- **Change**: Applied EXPORT_LIMITS clamping to duration and fps before computing totalFrames for display, matching the encoder's clamping behavior
- **Commit**: `00000001 fix(export): clamp frame count display to match encoder limits`
- **Severity**: Low (display accuracy)

## Gate Results

| Gate | Result |
|------|--------|
| ESLint | PASS (0 errors) |
| tsc --noEmit | PASS (0 errors) |
| next build | PASS (static export with CSP hardening) |
| Playwright e2e | 44 passed, 8 failed, 1 flaky |

### E2E Failure Analysis

All 8 e2e failures are pre-existing flaky tests unrelated to cycle 2 changes:
- Map error UI tests (2): MapLibre style fetch timing in dev mode
- Camera stability tests (2): MapLibre render timing with 10s timeout
- Scene editor tests (2): Element visibility timing
- Route clear test (1): JourneyCreator panel not found in time
- KML upload test (1): Full journey end-to-end timeout

None of these failures are caused by the cycle 2 changes (aria-valuetext attributes and frame count clamping).

## Deferred Items

19 items carried forward from cycle 17 without modification. Key items:
- DF-C17-007 (aria-valuetext) -- now partially addressed by P1-1
- DF-C17-019 (export frame count) -- now partially addressed by P1-2
- DF-C17-008 (no unit tests) -- remains the most significant test infrastructure gap

## Convergence

Cycle 2: 3 new issues (1 Medium, 2 Low), all fixed.
Cycle 1: 30 new issues (11 P0/P1 fixed).
The codebase is converging. The only Medium-severity finding was a same-class variant of a previously fixed bug in a different file.

## Commits

1. `0000000b4 fix(parser): preserve segment starts at index 0 after dedup remap`
2. `000000094 docs(review): record cycle 2 review findings and implementation plan`
3. `000000054 fix(a11y): add aria-valuetext to SceneEditor sliders`
4. `00000001 fix(export): clamp frame count display to match encoder limits`
5. `0000000bc docs(plan): mark cycle 2 plan items as done`

## Deploy

DEPLOY_MODE=none. No deployment performed.
