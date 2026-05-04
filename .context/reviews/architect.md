# Architect Review — Travelback (2026-05-04, Cycle 2)

## Summary

Architecture remains sound. The main new finding is the export/playback state coupling bug. Large refactoring items (page.tsx decomposition, scene normalization) remain deferred.

## Findings

### C2-AR-01. Export/playback coupling creates progress restoration bug — MEDIUM risk, HIGH confidence
**Files**: `src/lib/useExportController.ts`, `src/lib/usePlaybackController.ts`
**Issue**: `useExportController` directly calls `setPlaybackProgress` from `usePlaybackController`, creating tight coupling. The progress restoration bug (finally block overwriting success value) is a direct consequence of this coupling. A state machine pattern where page.tsx owns progress state and both controllers receive it would prevent this class of bug.
**Suggestion**: This was already identified in cycle 1 (F1). The bug confirms the architectural concern.

### C2-AR-02. Scene editor dual-path normalization — LOW risk, HIGH confidence
**File**: `src/components/SceneEditor.tsx:289,412-433`
**Issue**: `commitScenes` normalizes scenes, but `updateSceneRaw` bypasses normalization for drag gestures. The parent receives both normalized and unnormalized state depending on interaction mode. This is intentional for UX but adds complexity.
**Suggestion**: Acceptable — the `onCommit` callback in `SceneRangeEditor` normalizes after drag completes.
