# Cycle 10 Debugger Review — 2026-04-27

## Review Scope
Latent bug surface, failure modes, regressions.

## Findings

### C10-DBG-01 — LOW — `buildTrackGeometry` generates invalid GeoJSON LineString when segments is empty and points is non-empty

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:176-179`
- **Detail:** When `segments` is empty (all point coordinates invalid/filtered), the fallback `buildWrappedCoordinates(points.slice(0, 1))` produces either an empty coordinates array (if `points` is empty) or a single-point array. A LineString with 0 or 1 coordinates is invalid per the GeoJSON RFC 7946 spec. MapLibre tolerates this but logs a warning. This is a latent issue — the parser enforces >= 2 valid points, so this path is only reachable if `addTrackLayers` is called with a track that has >= 2 points where all coordinates fail the lat/lng validity check.
- **Failure scenario:** Extremely unlikely under current code — requires a track with >= 2 points where every point has `|lat| > 90` or `|lng| > 180`. The parser already filters these. Console warning is the worst observable symptom.
- **Fix:** Return `{ type: 'LineString', coordinates: [] }` when `segments.length === 0`.

### C10-DBG-02 — LOW — Export progress bar `aria-valuenow` not clamped

- **Severity:** LOW
- **Confidence:** Low
- **Files:** `src/components/ExportPanel.tsx:295`
- **Detail:** `aria-valuenow={Math.round(exportProgress * 100)}` — if `exportProgress` ever exceeds 1.0 due to floating-point accumulation, `aria-valuenow` would exceed `aria-valuemax={100}`. Currently safe because `videoEncoder.ts` clamps `progress = frame / (totalFrames - 1)` and frame never exceeds `totalFrames - 1`. Defensive fix is low priority.
- **Fix:** `aria-valuenow={Math.min(100, Math.round(exportProgress * 100))}`.

## Summary

| Severity | Count |
|----------|-------|
| LOW | 2 |
