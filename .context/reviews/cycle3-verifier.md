# Cycle 3 Verifier Review

Review target: `3b6750f` (`codex/review-plan-fix-2026-07-16`)

## Scope and evidence

I inventoried the application, components, parsers, worker, unit tests, browser tests, static-export scripts, public assets, README, prior Cycle 1/2 findings, and completed plans. I then exercised the current application in Chromium at a 390×844 touch viewport and ran the seven representative desktop import checks.

Fresh evidence:

- GPX, KML, Google flat JSON, Records.json, Semantic Location History, Timeline Edits, and Semantic Segments all imported successfully: 7/7 Playwright checks passed in 30.0 seconds.
- The mobile landing page exposed a coherent accessibility tree with named upload, sample, manual-route, help, unit, language, and theme controls.
- Journey Creator action geometry was: Cancel 35.7×45.8px; Open tool 46.5×45.8px; Go 28.9×45.8px; Hide 36.0×45.8px; Undo 55.4×45.8px; Clear 54.8×45.8px; Done 79.2×45.8px; Keep Editing 94.3×45.8px; Create Route 122.6×45.8px. The suspected sub-minimum target issue is not present at this viewport.
- A local export reached the focused `Video ready` heading, displayed the preview and Download MP4 action, and produced no page or console errors.

## Findings

| ID | Severity | Confidence | Finding | Evidence and user scenario | Recommended fix |
|---|---|---|---|---|---|
| C3-PR-001 | Medium | High | A cancelled timeline touch drag remains armed and the next unrelated gesture can commit a destructive trim. | `src/components/TimelineSelector.tsx:368-381` arms mutable drag state. The global lifecycle at `:413-435` listens for `touchmove` and `touchend`, but not `touchcancel` or window blur. In the 390×844 reproduction, dragging the end handle from 100% to 68% and dispatching `touchcancel` left the displayed trip at 20/20 locations but the handle at 68%. The next map touch moved the stale handle to 16% and its `touchend` committed 5/20 locations. | Add a cancellation path that cancels pending RAF work, restores the accepted/origin ratios, clears all drag refs, and never calls `onRangeChange`. Handle `touchcancel` and loss of window focus, or move to pointer events with pointer capture and `pointercancel`.
| C3-PR-002 | Low | High | An interrupted export-sheet swipe retains its start coordinate and can close the sheet on a later cross-boundary touch. | `src/components/ExportPanel.tsx:116-133` clears `touchStartRef` only on a non-handle `touchstart` or `touchend`; the wrapper at `:235` has no `onTouchCancel`. Reproduction: header `touchstart` → `touchcancel` → a later touch beginning outside the sheet and ending on its header 170px lower changed the dialog from visible to closed. | Add `onTouchCancel={() => { touchStartRef.current = null }}` and clear the ref whenever the sheet closes/unmounts. Add a mobile regression test for cancelled swipes.
| C3-PR-003 | Medium | High | The picker-cancelled export state gives incorrect recovery guidance even though the MP4 is still ready to download. | A cancelled save picker returns `saved: false, method: 'picker'` at `src/lib/videoEncoder.ts:319-333`; the controller maps that to `ready` at `src/lib/useExportController.ts:244-255`. The ready UI simultaneously shows Download MP4 at `src/components/ExportPanel.tsx:279-288`, yet English says to use preview/share or “export again” at `src/lib/i18n.ts:131`; the platform tip at `ExportPanel.tsx:275-277` may tell the user to find an MP4 in Downloads even though the picker was cancelled. The browser reproduced `Video ready`, that misleading paragraph, and a visible Download MP4 link. | Make the ready-state copy explicitly say the save was not completed and direct the user to Download MP4 or Share. Make the platform tip conditional so it does not claim the file is in Downloads before a download has started.
| C3-PR-004 | Low | High | Three remaining locale strings say “approximately estimated time” twice. | `src/lib/i18n.ts:119` has `Approx. estimated time:`, `:843` has `概算推定時間:`, and `:1567` has `Tiempo aprox. estimado:`. The mobile export rendered the English phrase verbatim. `src/lib/i18n.test.ts:33-36` guards only the previously corrected Korean, one Japanese journey phrase, and Chinese. | Use `Estimated time:`, `所要時間の目安:` (or another native-reviewed Japanese equivalent), and `Tiempo estimado:`; extend the reviewed-copy assertions to all affected locales.

## De-duplication notes

- The four IDs above are the canonical product-review findings; other Cycle 3 role reports intentionally reuse these IDs.
- I did not re-report Cycle 2’s completed timeline distance/keyboard, scene cancellation, export focus/lifecycle, parser-root, bounded-trail, CSP, dependency, or previously corrected Korean/Japanese/Chinese issues.
- I also did not re-report the explicitly carried CI-permissions/unit-gate, LICENSE, or real-device `preserveDrawingBuffer` items.

## Final sweep

No additional current-HEAD verifier defects were confirmed. There were no deployment actions, source changes, commits, or pushes.
