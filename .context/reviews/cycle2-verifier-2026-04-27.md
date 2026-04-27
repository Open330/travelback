# Verifier — Cycle 2 (2026-04-27)

## Verification of resolved claims

### N05 — Export React state entanglement
- **Claim:** `isExporting` prop on MapView suppresses non-camera side effects during export.
- **Verification:** CONFIRMED. MapView.tsx line 1000: `if (isExporting) return` exits the progress effect early. The prop is wired in page.tsx. The export controller sets `isExporting` to `true` at export start (useExportController.ts:111) and `false` in the finally block (line 239). After export, `setPlaybackProgress(preExportProgress)` (line 239) triggers the effect to re-sync trail/marker state.
- **Edge case:** If the map is destroyed during export, `resetSize` (line 613) clears container styles first and catches `map.resize()` errors. The `isExporting` prop is set to `false` by the finally block regardless.
- **Verdict:** RESOLVED.

### N06 — renderFrameAndWait deadlock
- **Claim:** 5-second timeout and identical-state fast path prevent indefinite blocking.
- **Verification:** CONFIRMED. MapView.tsx lines 523-545 compare current map state with target state at 6-digit precision for lng/lat, 3-digit for zoom, 1-digit for pitch/bearing. If identical, resolves immediately. Timeout at line 578-581 resolves the promise after 5 seconds. Abort signal is checked at line 583.
- **Edge case:** If rounding causes a near-identical state to slip through (e.g., center moved by 0.0000001 degrees), MapLibre may not repaint. The 5-second timeout catches this.
- **Verdict:** RESOLVED.

### N16 — Export resized map on resetSize failure
- **Claim:** `resetSize` clears container styles first, then wraps `map.resize()` in try/catch.
- **Verification:** CONFIRMED. MapView.tsx lines 613-630: container `style.width` and `style.height` are cleared (lines 617-620) before `map.resize()` is called (line 626). If `map.resize()` throws (map destroyed), the catch block is reached (line 627) and the container is already restored.
- **Verdict:** RESOLVED.

### N28 — normalizeBasePath path traversal
- **Claim:** `normalizeBasePath` rejects `..` paths.
- **Verification:** CONFIRMED. env.ts line 5: `if (trimmed.includes('..')) return ''`. The check is on the trimmed value (after leading/trailing slashes removed). This catches `/../`, `/foo/..`, and `..` itself.
- **Edge case:** A path like `/foo/..bar` would be rejected because it contains `..`, even though `..bar` is not a traversal. This is a false positive but acceptable for defense-in-depth.
- **Verdict:** RESOLVED.

### N01 — Trail geometry performance
- **Claim:** Precomputed segments reduce per-frame work.
- **Verification:** PARTIALLY CONFIRMED. `precomputeWrappedSegments` (MapView.tsx:116-138) builds wrapped coordinate arrays at track load time. During playback (lines 1019-1076), fully-traversed segments use precomputed arrays directly (O(1) reference push). The partial segment copies coordinates up to the current position (O(current-segment-points)). The fallback path (line 1070-1076) uses `buildTrackGeometry` which is O(n).
- **Improvement:** For a 100K-point track with 10 segments, a fully-traversed segment of 10K points is now O(1) instead of O(10K). The partial segment (average 10K points) is still O(10K). Overall improvement is significant for multi-segment tracks but marginal for single-segment tracks.
- **Verdict:** PARTIALLY RESOLVED. Main improvement delivered; partial segment copy remains O(n).

## Unverified claims from uncommitted changes

The following uncommitted changes require gate-testing:
1. `renderFrameAndWait` with 5s timeout — verified above by code review but not by automated test.
2. `resetSize` style-first approach — verified above by code review but not by automated test.
3. `isExporting` guard — verified above by code review but not by automated test.
4. `normalizeBasePath` `..` rejection — verified above by code review but not by automated test.

**These changes are NOT committed and NOT validated by build gates.**

## Summary

- Verified resolved: N05, N06, N16, N28 (4 findings)
- Partially resolved: N01 (1 finding)
- Unverified uncommitted changes: 4 items need gate-testing
