# Code Reviewer — Cycle 1 (2026-04-27)

Reviewer: code-reviewer
Repository: `/Users/hletrd/flash-shared/Travelback`
Scope: Full codebase including uncommitted changes

## Findings

### CR-01 — `normalizeBasePath` is triplicated across three files

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/types.ts:23-27`, `src/lib/parser.ts:594-598`, `src/lib/env.ts`
- **Detail:** The same `normalizeBasePath` function is defined independently in `types.ts`, `parser.ts`, and `env.ts`. Any change to the normalization logic must be applied in three places. `parser.ts` uses its own copy for the worker URL, while `env.ts` exports the canonical one and `types.ts` uses yet another copy for `BASE_PATH` computation.
- **Suggested fix:** Remove the duplicates from `types.ts` and `parser.ts`. Import from `env.ts` in both locations.

### CR-02 — `isLocalExportTestStubEnabled` is duplicated in useExportController and ExportPanel

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:20-29`, `src/components/ExportPanel.tsx:37-46`
- **Detail:** Identical `isLocalExportTestStubEnabled()` function exists in two files. Both check `localStorage` for the `travelback-export-test-stub` key.
- **Suggested fix:** Extract to a shared utility (e.g., `src/lib/test-helpers.ts`) and import from both consumers.

### CR-03 — Per-frame trail geometry rebuild via `buildTrackGeometry` + `setData` is O(traveled points) during playback

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:924-938`
- **Detail:** The animation update effect calls `buildTrackGeometry(track.points, track.segmentStartIndices, segmentIndex, point)` on every `progress` change. This slices, wraps, and copies coordinates for the entire traveled portion every frame. The uncommitted diff for F06 (`renderFrameAndWait`) helps the export path but the normal playback path still uses the same per-frame `buildTrackGeometry` + `setData` pattern.
- **Suggested fix:** Pre-segment coordinate arrays at track load time. On progress updates, only append or trim the trailing segment rather than rebuilding from scratch. Consider `line-gradient` + feature-state for trail visualization.

### CR-04 — Scene editor range sliders use static `aria-valuemin={0}` and `aria-valuemax={100}`

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/SceneEditor.tsx:189-190`
- **Detail:** The `SceneRangeEditor` sliders always set `aria-valuemin={0}` and `aria-valuemax={100}`, but the start handle's max should be the current end value and the end handle's min should be the current start value. Screen-reader users get incorrect boundary information. The `TimelineSelector` correctly uses dynamic `aria-valuemin`/`aria-valuemax` — the same pattern should apply here.
- **Suggested fix:** Set `aria-valuemin` on the start handle to 0, `aria-valuemax` to `Math.round(endPercent * 100)`. Set `aria-valuemin` on the end handle to `Math.round(startPercent * 100)`, `aria-valuemax` to 100.

### CR-05 — Export progress throttle can skip the final progress update before 100%

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/useExportController.ts:182-184`
- **Detail:** The throttle condition `nextProgress - exportProgressRef.current >= 0.02` means that if the last few frames advance by less than 2%, the final `setPlaybackProgress` call before `setPlaybackProgress(1)` may be skipped. This leaves the progress bar showing a stale value until the abrupt jump to 100%.
- **Suggested fix:** Always update on the last frame (when `nextProgress >= 1`), or reduce the threshold for the final 10% of progress.

### CR-06 — `videoEncoder.ts` `waitForIdle` fallback uses double-rAF which does not guarantee tile rendering

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:144-150`
- **Detail:** When `waitForIdle` is not provided (fallback path), the encoder uses `requestAnimationFrame` twice. This only guarantees the browser has painted a frame but not that MapLibre has finished loading/rendering tiles. The main path now uses `renderFrameAndWait` (from the uncommitted diff), making this fallback less likely, but it should still be hardened.
- **Suggested fix:** Document the limitation clearly. Consider making `waitForIdle` required or making the fallback a hard error, since `renderFrameAndWait` should always be used for export.

### CR-07 — `parseTrackFile` uses fragile catch-then-then promise chain for JSON

- **Severity:** LOW
- **Confidence:** Low
- **Files:** `src/lib/parser.ts:713-721`
- **Detail:** The `.catch(() => throw).then(parse).then(finalize).catch(reject)` chain is intentionally structured but confusing. The middle `.catch` throws a new error that skips the subsequent `.then`.
- **Suggested fix:** Rewrite using async/await for clarity.

### CR-08 — `TrackWorkspace` props interface has 25+ properties

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/TrackWorkspace.tsx:13-50`
- **Detail:** `TrackWorkspace` receives over 25 props from `page.tsx`. This makes the interface fragile — any new piece of state requires adding another prop.
- **Suggested fix:** This is a known architectural concern (F08 in cycle 2). Track it as a future refactor to use context or a session reducer.

### CR-09 — Uncommitted changes address prior findings but have not been committed or gate-tested

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** Multiple files with uncommitted changes
- **Detail:** The working tree has 8 files with uncommitted changes that partially address 7 findings from cycle 2 (F01, F06, F10, F16, F17, F18, F25/F26). These changes are not committed, not tested by the build gates, and not deployed. They introduce new code (`renderFrameAndWait`, export throttle, `assertPointBudget` additions, bootstrap rewrite guard) that could have regressions.
- **Suggested fix:** Commit these as separate semantic commits, running gates between each.

## Summary

| Severity | Count |
|----------|-------|
| MEDIUM   | 4     |
| LOW      | 5     |
| **Total** | **9** |
