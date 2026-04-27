# Test Engineer — Cycle 5 (2026-04-27)

Repository: `/Users/hletrd/flash-shared/Travelback`
Reviewer: test-engineer

## Findings

### TE5-01 — No unit tests for `computeCameraForProgress` scene transition blending
- **Severity:** MEDIUM-HIGH
- **Confidence:** High
- **File:** `src/lib/camera.ts:350-436`, `src/lib/camera.test.ts`
- **Description:** The existing camera tests cover `normalizeScenes` and `computeCameraForScene` but do NOT test `computeCameraForProgress`, which handles scene transitions, gap interpolation, and boundary blending. This is the most complex function in the camera module — it has 5 distinct code paths (in-scene, gap-between, before-first, after-last, fallback) plus transition blending logic. None of these paths have unit test coverage.
- **Failure scenario:** A change to transition blending logic (e.g., modifying `effectiveHalfTrans` calculation) breaks the smooth camera transitions between scenes. Since there are no tests, this regression is only caught by manual E2E review.
- **Suggested fix:** Add unit tests for `computeCameraForProgress` covering: (1) single scene playback, (2) two-scene transition at boundary, (3) gap between scenes, (4) progress before first scene, (5) progress after last scene, (6) degenerate zero-duration scene, (7) overlapping scenes after normalization.

---

### TE5-02 — No unit tests for `interpolateAlongTrack` edge cases
- **Severity:** MEDIUM
- **Confidence:** High
- **File:** `src/lib/interpolate.ts:86-171`, `src/lib/interpolate.test.ts`
- **Description:** The existing `interpolate.test.ts` covers basic interpolation but does not test: (1) tracks that cross the antimeridian, (2) tracks with segment breaks, (3) progress=0 and progress=1 boundary values, (4) tracks where all points are identical (bearing fallback path at line 154-161), (5) tracks where `cumulativeDistances` total is 0 (all segments have 0 distance).
- **Failure scenario:** Antimeridian-crossing track produces interpolated points with wildly incorrect longitude values. No test catches this.
- **Suggested fix:** Add test cases for each of the above edge cases.

---

### TE5-03 — Export panel codec probing is not tested
- **Severity:** MEDIUM
- **Confidence:** High
- **File:** `src/lib/videoEncoder.ts:248-258`, `src/components/ExportPanel.tsx:138-161`
- **Description:** `isCodecSupported` is called by `ExportPanel` to determine which codecs to offer. The function dynamically imports mediabunny and calls `canEncode`. This is not unit-tested — if the mediabunny API changes (e.g., `canEncode` is renamed or its return type changes), the export panel would silently show all codecs as "unsupported" or "checking..." forever.
- **Failure scenario:** mediabunny v2 renames `canEncode` to `isEncodingSupported`. `isCodecSupported` catches the error and returns `false`. All codecs show as "unsupported" in the export panel. User cannot export.
- **Suggested fix:** Add a unit test that mocks the mediabunny import and verifies `isCodecSupported` returns the correct boolean for each codec. Test the error-handling path too.

---

### TE5-04 — `usePlaybackController` animation has no test for timing accuracy
- **Severity:** LOW-MEDIUM
- **Confidence:** Medium
- **File:** `src/lib/usePlaybackController.ts:104-154`
- **Description:** The playback controller uses `requestAnimationFrame` with an accumulator-based progress model. This is untested — there are no unit tests verifying that the animation produces correct progress values at given time intervals. The fallback timer (250ms timeout) is also untested. If the rAF callback is throttled (background tab), the fallback timer should maintain reasonable playback, but this is not verified.
- **Failure scenario:** A change to the animation timing logic causes the playback to run at 2x speed in background tabs. No test catches this because the timing logic is untested.
- **Suggested fix:** Add unit tests with mocked `performance.now()` and `requestAnimationFrame` to verify progress values at known time intervals. Test the fallback timer path.

---

## Summary

| ID | Severity | Confidence | File |
|----|----------|------------|------|
| TE5-01 | MEDIUM-HIGH | High | camera.ts |
| TE5-02 | MEDIUM | High | interpolate.ts |
| TE5-03 | MEDIUM | High | videoEncoder.ts / ExportPanel.tsx |
| TE5-04 | LOW-MEDIUM | Medium | usePlaybackController.ts |
