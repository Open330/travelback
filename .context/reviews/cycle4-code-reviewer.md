# Cycle 4 Code Reviewer — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Methodology
Reviewed all source files in `src/`, test files, and configuration. Focused on code quality, logic, SOLID principles, and maintainability.

## Findings

### C4-CR01 — `normalizeScenes` mutates input array via spread-then-sort chain
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/camera.ts:19-43`
- **Detail:** `normalizeScenes` returns a new array but the `.map().sort().map().filter()` chain creates intermediate arrays. While functionally correct, the pattern sorts by `startPercent` then adjusts overlapping ranges via `previousEndPercent`. If two scenes have the same `startPercent` and `endPercent`, the sort is stable (JS spec guarantees stable sort since ES2019) and `localeCompare` on `id` is the tiebreaker. However, the `previousEndPercent` accumulation in the second `.map()` means the output depends on sort order. If a user creates overlapping scenes, the normalization silently picks winners and losers without clear user intent.
- **Suggested fix:** Already noted as C3-06 (deferred). No change needed this cycle.

### C4-CR02 — `buildTrackGeometry` duplicates `wrapLngNear` logic from `precomputeWrappedSegments`
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:116-137` and `MapView.tsx:140-201` and `MapView.tsx:1030-1035`
- **Detail:** The `wrapLngNear` function is defined three times: inside `precomputeWrappedSegments`, inside `buildTrackGeometry`, and as an inline function inside the progress update effect (line 1030). This is a DRY violation. Any change to the wrapping logic must be made in three places.
- **Suggested fix:** Extract `wrapLngNear` as a module-level utility or import from `interpolate.ts`.

### C4-CR03 — `addTrackLayers` has empty dependency array but accesses `track` parameter
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:822`
- **Detail:** `useCallback((map, track) => {...}, [])` — the callback is stable because `track` is always passed as a parameter, not closed over. However, the empty deps array is misleading; a comment explaining why would help future maintainers.
- **Suggested fix:** Add an inline comment explaining the intentional empty deps.

### C4-CR04 — `handleRangeChange` creates `filteredTrack` without validating segment indices
- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/app/page.tsx:301-312`
- **Detail:** When trimming the track, `segmentStartIndices` are filtered and remapped with `.filter((index) => index >= startIdx && index <= endIdx).map((index) => index - startIdx)`. The subsequent `.filter((index) => index >= 0)` guard is always true after subtraction from `startIdx` when the index was >= `startIdx`. However, if the original segment starts at `startIdx` exactly, the remapped index would be 0, which `normalizeSegmentStarts` in MapView filters out (it requires `index > 0`). This means a segment that starts exactly at the trim boundary is silently dropped.
- **Suggested fix:** Verify this is intentional. If a segment starts at the first point of a trimmed track, it should not be a segment boundary since there's no prior segment to break from.

### C4-CR05 — `usePlaybackController` fallback timer can fire after cleanup
- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/usePlaybackController.ts:119`
- **Detail:** The fallback timer `window.setTimeout(() => animate(performance.now()), 250)` is scheduled every frame. The cleanup function on line 152 clears `fallbackTimerRef.current`, but there's a brief window between scheduling the timeout and storing its ID where cleanup could miss it. The `mountedRef` check on line 125 prevents state updates after unmount, making this benign in practice.
- **Suggested fix:** Already documented as C3-20 (resolved via mountedRef check). Low risk.

### C4-CR06 — `ExportError` and `ParseError` share identical class structure but no common base
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:14-21`, `src/lib/parser.ts:13-20`
- **Detail:** Both error classes have `name` and `code` properties with identical semantics. No shared base class or interface. If a third error type is added, the pattern would be duplicated again.
- **Suggested fix:** Consider extracting a `CodedError` base class. Low priority since only two exist.

### C4-CR07 — `downloadVideo` fetches blob from URL when `showSaveFilePicker` is used
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:213`
- **Detail:** `const writeBlob = blob ?? await (await fetch(url)).blob()` — when `showSaveFilePicker` succeeds, it fetches the blob from the object URL. However, `blob` is already available in the caller (`useExportController.ts:189`). The fetch is unnecessary when `blob` is passed. Currently `downloadVideo` is called with the blob parameter, so the fetch path is dead code in normal usage.
- **Suggested fix:** The `blob` parameter should be made required since the caller always has it. Alternatively, add a comment that the fetch fallback is for API compatibility only.

### C4-CR08 — `normalizeWaypoint` in JourneyCreator silently drops `ele` and `time`
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/JourneyCreator.tsx:35-41`
- **Detail:** When creating waypoints from map clicks or coordinate search, the `normalizeWaypoint` function returns `TrackPoint` with only `lng` and `lat`. The `ele` and `time` fields are omitted. This is correct for manually-created journeys (no elevation or time data), but the type allows them.
- **Suggested fix:** No fix needed — this is intentional behavior for manual journeys.

### C4-CR09 — `checkJsonDepth` does not handle Unicode escape sequences in strings
- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/parser.ts:508-525`
- **Detail:** The `checkJsonDepth` function handles `\"` escapes and `\\` escapes but does not account for `\uXXXX` or `\u{XXXXX}` escape sequences. A JSON string containing `"` (which represents `"`) could cause the parser to incorrectly toggle the `inString` flag. However, this is only used as a pre-flight check in the worker path — `JSON.parse` on the main thread handles this correctly.
- **Suggested fix:** Add handling for `\u` escape sequences in the character-by-character scanner. Low risk since malformed input would still fail `JSON.parse`.

### C4-CR10 — `chooseReferenceGridStep` returns fixed steps that can produce very many grid lines
- **Severity:** LOW
- **Confidence:** Low
- **Files:** `src/components/MapView.tsx:260-269`
- **Detail:** For very large spans (>20 degrees), the step is 10 degrees, which is fine. But for spans near the boundary (e.g., 1.6 degrees), the step is 0.1, producing ~16 lines per axis plus margins. This seems acceptable but could be worth monitoring for edge cases with extremely large spans combined with small margins.
- **Suggested fix:** No fix needed currently.

## Summary
| Severity | Count |
|----------|-------|
| HIGH | 0 |
| MEDIUM | 3 |
| LOW | 7 |
| **Total** | **10** |
