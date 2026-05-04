# Document Specialist Review — Travelback (2026-05-04)

## Summary

The `.context/` documentation is comprehensive and mostly in sync with the code. A few minor discrepancies exist between documentation claims and implementation.

## Findings

### 1. Architecture doc lists "Markers" layer as HTML overlay — VERIFIED
**Doc**: `.context/project/02-architecture.md` (Map Layers table)
**Code**: `src/components/MapView.tsx:968-990`
**Issue**: The doc describes the marker as "HTML overlay" with "pulsing red dot". The implementation creates a DOM element with a pulse animation and a dot — correct.

### 2. Architecture doc mentions "precomputeWrappedSegments" — VERIFIED
**Doc**: `.context/project/02-architecture.md` (Trail rendering section)
**Code**: `src/components/MapView.tsx:116-131`
**Issue**: The doc describes precomputed segments with antimeridian wrapping. The implementation matches.

### 3. Architecture doc says "waitForIdle() is still used for initial map settling" — VERIFIED
**Doc**: `.context/project/02-architecture.md` (Export Pipeline notes)
**Code**: `src/lib/useExportController.ts:173`
**Issue**: `waitForIdle` is called after map resize, before the frame loop. Correct.

### 4. Overview doc lists "5 local background themes" — VERIFIED
**Doc**: `.context/project/01-overview.md`
**Code**: `src/types.ts:22-43`
**Issue**: 5 themes: Voyager, Light, Dark, Liberty, Bright. Correct.

### 5. Overview doc lists "6 speed levels (0.5x–16x)" — NEEDS VERIFICATION
**Doc**: `.context/project/01-overview.md`
**Code**: Controls component (not fully read)
**Issue**: The playback speed options should be 0.5x, 1x, 2x, 4x, 8x, 16x. The `speed` state in usePlaybackController defaults to 1.
**Suggestion**: Verify Controls.tsx has exactly 6 speed options.

### 6. Overview doc lists "Configurable playback duration: 10s to 5min" — NEEDS VERIFICATION
**Doc**: `.context/project/01-overview.md`
**Code**: `usePlaybackController.ts:21` defaults to 30s
**Issue**: The playback duration default is 30s. The Controls component should offer 10s-5min presets. The export panel has its own duration range (5-180s).
**Suggestion**: Verify Controls.tsx offers 10s-5min range for playback duration.

### 7. Overview doc lists "Configurable export duration: 5s to 3min" — VERIFIED
**Doc**: `.context/project/01-overview.md`
**Code**: `src/types.ts:78` `EXPORT_LIMITS.duration = { min: 5, max: 180 }`
**Issue**: 5 to 180 seconds matches "5s to 3min". Correct.

### 8. Overview doc lists "Resolution presets" — VERIFIED
**Doc**: `.context/project/01-overview.md`
**Code**: `src/types.ts:96-104`
**Issue**: 7 presets matching the doc list. Correct.

### 9. Overview doc lists "1–20 Mbps bitrate" — VERIFIED
**Doc**: `.context/project/01-overview.md`
**Code**: `src/types.ts:80` `EXPORT_LIMITS.bitrate = { min: 1, max: 20 }`
**Issue**: Correct.

### 10. Overview doc says "Import guide: Step-by-step instructions for Google Maps/Takeout plus common GPS and fitness app exports" — VERIFIED
**Doc**: `.context/project/01-overview.md`
**Code**: `src/lib/i18n.ts` translation keys include Google Maps (Phone), Google Maps (Computer), Strava, Garmin, AllTrails, Komoot, Other Apps
**Issue**: 7 import guide tabs covering all stated apps. Correct.

### 11. Conventions doc says "No semicolons" — VERIFIED
**Doc**: `.context/development/01-conventions.md`
**Code**: All source files
**Issue**: No semicolons found in source code. Correct.

### 12. Conventions doc says "single quotes for strings" — VERIFIED
**Doc**: `.context/development/01-conventions.md`
**Code**: All source files
**Issue**: Single quotes consistently used. Correct.

## Documentation Gaps

### G1. No documentation of the test-stub.ts feature flag
**File**: `src/lib/test-stub.ts`
**Issue**: The test stub utility is not documented in `.context/`. It allows bypassing real video export for testing.
**Suggestion**: Document the test stub in `.context/development/` or in the file's own comments.

### G2. Worker file duplication not documented in a visible location
**File**: `src/lib/googleJsonParser.ts:10-12`
**Issue**: The comment says "This code is also duplicated (in plain JS) in public/workers/trackParser.worker.js" but this constraint is only mentioned in a code comment, not in `.context/`.
**Suggestion**: Add a note to `.context/development/01-conventions.md` about the worker sync requirement.