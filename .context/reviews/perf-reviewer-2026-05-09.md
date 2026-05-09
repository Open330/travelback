# Performance Reviewer — Travelback (2026-05-09, Cycle 10)

## Scope
All runtime source files, Web Worker, build scripts, and e2e tests.

## Findings

### NEW-01: Worker `checkJsonDepth` scans entire file without cap (Low)
**File:** `public/workers/trackParser.worker.js`  
**Line:** 301-318

The main-thread `checkJsonDepth` in `src/lib/googleJsonParser.ts` caps scanning at `MAX_DEPTH_SCAN_CHARS = 10MB` to avoid iterating over massive files. The worker copy lacks this cap and scans the entire `text.length` character-by-character.

For a 100MB JSON file (the JSON max file size), this means ~100 million character iterations before parsing can begin. While this runs on a worker thread and doesn't block the UI, it wastes CPU and delays the parsing result.

**Suggested fix:** Port the 10MB cap to the worker's `checkJsonDepth`.

## Analysis Details

### Rendering & Animation
- **MapView.tsx**: `renderFrameAndWait` uses `map.once('render')` + `requestAnimationFrame` with a 5s timeout fallback. Camera state is rounded before comparison to skip redundant renders. Good.
- **usePlaybackController.ts**: Accumulator-based RAF timing (`startTimestampRef` + `startProgressRef`) eliminates drift. Fallback `setTimeout(250)` only for hidden tabs. Good.
- **TimelineSelector.tsx**: Distance-based bucketing via binary search in `ratioToIndex` is O(log n) per bar. Histogram bars are memoized. Good.
- **ElevationProfile.tsx**: SVG rendering with distance-proportional x-axis. No virtualization but tracks are bounded to 250K points max.

### Memory
- **videoEncoder.ts**: Memory estimation uses `8x` multiplier + `1.5x` for >1080p. `MAX_IN_MEMORY_EXPORT_BYTES` guards against excessive exports.
- **useExportController.ts**: `URL.revokeObjectURL` called on cleanup and reset. `prevFallbackAnchor` module-level cleanup prevents DOM accumulation.
- **MapView.tsx**: Cleanup effect removes marker, layers, sources. Debug window properties deleted.
- **ModalDialog.tsx**: Module-level `openModalStack` prevents leaks for nested modals.

### Worker & Parsing
- **parser.ts**: Worker created from `${basePath}/workers/trackParser.worker.js`, ArrayBuffer transferred. Fallback to main-thread for files <= 16MB.
- **googleJsonParser.ts**: `pointKey` dedup with `toFixed(7)` is efficient. `flattenGoogleSegments` uses Set-based dedup. Good.
- **Worker checkJsonDepth**: Missing 10MB scan cap (finding above).

### Bundle & Static Export
- **serve-static.mjs**: Cache-Control headers properly set: `immutable` for `_next/static/`, `no-cache` for HTML/worker/map-styles.
- **harden-static-export.mjs**: CSP meta tag replaced with SHA-256 hashes. Single-pass over HTML files.

### Network
- Map styles are local-only JSON files (no remote tiles/glyphs/sprites).
- `fetch-map-styles.mjs` generates minimal bundled styles.

## Verdict

1 performance finding (Low). Worker JSON depth scan is unbounded. Otherwise clean: no memory leaks, no excessive re-renders, no blocking main-thread operations.
