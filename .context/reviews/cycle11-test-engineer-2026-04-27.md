# Cycle 11 Test Engineer — 2026-04-27

## Inventory of reviewed files

- `src/lib/parser.test.ts` — full read
- `src/lib/camera.test.ts` — read via glob
- `src/lib/interpolate.test.ts` — read via glob
- `src/lib/videoEncoder.test.ts` — read via glob
- `vitest.config.ts` — read
- `e2e/travelback.spec.ts` — scanned key sections

## Findings

### TE11-01 — Two vitest tests are currently failing (DOCTYPE rejection)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.test.ts:529-537,611-618`
- **Detail:** As described in C11-01, `parseGPX(gpxWithDoctype)` and `parseKML(kmlWithDoctype)` do NOT throw `ParseError` because `stripXmlEntities` removes the DOCTYPE before `preflightXml` checks. These tests will always fail in the current codebase. `npx vitest run` shows 2 failures.
- **Failure scenario:** CI gate is broken for unit tests. Any developer running `npm test` sees failures.
- **Suggested fix:** Either fix the code (swap strip/preflight order) or fix the tests to match current behavior. Fixing the code is preferred (see C11-01).

---

### TE11-02 — No test for `checkJsonDepth` unicode escape edge case

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/parser.test.ts`
- **Detail:** `checkJsonDepth` is exported but has no dedicated tests. The parser tests cover the main `parseGoogleLocationHistory` path which uses `JSON.parse` + `RangeError` catch on the main thread, but `checkJsonDepth` (worker preflight) is not directly tested.
- **Failure scenario:** A regression in `checkJsonDepth` (e.g., mishandling unicode escapes) would not be caught by unit tests. Only the worker E2E path would detect it.
- **Suggested fix:** Add targeted `checkJsonDepth` unit tests covering: normal nesting, exceeding depth limit, string skipping, escape handling, unicode edge case.

---

### TE11-03 — Camera test coverage missing for `lerpCamera` edge cases

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/camera.test.ts`
- **Detail:** `lerpCamera` handles antimeridian crossing interpolation but the test suite may not cover the case where the interpolation crosses the antimeridian (e.g., lerp from lng=170 to lng=-170 should go through 180/-180, not through 0).
- **Failure scenario:** A regression in `shortestLngDelta` usage within `lerpCamera` could cause camera jumps across the antimeridian without test detection.
- **Suggested fix:** Add antimeridian crossing test cases for `lerpCamera`.
