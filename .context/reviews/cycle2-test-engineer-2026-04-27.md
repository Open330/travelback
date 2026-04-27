# Test Engineer — Cycle 2 (2026-04-27)

## Re-evaluation of carried findings

| Prior | Status | Notes |
|-------|--------|-------|
| N02 (no unit test layer) | UNCHANGED | No Vitest/Jest config, no `src/lib/__tests__/` directory. Parser, interpolation, camera, and export pure functions remain untested by unit tests. |
| N03 (export stub only) | UNCHANGED | E2E export test uses `travelback-export-test-stub` localStorage flag. Real encoder/capture pipeline is never exercised in CI. |
| N04 (duplicated parser) | UNCHANGED | No parity tests between worker and main-thread Google JSON parsers. |

## New findings

### TE2-01 — No test coverage for `isExporting` guard in MapView

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:1000`
- **Detail:** The `isExporting` guard is a critical correctness path — if it fails, the export pipeline and normal playback can interfere. There's no test that verifies:
  1. Progress updates are suppressed when `isExporting` is `true`
  2. Trail/marker state is correctly restored when `isExporting` transitions from `true` to `false`
  3. The guard doesn't cause stale trail geometry after export completion
- **Suggested fix:** Add an E2E or integration test that starts an export, verifies the progress effect is suppressed, then verifies trail/marker state after export completion.

### TE2-02 — No test for `renderFrameAndWait` identical-state fast path

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:523-545`
- **Detail:** The identical-state fast path (resolve immediately without waiting for render event) is important for export performance and deadlock prevention. No test verifies that:
  1. Identical camera states resolve immediately
  2. Near-identical states (within rounding) also resolve correctly
  3. The 5-second timeout fires when MapLibre doesn't render
- **Suggested fix:** Add a unit test for the rounding/comparison logic. E2E test for timeout behavior would be expensive but valuable.

### TE2-03 — No test for `normalizeBasePath` `..` rejection

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/env.ts:5`
- **Detail:** The `..` rejection in `normalizeBasePath` is a defense-in-depth check. No unit test verifies that paths containing `..` are rejected.
- **Suggested fix:** Add unit test: `expect(normalizeBasePath('/foo/..')).toBe('')`, `expect(normalizeBasePath('/foo/../bar')).toBe('')`, etc.

### TE2-04 — No test for `resetSize` style-first cleanup

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:613-630`
- **Detail:** The `resetSize` method now clears container styles before calling `map.resize()`. This is a safety-critical path for export cleanup. No test verifies that container dimensions are restored even if `map.resize()` throws.
- **Suggested fix:** Add an integration test that simulates a destroyed map during export and verifies container restoration.

## Test coverage gaps (carried forward)

- Parser pure functions: 0 unit tests (N02)
- Interpolation functions: 0 unit tests (N02)
- Camera/scene functions: 0 unit tests (N02)
- Export pipeline: stub-only E2E (N03)
- Worker/main-thread parity: 0 tests (N04)

## Summary

- Carried forward: 3 HIGH findings (N02, N03, N04) — all unchanged
- New findings: 4 (1 MEDIUM, 3 LOW)
