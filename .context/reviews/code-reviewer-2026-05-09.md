# Code Reviewer — Travelback (2026-05-09, Cycle 10)

## Scope
All 40 TS/TSX source files plus 6 test files, build scripts, e2e spec, and the Web Worker.

## Findings

### NEW-01: Worker `checkJsonDepth` lacks 10MB scan cap (Low)
**File:** `public/workers/trackParser.worker.js`  
**Line:** 301-318

The TypeScript source in `src/lib/googleJsonParser.ts` (lines 278-289) defines `MAX_DEPTH_SCAN_CHARS = 10 * 1024 * 1024` and caps the `checkJsonDepth` scan at 10MB. The comment explains: "Without the cap, a 100 MB file would require iterating ~100 M characters before the worker can start parsing."

The worker copy of `checkJsonDepth` iterates over the entire `text.length` without any cap:
```js
for (let i = 0; i < text.length; i++) { ... }
```

For a 100MB JSON file, the worker spends ~100M char iterations on depth scanning before it can begin actual parsing. This is a performance regression specific to the worker path.

**Suggested fix:** Apply the same 10MB cap in the worker:
```js
const MAX_DEPTH_SCAN_CHARS = 10 * 1024 * 1024
for (let i = 0; i < Math.min(text.length, MAX_DEPTH_SCAN_CHARS); i++) { ... }
```

### NEW-02: Worker `WorkerParseError` lacks `name` property (Info)
**File:** `public/workers/trackParser.worker.js`  
**Line:** 288-293

The main-thread `ParseError` class in `src/lib/parse-utils.ts` (line 32-38) sets `this.name = 'ParseError'`. The worker's `WorkerParseError` class does not set `this.name`. While no current consumer relies on `error.name`, this inconsistency could trip up future error-handling code that switches between main-thread and worker paths.

**Suggested fix:** Add `this.name = 'WorkerParseError'` or `'ParseError'` to align with the main-thread class.

## Analysis Details

After reading every source file, the following areas were checked for new issues:

- **MapView.tsx** (1200 lines): Clean imperative handle, proper cleanup on unmount, abort handling in `renderFrameAndWait` and `waitForIdle`, antimeridian-aware `buildFitBounds`.
- **interpolate.ts**: Correct haversine, binary search with `startIndex` clamping, NaN/Infinity/zero-distance edge cases handled.
- **camera.ts**: Clean scene normalization, WeakMap cache, smoothstep easing, proper antimeridian lerp.
- **usePlaybackController.ts**: Accumulator timing, fallback timer, mountedRef guard.
- **useExportController.ts**: Abort lifecycle, URL.revokeObjectURL, mountedRef, throttle progress.
- **parser.ts**: Worker lifecycle, bounded buffers, DOCTYPE/entity rejection, size limits.
- **googleJsonParser.ts**: All 5 format variants handled, dedup via `pointKey`, segment sorting, point budget enforcement.
- **videoEncoder.ts**: Config clamping, memory estimation, showSaveFilePicker fallback chain.
- **ExportPanel.tsx**: Clean state management, swipe-to-dismiss guard, codec probing, export-too-large guard.
- **ThemeToggle.tsx**: Proper hydration pattern, controlled/uncontrolled mode support, prefers-color-scheme listener cleanup.
- **TrackToolbar.tsx**: Focus trap, outside-click close, focus restoration, aria-expanded/aria-controls.
- **ModalDialog.tsx**: Module-level stack, inert/aria-hidden on app root, focus trap, previous focus restoration.
- **TimelineSelector.tsx**: Distance bucketing, 44px touch targets, keyboard support with guard.
- **Controls.tsx**: Touch targets, aria-labels, valuetext.
- **FileUpload.tsx**: Extension allowlist, error mapping, drag-end debounce cleanup.
- **ElevationProfile.tsx**: Distance-proportional x-axis, click-to-seek.
- **JourneyCreator.tsx**: Waypoint drag, proximity threshold, coordinate parsing, privacy-first search.
- **Toast.tsx**: Assertive/polite aria-live, timer cleanup.
- **ErrorBoundary.tsx**: Recovery with onReset, component stack.
- **KeyboardHelp.tsx**: ModalDialog integration, kbd styling.
- **TrackWorkspace.tsx**: Clean prop passing, trackSessionKey for remount.
- **GlobalToolbar.tsx**: Unit/locale/theme controls, aria-pressed on units.

## Verdict

2 new findings (1 Low, 1 Info). Both are minor. No bugs, security issues, or architectural regressions detected.
