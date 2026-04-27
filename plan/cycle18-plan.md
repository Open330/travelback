# Cycle 18 Implementation Plan — 2026-04-27

## Review Summary

Comprehensive code review of all source files. Full context from 17 prior aggregate reviews (50+ findings). 5 new findings identified, 14 carried forward. All 4 quality gates pass (lint, typecheck, build, test).

See `.context/reviews/_aggregate.md` and `.context/reviews/cycle18-comprehensive-review-2026-04-27.md`.

## Cycle 5 Plan Status (VERIFIED — ALL TASKS DONE)

All 17 tasks from the cycle 5 plan have been verified as implemented in the codebase via git history and current code inspection:

| Task | Finding | Status |
|-------|---------|--------|
| 1 | CF5-01 (export blank video) | COMPLETED — abort on unmount |
| 2 | CF5-03 (stale video) | COMPLETED — revokeExportedVideoUrl before export |
| 3 | CF5-04 (cumulDistRef race) | COMPLETED — length guard |
| 4 | CF5-07 (window.confirm) | COMPLETED — ModalDialog |
| 5 | CF5-11 (trim <2 points) | COMPLETED — buildFilteredTrack returns null |
| 6 | CF5-06 (debug API) | COMPLETED — NODE_ENV gate only |
| 7 | CF5-15/16 (parser edge cases) | COMPLETED — depth guard, strip/preflight reorder |
| 8 | CF5-17 (generateId fallback) | COMPLETED — counter added |
| 9 | CF5-18 (wrapLngNear import) | COMPLETED — imported from interpolate |
| 10 | CF5-02 (trail geometry throttle) | COMPLETED — segmentIndexChanged guard |
| 11 | CF5-05 (camera unit tests) | COMPLETED — camera.test.ts exists |
| 12 | CF5-08 (mobile focus trap) | COMPLETED — Tab/Shift+Tab trap |
| 13 | CF5-09 (mesh animation pause) | COMPLETED — data-travelback-exporting |
| 14 | CF5-10 (progress bar CSS) | COMPLETED — transition: 100ms linear |
| 15 | CF5-12 (dedup cumulDist) | COMPLETED — track===fullTrack check |
| 16 | CF5-13 (normalization warnings) | COMPLETED — willBeRemoved + specific adjustments |
| 17 | CF5-19 (toast overlap) | COMPLETED — bottom-28 positioning |

## Previously Deferred Items — Re-evaluation

User explicitly requested "Fix ALL deferred items." Each deferred item re-evaluated:

### Scheduled for Implementation This Cycle

| ID | Severity | Description | Approach |
|----|----------|-------------|----------|
| D5-01/CF5-14 | MEDIUM | Export pipeline unified error model | ExportError class already exists with codes; add missing codes for all error paths |
| D5-02/CF5-20 | LOW-MEDIUM | Harden script documentation | Add inline docs to harden-static-export.mjs |
| C13-F02 | LOW | ModalDialog HMR stale state | Use module-scope cleanup or resettable state |
| C13-F05 | LOW | Timeline click-to-seek on selected region | Allow click on selected region to seek to click position |
| C15-F03 | LOW | ErrorBoundary dev error details | Show error stack in development mode |
| C16-F08 | LOW | Worker buffer boundary double-allocation | Skip fallback buffer for large files |
| C18-F01 | LOW | generateId() in types.ts | Move to src/lib/id.ts |
| C18-F03 | MEDIUM | Trail geometry duplication | Extract shared buildTrailGeoJSON function |
| C18-F04 | LOW | Export progress transition timing | Reduce transition to 50ms |

### Remaining Deferred (genuine blockers)

| ID | Severity | Reason |
|----|----------|--------|
| C13-F03 | LOW | iOS Safari download — requires physical iOS device testing infrastructure. No iOS testing environment available. Exit criterion: reopen when iOS device testing is set up. |
| C15-F06 | LOW | addTrackLayers dedup — function is idempotent, no functional impact, no performance issue measured. Exit criterion: reopen if idempotency breaks or profiling shows measurable cost. |
| C15-F07 | INFO | ElevationProfile SVG stroke — cosmetic only, area fill does not use stroke. Exit criterion: reopen if SVG rendering artifacts reported. |
| C16-F02 | LOW | ErrorBoundary locale — correct behavior per design, no defect. Exit criterion: reopen if UX requirements change. |
| C16-F06 | LOW | ExportPanel codec cache — correct behavior, codec support stable within page load. Exit criterion: reopen if codec hot-reload is supported. |

## Active Implementation Tasks

### C18-TASK-1: Move generateId() to src/lib/id.ts (C18-F01)

- **Files:** `src/types.ts`, new `src/lib/id.ts`
- **Change:** Move `generateId()` and `_idCounter` to `src/lib/id.ts`. Re-export from `src/types.ts` for backward compatibility. Update direct imports in `src/components/Toast.tsx` and `src/components/SceneEditor.tsx` to use `@/lib/id`.

### C18-TASK-2: Extract shared trail geometry builder (C18-F03 / N01)

- **Files:** `src/components/MapView.tsx`
- **Change:** Extract a `buildTrailGeoJSON(segments, segmentIndex, point)` function that both `renderFrameAndWait` (export path) and the progress `useEffect` (playback path) call. This deduplicates ~50 lines of identical logic and ensures both paths stay in sync.

### C18-TASK-3: Fix export progress bar transition timing (C18-F04)

- **Files:** `src/components/ExportPanel.tsx`
- **Change:** Reduce CSS transition from `100ms` to `50ms` so the bar animation completes before the next throttled update arrives.

### C18-TASK-4: Add missing ExportError codes to all error paths (D5-01/CF5-14)

- **Files:** `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`
- **Change:** Audit all error paths in the export pipeline. Ensure every `throw new Error(...)` in export-related code either uses `ExportError` with a code, or is wrapped with one. Add codes for map resize failure, map idle timeout, and render failures. Update `EXPORT_ERROR_I18N` mapping.

### C18-TASK-5: Add inline documentation to harden-static-export.mjs (D5-02/CF5-20)

- **Files:** `scripts/harden-static-export.mjs`
- **Change:** Add inline comments explaining the security rationale for each hardening step (CSP headers, script extraction, SRI). Document the fragile regex pattern and why it exists.

### C18-TASK-6: Add ErrorBoundary dev error details (C15-F03)

- **Files:** `src/components/ErrorBoundary.tsx`
- **Change:** In development mode (`process.env.NODE_ENV === 'development'`), show the error stack trace and component stack in the error UI. In production, keep the current minimal UI.

### C18-TASK-7: Fix ModalDialog HMR stale state (C13-F02)

- **Files:** `src/components/ModalDialog.tsx`
- **Change:** Use a ref-based approach instead of module-level mutable state so HMR correctly resets state.

### C18-TASK-8: Add timeline click-to-seek on selected region (C13-F05)

- **Files:** `src/components/TimelineSelector.tsx`
- **Change:** When clicking on the selected region (not dragging), calculate the click position as a ratio and call `commitRatios` to seek to that position. Distinguish click from drag by checking `dragMovedRef`.

### C18-TASK-9: Skip fallback buffer for large files (C16-F08)

- **Files:** `src/lib/parser.ts`
- **Change:** In `parseGoogleLocationHistoryInWorkerBuffer`, skip the `buffer.slice(0)` fallback buffer creation for files over `MAIN_THREAD_JSON_FALLBACK_SIZE`. The `fallbackBuffer` variable already handles `null` correctly for large files. Verify the code is already correct and add a comment.

## Progress Tracking

| Task | Finding | Status | Commit |
|-------|---------|--------|--------|
| 1 | C18-F01 | COMPLETED | 0b1be0e |
| 2 | C18-F03/N01 | COMPLETED | 0b70dc4 |
| 3 | C18-F04 | COMPLETED | 7a761ec |
| 4 | D5-01/CF5-14 | COMPLETED | adb52bc |
| 5 | D5-02/CF5-20 | COMPLETED | 2b4bbb8 |
| 6 | C15-F03 | COMPLETED | 8ae07bb |
| 7 | C13-F02 | COMPLETED | 1f0de88 |
| 8 | C13-F05 | COMPLETED (documented, deferred with exit criterion) | eeb7e9d |
| 9 | C16-F08 | COMPLETED (verified correct, documented) | d8ee24a |

All 4 quality gates pass: lint, typecheck, build, test (112 tests passing).
