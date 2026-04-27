# Tracer — Cycle 5 (2026-04-27)

Repository: `/Users/hletrd/flash-shared/Travelback`
Reviewer: tracer

## Findings

### T5-01 — Export camera state uses `elapsedSec` from wall-clock time, but playback uses accumulator-based time — potential drift during export
- **Severity:** MEDIUM
- **Confidence:** Medium
- **File:** `src/lib/videoEncoder.ts:141`, `src/lib/camera.ts:138-203`
- **Description:** In `exportVideo`, the `elapsedSec` for each frame is computed as `frame * frameDuration` (line 141), which is deterministic. However, during normal playback, `elapsedSec` is computed as `progress * duration` (from `usePlaybackController`). If `progress` drifts slightly from the ideal `frame / totalFrames` (which it can, due to rAF timing), the camera rotation in orbit/birdeye/overview modes will use a different `elapsedSec` than the export. This means the export preview (playback during export) and the actual exported frames use different rotation values. The `exportTrack` callback in `useExportController.ts:176-182` throttles visible playback to ~10 Hz via `setPlaybackProgress`, but the `renderFrame` callback doesn't throttle the camera — each frame gets its own `elapsedSec` from the deterministic counter.
- **Failure scenario:** During export, the orbit camera rotation in the preview appears smooth but the exported video has slightly different rotation timing because the preview uses throttled `progress * duration` while the export uses `frame * frameDuration`. This is a cosmetic inconsistency rather than a data bug, but it means the preview doesn't match the export.
- **Suggested fix:** Use the same `elapsedSec` computation for both export and preview. Pass the export's deterministic `elapsedSec` to the playback progress callback so the preview matches exactly.

---

### T5-02 — Timeline selector range change triggers track reset + playback reset, but `cumulativeDistances` update may lag
- **Severity:** MEDIUM
- **Confidence:** High
- **File:** `src/app/page.tsx:288-321`, `src/components/MapView.tsx:923-982`
- **Description:** When `handleRangeChange` is called, it: (1) calls `resetExportSession()`, (2) creates `filteredTrack` with sliced points, (3) calls `setTrack(filteredTrack)`, (4) calls `resetPlayback()`. The `setTrack` triggers a re-render which recomputes `cumulativeDistances` via `useMemo`. However, `resetPlayback()` sets `progress` to 0 and `isPlaying` to false. The MapView receives the new `track` and `cumulativeDistances` in the same render cycle, but `cumulDistRef.current` in MapView is updated from the `cumulativeDistancesProp` in the track-loading effect (line 938), which runs after the render. There's a brief window where `trackRef.current` has the new track but `cumulDistRef.current` still holds the old distances.
- **Failure scenario:** If the progress effect runs during this window (triggered by `resetPlayback` changing `progress` from a non-zero value to 0), it uses new track points with old cumulative distances, producing an incorrect interpolation result.
- **Suggested fix:** Update `cumulDistRef.current` synchronously when the track changes, before any effects can run. Or ensure the progress effect checks that `cumulDistRef.current.length === track.points.length` before proceeding.

---

### T5-03 — `generateId()` falls back to `Date.now()-${Math.random()}` which can produce non-unique IDs
- **Severity:** LOW
- **Confidence:** High
- **File:** `src/types.ts:1-6`
- **Description:** When `crypto.randomUUID` is unavailable (e.g., non-HTTPS context in some browsers), `generateId()` falls back to `${Date.now()}-${Math.random().toString(36).slice(2)}`. This fallback has ~52 bits of entropy (Date.now is 13 digits, Math.random produces ~11 base-36 chars). While collision probability is low for normal usage, it's not cryptographically unique and could collide if called rapidly in a loop (same `Date.now()` value, sequential `Math.random()` values).
- **Failure scenario:** A script or automated test creates multiple scenes in rapid succession. Two scenes get the same ID from the fallback generator. One scene overwrites the other in the editor.
- **Suggested fix:** Add a counter to the fallback: `${Date.now()}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2)}`.

---

## Summary

| ID | Severity | Confidence | File |
|----|----------|------------|------|
| T5-01 | MEDIUM | Medium | videoEncoder.ts / camera.ts |
| T5-02 | MEDIUM | High | page.tsx / MapView.tsx |
| T5-03 | LOW | High | types.ts |
