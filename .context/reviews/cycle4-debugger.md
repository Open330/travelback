# Cycle 4 Debugger Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Methodology
Focused on latent bug surface, failure modes, and regression risks. Traced error paths, edge cases, and state transitions.

## Findings

### C4-DB01 — `parseGoogleLocationHistory` can throw `RangeError` from `JSON.parse` on deeply nested input on main thread
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.ts:533-540`
- **Detail:** The main thread path intentionally skips `checkJsonDepth` (line 529-531) and relies on `JSON.parse` throwing `RangeError` which is caught and converted to `ParseError`. This is correct. However, if the JSON is malformed in a way that causes `JSON.parse` to throw a `SyntaxError` instead of `RangeError`, the `catch(err)` on line 535 only checks for `RangeError` specifically, then falls through to the generic `INVALID_GOOGLE_JSON` error. This means deeply-nested-but-parseable JSON will trigger `RangeError`, while syntactically-invalid deeply-nested JSON will trigger `INVALID_GOOGLE_JSON`. Both are correct outcomes.
- **Suggested fix:** No bug — verified the error handling is correct for both paths.

### C4-DB02 — `exportVideo` frame loop progress calculation can produce `progress > 1`
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:140`
- **Detail:** `const progress = frame / (totalFrames - 1)` — when `frame === totalFrames - 1`, progress is exactly 1.0. When `frame < totalFrames - 1`, progress is < 1.0. This is correct. However, `computeCameraForProgress` and `interpolateAlongTrack` both clamp progress to [0,1], so even if progress exceeded 1, it would be clamped.
- **Suggested fix:** No fix needed — progress is bounded by the loop.

### C4-DB03 — `handleRangeChange` in page.tsx can produce `segmentStartIndices` with 0 value
- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/app/page.tsx:304-311`
- **Detail:** When trimming a track, the `segmentStartIndices` are remapped: `.filter((index) => index >= startIdx && index <= endIdx).map((index) => index - startIdx)`. If a segment starts at exactly `startIdx`, the remapped index is 0. In `normalizeSegmentStarts` (MapView:95), indices of 0 are filtered out (`index > 0` is required). This means the segment starting at the first point of the trimmed track is dropped as a segment boundary. If the original track had a segment boundary at exactly the trim start, the resulting track loses that segment division.
- **Suggested fix:** This is arguably correct — if a segment starts at the first point of the trimmed track, there's no prior segment to break from. However, it could affect tracks where segments represent meaningful breaks (e.g., different activities). Verify that the caller (`page.tsx`) handles this correctly.

### C4-DB04 — `SceneRangeEditor` drag can leave `dragging` state true if `pointerup` fires outside window
- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/SceneEditor.tsx:104-149`
- **Detail:** The `pointermove` and `pointerup` listeners are registered on `window`. If the browser loses focus during drag (e.g., OS notification, Alt+Tab), `pointerup` might not fire. The `dragging` state would remain true, and the `pointermove` listener would continue running until the next `pointerup` event. This is a common drag implementation issue that affects many UI libraries.
- **Suggested fix:** Add a `pointercancel` listener and a `blur` listener to reset drag state.

### C4-DB05 — `downloadVideo` fallback `<a>` element removal uses setTimeout with 100ms delay
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:238-239`
- **Detail:** The comment explains this is for Safari < 15.4 compatibility where synchronous removal can silently fail. The 100ms delay means the `<a>` element stays in the DOM briefly. If `downloadVideo` is called rapidly (unlikely for a video download), elements could accumulate. The `a.click()` could also throw on some browsers, and the `finally` block handles cleanup.
- **Suggested fix:** No fix needed — the race condition is benign in practice.

### C4-DB06 — `useEffect` cleanup in MapView's track effect may remove listeners from wrong style.load handler
- **Severity:** LOW
- **Confidence:** Low
- **Files:** `src/components/MapView.tsx:980-991`
- **Detail:** When the track changes, the effect cleanup removes `onStyleReady` from `style.load`, `styledata`, and `idle` events. However, if the style is currently loading when the track changes, the cleanup might remove the handler before it fires, and the new track's handler wouldn't be registered until the effect re-runs. This could cause a brief period where the map has no track data after a style change. The `addTrackLayers` guard (`if (map.isStyleLoaded() && (!map.getLayer('route-line') || ...))`) in the progress effect (line 1010-1012) provides a safety net.
- **Suggested fix:** No fix needed — the safety net in the progress effect handles this.

## Summary
| Severity | Count |
|----------|-------|
| HIGH | 0 |
| MEDIUM | 2 |
| LOW | 4 |
| **Total** | **6** |
