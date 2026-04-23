# Cycle 2 Test-Engineer Review (2026-04-23, orchestrator run r2)

Scope: e2e coverage in `e2e/travelback.spec.ts`, missing unit-test coverage, test reliability.

## Gate results
- `npm run test:e2e:static:ci` completed successfully (exit code 0) in this cycle.

## Observations

### R2-TE-1 (info) — E2E suite covers import / playback / export UI / i18n / theme / journey / camera motion stability
- File: `e2e/travelback.spec.ts` (1120 lines, 53 tests across desktop and mobile viewports).
- Evidence: covers GPX, KML, Google JSON (flat, records, semantic location, timeline edits, semantic segments), theme persistence, map error recovery, camera stability (scene-based + basic follow), map-style cycling, export panel dialog semantics, and accessibility-adjacent behaviors (focus trap, keyboard flow).
- **Positive finding.**

### R2-TE-2 (high/medium) — No unit tests for parser/interpolate/camera/videoEncoder hot paths
- Files: `src/lib/parser.ts`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/videoEncoder.ts`.
- Evidence: DF-C17-008 is active. Parser has branchy logic for Google's 4 JSON formats; interpolate.ts has non-trivial edge cases (empty, single-point, zero-distance, antimeridian, identical consecutive points). Camera.ts has scene-transition blending, gap interpolation, and mode-specific logic. Unit tests would catch regressions that E2E can't (e.g., input that doesn't survive round-tripping via UI).
- **Carry forward DF-C17-008.** No new action this cycle.

### R2-TE-3 (medium) — `interpolateAlongTrack` at exactly `progress=1.0` takes the "else" branch and returns the last segment's interpolation with `t=(targetDist-segStart)/segLen`; this is DF-C17-013
- File: `src/lib/interpolate.ts:95-122`.
- Evidence: at `progress=1`, `clampedProgress=1`, `targetDist = total`, binary search finds `segIdx = lastIndex-1`, then `segStart=cumulativeDistances[segIdx]`, `segEnd=cumulativeDistances[segIdx+1]`, `t = (total - segStart) / (segEnd - segStart) = 1.0`. Point is correctly interpolated as `b`. Behavior is correct; "edge case" flagged in DF-C17-013 is mathematically benign. No fix needed, but a unit test would prove this explicitly.
- **Carry forward DF-C17-013** (ties into DF-C17-008).

### R2-TE-4 (low) — E2E test for map-style cycling makes the assertion "every style renders without map-error" but does NOT assert pixel-level visual correctness
- File: `e2e/travelback.spec.ts:873-896`.
- Evidence: the test iterates all 5 styles and confirms the reference grid and track layers are attached. This is sufficient behavioral coverage for the local-only contract. Visual regression requires a pixel-diff harness (out of scope for static export).
- **Positive finding.**

### R2-TE-5 (medium) — `parseTrackFile` fallback path (worker → main thread) is NOT reached by E2E
- File: `src/lib/parser.ts:439-514`, specifically the `catch (err)` / `worker.onerror` branches.
- Evidence: to exercise the fallback, E2E would need to simulate a worker creation failure or worker crash — which requires an intercepted worker URL or a deliberately broken worker payload. DF-C17-002 already tracks this as an "exit criterion: re-open when a parser reliability pass can test both paths systematically."
- **Carry forward DF-C17-002.**

### R2-TE-6 (low) — E2E test `playback controls work after importing track` only asserts the camera tracking button appears; it does not verify progress actually advanced
- File: `e2e/travelback.spec.ts:444-457`.
- Evidence: the test waits 1500ms after Play and checks for "camera tracking" button. It does not read progress state or verify the marker moved. Could be strengthened by reading `__travelbackDebug.getCamera()` or the playback stats text.
- Fix: add a `expect.poll` that reads the playback-stats text and verifies the time progressed. Confidence: **Medium**. *Below threshold; record as deferred.*

### R2-TE-7 (low) — Fixture files under `e2e/fixtures/` are used by many tests; large JSON fixtures are not size-bounded in CI
- Files: `e2e/fixtures/google-*.json`.
- Evidence: fixtures are checked into git. If someone commits a 50 MB fixture, CI clone time and test duration would grow. No check currently enforces fixture size.
- Fix: add a pre-commit or CI guard that fails if any fixture exceeds, say, 1 MB. Confidence: **Medium**. *Below threshold; record as deferred.*

## Net assessment
- No new blocking test findings.
- 2 new below-threshold deferrals (R2-TE-6, R2-TE-7).
- Existing DF-C17-008 (unit tests), DF-C17-013, DF-C17-002 carried forward.
