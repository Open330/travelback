# Cycle 6 Debugger Review

## Scope
I reviewed the repository end to end for review-relevant behavior: root config, app entrypoints, core libraries, UI components, the track parser worker, helper scripts, the Playwright e2e suite, fixtures, and bundled map styles.

I also ran `npm run typecheck` and `npm run lint`; both passed.

## Findings

### 1. Scene preview never clears back to the live playback camera
- Severity: medium
- Confidence: high
- Status: confirmed

**Symptom**
Dragging a scene parameter updates the map to a live preview camera, but releasing the pointer or closing the panel leaves the map stuck on that preview instead of returning to the current playback camera.

**Root Cause**
`SceneEditor` explicitly sends `onPreviewScene(null)` when preview should end (`src/components/SceneEditor.tsx:366-368`), but the parent handler treats `null` as an early return and does nothing (`src/app/page.tsx:384-389`). That means the preview-clear signal is ignored, so the map never gets restored.

**Failure Scenario**
1. Open the scene editor.
2. Adjust a scene camera parameter so the preview jumps the map.
3. Release the control or close the editor.
4. The map remains on the preview camera, which no longer matches the active playback state.

**Suggested Fix**
Handle the `null` preview signal in `handlePreviewScene` by restoring the normal playback camera state for the current progress/scenes instead of returning early. The minimal fix is to stop treating `null` as a no-op.

**Verification**
Manually confirm that releasing a scene slider or closing the scene editor returns the map to the current playback camera. Add a regression test for the preview-clear path so this does not regress again.

### 2. Regression coverage is missing for the preview-clear path
- Severity: low
- Confidence: high
- Status: risk needing validation

The e2e suite already covers opening the scene editor, adding scenes, and changing camera mode (`e2e/travelback.spec.ts:956-1065`), but it does not exercise the preview-reset path. That leaves the confirmed bug above under-covered even though the rest of the scene-editor behavior is already well tested.

**Suggested Fix**
Add one e2e case that drags or changes a scene parameter, releases it, and asserts the map returns to the live playback camera.

## Sweep Result
- No other confirmed functional bugs were found in the reviewed app, lib, component, worker, script, and map-style files.
- I did not find additional high-confidence race conditions, async-state inconsistencies, or error-handling regressions beyond the preview-clear bug above.

## References
- `src/components/SceneEditor.tsx:366-368`
- `src/app/page.tsx:384-389`
- `e2e/travelback.spec.ts:956-1065`
