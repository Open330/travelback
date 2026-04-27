# Cycle 6 Aggregate Review (2026-04-27)

11 agents reviewed. 34 raw findings deduplicated into 19 unique items.

---

## AG6-01 — Export trail/marker freeze: `isExporting` guard blocks all visual updates during video export

- **Severity:** HIGH
- **Confidence:** High
- **Cross-agent agreement:** 9/11 (code-reviewer, perf-reviewer, verifier, critic, designer, debugger, tracer, architect, test-engineer)
- **Files:** `src/components/MapView.tsx:997-1004`, `src/components/MapView.tsx:512-589`, `src/lib/useExportController.ts:186-193`
- **Root cause (tracer):** CF5-02 optimization added `isExporting` guard to skip the progress effect during export. The guard skips ALL visual updates, but `renderFrameAndWait` only updates the camera. The comment on line 999 incorrectly claims "camera/trail/marker updates are handled by renderFrameAndWait."
- **Impact:** Exported videos show a moving camera with a frozen orange trail and static red marker. The export is the primary save/share action — its output must match the live playback experience.
- **Fix:** Update trail source and marker position imperatively inside `renderFrameAndWait` (or a new `applyExportFrame` method) before waiting for the render event. This avoids React re-renders while producing correct output. The trail update can use the precomputed segments for O(1) lookups. Define an explicit `ExportFrameUpdate` contract (architect) so future visual elements are included.

---

## AG6-02 — `hadExistingExport` stale flag: failed export shows 'done' state with no video

- **Severity:** MEDIUM
- **Confidence:** High
- **Cross-agent agreement:** 6/11 (code-reviewer, verifier, critic, debugger, tracer, test-engineer)
- **Files:** `src/lib/useExportController.ts:121, 131, 233`
- **Root cause (tracer):** CF5-03 fix called `revokeExportedVideoUrl()` at export start to prevent showing stale video. But `hadExistingExport` is captured before the revoke (line 121). On failure, `setExportState(hadExistingExport ? 'done' : 'idle')` uses the stale flag, showing 'done' with an empty preview.
- **Fix:** Always use `'idle'` on export failure since the video was revoked. Remove the `hadExistingExport` ternary from the catch block.

---

## AG6-03 — Camera gap transition bearing snap after last scene

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Cross-agent agreement:** 3/11 (architect, verifier, critic)
- **Files:** `src/lib/camera.ts:374-408`
- **Detail:** When progress is in the gap after the last scene (prevIdx >= 0, nextIdx === -1), the code falls through to `computeDefaultFollowCamera` without lerp from the previous scene's end state. This causes an instant bearing jump.
- **Fix:** When in a gap after the last scene, interpolate from the last scene's end state to the default follow camera over the gap duration. Define a unified gap transition strategy (architect).

---

## AG6-04 — Debug camera API still exposed in production via URL parameter

- **Severity:** MEDIUM
- **Confidence:** High
- **Cross-agent agreement:** 1/11 (security-reviewer)
- **Files:** `src/components/MapView.tsx:717-720`
- **Detail:** `process.env.NODE_ENV === 'development' || debugParams.get('__travelbackDebug') === '1'` allows the debug API in production builds. The localStorage escape hatch was removed since cycle 5, but the URL parameter remains.
- **Fix:** Remove the `|| debugParams.get('__travelbackDebug') === '1'` clause entirely. If debug access is needed in production, use a build-time flag.

---

## AG6-05 — Worker message not validated before accessing properties

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Cross-agent agreement:** 2/11 (security-reviewer, test-engineer)
- **Files:** `src/lib/parser.ts:643-673`
- **Detail:** Worker `onmessage` handler accesses `event.data.error`, `event.data.track`, `event.data.code` without validation. No tests for malformed worker responses.
- **Fix:** Add runtime type checks for the worker message shape. Add tests simulating various worker message shapes (missing fields, wrong types).

---

## AG6-06 — `renderFrameAndWait` JSDoc comment is factually incorrect

- **Severity:** MEDIUM
- **Confidence:** High
- **Cross-agent agreement:** 1/11 (document-specialist)
- **Files:** `src/components/MapView.tsx:999`
- **Detail:** Comment claims "camera/trail/marker updates are handled by renderFrameAndWait" but only camera is updated. Misleading documentation could cause future developers to assume the export path is correct.
- **Fix:** Update comment to accurately describe what `renderFrameAndWait` does. (Will be resolved by AG6-01 fix which adds trail/marker updates.)

---

## AG6-07 — `playbackProgress` in `exportTrack` dependency array causes unnecessary callback churn

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Cross-agent agreement:** 2/11 (code-reviewer, architect)
- **Files:** `src/lib/useExportController.ts:262`
- **Detail:** `playbackProgress` (updated at ~60fps during playback) is in the dependency array of `exportTrack` useCallback, causing the callback to be recreated on every tick. ExportPanel re-renders on every progress tick via its `onExport` prop.
- **Fix:** Read `playbackProgress` from a ref instead of closing over it.

---

## AG6-08 — `computeCameraForProgress` called twice per export frame (architectural waste)

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Cross-agent agreement:** 1/11 (perf-reviewer)
- **Files:** `src/lib/videoEncoder.ts:144-146`, `src/lib/useExportController.ts:187`
- **Detail:** Camera is computed once in the encoder, then the `setPlaybackProgress` call would trigger MapView's effect to compute it again if the `isExporting` guard were removed. The guard prevents double computation but only by breaking trail/marker updates.
- **Fix:** Resolved by AG6-01 fix — `renderFrameAndWait` will update trail/marker imperatively, so the progress effect can remain guarded during export without double camera computation.

---

## AG6-09 — `harden-static-export.mjs` bootstrap inlining regex lacks inline rationale

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Cross-agent agreement:** 2/11 (document-specialist, security-reviewer)
- **Files:** `scripts/harden-static-export.mjs:75`
- **Detail:** The regex at line 75 is complex and tightly coupled to Next.js output format, but has no comments explaining its structure, expected input, or failure modes. CF5-20 partially addressed this for CSP injection but not the bootstrap regex.
- **Fix:** Add comments explaining: (a) what the regex matches, (b) the expected Next.js output format, (c) what happens if the format changes, (d) why inlining is necessary (CSP hash computation).

---

## AG6-10 — `downloadVideo` unsafe type casts for File System Access API

- **Severity:** LOW
- **Confidence:** High
- **Cross-agent agreement:** 1/11 (code-reviewer)
- **Files:** `src/lib/videoEncoder.ts:209-215`
- **Detail:** `showSaveFilePicker` result is cast as `FileSystemWritableFileStream` via `as unknown as` chains. These bypass TypeScript type checking and will silently break if the API changes.
- **Fix:** Use proper type narrowing with the `in` operator or type predicates instead of `as unknown as` chains.

---

## AG6-11 — `renderFrameAndWait` 5-second timeout resolves silently instead of reporting stale frame

- **Severity:** LOW
- **Confidence:** Medium
- **Cross-agent agreement:** 1/11 (code-reviewer)
- **Files:** `src/components/MapView.tsx:577-579`
- **Detail:** When MapLibre never fires a render event within 5 seconds, `renderFrameAndWait` resolves successfully. No logging or metric for this condition, making it invisible in production.
- **Fix:** Log a warning when the timeout fires. Consider exposing a "stale frame" counter to the export progress UI.

---

## AG6-12 — `referenceGridData` recomputed on every track change even for style changes

- **Severity:** LOW
- **Confidence:** High
- **Cross-agent agreement:** 1/11 (perf-reviewer)
- **Files:** `src/components/MapView.tsx:469`
- **Detail:** `useMemo(() => buildReferenceGridData(track), [track])` recomputes the grid on every track reference change, even if the points are identical. O(n) for large tracks.
- **Fix:** Use a deep-comparison or hash-based key to avoid recomputation when track data hasn't changed semantically.

---

## AG6-13 — Fallback buffer doubles memory for files under 16MB

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Cross-agent agreement:** 1/11 (perf-reviewer)
- **Files:** `src/lib/parser.ts:618`
- **Detail:** `buffer.slice(0)` creates a full copy of the buffer for fallback. For a 15MB file, temporarily uses ~30MB. Significant on memory-constrained mobile devices.
- **Fix:** Consider using structured clone or transferable approach, or lower the `MAIN_THREAD_JSON_FALLBACK_SIZE` threshold.

---

## AG6-14 — Normalization warnings still confusing after partial fix

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Cross-agent agreement:** 1/11 (critic)
- **Files:** `src/components/SceneEditor.tsx:268-289`
- **Detail:** CF5-13 fix shows "will be removed" for scenes with start >= end. But "ranges adjusted" warning fires on ANY normalization change without specifics. User doesn't know what was adjusted.
- **Fix:** Show specific adjustments: "Scene X start moved from 15% to 20%" instead of a generic "ranges adjusted" message.

---

## AG6-15 — Export progress bar visual feedback during fast exports

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Cross-agent agreement:** 1/11 (designer)
- **Files:** `src/components/ExportPanel.tsx:296`
- **Detail:** Progress bar uses `transition: 'width .05s linear'` which is very fast. For very fast exports (~150 frames in 5s), the bar may "jump" rather than smoothly progress.
- **Fix:** Consider removing the transition entirely during active export (only animate the final 100% state).

---

## AG6-16 — Toast z-index overlaps modal dialogs

- **Severity:** LOW
- **Confidence:** Medium
- **Cross-agent agreement:** 1/11 (designer)
- **Files:** `src/components/Toast.tsx:69`, `src/styles/vitro-base.css:800-818`
- **Detail:** Toast has z-index 50, modal has z-index 30/40. Toast appears on top of modal dialogs.
- **Fix:** Reduce toast z-index to below modal z-index, or add `data-modal-open` attribute to adjust positioning when a modal is active.

---

## AG6-17 — README may not reflect current export capabilities

- **Severity:** LOW
- **Confidence:** Medium
- **Cross-agent agreement:** 1/11 (document-specialist)
- **Files:** `README.md`
- **Detail:** README describes the export feature but may not reflect current codec support (H.264/H.265/AV1) or resolution presets.
- **Fix:** Verify README export section matches current code and update if needed.

---

## AG6-18 — `computeCameraForProgress` missing unit tests for gap interpolation and scene transitions

- **Severity:** MEDIUM
- **Confidence:** High
- **Cross-agent agreement:** 1/11 (test-engineer)
- **Files:** `src/lib/camera.test.ts`, `src/lib/camera.ts:350-436`
- **Detail:** Current tests cover basic normalization and single-scene cases but not gap interpolation, transition blending, before-first-scene, or after-last-scene handling.
- **Fix:** Add tests for: two-scene transition, gap between scenes, before-first-scene, after-last-scene, zero-duration scene, overlapping scenes.

---

## AG6-19 — `useExportController` has too many responsibilities and dependency churn

- **Severity:** MEDIUM
- **Confidence:** High
- **Cross-agent agreement:** 1/11 (architect)
- **Files:** `src/lib/useExportController.ts`
- **Detail:** The hook manages: export state, progress tracking, video blob lifecycle, download triggering, abort control, map interaction, and playback state restoration. 13 dependency items in its main useCallback. `playbackProgress` causes callback recreation at 60fps.
- **Fix (architectural, deferred):** Split into focused hooks: `useExportLifecycle` (state management), `useVideoBlob` (blob/URL lifecycle), `useExportProgress` (progress tracking). Read mutable values from refs instead of closing over them in the main callback. This is a larger refactor — AG6-07 is the minimal fix for the immediate churn problem.

---

## Summary by severity

| Severity | Count | IDs |
|----------|-------|-----|
| HIGH     | 1     | AG6-01 |
| MEDIUM   | 5     | AG6-02, AG6-03, AG6-04, AG6-06, AG6-18 |
| LOW-MEDIUM | 7  | AG6-05, AG6-07, AG6-08, AG6-09, AG6-13, AG6-14, AG6-15 |
| LOW      | 5     | AG6-10, AG6-11, AG6-12, AG6-16, AG6-17 |
| Deferred | 1     | AG6-19 (architectural refactor) |

## Actionable this cycle

AG6-01 (HIGH), AG6-02 (MEDIUM), AG6-03 (MEDIUM), AG6-04 (MEDIUM), AG6-05 (LOW-MEDIUM), AG6-06 (MEDIUM, resolved by AG6-01), AG6-07 (LOW-MEDIUM), AG6-09 (LOW-MEDIUM), AG6-14 (LOW-MEDIUM), AG6-15 (LOW-MEDIUM)

## Deferred to future cycles

AG6-08 (resolved by AG6-01), AG6-10 (LOW, API cast safety), AG6-11 (LOW, stale frame logging), AG6-12 (LOW, grid memo), AG6-13 (LOW-MEDIUM, buffer copy), AG6-16 (LOW, toast z-index), AG6-17 (LOW, README accuracy), AG6-18 (MEDIUM, test coverage), AG6-19 (MEDIUM, architectural refactor)
