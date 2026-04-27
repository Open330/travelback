# Performance Reviewer — Cycle 6 (2026-04-27)

## Files reviewed
All source files in `src/` and `scripts/`.

## Findings

### P6-01 — Export trail/marker not updated: both a correctness AND performance regression

- **Severity:** HIGH
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:997-1004`
- The `isExporting` guard that skips the progress effect during export was added to avoid React re-render overhead (a performance optimization). But it also skips all trail and marker updates, making the export visually incorrect. The optimization was too aggressive — it eliminated the React overhead but also eliminated the necessary visual updates.
- **Failure scenario:** Exported video shows static trail/marker. The performance gain is irrelevant because the output is wrong.
- **Suggested fix:** Inside `renderFrameAndWait`, imperatively update the trail source and marker position before waiting for the render event. This avoids React re-renders while producing correct output. The trail update can use the precomputed segments for O(1) lookups.

### P6-02 — `computeCameraForProgress` called twice per export frame

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:144-146`, `src/lib/useExportController.ts:187`
- In the export loop, `computeCameraForProgress` is called in `videoEncoder.ts` (line 144) to compute the camera state for each frame. Then the callback in `useExportController.ts` (line 187) passes this state to `renderFrameAndWait`. However, the `setPlaybackProgress` call in the callback (line 190) triggers a React state update which, if not guarded by `isExporting`, would cause MapView's progress effect to call `computeCameraForProgress` again. The `isExporting` guard prevents this, but the architecture is wasteful — the camera state is computed once in the encoder, then thrown away by the MapView effect, which would compute it again if the guard were removed.
- **Failure scenario:** When the `isExporting` guard is removed to fix P6-01, the camera state would be computed twice per frame unless the architecture is restructured.
- **Suggested fix:** Have `renderFrameAndWait` also update trail/marker imperatively so that removing the `isExporting` guard doesn't cause double computation.

### P6-03 — `referenceGridData` recomputed on every track change even for style changes

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:469`
- `useMemo(() => buildReferenceGridData(track), [track])` recomputes the grid on every track reference change. When the track object is recreated (e.g., after trim), the grid is recomputed even if the points are identical. The grid computation iterates all track points, which is O(n) for large tracks.
- **Failure scenario:** User trims a track. Grid is recomputed unnecessarily.
- **Suggested fix:** Use a deep-comparison or hash-based key to avoid recomputation when the track data hasn't changed semantically.

### P6-04 — Fallback buffer in worker path doubles memory for files under 16MB

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.ts:618`
- `const fallbackBuffer = buffer.byteLength <= MAIN_THREAD_JSON_FALLBACK_SIZE ? buffer.slice(0) : null` creates a full copy of the buffer for fallback. For a 15MB file, this temporarily uses ~30MB. While this is by design (fallback safety), it could be significant on memory-constrained mobile devices.
- **Failure scenario:** Mobile device with 4GB RAM and multiple tabs open. Parsing a 14MB JSON file uses 28MB temporarily, pushing the tab close to its memory limit.
- **Suggested fix:** Consider using a structured clone or transferable approach instead of `buffer.slice(0)`, or lower the `MAIN_THREAD_JSON_FALLBACK_SIZE` threshold.
