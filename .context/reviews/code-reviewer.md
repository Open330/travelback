# Code Review — Travelback (2026-05-04, Cycle 2)

## Summary

Focus on NEW findings beyond cycle 1. Codebase remains well-structured. Key finding: export progress restoration bug that overwrites successful playback position.

## Findings

### C2-CR-01. Export progress restoration overwrites final playback position on success — MEDIUM risk, HIGH confidence
**File**: `src/lib/useExportController.ts:254,306-307`
**Issue**: On successful export, `setPlaybackProgress(1)` at line 254 is called inside the try block. The finally block at lines 306-307 then unconditionally calls `setPlaybackProgress(preExportProgress)`, overwriting the success value. After a successful export, playback progress resets to wherever it was before export started.
**Fix**: Only restore preExportProgress when export was aborted or failed.

### C2-CR-02. Test stub bypass is accessible in production via URL parameter — LOW risk, HIGH confidence
**File**: `src/lib/test-stub.ts`
**Issue**: `isLocalExportTestStubEnabled()` checks for a URL parameter. In production, anyone adding `?test-stub` gets a 26-byte stub export instead of a real video.
**Suggestion**: Gate behind `process.env.NODE_ENV === 'development'`.

### C2-CR-03. `renderFrameAndWait` duplicate frame capture on last frame — LOW risk, MEDIUM confidence
**File**: `src/lib/videoEncoder.ts:140,162-163`
**Issue**: Last iteration captures frame at progress=1. If 5-second timeout fires for that frame, the resolve produces a duplicate. Mediabunny likely handles this gracefully.
**Suggestion**: Acceptable — timeout is safety valve for rare edge cases.

### C2-CR-04. Camera preset functions use hardcoded IDs — LOW risk, LOW confidence
**File**: `src/lib/camera.ts:225-350`
**Issue**: Preset scene IDs like `'scene-1'` are hardcoded. If user applies presets sequentially, IDs could theoretically collide. In practice, presets replace all scenes, so this is safe.
**Suggestion**: No change needed.

### C2-CR-05. ErrorBoundary "Try Again" recovery verified — PASS
**File**: `src/app/page.tsx:510-519`
**Issue**: `handleErrorReset` properly clears all state. Cycle 1 finding F14 is resolved.
**Suggestion**: No change needed.
