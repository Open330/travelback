# Debugger — Cycle 5 (2026-04-27)

Repository: `/Users/hletrd/flash-shared/Travelback`
Reviewer: debugger

## Findings

### DBG5-01 — Export produces blank video when map is destroyed mid-export
- **Severity:** HIGH
- **Confidence:** High
- **File:** `src/lib/useExportController.ts:102-261`, `src/components/MapView.tsx:762-778`
- **Description:** If the MapView component unmounts while an export is in progress (e.g., due to a React error boundary catching an unrelated error, or a hot module replacement during development), the map is destroyed in the cleanup effect (line 772: `map.remove()`). However, the export loop in `videoEncoder.ts` continues because the `AbortController` is not triggered. Subsequent calls to `mapHandle.renderFrameAndWait()` resolve immediately (the map ref is null, and the function returns immediately at line 514). `mapHandle.waitForIdle()` also resolves immediately. The encoder produces an MP4 with all-black or all-transparent frames.
- **Failure scenario:** During development, a CSS change triggers HMR. The map is destroyed and recreated. The export was in progress and continues, producing a blank video. The user downloads this video thinking it's their travel animation.
- **Suggested fix:** In the export pipeline, verify that `mapHandle.getMap()` returns a valid map before each frame. If the map is null or destroyed, abort the export with a specific error. Also abort `exportAbortRef.current` in the component's unmount cleanup.

---

### DBG5-02 — `renderFrameAndWait` resolves immediately when map is null, but caller assumes a frame was captured
- **Severity:** MEDIUM
- **Confidence:** High
- **File:** `src/components/MapView.tsx:511-514`
- **Description:** The `renderFrameAndWait` imperative handle method resolves immediately when `mapRef.current` is null (`if (!map) { resolve(); return }`). The caller (`videoEncoder.ts:149`) awaits this promise and then captures the canvas frame. Since the promise resolved without actually rendering, the captured frame is stale (from the last successful render) or blank.
- **Failure scenario:** Map is null during export. `renderFrameAndWait` resolves immediately. `videoSource.add()` captures whatever is on the canvas, which could be the last frame from a previous render or a blank canvas.
- **Suggested fix:** Reject the promise instead of resolving when the map is null, so the export loop can distinguish "frame ready" from "map unavailable". Alternatively, have the export controller check map validity before calling `renderFrameAndWait`.

---

### DBG5-03 — Worker fallback path can silently produce empty track
- **Severity:** MEDIUM
- **Confidence:** Medium
- **File:** `src/lib/parser.ts:647-660`
- **Description:** When the worker returns `event.data.track` with `undefined` or `null` but no `error`, the code falls through to the `if (!event.data.track)` check at line 648. If a `fallbackBuffer` exists, it parses the JSON on the main thread via `parseSmallGoogleJsonFallback`. However, this fallback can also produce an empty track (0 points) from a valid JSON file that contains no recognizable location data. The `finalizeTrack` function at line 711 rejects tracks with <2 points, so this would be caught — but only if `parseSmallGoogleJsonFallback` doesn't throw. If it returns a Track object with `points: []`, `finalizeTrack` throws, and the error is caught by the outer `catch` in `parseTrackFile`.
- **Failure scenario:** A valid JSON file with no location data passes the worker, the fallback parser produces an empty track, and `finalizeTrack` throws "Track must contain at least 2 points". The error message is correct, but the path is unnecessarily complex: the worker should have reported the empty track directly rather than requiring a main-thread fallback.
- **Suggested fix:** Have the worker check for `points.length < 2` and report it as an error rather than returning a track with 0 points. This eliminates the unnecessary fallback path.

---

## Summary

| ID | Severity | Confidence | File |
|----|----------|------------|------|
| DBG5-01 | HIGH | High | useExportController.ts / MapView.tsx |
| DBG5-02 | MEDIUM | High | MapView.tsx |
| DBG5-03 | MEDIUM | Medium | parser.ts |
