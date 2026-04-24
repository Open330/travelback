# Critic Review — Review-Plan-Fix Cycle 1 Prompt 1 (2026-04-24)

**Reviewer:** critic specialist
**Scope:** Whole repository plus current plan/review surface in `plan/`, `.context/plans/`, `.context/reviews/`, `.context/reports/`, and `.omx/plans/`.
**Method:** Inventory first, then source/config/test review with cross-file interaction checks. Focused on correctness, UX/accessibility, maintainability, and release-readiness risks not already captured by the latest aggregate reviews.

## Inventory of Review-Relevant Files

### Application surface
- `src/app/page.tsx` — root client state orchestration, track/session lifecycle, theme/style/unit persistence, export overlay.
- `src/app/layout.tsx`, `src/app/globals.css`, `src/styles/vitro-base.css` — metadata, CSP/bootstrap, global visual system.
- `src/components/` — UI/control surface: `MapView`, `TimelineSelector`, `Controls`, `TrackWorkspace`, `FileUpload`, `ExportPanel`, `SceneEditor`, `JourneyCreator`, modal/toast/toolbars/help.
- `src/lib/` — core logic: parser/worker bridge, interpolation, camera, playback controller, export controller, video encoder, i18n/env.
- `src/types.ts` — shared map style, camera, scene, and export types.
- `public/workers/trackParser.worker.js`, `public/map-styles/*.json`, fixtures/assets — worker parser and static runtime assets.

### Verification/release surface
- `e2e/travelback.spec.ts`, `e2e/fixtures/*` — Playwright regression suite.
- `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `playwright*.config.ts`, `postcss.config.mjs` — build/test/static export configuration.
- `scripts/harden-static-export.mjs`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`, `scripts/fetch-map-styles.mjs` — static export hardening and serving.

### Recent plan/review surface
- Current untracked cycle surface: `plan/cycle2-c2-plan.md`, `.context/reviews/cycle-c2-aggregate-2026-04-24.md`, `.context/reviews/cycle-c2-code-reviewer-2026-04-24.md`.
- Recent converged reviews: `.context/reviews/cycle-r10-*.md`, `.context/reviews/cycle-r9-*.md`, prior role reviews.
- Structured remediation artifacts: `.omx/plans/prd-review-remediation.md`, `.omx/plans/test-spec-review-remediation.md`.

## Verification Performed

- Read source/config/test files across `src/`, `e2e/`, `scripts/`, `public/workers/`, `plan/`, `.context/reviews/`, and `.omx/plans/`.
- Cross-checked current cycle claim of “0 new actionable findings” against actual component interactions.
- Ran `npm run lint` — passed.
- Ran `npm run typecheck` — passed.

## Findings

### CRITIC-C1-001 — Timeline selector receives distances for the filtered track while rendering the full track

- **Severity:** HIGH
- **Confidence:** High
- **Files/lines:**
  - `src/app/page.tsx:97-101` computes `cumulativeDistances` from `track`, which becomes the trimmed/filtered track after range selection.
  - `src/components/TrackWorkspace.tsx:125-132` renders `TimelineSelector` with `track={fullTrack}` but passes that same `cumulativeDistances` prop.
  - `src/components/TimelineSelector.tsx:99-140` assumes `points` and `cumulDist` describe the same track when building buckets and resolving ratios to point indexes.
- **Failure scenario:**
  1. Load a full trip with unevenly spaced points.
  2. Drag the timeline to trim to a short segment. `handleRangeChange` in `page.tsx:185-206` replaces `track` with the sliced subset.
  3. React recomputes `cumulativeDistances` from the sliced subset (`page.tsx:97-101`) but `TimelineSelector` still renders `fullTrack` (`TrackWorkspace.tsx:127-130`).
  4. The next render's histogram/date/index math is now based on mismatched arrays: full-track points with filtered-track distances. `ratioToIndex` can only binary-search across the shorter distance array except at ratio `1`, so subsequent trims can select the wrong part of the original trip and display misleading counts/date labels.
- **Why recent reviews missed it:** The existing e2e guard at `e2e/travelback.spec.ts:651-667` checks a single trim does not collapse to one point; it does not perform a second trim or verify distance/index consistency after the parent track becomes filtered.
- **Concrete fix:**
  - In `page.tsx`, compute two distance arrays:
    - `trackCumulativeDistances` from `track` for `MapView`, `Controls`, `ElevationProfile`, and export.
    - `fullTrackCumulativeDistances` from `fullTrack` for `TimelineSelector`.
  - Thread `fullTrackCumulativeDistances` through `TrackWorkspace` separately, or let `TimelineSelector` compute distances from its own `track` prop.
  - Add an e2e regression that trims once, then drags/keyboard-adjusts again and asserts the selected count/date range changes according to the original full track, not the first slice.

### CRITIC-C1-002 — Keyboard timeline adjustments update only the local visual slider, not the actual filtered track

- **Severity:** HIGH
- **Confidence:** High
- **Files/lines:**
  - `src/components/TimelineSelector.tsx:142-148` intentionally calls `onRangeChange` only on points-length changes, not on ratio changes.
  - `src/components/TimelineSelector.tsx:386-405` updates `startRatio` for keyboard input without calling `onRangeChange`.
  - `src/components/TimelineSelector.tsx:442-460` updates `endRatio` for keyboard input without calling `onRangeChange`.
  - Mouse/touch drag does call `onRangeChange` in `applyDrag` (`TimelineSelector.tsx:221-226`) and `endDrag` (`TimelineSelector.tsx:255-258`), so the bug is keyboard-specific.
- **Failure scenario:**
  1. A keyboard or screen-reader user focuses the start/end timeline slider.
  2. They press Arrow/Home/End keys. The handle moves and `aria-valuenow` changes because `startRatio`/`endRatio` state changes.
  3. The parent `track` remains unchanged because `onRangeChange` is never called for those state changes.
  4. Controls, map, elevation profile, and export continue using the old track while the timeline UI says a new range is selected.
- **Concrete fix:**
  - Create a shared `commitRatios(nextStart, nextEnd)` helper that clamps, sets ratios, resolves indexes with the same point/distance basis, and calls `onRangeChangeRef.current(startIdx, endIdx)`.
  - Use it from pointer drag, keyboard handlers, and reset.
  - Add an e2e test that focuses `timeline-start-handle`, presses `ArrowRight`/`End`, and asserts the visible `track-title` count changes from `N / N` to a trimmed count.

### CRITIC-C1-003 — Changing playback speed or duration while playing causes an immediate progress jump

- **Severity:** MEDIUM
- **Confidence:** High
- **Files/lines:**
  - `src/lib/usePlaybackController.ts:34-39` updates `speedRef` and `durationRef` when state changes.
  - `src/lib/usePlaybackController.ts:94-100` calculates progress from the original `startTimestampRef`/`startProgressRef` using the current speed/duration refs.
  - `src/components/Controls.tsx:98-120` allows speed and duration changes while playback is active.
- **Failure scenario:**
  1. Start playback at `1x`, duration `30s`; after 10 seconds, progress is about `0.33`.
  2. Change speed to `2x` while still playing.
  3. The next animation frame computes `startProgress + elapsedSinceOriginalStart * 2 / 30`, so progress jumps toward `0.66` instead of continuing smoothly from `0.33` at the new rate.
  4. Changing duration has the same problem in reverse: switching `30s` to `60s` mid-play can make progress snap backward because all previous elapsed time is reinterpreted under the new duration.
- **Concrete fix:**
  - Rebase the playback accumulator whenever speed or duration changes during active playback: set `startTimestampRef.current = performance.now()` and `startProgressRef.current = progressRef.current` before applying the new rate/duration.
  - Prefer wrapping `setSpeed`/`setDuration` in controller methods (`changeSpeed`, `changeDuration`) instead of exposing raw setters.
  - Add a focused test for “progress is monotonic and has no large discontinuity when speed/duration changes during playback.” If unit test infra is unavailable, add a Playwright debug-state test using `__travelbackDebug` or UI stats.

### CRITIC-C1-004 — Cancelling the native save picker after encoding leaks the generated Blob URL

- **Severity:** MEDIUM
- **Confidence:** Medium-High
- **Files/lines:**
  - `src/lib/useExportController.ts:151-159` creates `videoUrl` before `downloadVideo`, then throws on `{ saved: false }` before storing that URL in state/ref.
  - `src/lib/useExportController.ts:165-174` handles the abort/cancel path but does not revoke the just-created URL.
  - Existing revocation paths at `useExportController.ts:54-70` only know about `exportedVideoUrlRef.current` or React state, which are not set yet on picker cancel.
- **Failure scenario:**
  1. Browser supports `showSaveFilePicker`.
  2. User renders a large video, the Blob URL is created at `useExportController.ts:155`.
  3. User cancels the native save picker; `downloadVideo` returns `{ saved: false }`, causing an AbortError at `useExportController.ts:157-159`.
  4. The catch path reports cancellation but never revokes `videoUrl`, retaining a potentially very large encoded video Blob until page unload. Repeating this can grow memory significantly.
- **Concrete fix:**
  - Track the local URL in the try block and revoke it in the cancel/error path if it was not adopted into state. Example pattern: `let pendingVideoUrl: string | null = null`; assign after `createObjectURL`; after successful save, transfer ownership to state and null it; in `catch`/`finally`, `if (pendingVideoUrl) URL.revokeObjectURL(pendingVideoUrl)`.
  - Add a small mocked test around `downloadVideo` returning `saved: false` or an integration test that stubs `window.showSaveFilePicker` to throw `AbortError` and verifies no preview URL remains.

## Plan/Review Surface Assessment

- The current `plan/cycle2-c2-plan.md` and `.context/reviews/cycle-c2-aggregate-2026-04-24.md` state “0 new actionable findings.” That conclusion is not supported after cross-file review: CRITIC-C1-001 and CRITIC-C1-002 are active UX/correctness bugs around timeline trimming, and CRITIC-C1-003 is an active playback correctness bug.
- The latest review surface has many true convergence signals (lint/typecheck pass, broad e2e coverage, extensive deferred list), but it has a blind spot around **second-order interactions after state has changed once**: second timeline trim, keyboard-only timeline trim, mid-playback control changes, and post-encode native picker cancellation.
- Existing tests are strong for first-use flows but should add interaction-chain regressions: “do operation A, then operation B while state is no longer initial.”

## Recommended Fix Order

1. **Fix timeline distance ownership (CRITIC-C1-001)** — highest risk because it can make subsequent trims select/export the wrong route segment.
2. **Fix keyboard timeline commit path (CRITIC-C1-002)** — accessibility and correctness; likely small change once a shared commit helper exists.
3. **Fix playback accumulator rebasing (CRITIC-C1-003)** — improves visible playback continuity and prevents surprising jumps.
4. **Fix pending Blob URL revocation (CRITIC-C1-004)** — contained memory-release hardening.

## Suggested Regression Tests

- Timeline second-trim test: upload a fixture with non-uniform point spacing, perform one trim, then perform a second trim and assert count/date/range correspond to the full original track.
- Timeline keyboard test: focus start/end handles, press arrow keys, assert parent track count and map/elevation stats update.
- Playback continuity test: start playback, wait until progress advances, change speed and duration, assert no abrupt jump beyond a small threshold.
- Export picker cancel test: stub File System Access API cancel after encoding path and assert export returns to idle without retaining preview state or unreclaimed pending URL.
