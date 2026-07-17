# Cycle 10 skeptical critic review

Target: `3d74754369d22ad1bb9e7970634e0f0163d5b777`
Role: critic
Date: 2026-07-17

## Result

The final adversarial pass retained three distinct issues: two Medium confirmed invariant violations and one Low likely/manual-validation resource-bound weakness. It rejected one initially plausible failure-recovery hypothesis after finding contradictory cleanup code.

## Inventory and method

All 55 source/test paths, the full 20-path E2E/fixture surface, 19 public assets, seven scripts, authored root configs/manifests/docs, and the Pages workflow were examined. Generated/binary files were inventoried and checked by provenance or audit as appropriate. The 774 `.context/` and 39 `plan/` paths were catalogued; current guidance and historical reviews/plans were read or searched to avoid treating old or fixed issues as new. Dependency/build trees were excluded.

The critic challenged comments, tests, and apparent safeguards with counterexamples rather than accepting intent. `npm run check:worker` passed and the low-threshold dependency audit found zero vulnerabilities. Unit/lint execution was unavailable because the existing primary install lacks executable package entries; no install was introduced.

## Findings

### C10-CORE-01 — "Seeking while playing is supported" is contradicted by the accumulator

- Severity: Medium
- Confidence: High
- Status: Confirmed
- Locations: `src/lib/usePlaybackController.ts:83-92`, `src/lib/usePlaybackController.ts:98-155`, `e2e/travelback.spec.ts:1058-1071`

The UI exposes multiple seek actions without pausing, and a historical comment treated that as intended behavior. The implementation only changes `progressRef`; the active RAF still owns a stale `startProgressRef` and overwrites the user's action. The generic playback E2E test starts playback but never asserts progress or seeks while active, so it can pass while the core interaction is broken.

Root fix: rebase the active accumulator on seek and add deterministic pre-first-frame and mid-playback regressions.

### C10-CORE-02 — Segment-aware distance does not imply a segment-aware elevation visualization

- Severity: Medium
- Confidence: High
- Status: Confirmed
- Locations: `src/lib/interpolate.ts:31-41`, `src/components/ElevationProfile.tsx:23-98`, `src/components/ElevationProfile.test.ts:4-56`

The distance helper correctly suppresses the gap, which can make the feature look segment-safe on inspection. The chart builder is not given the boundary, however, and its "contiguous run" means only contiguous non-null elevation samples. Valid elevation values on either side of a teleport are consequently joined. The tests challenge missing values but never challenge disconnected valid values.

Root fix: make segment boundaries a first-class geometry input and assert separate SVG subpaths at each boundary.

### C10-CORE-03 — A file-size limit is not a bound on downstream display work

- Severity: Low
- Confidence: Medium
- Status: Likely; manual validation required
- Locations: `src/lib/parse-utils.ts:18-27`, `src/lib/parser.ts:214-230`, `src/app/page.tsx:636-640`, `src/components/TrackWorkspace.tsx:126-140`

The parser has impressive global XML limits, but none constrain the user-visible name field. A nearly 4 MiB name remains valid and is multiplied into responsive title nodes plus a live announcement. React escaping answers the XSS question, not the responsiveness or accessibility-tree question.

Root fix: enforce a documented canonical display-name policy before the value enters application state, and measure the edge case.

## Disproved and challenged assumptions

- Rejected: "Error reset leaves the trim confirmation permanently stuck." `handleErrorReset` empties scenes and the effect at `src/app/page.tsx:486-493` then clears the pending range. Reporting the earlier hypothesis would ignore contradictory evidence.
- Challenged but not reported: catch blocks, worker abort races, stale export URLs, map teardown, scene drag cleanup, timeline touch listeners, static path normalization, and XML entity stripping all had corresponding ownership/cleanup or insufficient impact after end-to-end tracing.
- Existing deferred CI permissions, CI unit-test omission, license, frame-header, and measured performance debts were not recast as new findings.

## Final missed-issue sweep

The last pass deliberately revisited tests with weak assertions, comments that assert safety, duplicated mobile/desktop render paths, state/ref dual ownership, failure cleanup, segment semantics, parser outputs, and known historical blind spots. No fourth issue remained after demanding an exact failure scenario, current-HEAD evidence, and a root-level fix.
