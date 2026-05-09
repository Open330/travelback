# Aggregate Review — Travelback (2026-05-09, Cycle 10)

## Overview

Deep review completed across all 40 TS/TSX/CSS source files in the repository. All quality gates pass clean (lint, typecheck, build, 219 tests, 0 vulnerabilities). After 9 prior cycles found 0 new issues, this cycle discovered 3 genuinely new findings — all minor (2 Low, 1 Info). No security issues, architectural regressions, runtime bugs, or test gaps were found.

## Deduplicated Findings

### NEW-01: Worker `checkJsonDepth` lacks 10MB scan cap (Low)
**Files:** `public/workers/trackParser.worker.js` (line 301-318), `src/lib/googleJsonParser.ts` (line 278-289)
**Reported by:** Code Reviewer, Performance Reviewer

The main-thread `checkJsonDepth` caps scanning at `MAX_DEPTH_SCAN_CHARS = 10 * 1024 * 1024` to avoid iterating over massive files. The worker copy iterates over the entire `text.length` without any cap. For a 100MB JSON file (the max allowed), this wastes ~100M character iterations on the worker thread before parsing can begin.

**Fix:** Port the 10MB cap to the worker's `checkJsonDepth`.

### NEW-02: Mobile menu unit toggle buttons lack accessible labels (Low)
**File:** `src/components/TrackToolbar.tsx` (lines 232-249)
**Reported by:** Designer, Tracer

The unit toggle buttons in the mobile menu show only abbreviated text "km" / "mi" without `aria-label` or `title`. The desktop `GlobalToolbar.tsx` provides full "Metric units" / "Imperial units" labels via `aria-label`. Screen reader users navigating the mobile menu receive less context than desktop users.

**Fix:** Add `aria-label={units === 'metric' ? t('units.metric') : t('units.imperial')}` to mobile menu unit buttons.

### NEW-03: Worker `WorkerParseError` lacks `name` property (Info)
**File:** `public/workers/trackParser.worker.js` (lines 288-293)
**Reported by:** Code Reviewer

The main-thread `ParseError` class in `src/lib/parse-utils.ts` sets `this.name = 'ParseError'`. The worker's `WorkerParseError` class does not set `this.name`. While no current consumer relies on `error.name`, this inconsistency could trip up future error-handling code that switches between main-thread and worker paths.

**Fix:** Add `this.name = 'WorkerParseError'` (or `'ParseError'`) to the worker class constructor.

## Analysis Details

After reading every source file in the repository, the following areas were checked for new issues:

- **MapView.tsx** (1200 lines): Well-structured with proper cleanup. renderFrameAndWait has correct timeout, settled guard, abort handling. waitForIdle has proper timeout and abort lifecycle. buildFitBounds handles antimeridian crossing and degenerate bounds. buildTrailGeoJSONFromSegments shared between export and playback paths. All eslint-disable comments justified with clear reasoning.
- **interpolate.ts**: Correct haversine math, proper binary search in findDistanceIndexAtOrAfter with startIndex clamping, correct edge case handling for empty/single-point/zero-distance tracks, bearing fallback walks backward for distinct points.
- **camera.ts**: Clean scene normalization with overlap resolution, WeakMap cache for overview cameras, correct antimeridian handling in lerpCamera, proper transition blending at scene boundaries with elapsedSec=0 for stable lerp anchors.
- **usePlaybackController.ts**: Accumulator-based timing eliminates drift, proper fallback timer for hidden tabs, clean unmount with mountedRef guard, correct awaitingFirstFrame pattern.
- **useExportController.ts**: Clean abort lifecycle, proper URL.revokeObjectURL cleanup, mountedRef guards, proper pre-export progress preservation and post-export restoration, throttle-based UI update intervals at ~10 Hz.
- **parser.ts**: Robust error handling with ParseError codes, proper Worker lifecycle with cleanup(), bounded fallback buffers, correct depth/size limits per file type (XML 4MB, JSON 100MB).
- **googleJsonParser.ts**: Handles all known Google Location History format variants (Records, Semantic, Timeline Edits, SemanticSegments), proper point dedup via pointKey, correct segment sorting by time with stable fallback, point budget enforcement.
- **parse-utils.ts**: Clean shared utilities, MAX_TRACK_POINTS = 250K, proper ParseError class.
- **videoEncoder.ts**: Proper config clamping, memory estimation with resolution multiplier, correct finalize-on-complete-only pattern, robust filename sanitization, showSaveFilePicker with fallback chain.
- **SceneEditor.tsx**: Good undo/redo for scene deletion with 5s auto-clear, proper normalization warnings, raw/committed drag split prevents normalization counteraction during gesture.
- **TimelineSelector.tsx**: Proper accessibility (role=slider, aria-*, keyboard with Home/End/Arrow keys), distance-based bucketing via binary search, click-to-seek on selected region, keyboard guard for leaked keys.
- **Controls.tsx**: Good touch targets (min-h-11), proper aria-labels and valuetext, pointer-coarse responsive labels.
- **FileUpload.tsx**: Clean file validation with extension allowlist, proper error code mapping, drag-end debounce timer cleanup on unmount.
- **ElevationProfile.tsx**: Distance-proportional x-axis, proper click-to-seek using distance fraction, keyboard navigation.
- **JourneyCreator.tsx**: Proper waypoint drag lifecycle, proximity threshold for accidental double-clicks, coordinate parsing with multiple pattern support, privacy-first search (opt-in).
- **Toast.tsx**: Assertive aria-live for errors, polite for others, proper timer cleanup.
- **ErrorBoundary.tsx**: Clean recovery with onReset, component stack preserved for dev mode, localized error messages.
- **KeyboardHelp.tsx**: ModalDialog integration, kbd styling.
- **TrackWorkspace.tsx**: Clean prop passing, trackSessionKey for remount.
- **GlobalToolbar.tsx**: Unit/locale/theme controls, aria-pressed on units, full aria-labels on unit buttons.
- **TrackToolbar.tsx**: Focus trap, outside-click close, focus restoration, aria-expanded/aria-controls. Mobile menu unit buttons lack aria-label (finding above).
- **ThemeToggle.tsx**: Proper hydration pattern, controlled/uncontrolled mode support, prefers-color-scheme listener cleanup.
- **ModalDialog.tsx**: Module-level stack, inert/aria-hidden on app root, focus trap, previous focus restoration.
- **globals.css**: prefers-reduced-motion properly implemented in 3 separate @media blocks covering marker-pulse, animate-spin, export-checkmark, vitro-btn-primary, and a global catch-all. MapLibre control touch targets enforced (min 44px).
- **env.ts**: Path traversal defense-in-depth on basePath.
- **i18n.ts**: All 5 locales (en/ko/ja/zh/es) have consistent key sets. Locale key completeness test exists.
- **page.tsx**: Clean state management, proper theme/mapstyle persistence with explicit choice tracking, correct track slicing with segment index remapping.
- **layout.tsx**: Bootstrap script handles theme/locale/mapstyle before hydration, proper CSP with hardening postbuild step.
- **harden-static-export.mjs**: CSP meta tag replacement with SHA-256 hashes. Inline bootstrap script extraction. Safety assertions prevent deployment with placeholder CSP.
- **smoke-static.mjs**: Verifies hardened CSP, worker/parser constant sync, map style local-only-ness.

### Regression Risk Assessment

All fixes from cycles 1-9 verified intact:
- C9: 0 findings (convergence)
- C8: prefers-reduced-motion, style fixes (92d1586, bbc60f1)
- C7: z-index layering, toolbar overlap (d8f1fc4, 535e896)
- C6: JourneyCreator/SceneEditor indentation (5ca7fa2)
- C5: isMapRenderExportError removal, MapView/SceneEditor indentation
- C4: MapView indentation, hasTime memoization
- C3: camera smoothing consolidation, referenceGridData dependency, fallback timer
- C2: scene preset generator tests, export progress preservation
- C1: error boundary recovery

No regressions detected.

## CARRIED DEFERRED ITEMS (unchanged from cycles 1-9)

- DEF-01 MapView.tsx monolith (Low — requires large refactor)
- DEF-02 No tests for MapView pure utilities (Low — blocked by DEF-01)
- DEF-03 No tests for export controller (Low — complex async testing)
- DEF-04 No tests for parseCoordinateQuery (Low — easy but low priority)
- DEF-05 Worker/parser code duplication (Info — no build pipeline support for workers)
- DEF-06 mediabunny no explicit cleanup API (Info — library limitation)
- DEF-07 waitForIdle type mismatch (Info — no runtime impact)

## AGENT FAILURES

None.

## Cross-Agent Agreement Summary

3 new findings discovered after 9 cycles of convergence. All are minor quality/consistency issues:
- 2 Low severity: worker scan cap omission, mobile aria-label gap
- 1 Info severity: worker error class name inconsistency

No security issues, runtime bugs, performance regressions, architectural concerns, test gaps, documentation gaps, or UX problems were found. The codebase remains in excellent condition.
