# Cycle 12 Test Engineer Review — 2026-04-27

Reviewer: test-engineer
Scope: Test coverage gaps, flaky tests, TDD opportunities

## Current test status

- **Unit tests (vitest):** 112 passing across 5 test files. All green.
- **E2E tests (playwright):** Config exists but no tests are regularly run in the review cycle.
- **Component tests:** None. No React Testing Library or similar component test infrastructure.

## Findings

### C12-TE-01 — No test for `downloadVideo` user activation behavior

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:204-245`, `src/lib/videoEncoder.test.ts`
- **Detail:** The `downloadVideo` function has branching logic based on `navigator.userActivation.isActive` and `showSaveFilePicker` availability. Neither branch is tested. The existing `videoEncoder.test.ts` only covers `ExportError`, `estimateEncodedBytes`, and `estimateExportMemoryBytes`. The download function's fallback behavior is critical for export UX and should have test coverage.
- **Suggested fix:** Add unit tests for `downloadVideo` using mocked `window.showSaveFilePicker` and `navigator.userActivation`. Test the fallback `<a>` download path as well.

### C12-TE-02 — `buildFilteredTrack` degenerate-case fallback is untested

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:40-55`
- **Detail:** The `buildFilteredTrack` function has a fallback that returns the full track when the slice is < 2 points. This path is never exercised by tests or by current callers (which pre-check). It should be tested to verify the fallback behavior is intentional and correct, or the fallback should be removed in favor of throwing.
- **Suggested fix:** Add a test for `buildFilteredTrack` with a single-point range to verify the current behavior.

## Test coverage summary

| Module | Test file | Coverage assessment |
|--------|-----------|-------------------|
| parser.ts | parser.test.ts | Good — covers all 4 Google formats, GPX, KML, edge cases |
| videoEncoder.ts | videoEncoder.test.ts | Minimal — only ExportError and estimation; no download/codec tests |
| camera.ts | camera.test.ts | Good — covers interpolation, bearing, scenes |
| interpolate.ts | interpolate.test.ts | Good — covers distance, bearing, interpolation |
| env.ts | env.test.ts | Good — covers basePath logic |
| Components | (none) | No component tests |
