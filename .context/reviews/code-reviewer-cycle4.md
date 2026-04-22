# Code Reviewer -- Cycle 4 (2026-04-23)

## Summary
All cycle 3 fixes confirmed applied (worker segment filter `idx >= 0`, worker error code constants). Found 4 new issues: 1 HIGH (NaN coordinates bypassing validation), 1 MEDIUM (drag-drop race), 1 MEDIUM (unnecessary normalization), 1 LOW (estimate accuracy).

## Findings

### C4-F1: FileUpload handleDrop missing loading guard [MEDIUM / HIGH]
- **File:** `src/components/FileUpload.tsx` line 77-90
- **Issue:** `handleDrop` calls `handleFile(file)` without checking the `loading` state. If a user drops a second file while the first is still parsing, both parse operations run concurrently. The second call's `setLoading(true)` is a no-op (already true), but its `setLoading(false)` in the `finally` block fires first, causing the UI to exit the loading state while the first parse is still running. This also means the second file's `onTrackLoaded` callback could overwrite the first file's track.
- **Fix:** Add a `loading` guard at the top of `handleDrop` (and also `handleFileInput` if not already guarded). If `loading` is true, return early or queue the file.
- **Cross-agent:** Also identified by debugger perspective.

### C4-F2: pushE7/parseRecords NaN coordinates pass validation [HIGH / HIGH]
- **File:** `src/lib/parser.ts` lines 184-186 (pushE7), 196 (parseRecords), `public/workers/trackParser.worker.js` lines 30-31 (pushE7), 44 (parseRecords)
- **Issue:** `Math.abs(NaN) > 90` evaluates to `false`, meaning NaN coordinates pass the validation check. If a malformed Google Location History record has non-numeric `latitudeE7` or `longitudeE7` values (e.g., strings like `"NaN"` or `undefined` after E7 conversion), the resulting NaN lat/lng will pass both `Math.abs(lat) > 90` and `Math.abs(lng) > 180` guards. This introduces NaN coordinates into the track data, which can cause rendering artifacts on the map (MapLibre GL handles NaN poorly) and break distance calculations.
- **Fix:** Add `Number.isFinite(lat) && Number.isFinite(lng)` checks in both `pushE7` and `parseRecords`, in both parser.ts and the worker. Alternatively, `Number.isFinite` can replace the `Math.abs` checks since `Number.isFinite` rejects NaN, Infinity, and out-of-range values in one call.
- **Cross-agent:** Affects both the main-thread parser and the worker (primary code path).

### C4-F3: ExportPanel estimated time multiplier may be inaccurate [LOW / MEDIUM]
- **File:** `src/components/ExportPanel.tsx` line 105
- **Issue:** `estimatedSeconds = Math.round(duration * 0.5 * resScale * codecScale)` uses a 0.5x base multiplier. For 4K AV1 exports, the actual encoding time can be significantly longer than this estimate. The estimate is labeled with "~" and "approx" qualifiers (from cycle 2 fix), so user expectations are managed, but the estimate could be more accurate.
- **Impact:** Low. The estimate is approximate and clearly labeled as such.

### C4-F4: SceneEditor normalizes scenes on every name keystroke [MEDIUM / MEDIUM]
- **File:** `src/components/SceneEditor.tsx` lines 330-344 (updateScene), 442-443 (name input)
- **Issue:** `updateScene` calls `commitScenes`, which calls `normalizeScenes` on every change. When the user types in the scene name input, each keystroke triggers a full scene normalization pass (sorting, zero-duration filtering, etc.) even though name changes cannot affect scene ranges. This is unnecessary computation, especially with many scenes.
- **Fix:** Skip `normalizeScenes` when only the scene name has changed. One approach: check if the patch only contains `name` and, if so, call `onChange` with the updated scenes directly without normalization.
- **Impact:** Low practical impact with typical scene counts (2-10), but the principle violation is clear.

## Positive Observations
- Cycle 3 fixes correctly applied in both code paths
- Worker error code constants properly synchronized with main-thread parser
- Clean error code mapping in FileUpload (no string matching on error messages)
- Proper use of `useCallback` with correct dependency arrays throughout
- Good separation of concerns between hooks and components
