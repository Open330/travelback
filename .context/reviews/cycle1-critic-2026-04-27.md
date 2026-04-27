# Critic — Cycle 1 (2026-04-27)

Reviewer: critic
Repository: `/Users/hletrd/flash-shared/Travelback`
Scope: Full codebase including uncommitted changes, focus on architectural issues, correctness risks, and design gaps

## Findings

### C-01 — Uncommitted fixes partially address cycle 2 findings but are not committed or gate-tested

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** Multiple files with uncommitted changes
- **Detail:** The working tree has uncommitted changes that address 7 of 32 cycle 2 findings (F01 partially, F06, F10, F16, F17, F18, F25/F26). These introduce new code (`renderFrameAndWait`, export throttle, `assertPointBudget` additions, bootstrap rewrite guard) that has not been validated by the build gates (`eslint`, `tsc --noEmit`, `next build`) or E2E tests. The deployed code does not include any of these fixes.
- **Suggested fix:** Commit these as separate semantic commits, running gates between each.

### C-02 — Scene normalization silently mutates user intent; UI warns after the fact

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/camera.ts:19-43`, `src/components/SceneEditor.tsx:265-281`
- **Detail:** When a user creates scenes with overlapping ranges, `normalizeScenes()` silently clamps and reorders them. The SceneEditor shows a warning after the fact. The user cannot undo the normalization or see what their original values were. `commitScenes` normalizes before passing to `onChange`, so the parent only ever sees normalized scenes. This is the same F24/F30 concern from cycle 2 — still unaddressed.
- **Suggested fix:** Store raw (un-normalized) scenes in page.tsx state. Only normalize when passing to playback/export. Show warnings against raw values. Allow the user to see and reverse the normalization.

### C-03 — `handleRangeChange` in page.tsx clears all scenes whenever the range is not full

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/app/page.tsx:293-297`
- **Detail:** When the user trims the timeline, `handleRangeChange` clears all scenes if the new range is not the full track. Any carefully authored scene composition is destroyed the moment the user drags a timeline handle. There is no undo or confirmation dialog.
- **Suggested fix:** Instead of clearing scenes, re-scale them proportionally to the new range. Or at minimum, show a confirmation dialog before discarding scenes.

### C-04 — Export test stub is not documented

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:20-29`, `src/lib/useExportController.ts:163-172`
- **Detail:** The `isLocalExportTestStubEnabled()` check allows bypassing the entire `exportVideo()` call on localhost when a localStorage flag is set. This is useful for E2E tests but is not documented in the README or architecture docs. If a developer accidentally enables this flag, they will see "successful" exports that are actually 26-byte stub files.
- **Suggested fix:** Document the test stub in the development section. Add a visible console warning when the stub is active.

### C-05 — `usePlaybackController` fallback timer can fire after component unmount

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/usePlaybackController.ts:119`
- **Detail:** The `fallbackTimerRef` uses `window.setTimeout(() => animate(...), 250)`. If the component unmounts during the 250ms window, the `animate` function runs and calls `setPlaybackProgress` on an unmounted component. The `mountedRef` guard at line 125 catches this, but `setPlaybackProgress` is called before the guard check in some code paths (line 129). The effect cleanup cancels `animFrameRef` and `fallbackTimerRef`, but there is a race between `clearTimeout` and the callback firing.
- **Suggested fix:** Move the `mountedRef` check to the very beginning of `animate`, before any state updates.

### C-06 — Error handling inconsistency: videoEncoder uses generic Error while parser uses ParseError

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:86`, `src/lib/videoEncoder.ts:169`, `src/lib/parser.ts:12-18`
- **Detail:** The parser uses `ParseError` with machine-readable codes (e.g., `TOO_MANY_POINTS`). The video encoder uses generic `Error` with English-only messages. This means export errors cannot be i18n-translated using the same pattern as parse errors, and the user sees raw English error text in the toast.
- **Suggested fix:** Create a parallel `ExportError` class with machine-readable codes. Map export error codes to i18n keys in the export controller.

## Summary

| Severity | Count |
|----------|-------|
| MEDIUM   | 3     |
| LOW      | 3     |
| **Total** | **6** |
