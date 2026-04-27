# Verifier — Cycle 5 (2026-04-27)

Repository: `/Users/hletrd/flash-shared/Travelback`
Reviewer: verifier

## Findings

### V5-01 — Export resume after abort leaves map in resized state
- **Severity:** MEDIUM-HIGH
- **Confidence:** High
- **File:** `src/lib/useExportController.ts:224-250`
- **Description:** When an export is aborted, the `finally` block calls `mapViewRef.current?.resetSize()`. However, between the abort and the `finally` block, there's a `try { await mapViewRef.current?.waitForIdle(abortController.signal) }` call that is skipped because `abortController.signal.aborted` is true. The `resetSize()` call itself can throw if the map was already destroyed. The `catch` in the outer block at line 226 only handles the `resetSize` error. But the real issue is: if `resetSize()` throws (which is caught), the `waitForIdle` is skipped (correct), but the `finally` block still sets `isExporting(false)` and `setPlaybackProgress(preExportProgress)`. The map container's CSS dimensions remain at the export resolution (e.g., 1920x1080) because `resetSize()` failed silently.
- **Failure scenario:** User cancels an export. The map container is stuck at 1920x1080 pixels in CSS dimensions. The map appears zoomed in and incorrectly sized. Only a page reload fixes this.
- **Suggested fix:** Make `resetSize()` more resilient by ensuring the container style is always cleared even if `map.resize()` throws. The current code already does `container.style.width = ''` and `container.style.height = ''` before calling `map.resize()`, so the CSS should be restored. Verify that the try/catch in `resetSize()` actually covers the right scope and that `container.style` clearing cannot be bypassed.

---

### V5-02 — `interpolateAlongTrack` returns zero coordinates for empty tracks but callers don't guard
- **Severity:** MEDIUM
- **Confidence:** High
- **File:** `src/lib/interpolate.ts:86-109`, `src/components/MapView.tsx:1006-1007`
- **Description:** `interpolateAlongTrack` returns `{ lng: 0, lat: 0 }` for empty tracks. This is the "null island" point off the coast of Africa. Callers like MapView's progress effect call `interpolateAlongTrack(track.points, cumulDistRef.current, progress)` and then use the result to update the marker position and trail. If `cumulDistRef.current` is empty (length 0) but `track` is non-null, the effect proceeds past the early return (`!track || cumulDistRef.current.length === 0`) and produces incorrect results.
- **Failure scenario:** A race condition where `track` is set but `cumulDistRef` hasn't been populated yet. The marker jumps to (0, 0) in the Gulf of Guinea. The map might even pan to this location.
- **Suggested fix:** Add an explicit guard in MapView's progress effect: if `cumulDistRef.current.length === 0`, skip the interpolation. Also verify that `cumulDistRef` is always populated before `track` in the track-loading effect.

---

### V5-03 — Scene transition blending can produce negative `blendT` values
- **Severity:** LOW
- **Confidence:** High
- **File:** `src/lib/camera.ts:421-433`
- **Description:** At lines 424 and 431, the blend factor `blendT` is computed as `(localProgress * sceneDuration) / effectiveHalfTrans`. Since `effectiveHalfTrans = Math.min(transitionDuration / 2, sceneDuration / 2)`, and the condition at line 421 checks `localProgress < effectiveHalfTrans / sceneDuration`, the math guarantees `localProgress * sceneDuration < effectiveHalfTrans`. Therefore `blendT < 1.0`, which is correct. However, if `sceneDuration` is 0 (degenerate scene), `localProgress` would be 0 and `blendT` would be 0/0 = NaN. The `Math.max(0, Math.min(1, NaN))` clamping produces 0, which is safe, but the NaN intermediate is unexpected.
- **Failure scenario:** Not a user-facing bug since the clamping handles NaN as 0. However, a degenerate scene with 0 duration would produce unexpected camera behavior (always at the blend start, never reaching the main camera).
- **Suggested fix:** Add an explicit check for `sceneDuration <= 0` and skip blending entirely, returning `mainCamera` directly.

---

## Summary

| ID | Severity | Confidence | File |
|----|----------|------------|------|
| V5-01 | MEDIUM-HIGH | High | useExportController.ts |
| V5-02 | MEDIUM | High | interpolate.ts / MapView.tsx |
| V5-03 | LOW | High | camera.ts |
