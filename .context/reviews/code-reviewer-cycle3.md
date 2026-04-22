# Code Reviewer — Cycle 3 (2026-04-23)

## Methodology
Full file-by-file review of all 30+ source files in the repository. Cross-referenced with prior cycle reviews and deferred findings. Focused on logic bugs, edge cases, error handling, and maintainability.

## File Inventory
All source files examined: page.tsx, layout.tsx, parser.ts, interpolate.ts, camera.ts, videoEncoder.ts, i18n.ts, types.ts, env.ts, useExportController.ts, usePlaybackController.ts, ExportPanel.tsx, SceneEditor.tsx, MapView.tsx, FileUpload.tsx, Toast.tsx, TrackWorkspace.tsx, TimelineSelector.tsx, GoogleGuide.tsx, JourneyCreator.tsx, ErrorBoundary.tsx, GlobalToolbar.tsx, Controls.tsx, ElevationProfile.tsx, ModalDialog.tsx, ThemeToggle.tsx, KeyboardHelp.tsx, TrackToolbar.tsx, trackParser.worker.js, globals.css, vitro-base.css, eslint.config.mjs, tsconfig.json, next.config.ts, playwright.config.ts

## Findings

### C3-F1. Worker segment remap filter drops valid segment starts at index 0 (CRITICAL — same class as C2-F1)
- **Severity**: HIGH | **Confidence**: HIGH
- **File**: `public/workers/trackParser.worker.js:200`
- **Issue**: Line 200 has `.filter(idx => idx > 0)`, which is the exact same bug that was fixed in `src/lib/parser.ts:424` during cycle 2 (changed to `idx >= 0`). The worker file was not updated when the main-thread parser was fixed. This means all Google Location History files processed via the Worker path (the default path in browsers that support Workers) still drop segment starts that remap to index 0 after the dedup+sort reordering, causing two distinct activity segments to be incorrectly merged.
- **Fix**: Change `.filter(idx => idx > 0)` to `.filter(idx => idx >= 0)` on line 200 of `public/workers/trackParser.worker.js`.
- **Failure scenario**: User imports a Google Location History JSON with multiple semantic segments. The dedup step removes enough early points that a segment start remaps to index 0. The worker drops this segment boundary. The resulting track shows an incorrect straight line between two distinct activities.

### C3-F2. Worker dedup does not deduplicate identical coordinates with different timestamps
- **Severity**: LOW | **Confidence**: MEDIUM
- **File**: `public/workers/trackParser.worker.js:174`
- **Issue**: The worker's dedup key includes the timestamp (`point.time.getTime()`), which means two points at the same lat/lng but with different timestamps are NOT deduplicated. This is correct for time-series data, but it differs from the main-thread parser's behavior, which also includes the timestamp in the key. However, the main-thread parser uses `p.time?.getTime() ?? ''` (with nullish coalescing to empty string), while the worker uses `point.time ? point.time.getTime() : ''`. These produce the same result for valid Date objects and undefined times, but the worker's approach is slightly different in style. This is a consistency concern, not a bug.

## Verified Fixes from Prior Cycles
- C2-F1 (parser segment filter): Verified fixed in parser.ts — `idx >= 0` on line 424
- C2-F2 (aria-valuetext): Verified fixed in SceneEditor.tsx — all sliders have `aria-valuetext`
- C2-F3 (ExportPanel frame count): Verified fixed — clamping applied before totalFrames calculation
