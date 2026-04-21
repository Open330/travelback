# Cycle 5 Implementation Plan -- 2026-04-21

## Review Summary

Deep review across 11 agents. **3 new findings** identified (after dedup), 1 MEDIUM severity, 2 LOW severity. All prior cycle fixes confirmed still applied. See `.context/reviews/_aggregate.md` and `.context/reviews/cycle5-*-2026-04-21.md`.

## Cycle 4 Plan Status -- All Complete

| Task | Status |
|------|--------|
| TASK-1: E2E test for theme toggle persistence | DONE |
| TASK-2: E2E test for map load error handling | DONE |
| TASK-3: Guard map resize reset in export controller | DONE |
| TASK-4: Remove redundant useEffect for DOM attributes | DONE |

## Active Implementation Items

### TASK-1: Fix worker buffer transfer fallback using detached ArrayBuffer [C5-A1] -- MEDIUM/MEDIUM

- **Source:** debugger, tracer (independent discovery)
- **Root Cause:** In `parseGoogleLocationHistoryInWorkerBuffer`, the ArrayBuffer is transferred to the Worker via `postMessage({ ext: 'json', buffer }, [buffer])`. After transfer, the `buffer` variable in the closure is detached (zero-length). The `onmessage` and `onerror` fallback handlers call `parseGoogleLocationHistory(decodeJsonBuffer(buffer))`, which decodes an empty string from the detached buffer, causing `JSON.parse('')` to throw a SyntaxError. The user sees a generic "Failed to parse file" error instead of the worker's specific error message.
- **Files:** `src/lib/parser.ts` lines 440-510
- **Fix:** When the worker reports an error (via `onmessage` with `{ error: '...' }`), reject directly with a `ParseError` using the worker's error message and code. Only fall back to main-thread parsing when the Worker *cannot be created* (already handled at lines 447-457). For `onerror` (worker crash), also reject with the worker's error rather than falling back to the detached buffer.
- **Status:** DONE

### TASK-2: Fix playback animation loop dt capping for frame-rate independence [C5-A2] -- LOW/HIGH

- **Source:** code-reviewer
- **Root Cause:** In `usePlaybackController`, the animation loop caps `rawDt` at `1/30` to prevent large jumps after tab backgrounding. However, `lastTimeRef.current` is set to `now` regardless, so when rAF is throttled (e.g., 10fps in background), each frame uses `dt = 1/30` instead of the actual elapsed time. This makes the animation speed dependent on frame rate when throttled.
- **Files:** `src/lib/usePlaybackController.ts` lines 78-107
- **Fix:** Use an accumulator-based approach. Track total elapsed time from a start timestamp rather than accumulating dt values. This eliminates both the accumulation error and the frame-rate dependency:
  ```typescript
  const startTimeRef = useRef<number>(0)
  const startProgressRef = useRef<number>(0)
  
  // In the effect:
  startTimeRef.current = performance.now()
  startProgressRef.current = progressRef.current
  
  const animate = (now: number) => {
    if (!isPlayingRef.current) return
    const elapsedSec = (now - startTimeRef.current) / 1000
    const nextProgress = startProgressRef.current + (elapsedSec * speedRef.current) / durationRef.current
    // ...
  }
  ```
- **Status:** DONE

### TASK-3: Add E2E test for map error reload button [C5-A3] -- LOW/HIGH

- **Source:** test-engineer
- **Root Cause:** The existing map error test verifies the error UI appears but does not test the reload button functionality. The "Reload Page" button calls `window.location.reload()`, which should clear the error and re-attempt map initialization.
- **Files:** `e2e/travelback.spec.ts`
- **Fix:** Add a test that: (1) blocks the map style JSON, (2) verifies error UI appears, (3) unblocks the map style, (4) clicks the reload button, (5) verifies the map loads successfully after reload (no error UI visible).
- **Status:** DONE

## Deferred Items

### New Deferred Findings from This Cycle

- DF-C5-001: Worker buffer transfer fallback uses detached ArrayBuffer (C5-A1) -- This is scheduled for implementation as TASK-1 above. If not completed this cycle, it becomes a deferred item with exit criterion: re-open when parser fallback logic is refactored; the practical impact is limited because the fallback's failure is caught and produces a generic error message rather than a crash.

### Previously Deferred (Carried Forward)

- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring
- DF-C2-001: Mobile information architecture gaps
- DF-C2-002: Playback progress drives whole-app rerenders (HIGH/HIGH)
- DF-C2-003: Large GPX/KML imports parse on main thread
- DF-C2-004: Manual route dragging is O(n) on pointer move
- DF-C2-005: Export settings permit browser-hostile combinations
- DF-C2-006: Locale/help content eagerly bundled
- DF-C2-007: Large default variable font payload
- DF-C2-008: E2E suite serialized and sleep-heavy
- DF-C2-009: Residual CSP allows inline styles
- DF-C2-010: Local-only bundled styles ship without real basemap layer
- DF-C3-001: CSS layer ordering may deprioritize theme variables
- DF-C3-002: Mobile users lose theme/locale access when track loaded
- DF-C3-003: TrackToolbar/title overlap potential on large screens
- DF-C3-004: Map style URL path correctness on alternative hosting
- DF-C3-005: next/image for static SVG adds complexity
- DF-C3-006: Select dropdown doesn't match dark theme
- DF-C4-001: HomeInner god component -- extract to React Context providers
- DF-C4-002: Module-level mutable state in ExportPanel/ModalDialog
- DF-C4-003: buildReferenceGridData not memoized
- DF-C4-004: showSaveFilePicker double cast
- DF-C4-005: No persistent storage for scenes/export settings
- DF-C4-006: Export time estimate accuracy
- DF-C4-007: Duplicate theme initialization
- DF-C4-008: Deferred items triage process
- DF-C4-009: generateId() fallback uses Math.random()
- DF-C4-010: isTouchDevice detection runs once on mount
- DF-C4-011: Multiple eslint-disable comments
- DF-C4-012: fullTrack and track set to same value initially
- DF-C4-013: Export progress floating-point edge case
- DF-C4-014: localStorage write failure silently ignored
- DF-C4-015: Bootstrap script minified with no source reference
- DF-C4-016: eslint-disable comments lack consistent format
- DF-C4-017: No unit test for parser error code mapping
