# Cycle 8 Implementation Plan

**Date:** 2026-04-19
**Source review:** `comprehensive-deep-code-review-2026-04-19-cycle8.md`

## Finding: NEW-C10-1 — `setIsPlaying` exposed from `usePlaybackController`

- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `src/lib/usePlaybackController.ts:118`
- **Status:** DONE

### Problem

The `usePlaybackController` hook returns `setIsPlaying` (the raw `useState` setter) in its return object. No consumer ever calls `setIsPlaying` directly -- they all use `togglePlay()`, `pausePlayback()`, or `resetPlayback()`. Exposing the raw setter is an encapsulation violation. A consumer could call `setIsPlaying(true)`, bypassing the `progressRef.current >= 1` reset logic in `togglePlay()`, leading to inconsistent behavior when progress is at 1.0.

Similarly, `setFollowCamera` is exposed (line 117) but also never called directly by consumers (they use `toggleFollowCamera()`).

### Plan

1. Remove `setIsPlaying` from the return object of `usePlaybackController`
2. Remove `setFollowCamera` from the return object of `usePlaybackController`
3. Verify no consumer references either setter
4. Run `tsc --noEmit` to confirm no type errors
5. Run the app and verify playback controls still work

### Exit criteria

- `setIsPlaying` and `setFollowCamera` are not in the return object
- `tsc --noEmit` passes
- No consumer code breaks
- Playback toggle, pause, and follow camera toggle all work correctly

### Implementation

- Removed `setIsPlaying` and `setFollowCamera` from the return object of `usePlaybackController`
- No consumers referenced these raw setters -- all use the proper callback interfaces
- `tsc --noEmit` passes clean
- LSP diagnostics show 0 errors
- Committed and pushed as `1eb109c`

---

## Finding: NEW-C10-2 — Duplicate file size validation

- **Severity:** INFO
- **Confidence:** HIGH
- **Files:** `src/components/FileUpload.tsx:39-42`, `src/lib/parser.ts:524-531`
- **Status:** NO FIX NEEDED

### Rationale

The redundancy provides defense-in-depth. Both checks use the same source constants (`MAX_FILE_SIZE`, `JSON_MAX_FILE_SIZE`). The duplication is harmless and actually protects against future changes to one path without the other.

---

## Finding: NEW-C10-3 — `downloadVideo` showSaveFilePicker cast semantically incorrect

- **Severity:** INFO
- **Confidence:** HIGH
- **File:** `src/lib/videoEncoder.ts:158-163`
- **Status:** NO FIX NEEDED

### Rationale

The code works correctly at runtime because TypeScript casts are erased. The double-cast pattern is necessary because the File System Access API types aren't in the standard TypeScript DOM lib. The semantic incorrectness of the intermediate cast type doesn't affect behavior. This is a private function with no external API surface.

---

## Deferred Findings Update

No new deferred items from this cycle. All previously deferred findings remain unchanged as documented in `.context/plans/deferred-findings-cycle2-2026-04-19.md`.
