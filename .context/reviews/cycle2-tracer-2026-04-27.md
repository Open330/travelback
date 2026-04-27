# Tracer — Cycle 2 (2026-04-27)

## Flow 1: Export with isExporting guard

**Trace:** User clicks "Start Export" → `exportTrack()` called → `setIsExporting(true)` (useExportController.ts:111) → `mapHandle.resize()` → `mapHandle.waitForIdle()` → `exportVideo()` frame loop → `renderFrameAndWait()` per frame → `setPlaybackProgress()` throttled → MapView `useEffect([progress])` → **guard: `if (isExporting) return`** (line 1000) → only camera updates via `renderFrameAndWait` → export completes → `mapHandle.resetSize()` → `setPlaybackProgress(preExportProgress)` → `setIsExporting(false)` → MapView effect fires → trail/marker/camera re-sync.

**Verdict:** PASS. The `isExporting` guard correctly prevents React-driven trail/marker updates during export. After export, the progress is restored and the effect re-syncs.

## Flow 2: Export cancel with resetSize cleanup

**Trace:** User clicks "Cancel Export" → `exportAbortRef.current?.abort()` (useExportController.ts:93) → `AbortError` caught in frame loop → `resetSize()` called (line 219) → container styles cleared (MapView.tsx:617-620) → `map.resize()` in try/catch (lines 625-629) → `setIsExporting(false)` (line 239) → progress restored.

**Verdict:** PASS. Cancel path correctly restores container dimensions and export state even if map was partially destroyed.

## Flow 3: renderFrameAndWait identical-state fast path

**Trace:** Export frame → `renderFrameAndWait(state)` → compare current map state with target → **all fields match within rounding** (line 540-545) → resolve immediately → no `render` event listener → no timeout → frame captured immediately.

**Verdict:** PASS. Identical state is resolved without waiting for MapLibre's render event.

## Flow 4: renderFrameAndWait timeout on missing render event

**Trace:** Export frame → `renderFrameAndWait(state)` → camera state differs from current → `map.jumpTo()` called → `map.once('render', onRender)` registered → MapLibre doesn't fire `render` (e.g., tile not loaded) → **5-second timeout fires** (line 578-581) → `cleanup()` → resolve() → frame captured with potentially incomplete tile data.

**Verdict:** PASS with caveat. Timeout prevents deadlock but may produce a frame with missing tile data. This is acceptable — a duplicate/incomplete frame is better than a stalled export.

## Flow 5: normalizeBasePath with path traversal

**Trace:** `NEXT_PUBLIC_BASE_PATH="/foo/.."` → `normalizeBasePath(value)` → `trimmed = "foo/.."` → `trimmed.includes('..')` is `true` → return `''` → `basePath` is `''`.

**Verdict:** PASS. Path traversal is rejected. Returns empty string (no base path) instead of allowing the traversal.

## Flow 6: Trail update with precomputed segments during playback

**Trace:** Progress update → MapView effect fires → `isExporting` is `false` → `interpolateAlongTrack()` returns `segmentIndex` → iterate `precomputedSegmentsRef.current` → fully-traversed segments: push `seg.coordinates` directly (O(1)) → partial segment: copy coordinates up to `segmentIndex` (O(n) for segment) → add interpolated point → construct GeoJSON → `trailSource.setData()`.

**Verdict:** PASS. Performance is improved for multi-segment tracks. Single long segments still have O(n) partial copy.

## Summary

- 6 flows traced: all PASS
- No regressions detected in the uncommitted changes
