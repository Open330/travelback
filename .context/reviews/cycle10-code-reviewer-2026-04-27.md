# Cycle 10 Code Review — 2026-04-27

## Review Scope
Full source tree: `src/`, `scripts/`, `e2e/`, `.context/`

## Findings

### C10-CR-01 — LOW-MEDIUM — `handleLoadSample` still closes over `t` directly

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/app/page.tsx:369-392`
- **Detail:** `handleLoadSample` uses `t` directly in its error handler (`addToast(t('app.sampleLoadFailed'), 'error')`) and includes `t` in its dependency array. The same pattern was fixed in C8-F02 for `useExportController` and C9-F04 for `loadTrackIntoSession` (both now use `tRef`). This callback is recreated on every locale change.
- **Failure scenario:** When locale changes, `handleLoadSample` is recreated, causing `FileUpload` to re-render even when no sample load is in progress.
- **Fix:** Use `tRef.current('app.sampleLoadFailed')` inside the callback and remove `t` from deps.

### C10-CR-02 — LOW — Redundant `segmentStartIndices` remapping in `confirmTrimClear`

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:332-355`
- **Detail:** `confirmTrimClear` duplicates the exact same track-slicing and segment-remapping logic as `handleRangeChange` (lines 298-330). The two functions differ only in that `confirmTrimClear` first clears scenes and `handleRangeChange` short-circuits when scenes exist.
- **Failure scenario:** A future fix to segment remapping in one path but not the other introduces behavioral drift.
- **Fix:** Extract a shared `buildFilteredTrack(fullTrack, startIdx, endIdx)` helper and call it from both `handleRangeChange` and `confirmTrimClear`.

### C10-CR-03 — LOW — `buildTrackGeometry` fallback generates degenerate LineString when `points` is empty

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:176-179`
- **Detail:** When `segments` is empty (no valid points), `buildTrackGeometry` falls back to `buildWrappedCoordinates(points.slice(0, 1))`. For an empty `points` array, this creates a `LineString` with an empty coordinates array, which is invalid per the GeoJSON spec (LineString must have >= 2 positions). While MapLibre tolerates this, it logs a console warning.
- **Failure scenario:** Console warnings on degenerate track loads. Not user-visible but clutters developer diagnostics.
- **Fix:** Return `{ type: 'LineString', coordinates: [] }` directly when `segments.length === 0` and `points` is empty, avoiding the slice-to-1 fallback.

### C10-CR-04 — LOW — Inconsistent null-check style for `track.points[0]`

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:940-941`, `src/components/MapView.tsx:1068`
- **Detail:** `addTrackLayers` accesses `track.points[0]` without a bounds check, while the calling `useEffect` only checks `track` is truthy and `cumulDistRef` length matches. If somehow a track with empty points reaches `addTrackLayers`, this would throw. The `finalizeTrack` in `parser.ts` enforces `points.length >= 2`, so this is a latent risk rather than active, but the defensive check is inconsistent.
- **Failure scenario:** No current failure path — parser rejects tracks with < 2 points. But if a future code path bypasses the parser, this could throw.
- **Fix:** Add `if (track.points.length === 0) return` guard at the top of `addTrackLayers`, or assert invariants at the component boundary.

### C10-CR-05 — LOW — `TimelineSelector` drag hint uses `localStorage` without quota protection

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/TimelineSelector.tsx:107-115`
- **Detail:** The `showHint` initialization reads `localStorage` inside a try/catch, but `dismissHint` writes to `localStorage` also wrapped in try/catch. Both are correct. However, `HINT_DISMISSED_KEY` is a module-level constant that could collide with other apps on the same domain if not namespaced with `travelback-`.
- **Failure scenario:** Unlikely in practice — the key `travelback-timeline-hint-dismissed` is already namespaced. Very low risk.
- **Fix:** No action needed. Finding recorded for completeness.

## Summary

| Severity | Count |
|----------|-------|
| LOW-MEDIUM | 1 |
| LOW | 4 |
