# Architect -- Cycle 4 (2026-04-21)

## Summary
The architecture is sound for a single-page static web app. The main architectural concern is the growing complexity of the state management layer (HomeInner). Found 3 findings.

## Findings

### A4-001: Centralized state in HomeInner limits scalability [HIGH]
- **File:** `src/app/page.tsx`
- **Issue:** All application state lives in `HomeInner` (14 useState hooks, 2 custom hooks). This makes the component the single source of truth, which is correct for data flow but creates a bottleneck. Every state change triggers a rerender of the entire component tree.
- **Recommendation:** Consider extracting state into React Context providers:
  - `TrackProvider` (fullTrack, track, cumulativeDistances, rangeChange)
  - `ThemeProvider` (colorMode, mapStyleKey, hasExplicitMapStyleChoice)
  - `PlaybackProvider` (already partially done via usePlaybackController)
  - `ExportProvider` (already partially done via useExportController)
- **Impact:** This is the most impactful architectural improvement available. It would reduce unnecessary rerenders, simplify component props, and make it easier to add new features.

### A4-002: No persistent storage layer beyond localStorage [MEDIUM]
- **Issue:** The app stores theme and locale preferences in localStorage but doesn't persist track data, scene configurations, or export settings. If the user accidentally refreshes mid-session, all work is lost.
- **Recommendation:** Consider IndexedDB or `localStorage` for persisting:
  - Scene configurations (complex to recreate)
  - Last-used export settings (resolution, codec, quality)
  - Recent track file references (File API handles)
- **Impact:** Medium. Users who spend time configuring scenes and export settings can lose work on accidental refresh.

### A4-003: Worker thread architecture limited to Google JSON [MEDIUM]
- **File:** `src/lib/parser.ts`
- **Issue:** Only Google Location History JSON files are parsed in a worker thread. GPX and KML parsing uses the synchronous DOMParser on the main thread. The worker infrastructure exists but is not generalized.
- **Recommendation:** Create a general-purpose `trackParser.worker.js` that handles all three formats. The DOMParser is available in workers (via `new DOMParser()` in modern browsers), so GPX/KML parsing can be offloaded too.
- **Impact:** Medium. Large GPX files (up to 200MB) can block the UI for seconds. Already deferred as DF-C2-003.

## Positive Observations
- Clean separation between hooks (usePlaybackController, useExportController) and components
- The ref-based imperative handle pattern for MapView is well-designed
- The worker fallback pattern (try worker, fallback to main thread) is robust
- The modal stack system correctly handles z-ordering and focus management
- Static export architecture is well-suited for the GitHub Pages deployment target
