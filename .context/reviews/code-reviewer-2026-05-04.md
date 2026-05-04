# Code Review — Travelback (2026-05-04)

## Summary

The codebase is well-structured with clean separation of concerns, good TypeScript usage, and consistent conventions. The main areas of concern are around large component file sizes, some stale-closure-prone patterns, and minor maintainability issues.

## Findings

### 1. MapView.tsx is excessively large (~1200 lines) — LOW risk, HIGH confidence
**File**: `src/components/MapView.tsx:1-1215`
**Issue**: Single file contains map initialization, geometry building, reference grid logic, trail rendering, camera smoothing, debug window exposure, and UI error state. This violates the Single Responsibility Principle and makes the component hard to test in isolation.
**Suggestion**: Extract `buildReferenceGridData`, `buildTrackGeometry`, `precomputeWrappedSegments`, and `buildTrailGeoJSONFromSegments` into a `src/lib/mapGeometry.ts` utility module. Extract `smoothCameraState`, `centerDistanceMeters`, and related camera smoothing logic into `src/lib/cameraSmooth.ts`.

### 2. page.tsx accumulates many useState calls (~30+) — LOW risk, MEDIUM confidence
**File**: `src/app/page.tsx:88-136`
**Issue**: HomeInner has 30+ individual useState calls. While hooks are properly organized with dedicated controllers (usePlaybackController, useExportController), the remaining modal/panel/theme state could benefit from useReducer or a state machine pattern for better traceability.
**Suggestion**: Low priority — the current pattern works but could become unwieldy as features grow.

### 3. eslint-disable comments for hook dependencies — LOW risk, HIGH confidence
**Files**: `src/app/page.tsx:153,179,191`, `src/components/MapView.tsx:853,879,1052,1175`
**Issue**: Multiple `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions with long comments explaining intentional omissions. While each has a valid reason, the pattern of using mutable refs to bypass React's dependency tracking is a common source of stale-closure bugs.
**Suggestion**: Consider a custom hook pattern that encapsulates the ref-sync-then-read-later idiom to reduce the number of raw suppressions.

### 4. Inconsistent null handling in interpolateAlongTrack — LOW risk, HIGH confidence
**File**: `src/lib/interpolate.ts:95-103`
**Issue**: When `points.length === 0`, returns `{ lng: 0, lat: 0 }` — a valid coordinate (Gulf of Guinea) rather than null/undefined. Callers must know to check point count before calling. This is documented by the guard comment but could produce subtle bugs if a caller forgets.
**Suggestion**: Return a sentinel or throw for empty arrays since no valid track should have 0 points after parsing.

### 5. WeakMap cache for overview camera never evicts — LOW risk, MEDIUM confidence
**File**: `src/lib/camera.ts:103`
**Issue**: `overviewCameraCache` uses WeakMap keyed on Track objects. Since Track objects are recreated on trim/load, old entries are garbage-collected properly. However, the cache is module-level global state which could surprise future maintainers.
**Suggestion**: Acceptable pattern; add a brief comment that WeakMap is intentional for GC behavior.

### 6. i18n.ts translation object is monolithic — LOW risk, HIGH confidence
**File**: `src/lib/i18n.ts:1-1875`
**Issue**: All 5 locale translations (~370 keys each) live in a single file (~1875 lines). Every new translation key requires adding entries in all 5 locale blocks.
**Suggestion**: Consider splitting per-locale or using lazy-loading. Low priority since the file is stable and the current approach avoids async complexity.

### 7. parseTrackFile creates Promise anti-pattern — LOW risk, MEDIUM confidence
**File**: `src/lib/parser.ts:338-397`
**Issue**: `parseTrackFile` wraps FileReader in a manual Promise but uses `.catch().then().catch()` chain for JSON path (lines 365-373). The `.catch()` at line 366 throws a new error inside the catch handler, which works but is unusual — the thrown error inside `.catch()` becomes the rejection value of the returned promise.
**Suggestion**: Use async/await consistently instead of mixing promise chains.

### 8. videoEncoder.ts FileSystemWritableFileStream cast is unsafe — LOW risk, HIGH confidence
**File**: `src/lib/videoEncoder.ts:219-224`
**Issue**: `showSaveFilePicker` result is cast through `unknown` twice. The cast `as unknown as { showSaveFilePicker: ... }` on line 219 and `as FileSystemWritableFileStream` on line 222 are type-unsafe. If the API changes, this will produce runtime errors without compile-time warnings.
**Suggestion**: Add a proper type declaration file for the File System Access API.

### 9. Export panel duration sync via useEffect — LOW risk, MEDIUM confidence
**File**: `src/components/ExportPanel.tsx:75-85`
**Issue**: Duration is synced from `playbackDuration` prop on panel open via useEffect with a ref guard. This is a controlled/uncontrolled hybrid pattern that can be fragile. The eslint-disable comment acknowledges this.
**Suggestion**: Acceptable for current use case.

### 10. buildFilteredTrack filters out segment at index 0 — LOW risk, HIGH confidence
**File**: `src/app/page.tsx:47-51`
**Issue**: After remapping segment indices, `filter(index => index > 0)` removes a segment that was at exactly `startIdx`. This is intentional per the JSDoc but could confuse maintainers since it means trimming can silently drop a segment boundary.
**Suggestion**: The JSDoc is clear; this is acceptable.

## Cross-File Issues

### 11. Export/playback state synchronization — MEDIUM risk, MEDIUM confidence
**Files**: `src/lib/useExportController.ts`, `src/lib/usePlaybackController.ts`, `src/app/page.tsx`
**Issue**: During export, `useExportController` pauses playback and drives progress imperatively, while `usePlaybackController` still owns the `progress` state. The interplay between `setPlaybackProgress` (from usePlaybackController) being called by useExportController creates tight coupling. If either controller's cleanup order changes, progress could jump.
**Suggestion**: Consider a state machine that owns the progress source-of-truth and mediates between playback and export.

### 12. MapView imperative handle exposes many internal methods — LOW risk, MEDIUM confidence
**File**: `src/components/MapView.tsx:545-758`
**Issue**: The `MapViewHandle` interface exposes 7 methods. This is a wide API surface for a forwarded ref, suggesting the parent is reaching too deeply into MapView's implementation.
**Suggestion**: Low priority but consider consolidating resize/resetSize/waitForIdle into a single export lifecycle method.