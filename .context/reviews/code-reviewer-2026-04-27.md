# Code Review — Code Quality, Logic, SOLID, Maintainability

**Reviewer**: code-reviewer  
**Date**: 2026-04-27  
**Scope**: Full repository — all `src/` files, scripts, configuration

---

## Finding 1: `generateId()` in `types.ts` violates single-responsibility

**File**: `src/types.ts:1-8`  
**Severity**: Medium  
**Confidence**: High  

`generateId()` is a utility function placed in `types.ts`, which should contain only type definitions and constants. This violates SRP and makes the module harder to maintain.

**Fix**: Move `generateId()` to a dedicated utility file like `src/lib/id.ts` or `src/lib/utils.ts`.

---

## Finding 2: `videoEncoder.ts` — `downloadVideo` uses `any` cast for `showSaveFilePicker`

**File**: `src/lib/videoEncoder.ts:214-218`  
**Severity**: Low  
**Confidence**: High  

The code uses `(window as unknown as { showSaveFilePicker: ... })` and a second cast to access `createWritable`. While this works, it obscures the actual API shape. A proper type declaration for the File System Access API would be cleaner.

**Fix**: Add a proper type declaration file for the File System Access API or use the `wicg-file-system-access` type package.

---

## Finding 3: `useExportController.ts` — Test stub check called in production code path

**File**: `src/lib/useExportController.ts:194`  
**Severity**: Low  
**Confidence**: Medium  

`isLocalExportTestStubEnabled()` is checked on every export call. While the function is gated to localhost, the conditional branch in the middle of the export controller adds complexity to an already complex function.

**Fix**: Accept an optional `isStubEnabled` callback in the controller options, defaulting to the current check.

---

## Finding 4: `JourneyCreator.tsx` — Long component with multiple concerns

**File**: `src/components/JourneyCreator.tsx` (882 lines)  
**Severity**: Medium  
**Confidence**: High  

`JourneyCreator` handles map layer management, drag-and-drop waypoint editing, coordinate search, icon selection, and confirmation dialogs all in one component.

**Fix**: Extract concerns into custom hooks — `useWaypointDrag(map, waypoints)`, `useCoordinateSearch()`, `useJourneyLayers(map, waypoints)`.

---

## Finding 5: `MapView.tsx` — Trail update logic duplicated between playback effect and `renderFrameAndWait`

**File**: `src/components/MapView.tsx:533-591` (renderFrameAndWait) and `1089-1137` (progress effect)  
**Severity**: Medium  
**Confidence**: High  

The trail GeoJSON update logic is duplicated nearly line-for-line between `renderFrameAndWait` (export path) and the progress `useEffect` (playback path).

**Fix**: Extract a `buildTrailGeometry(segments, segmentIndex, point)` function and call it from both paths.

---

## Finding 6: `page.tsx` — Excessive state in `HomeInner`

**File**: `src/app/page.tsx`  
**Severity**: Medium  
**Confidence**: High  

`HomeInner` manages 15+ state variables directly. Several state pieces could be consolidated (e.g., `showExport`, `showSceneEditor`, `showGoogleGuide`, `showKeyboardHelp` could be a `visiblePanel` union state).

**Fix**: Consolidate mutually exclusive panel states into a single discriminated union: `type VisiblePanel = 'none' | 'export' | 'scene-editor' | 'google-guide' | 'keyboard-help'`.

---

## Finding 7: `parser.ts` — `looksLikeGoogleLocationRecord` is a weak heuristic

**File**: `src/lib/parser.ts:41-50`  
**Severity**: Low  
**Confidence**: Medium  

The function checks only for the presence of `latitude`, `longitude`, `latitudeE7`, or `longitudeE7` keys without verifying value types.

**Fix**: Also verify that at least one of the values is a finite number before matching.

---

## Finding 8: `camera.ts` — `computeCameraForProgress` has complex control flow

**File**: `src/lib/camera.ts:350-460`  
**Severity**: Medium  
**Confidence**: High  

The function has deeply nested conditionals for gap handling with multiple early-return branches.

**Fix**: Extract `resolveGapCamera(track, cumulDist, normalizedScenes, globalProgress)` as a standalone function.

---

## Finding 9: `harden-static-export.mjs` — Regex for inline script extraction is fragile

**File**: `scripts/harden-static-export.mjs:90`  
**Severity**: Medium  
**Confidence**: High  

The regex pattern for extracting the `__next_s.push` bootstrap is documented as fragile. The error message could be more actionable.

**Fix**: Add the Next.js version to the error message. Consider testing the regex against a known fixture in CI.

---

## Finding 10: `TimelineSelector.tsx` — Inconsistent keyboard step sizes

**File**: `src/components/TimelineSelector.tsx:451-453,509-511`  
**Severity**: Low  
**Confidence**: High  

The arrow key step for handle movement is `0.01` (1% of the timeline). For short tracks with few points, the keyboard step may not advance the handle by even one point index.

**Fix**: Consider making the keyboard step adaptive based on point count.

---

## Summary

| # | Finding | Severity | Confidence |
|---|---------|----------|------------|
| 1 | `generateId()` in types.ts | Medium | High |
| 2 | `any` cast for File System Access API | Low | High |
| 3 | Test stub check in production path | Low | Medium |
| 4 | JourneyCreator too many concerns | Medium | High |
| 5 | Duplicated trail update logic | Medium | High |
| 6 | Excessive state in HomeInner | Medium | High |
| 7 | Weak format detection heuristic | Low | Medium |
| 8 | Complex control flow in computeCameraForProgress | Medium | High |
| 9 | Fragile regex in harden-static-export | Medium | High |
| 10 | Inconsistent keyboard step sizes | Low | High |
