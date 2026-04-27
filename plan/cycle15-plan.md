# Cycle 15 Implementation Plan — 2026-04-27

## Review Summary

Deep review across the full codebase with context from 5 prior aggregate reviews (50+ findings).
**7 new findings** after dedup (1 MEDIUM, 1 LOW-MEDIUM, 4 LOW, 1 INFO).
5 findings resolved since cycle 14.

See `.context/reviews/_aggregate.md` for full details.

## Cycle 14 Plan Status

| Task | Status |
|------|--------|
| C14-F01 (transition-duration 0ms) | COMPLETED |
| C14-F02 (pendingTrimRange useEffect) | COMPLETED |
| C14-F03 (scenesRef in useExportController) | COMPLETED |
| C14-F06 (full scene array undo snapshot) | COMPLETED |
| C14-F08 (share error toast) | COMPLETED |

## Findings Disposition

### Scheduled for Implementation

| ID | Severity | Description | Approach |
|----|----------|-------------|----------|
| C15-F01 | MEDIUM | JourneyCreator cleanup ref overwrites on style reload | Accumulate cleanup functions in array instead of overwriting single ref |
| C15-F05 | LOW-MEDIUM | useExportController resetSize() called without mountedRef guard | Move resetSize() inside mountedRef guard or add try/catch |
| C15-F04 | LOW | checkJsonDepth uses index-based iteration | Change to `for (const ch of text)` |
| C15-F08 | LOW | buildFitBounds antimeridian degenerate padding | Apply DEGENERATE_PADDING in shifted coordinate space when track crosses antimeridian |

### Deferred

| ID | Severity | Reason |
|----|----------|--------|
| C15-F03 | LOW | ErrorBoundary dev error details — UX enhancement for development workflow only, not a runtime defect in production. Exit criterion: reopen during ErrorBoundary refactoring or when adding dev-mode diagnostics. |
| C15-F06 | LOW | MapView addTrackLayers called from multiple paths — function is idempotent, no functional impact. Exit criterion: reopen if idempotency is broken or if performance profiling shows redundant GeoJSON setData calls. |
| C15-F07 | INFO | ElevationProfile SVG stroke inconsistency — cosmetic only, area fill does not use stroke. Exit criterion: reopen if SVG rendering artifacts are reported. |

Deferred item details:

- **C15-F03** (ErrorBoundary dev details): Showing error stack traces in development is a DX improvement, not a production defect. The current ErrorBoundary correctly catches errors and prevents white-screen crashes. Exit criterion: reopen during ErrorBoundary refactoring or when adding dev-mode diagnostics.
- **C15-F06** (addTrackLayers dedup): The function is idempotent — it checks `if (map.getSource('route'))` before adding sources/layers, so duplicate calls are safe. The only cost is unnecessary GeoJSON `setData()` calls, which are fast. Exit criterion: reopen if idempotency is broken or if performance profiling shows redundant calls are measurable.
- **C15-F07** (ElevationProfile SVG): The area fill path uses `fill`, not `stroke`, so `vectorEffect="non-scaling-stroke"` does not apply. The main path line already uses `vectorEffect`. No visual defect. Exit criterion: reopen if SVG rendering artifacts are reported.

## Active Implementation Items

### C15-TASK-1: Accumulate JourneyCreator cleanup functions (C15-F01)

- **File:** `src/components/JourneyCreator.tsx`
- **Change:** Replace `cleanupRef = useRef<(() => void) | null>(null)` with `cleanupRef = useRef<(() => void)[]>([])`. In `bindListeners()`, push cleanup functions to the array instead of overwriting. On unmount, call all accumulated cleanup functions.

### C15-TASK-2: Guard resetSize() with mountedRef in export finally (C15-F05)

- **File:** `src/lib/useExportController.ts`
- **Change:** In the `finally` block, wrap the `resetSize()` call inside the `if (mountedRef.current)` guard, or add a separate mountedRef check before `resetSize()`.

### C15-TASK-3: Use for...of in checkJsonDepth (C15-F04)

- **File:** `src/lib/parser.ts`
- **Change:** Replace `for (let i = 0; i < text.length; i++) { const ch = text[i]` with `for (const ch of text)`.

### C15-TASK-4: Fix antimeridian degenerate bounds padding (C15-F08)

- **File:** `src/components/MapView.tsx`
- **Change:** When the track crosses the antimeridian, apply `DEGENERATE_PADDING` in the shifted coordinate space (0-360 range) before converting back to the standard range.
