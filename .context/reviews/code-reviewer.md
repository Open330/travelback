# Code Quality Review — Cycle 1 (2026-04-23)

## Summary
The codebase is well-structured with clean separation of concerns. However, several logic bugs, edge-case issues, and maintainability concerns were identified.

---

## Finding 1: Duplicate file-size check in FileUpload and parser
- **File**: `src/components/FileUpload.tsx` lines 39-42, `src/lib/parser.ts` lines 520-527
- **Severity**: Medium | **Confidence**: High
- **Description**: `FileUpload.handleFile` checks `file.size > maxForType` and throws a generic Error with i18n text. Then `parseTrackFile` also checks `file.size > maxForType` and throws a `ParseError` with code `FILE_TOO_LARGE`. The duplicate check means: (1) the FileUpload check catches it first with a non-ParseError, which then falls through to the generic `setError(t('fileUpload.parseFailed'))` handler instead of the `FILE_TOO_LARGE` code path; (2) if the FileUpload check is removed, the parser's ParseError with the code path works correctly.
- **Failure scenario**: User uploads a file > 200MB (non-JSON). FileUpload catches it with a plain Error, which doesn't have a `ParseError.code`, so `matchedKey` is empty and `isFileTooLarge` is false. The error display falls through to the generic `parseFailed` message instead of showing the correct "too large" message with the MB limit.
- **Fix**: Remove the duplicate size check from `FileUpload.handleFile` (lines 39-42), letting `parseTrackFile` handle it with its proper `ParseError` code path.

---

## Finding 2: `totalDistance` in JourneyCreator uses default segmentStartIndices
- **File**: `src/components/JourneyCreator.tsx` line 141
- **Severity**: Low | **Confidence**: High
- **Description**: `totalDistance(pts)` is called without passing `segmentStartIndices`. Since JourneyCreator never creates segment breaks, this is functionally correct now but fragile.
- **Fix**: Pass an explicit empty array: `totalDistance(pts, [])` to make intent clear.

---

## Finding 3: `interpolateAlongTrack` binary search edge case at progress=1.0
- **File**: `src/lib/interpolate.ts` lines 97-103
- **Severity**: Low | **Confidence**: Medium
- **Description**: When `targetDist` equals `cumulativeDistances[cumulDist.length - 1]` exactly (progress=1.0), the binary search ends with `lo` at the second-to-last segment. The `segEnd = cumulativeDistances[segIdx + 1] ?? segStart` fallback handles this, but progress=1.0 interpolates into the last segment rather than returning the exact last point.
- **Fix**: After the binary search, check if `targetDist >= cumulativeDistances[cumulativeDistances.length - 1]` and if so, return the last point directly.

---

## Finding 4: `normalizeScenes` silently removes zero-duration scenes without warning during export
- **File**: `src/lib/camera.ts` line 43
- **Severity**: Medium | **Confidence**: High
- **Description**: The `.filter((scene) => scene.endPercent > scene.startPercent)` in `normalizeScenes` silently drops scenes where startPercent >= endPercent. The SceneEditor has a separate `normalizationWarnings` check, but the two are decoupled — `normalizeScenes` is called independently during export (in `videoEncoder.ts` line 69) without any warning to the user.
- **Failure scenario**: User creates a scene with start=50% end=50%. The editor shows a warning, but if the user exports anyway, the scene is silently removed.
- **Fix**: Ensure the export pipeline reports when scenes are dropped by `normalizeScenes`, or prevent the export button from being clickable when normalization warnings exist.

---

## Finding 5: `showSaveFilePicker` type casting is unsafe
- **File**: `src/lib/videoEncoder.ts` lines 175-180
- **Severity**: Low | **Confidence**: High
- **Description**: The `showSaveFilePicker` call uses double casting. This works but is fragile if the File System Access API spec changes.
- **Fix**: Create a typed interface for the File System Access API methods used.

---

## Finding 6: `cycleStyle` doesn't persist map style to localStorage
- **File**: `src/app/page.tsx` lines 293-303
- **Severity**: Medium | **Confidence**: High
- **Description**: When the user cycles map styles via the toolbar button, `handleModeChange` persists the theme to localStorage, but `cycleStyle` does NOT persist the map style choice. On page reload, the bootstrap script reads `data-mapstyle` which was set by the initial theme detection, not the user's explicit style choice.
- **Failure scenario**: User cycles to "Dark" map style, reloads page, gets "Voyager" instead.
- **Fix**: Save the explicit map style choice to localStorage in `cycleStyle` and read it in the bootstrap script.

---

## Finding 7: `handleRangeChange` segment index calculation may produce invalid indices
- **File**: `src/app/page.tsx` lines 170-191
- **Severity**: Medium | **Confidence**: Medium
- **Description**: When slicing a track by range, `segmentStartIndices` are filtered and mapped: `.filter((index) => index >= startIdx && index <= endIdx).map((index) => index - startIdx).filter((index) => index > 0)`. The final `.filter(index > 0)` removes the segment start at index 0, but if `startIdx > 0` and there's a segment start exactly at `startIdx`, it gets mapped to 0 and then filtered out.
- **Fix**: Change the final filter to `index >= 0` and add 1 to the mapped index for non-zero starts, or reconsider the segment preservation logic.

---

## Finding 8: `readFailed` error not properly surfaced to user
- **File**: `src/lib/parser.ts` line 566
- **Severity**: Low | **Confidence**: High
- **Description**: `reader.onerror` throws `new Error('Failed to read file')` which is not a `ParseError` and has no code. This falls through to the generic error handler in FileUpload.
- **Fix**: Change to `new ParseError('Failed to read file', 'READ_FAILED')` and add mapping in FileUpload.

---

## Final Sweep
- All source files in `src/` were reviewed.
- Key cross-file interactions verified.
- No files were skipped.
