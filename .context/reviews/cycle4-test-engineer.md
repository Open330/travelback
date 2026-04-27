# Cycle 4 Test Engineer Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Methodology
Reviewed test coverage, test quality, and TDD opportunities. Analyzed 5 existing test files (91 tests) and E2E test suite.

## Findings

### C4-TE01 — No unit tests for `useExportController` hook
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts`
- **Detail:** The export controller is the most complex hook in the codebase. It manages export state, abort handling, map resize, idle waiting, blob URL cleanup, and error recovery. No unit tests exist. The E2E test stub bypasses the real encoder. The export path is only verified via the stub, which returns a 26-byte placeholder.
- **Suggested fix:** Add unit tests for the hook's state machine transitions: idle->exporting->done, idle->exporting->idle (cancel), idle->exporting->idle (error). Mock the map handle and video encoder.

### C4-TE02 — No unit tests for `usePlaybackController` hook
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/usePlaybackController.ts`
- **Detail:** The playback controller manages animation timing, progress tracking, and keyboard shortcuts. No unit tests exist. The `animate` function uses `requestAnimationFrame` and `performance.now()`, which require browser-like environment. Vitest with `jsdom` can handle this with timer mocking.
- **Suggested fix:** Add tests for play/pause state transitions, seek behavior, and speed changes.

### C4-TE03 — No unit tests for `MapView` component
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx`
- **Detail:** MapView is the largest component (1200 lines) with complex camera logic, trail updates, and the `isExporting` guard. No unit tests exist. Testing requires mocking MapLibre GL JS, which is challenging but possible with a minimal mock.
- **Suggested fix:** Already noted as C3-13 (deferred). Add tests for the `isExporting` guard and trail update logic.

### C4-TE04 — Parser tests don't cover GPX/KML XML paths
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.test.ts`, `src/lib/parser.ts`
- **Detail:** The parser tests only cover `parseGoogleLocationHistory` and `checkJsonDepth`. No tests exist for `parseGPX`, `parseKML`, or `parseTrackFile`. The GPX parser has complex segment extraction logic, and the KML parser depends on `@tmcw/togeojson`. The `parseTrackFile` function has size limit checks and format detection logic that should be tested.
- **Suggested fix:** Add GPX/KML test fixtures and test `parseGPX`, `parseKML`, and `parseTrackFile` directly. Since these use `DOMParser`, they require a browser-like environment (jsdom provides this).

### C4-TE05 — No tests for error paths in `downloadVideo`
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:204-244`
- **Detail:** `downloadVideo` has two code paths: `showSaveFilePicker` and fallback `<a>` download. No tests exist for either path. Testing requires mocking `window.showSaveFilePicker` and DOM APIs.
- **Suggested fix:** Add tests mocking the File System Access API and verifying fallback behavior.

### C4-TE06 — Video encoder test coverage is thin
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.test.ts`
- **Detail:** The video encoder tests cover `estimateEncodedBytes` and `estimateExportMemoryBytes` but not the actual `exportVideo` function (which requires WebCodecs). The `ExportError` class is tested. The `downloadVideo` function is not tested. The `isCodecSupported` function is not tested.
- **Suggested fix:** Add tests for `downloadVideo` with mocked APIs. Add tests for `isCodecSupported` with mocked mediabunny.

### C4-TE07 — E2E tests are not in the GATES for this cycle
- **Severity:** LOW
- **Confidence:** High
- **Files:** `e2e/`
- **Detail:** The GATES for this cycle are `eslint, tsc --noEmit, next build`. E2E tests (Playwright) are not included. Previous cycles may have E2E test failures that aren't caught by the gate.
- **Suggested fix:** Consider adding `npm run test:e2e` to GATES when Playwright is available.

## Summary
| Severity | Count |
|----------|-------|
| HIGH | 0 |
| MEDIUM | 5 |
| LOW | 2 |
| **Total** | **7** |
