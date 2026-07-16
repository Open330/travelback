# Test Engineer — Deep Review (2026-07-16)

## Current test status

The Vitest suite passes: 6 files and 219 tests. That result does not describe release status: npm run smoke:static fails before static E2E, and a direct static Playwright run reproduced multiple failures. Coverage was mapped against every confirmed correctness/race finding below.

## Findings

### TE-01 — CI never runs the 219 unit tests

Severity: High | Confidence: High | Status: Confirmed

Files: package.json:10-18, .github/workflows/deploy-pages.yml:26-32

The test script exists, but the build job runs lint, typecheck, audit, build, and static E2E without npm test. Parser, interpolation, camera, and encoder unit regressions can merge and deploy if browser cases do not happen to exercise them.

Suggested fix: add npm test before build/static E2E and preserve the command’s non-zero exit status.

### TE-02 — The smoke test asserts obsolete file layout instead of behavior

Severity: High | Confidence: High | Status: Reproduced

Files: scripts/smoke-static.mjs:223-259, src/lib/parse-utils.ts:6-8, src/lib/googleJsonParser.ts:138-158

The test assumes MAX_TRACK_POINTS and parseSemanticPoint live in parser.ts. Both were extracted, so the test fails even though the worker constant currently matches. This prevents every downstream static test from running in CI and will reveal a second stale assertion after the first is repaired.

Suggested fix: bundle shared worker code or import/read the actual owning modules. Add behavioral parity fixtures for each Google JSON shape and error code instead of source-string presence checks.

### TE-03 — Map tests assert layer presence, not evolving source data

Severity: High | Confidence: High | Status: Confirmed gap

Files: e2e/travelback.spec.ts:840-866, src/components/MapView.tsx:568-578 and 1069-1080

The existing browser check verifies route/trail layers and sources exist, so it passes while the trail is frozen between vertices. There are no assertions for active endpoint coordinates, segment transitions, singleton visit segments, or progress-dependent frame content.

Suggested fix: expose read-only debug source data in test mode and assert two progress samples inside one segment, a boundary crossing, and a mixed singleton/multi-point route. Exercise both playback and renderFrameAndWait.

### TE-04 — The real export path is optional and validates only container success

Severity: High | Confidence: High | Status: Confirmed gap

Files: e2e/travelback.spec.ts:1299-1333, src/lib/test-stub.ts

The normal E2E export uses a tiny stub. The WebCodecs/Mediabunny test returns immediately unless TRAVELBACK_REAL_EXPORT=1, and even then it checks only the ready state and download filename. Stale map frames, frozen trails, codec cleanup, and MP4 visual content are untested.

Suggested fix: run a short real export on a codec-capable CI lane, inspect MP4 metadata/frame count, and compare a few decoded frames or deterministic source snapshots. Keep the stub for fast UI coverage but do not treat it as encoder coverage.

### TE-05 — Trim tests do not model accept/cancel/local-seek state

Severity: Medium | Confidence: High | Status: Confirmed gap and observed failure

Files: e2e/travelback.spec.ts:720-761 and 1089-1110, src/components/TimelineSelector.tsx:274-329, src/app/page.tsx:319-355

The scene-trim test drags and expects scenes to clear immediately, although the application now creates a confirmation state. It does not click confirm or cancel. No test verifies that cancel restores handles, or that clicking the midpoint of a 25–50% selection seeks to 50% of the active track. A direct static run also failed the three-point trim count assertion at e2e line 735.

Suggested fix: split into confirm, cancel, and selected-range seek scenarios; assert handle ratios, full/active counts, active point array, playback progress, and scene state together.

### TE-06 — Async cancellation and stale-completion races have no deterministic tests

Severity: Medium | Confidence: High | Status: Confirmed gap

Files: src/components/FileUpload.tsx:53-95, src/lib/parser.ts:239-335, src/lib/videoEncoder.ts:115-173

There is no deferred-promise test for a file parse resolving after FileUpload unmounts/new-journey start. Encoder tests do not assert Output.cancel after abort, render failure, idle failure, or CanvasSource rejection.

Suggested fix: use controllable promises/fake workers and mock Mediabunny Output state. Assert stale parse callbacks are ignored, worker cleanup occurs once, successful output finalizes once, and every failed/aborted output cancels once.

### TE-07 — Destructive editor transitions lack source/state regression coverage

Severity: Medium | Confidence: High | Status: Confirmed gap

Files: src/components/JourneyCreator.tsx:197-207 and 481-493, src/components/SceneEditor.tsx:221-264 and 368-378

Tests do not inspect the journey line source after delete/undo/clear, do not cover keyboard range normalization, and do not protect newer scene edits from delete-undo restoration.

Suggested fix: add component tests for two-to-one/zero waypoint transitions, delete-edit-undo, and keyboard-created overlap. Assert both UI state and data sent to MapView/export.

### TE-08 — Existing desktop settings tests are correctly detecting a product regression

Severity: Medium | Confidence: High | Status: Reproduced

Files: e2e/travelback.spec.ts:274-300 and 537-590, src/components/GlobalToolbar.tsx:23-26, src/components/TrackToolbar.tsx:162-280

Japanese, Spanish, zoom-toolbar layout, and loaded-toolbar layout cases all fail after route load because the global toolbar is hidden and the replacement settings are mobile-only. Retries fail at the same visibility/select action, so these should not be weakened or removed.

Suggested fix: restore accessible desktop settings, then keep all four tests. Add a direct assertion that exactly one visible Language combobox exists at desktop and mobile viewports.

## Recommended suite order

1. lint, typecheck, and unit tests
2. dependency audit
3. production build and static smoke
4. static E2E
5. short real-export lane

## Summary

8 findings: 4 High and 4 Medium. The unit foundation is useful, but CI omission, a brittle smoke gate, missing visual/export assertions, and reproduced static E2E failures leave critical paths unprotected.
