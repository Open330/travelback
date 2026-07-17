# Cycle 10 debugger review

Target: `3d74754369d22ad1bb9e7970634e0f0163d5b777`
Role: debugger
Date: 2026-07-17

## Result

Two defects are confirmed from deterministic source-level reproductions; one Low responsiveness hypothesis is strongly supported by data flow but still needs browser/assistive-technology measurement. One initially plausible stale-state hypothesis was falsified.

## Inventory and debugging evidence

The debugging pass examined all 55 source/unit-test paths, all 20 E2E/fixture paths, 19 public assets, seven scripts, root manifests/configs/docs, and the Pages workflow. Generated and binary assets were inventoried and checked by provenance or audit. The 774 `.context/` and 39 `plan/` paths were catalogued and historical failures/fixes searched to avoid debugging obsolete code. Dependency and build-output trees were excluded.

`npm run check:worker` passed. `npm audit --audit-level=low --json` found zero vulnerabilities. Unit and lint executables are absent from the incomplete pre-existing primary install (exit 127), and direct package entrypoints are also incomplete; no install was performed. The confirmed reproductions below therefore use exact synchronous/ref and pure-geometry traces rather than claiming a browser run.

## Findings and reproductions

### C10-CORE-01 — Active seek snaps back on the next animation callback

- Severity: Medium
- Confidence: High
- Status: Confirmed
- Locations: `src/lib/usePlaybackController.ts:83-88`, `src/lib/usePlaybackController.ts:98-155`

Deterministic reproduction:

1. Begin playback with `startProgressRef = 0.20`, `startTimestampRef = t0`, and `isPlayingRef = true`.
2. Call `seekTo(0.80)`. State and `progressRef` become 0.80, but both start refs remain unchanged.
3. Invoke the already scheduled `animate(t0 + 100ms)` with a 30-second duration and speed 1.
4. Line 135 computes about `0.2033`, and line 143 publishes it, overwriting 0.80.

The first-frame branch has the same failure mode: a seek after play but before the first callback is replaced by `startProgressRef.current`. No unit test targets the hook, and the generic playback E2E at `e2e/travelback.spec.ts:1058-1071` does not inspect progress.

Root fix: rebase active timing state inside seek (including the awaiting-first-frame and endpoint cases) and add fake-clock/fake-RAF regressions.

### C10-CORE-02 — Segmented valid elevations generate one false connected subpath

- Severity: Medium
- Confidence: High
- Status: Confirmed
- Locations: `src/lib/interpolate.ts:31-41`, `src/components/ElevationProfile.tsx:23-98`, `src/components/ElevationProfile.test.ts:4-56`

Deterministic reproduction:

1. Use two disconnected two-point segments with elevations `[10, 20]` and `[100, 110]`; the second begins at index 2.
2. Segment-aware cumulative distance is `[0, 10, 10, 20]` because the cross-gap distance is correctly zeroed.
3. Call the current `buildElevationGeometry([10, 20, 100, 110], [0, 10, 10, 20])`.
4. No elevation is missing, so lines 48-66 create one run. Lines 71-80 emit one line/area whose middle points share x=50 and are connected vertically.

That geometry asserts an elevation jump at zero traveled distance rather than a break. Existing tests cover missing-elevation runs but provide no segment-boundary input; the existing segmented E2E fixture contains no elevation values.

Root fix: split geometry runs on `segmentStartIndices` and assert two `M` subpaths/areas in a focused unit test and browser fixture.

### C10-CORE-03 — Oversized XML name can stall title/live-status processing

- Severity: Low
- Confidence: Medium
- Status: Likely; manual validation required
- Locations: `src/lib/parse-utils.ts:18-27`, `src/lib/parser.ts:214-230`, `src/app/page.tsx:636-640`, `src/components/TrackWorkspace.tsx:126-140`

Manual validation recipe: construct a valid GPX below 4 MiB with two points and a name occupying most remaining bytes; import it while recording main-thread and accessibility-tree activity. Source tracing predicts that the full string reaches two title nodes and the polite live region. The data flow is confirmed, but the duration and severity of browser/AT unresponsiveness were not measured in this environment, so it is not labeled confirmed.

Root fix: cap and normalize parsed display names, then repeat the profile and assert bounded DOM/live-region text.

## Falsified hypothesis

The proposed failure sequence "trim confirmation open → descendant error → Try Again → permanently stale modal" is not valid on current HEAD. Although `handleErrorReset` does not directly clear `pendingTrimRange`, it sets scenes to `[]`, and the effect at `src/app/page.tsx:486-493` clears the range and revises the selector. A transient post-paint render was not enough to justify a defect report.

## Final missed-issue sweep

The final debugger pass replayed abort/timeout races, export reset and URL cleanup, map teardown, sample-load replacement, scene/timeline drag termination, visibility-driven animation, parser budget boundaries, static-server errors, modal focus restoration, and known historical regressions. No fourth reproducible causal chain remained after checking cleanup code and existing tests.
