# Critic — Travelback (2026-05-04, Cycle 2)

## Summary

The export/playback progress restoration bug is the most significant new finding. Default scene generation on export vs. preview continues to be a UX inconsistency worth noting.

## Findings

### C2-CT-01. Export success progress overwritten by finally block — MEDIUM risk, HIGH confidence
**File**: `src/lib/useExportController.ts:254,306-307`
**Issue**: Same as C2-CR-01. After successful export, the finally block resets progress to pre-export value. This creates a jarring UX where the progress bar jumps backward after a successful export.
**Suggestion**: Restructure the try/catch/finally so that the success path's progress is preserved.

### C2-CT-02. Default scene generation on export vs. preview — MEDIUM risk (unchanged from cycle 1)
**File**: `src/lib/useExportController.ts:161-163`
**Issue**: When scenes is empty, default cinematic scenes are auto-generated during export but not during preview. The exported video will look different from the preview. This was finding F3 in cycle 1 aggregate.
**Suggestion**: Either auto-generate default scenes on track load or indicate in the UI that scenes will be auto-generated on export.

### C2-CT-03. Scene editor drag gesture leaves unnormalized state briefly — LOW risk, LOW confidence
**File**: `src/components/SceneEditor.tsx:412-433`
**Issue**: During drag, `updateSceneRaw` bypasses normalization and writes directly to parent state via `onChange`. If the component unmounts during drag, the `pointerup` handler won't fire and the parent may hold unnormalized scenes. In practice, unmounting during an active drag gesture is extremely unlikely.
**Suggestion**: Acceptable — the next `commitScenes` call will normalize.
