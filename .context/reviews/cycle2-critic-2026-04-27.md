# Critic — Cycle 2 (2026-04-27)

## Re-evaluation of carried findings

| Prior | Status | Notes |
|-------|--------|-------|
| N05 (export React entanglement) | RESOLVED | `isExporting` guard is clean and effective. |
| N09 (trim destroys scenes) | UNCHANGED | `handleRangeChange` still silently clears scenes. User-authored scene compositions are destroyed without confirmation or undo. This is the most impactful UX regression in the codebase. |
| N10 (scene normalization mutates intent) | UNCHANGED | `normalizeScenes` still silently clamps overlapping scenes. No raw/authored scene separation. |
| N18 (ExportError consistency) | UNCHANGED | videoEncoder still uses generic `Error` while parser uses `ParseError` with codes. |
| N19 (test stub documentation) | UNCHANGED | `travelback-export-test-stub` localStorage flag still undocumented. |
| N20 (uncommitted changes) | UNCHANGED | 8 files with uncommitted changes. Risk of silent divergence. |
| N26 (playback timer unmount race) | UNCHANGED | `usePlaybackController` fallback timer can fire after unmount. |

## New findings

### C2-01 — Precomputed segments improve trail perf but the `buildTrackGeometry` fallback path is untested

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:1070-1076`
- **Detail:** When `precomputedSegmentsRef.current` is empty, the code falls back to `buildTrackGeometry(track.points, ...)`, which is the original O(n) path. This fallback exists for the case where precomputed segments haven't been populated yet (e.g., race between track load and first progress update). There's no E2E test that exercises this fallback path, and it could silently regress.
- **Impact:** Fallback path is untested and could break without CI catching it.

### C2-02 — The `isExporting` guard in MapView is a prop-driven conditional that could fall out of sync

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:25,1000`
- **Detail:** The `isExporting` prop must be kept in sync with the export controller's state. If `isExporting` is `true` but the export has been cancelled, the progress effect would remain suppressed. Currently, `useExportController` sets `isExporting` to `false` in the finally block (useExportController.ts:239), so this is handled. But the coupling is implicit.
- **Impact:** Low — the finally block ensures cleanup, but the pattern relies on correct error handling in the export pipeline.

### C2-03 — `handleRangeChange` missing dependency `t` in useCallback (ESLint warning)

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:316` (ESLint warning)
- **Detail:** This is a pre-existing ESLint warning. `useCallback` for `handleRangeChange` has `t` in its body but not in the dependency array. If `t` changes (locale switch), the callback would use the stale translation function. Since `handleRangeChange` clears scenes, a stale `t` wouldn't cause functional issues, but it's a correctness gap.
- **Impact:** Stale translation in scene-clear toast if locale changes during active trimming. Unlikely in practice.

## Summary

- Carried forward: 7 findings evaluated (1 resolved, 6 unchanged)
- New findings: 3 (1 MEDIUM, 2 LOW)
