# Aggregate Review — Cycle 1 (2026-04-23)

## Methodology
9 review agents: code-reviewer, security-reviewer, perf-reviewer, critic, verifier, architect, debugger, test-engineer, designer. Findings deduplicated; cross-agent agreement noted; highest severity/confidence preserved.

---

## DEDUPLICATED FINDINGS (sorted by severity x confidence)

### F1. FileUpload duplicate size check breaks error code path
- **Severity**: Medium | **Confidence**: High
- **Cross-agent**: code-reviewer (F1), verifier (F1)
- **File**: `src/components/FileUpload.tsx:39-42`, `src/lib/parser.ts:520-527`
- **Issue**: FileUpload pre-checks file size with `new Error(t(...))` (not ParseError). When it fires, `err instanceof ParseError` is false, so the FILE_TOO_LARGE code path is skipped. User sees generic "parseFailed" instead of "too large" message.
- **Fix**: Remove duplicate check from FileUpload; let parseTrackFile handle it via ParseError.

### F2. Map style not persisted to localStorage on cycle
- **Severity**: Medium | **Confidence**: High
- **Cross-agent**: code-reviewer (F6), verifier (F2)
- **File**: `src/app/page.tsx:293-303`
- **Issue**: `cycleStyle` sets state and DOM attribute but never writes to localStorage. On reload, bootstrap script derives mapstyle from theme only, losing explicit style choice (e.g. Liberty).
- **Fix**: Persist explicit map style to localStorage in `cycleStyle`; read it in bootstrap script.

### F3. handleRangeChange drops segment start at boundary
- **Severity**: Medium | **Confidence**: Medium
- **Cross-agent**: code-reviewer (F7), verifier (F3)
- **File**: `src/app/page.tsx:170-191`
- **Issue**: `.filter(index > 0)` removes segment starts that map to index 0 after subtraction. If a segment start equals startIdx, it is mapped to 0 then dropped.
- **Fix**: Change filter to preserve mapped index 0, or adjust segment preservation logic.

### F4. Scene overlap detection missing despite i18n keys existing
- **Severity**: Low | **Confidence**: High
- **Cross-agent**: critic (F5, F6), verifier (F6)
- **File**: `src/components/SceneEditor.tsx`, `src/lib/i18n.ts`
- **Issue**: Translation keys `scenes.overlap` and `scenes.overlapSuffix` exist in all locales but are never referenced. Overlap detection code is absent.
- **Fix**: Implement overlap detection in SceneEditor commitScenes validation.

### F5. normalizeScenes silently drops zero-duration scenes without warning during export
- **Severity**: Medium | **Confidence**: High
- **Cross-agent**: code-reviewer (F4)
- **File**: `src/lib/camera.ts:43`
- **Issue**: During export, `normalizeScenes` filters out zero-duration scenes silently. The SceneEditor has separate validation but it is decoupled from the export path.
- **Fix**: Prevent export when normalization warnings exist, or report dropped scenes.

### F6. usePlaybackController missing unmount guard
- **Severity**: Low | **Confidence**: High
- **Cross-agent**: perf-reviewer (F5)
- **File**: `src/lib/usePlaybackController.ts:79-110`
- **Issue**: If component unmounts between setPlaybackProgress and next rAF, state update hits unmounted component.
- **Fix**: Add mounted ref guard.

### F7. Korean `export.at` translation is empty string
- **Severity**: Low | **Confidence**: High
- **Cross-agent**: critic (F4)
- **File**: `src/lib/i18n.ts`
- **Issue**: Empty Korean translation for `export.at` renders output spec as "1920x1080 MP4  Mbps" (double space).
- **Fix**: Add appropriate Korean word.

### F8. readFailed error not properly surfaced
- **Severity**: Low | **Confidence**: High
- **Cross-agent**: code-reviewer (F8)
- **File**: `src/lib/parser.ts:566`
- **Issue**: `reader.onerror` throws plain Error, not ParseError, so it falls through to generic handler.
- **Fix**: Use ParseError with READ_FAILED code; add mapping in FileUpload.

### F9. ThemeToggle dual state management
- **Severity**: Medium | **Confidence**: High
- **Cross-agent**: critic (F1)
- **File**: `src/components/ThemeToggle.tsx`
- **Issue**: ThemeToggle has internal mode state even when controlledMode is provided. matchMedia listener calls onModeChange creating confusing dual-state.
- **Fix**: Make ThemeToggle fully controlled when controlledMode is provided.

### F10. Timeline selector range change fires only on drag end
- **Severity**: Medium | **Confidence**: High
- **Cross-agent**: critic (F3)
- **File**: `src/components/TimelineSelector.tsx:209-220`
- **Issue**: onRangeChange only called in endDrag, not during applyDrag. Track data doesn't update while dragging — visual selection changes but filtered track doesn't update until release.
- **Fix**: Call onRangeChange during drag (throttled via rAF).

### F11. Worker fallback path inconsistency
- **Severity**: Medium | **Confidence**: Medium
- **Cross-agent**: debugger (F1)
- **File**: `src/lib/parser.ts:440-515`
- **Issue**: Some worker failure paths fall back to main-thread parse, others don't. Mixed approach could confuse users.
- **Fix**: Consistently always or never fall back on worker failure.

### F12. CSP uses unsafe-inline for scripts in development
- **Severity**: Medium | **Confidence**: High
- **Cross-agent**: security-reviewer (F1)
- **File**: `src/app/layout.tsx:59-63`
- **Issue**: If harden script fails or is skipped, CSP remains weak.
- **Fix**: Add CI check validating production build has no unsafe-inline in CSP.

### F13. Video export sequential waitForIdle is slow
- **Severity**: Medium | **Confidence**: High
- **Cross-agent**: perf-reviewer (F1)
- **File**: `src/lib/videoEncoder.ts:93-133`
- **Issue**: Each frame waits up to 5s for map idle. For 900 frames, very long export times.
- **Fix**: Reduce timeout for export case or use progressive approach.

### F14. MapView re-renders every progress change during playback
- **Severity**: Medium | **Confidence**: High
- **Cross-agent**: perf-reviewer (F3, F4)
- **File**: `src/components/MapView.tsx:822-936`
- **Issue**: Effect runs every ~16ms during playback, calling interpolateAlongTrack and rebuilding trail geometry (O(n) for large tracks).
- **Fix**: Use rAF directly in MapView; only recompute changed trail segment.

### F15. HomeInner is a 440-line god component
- **Severity**: Medium | **Confidence**: High
- **Cross-agent**: architect (F1)
- **File**: `src/app/page.tsx`
- **Issue**: 20+ state variables, 15+ callbacks, all prop drilling.
- **Fix**: Extract custom hooks (useTrackSession, useThemeState, useUIPanels).

### F16. Missing keyboard focus management in SceneEditor
- **Severity**: Medium | **Confidence**: High
- **Cross-agent**: designer (F1)
- **File**: `src/components/SceneEditor.tsx`
- **Issue**: No aria-valuetext on range sliders; focus not managed when expanding/collapsing.
- **Fix**: Add aria-valuetext to range sliders.

### F17. No unit tests — only E2E tests
- **Severity**: High | **Confidence**: High
- **Cross-agent**: test-engineer (F1)
- **Issue**: Zero unit tests for parser, interpolate, camera, videoEncoder.
- **Fix**: Add unit tests for critical modules.

### F18. Export cleanup may fail silently
- **Severity**: Low | **Confidence**: High
- **Cross-agent**: debugger (F3)
- **File**: `src/lib/useExportController.ts:176-205`
- **Issue**: If map destroyed during export, waitForIdle in finally block would fail.
- **Fix**: Add guard checking map exists before calling waitForIdle.

### F19. No undo/redo for scene edits beyond single-delete
- **Severity**: Medium | **Confidence**: High
- **Cross-agent**: critic (F2)
- **File**: `src/components/SceneEditor.tsx`
- **Issue**: Only 5-second undo for last deletion. No undo for parameter changes, additions, preset applications.
- **Fix**: Implement basic undo/redo stack.

### F20. CSS custom properties used without fallbacks
- **Severity**: Low | **Confidence**: Medium
- **Cross-agent**: architect (F3)
- **Issue**: Most inline style `var()` calls lack fallback values. If CSS fails to load, UI may be unreadable.
- **Fix**: Add fallback values to all `var()` usages in inline styles.

### F21. No granular error boundaries around individual components
- **Severity**: Low | **Confidence**: Medium
- **Cross-agent**: architect (F4)
- **File**: `src/app/page.tsx`
- **Issue**: Single ErrorBoundary wraps everything. Map error kills entire UI.
- **Fix**: Add error boundaries around MapView and export pipeline.

### F22. GoogleGuide tabs not keyboard accessible
- **Severity**: Low | **Confidence**: High
- **Cross-agent**: designer (F5)
- **File**: `src/components/GoogleGuide.tsx:289`
- **Issue**: Tab buttons have role="tab" but no arrow-key navigation per WAI-ARIA.
- **Fix**: Add arrow-key navigation for tab list.

### F23. Toast aria-live not differentiated by severity
- **Severity**: Low | **Confidence**: High
- **Cross-agent**: designer (F3)
- **File**: `src/components/Toast.tsx:64`
- **Issue**: All toasts use `aria-live="polite"`. Error toasts should use "assertive".
- **Fix**: Use assertive for error toasts.

### F24. InterpolateAlongTrack edge case at progress=1.0
- **Severity**: Low | **Confidence**: Medium
- **Cross-agent**: code-reviewer (F3)
- **File**: `src/lib/interpolate.ts:97-103`
- **Issue**: Binary search at exact progress=1.0 may interpolate into last segment rather than returning exact last point.
- **Fix**: Check if targetDist >= last cumulative distance and return last point directly.

### F25. showSaveFilePicker type casting is unsafe
- **Severity**: Low | **Confidence**: High
- **Cross-agent**: code-reviewer (F5)
- **File**: `src/lib/videoEncoder.ts:175-180`
- **Issue**: Double casting on File System Access API.
- **Fix**: Create typed interface for File System Access API.

### F26. JourneyCreator totalDistance without segmentStartIndices
- **Severity**: Low | **Confidence**: High
- **Cross-agent**: code-reviewer (F2)
- **File**: `src/components/JourneyCreator.tsx:141`
- **Issue**: `totalDistance(pts)` called without segmentStartIndices. Functionally correct but fragile.
- **Fix**: Pass explicit empty array.

### F27. i18n translations bundled inline (~1700 lines)
- **Severity**: Low | **Confidence**: High
- **Cross-agent**: perf-reviewer (F6)
- **Issue**: All 5 locales in main JS chunk.
- **Fix**: Code-split by locale. Low priority.

### F28. Mobile density — too many controls on small screens
- **Severity**: Low | **Confidence**: Medium
- **Cross-agent**: designer (F2)
- **Issue**: Playback controls bar doesn't collapse on small screens.
- **Fix**: Collapse stats on very small screens or use bottom sheet.

### F29. FileUpload drop zone lacks visual focus indicator
- **Severity**: Low | **Confidence**: Medium
- **Cross-agent**: designer (F4)
- **Issue**: No visible focus ring when drop zone is focused via keyboard.
- **Fix**: Add focus-visible ring.

### F30. Export frame count display inaccuracy
- **Severity**: Low | **Confidence**: Medium
- **Cross-agent**: critic (F7)
- **Issue**: Math.round(exportProgress * totalFrames) slightly off.
- **Fix**: Use actual frame count from export controller.

---

## AGENT FAILURES
None. All 9 agents returned findings.

## POSITIVE FINDINGS (noted across agents)
- Web Worker usage for JSON parsing is well-structured (architect F5)
- Export controller hook has clean separation (architect F6)
- Bootstrap script is safe — constrained values, no eval (security F4)
- CSP frame-ancestors/object-src protections correct (security F5)
- Playback accumulator pattern avoids drift (verifier F5)
- Video filename sanitization handles Unicode correctly (verifier F4)
- ModalDialog has proper focus trap, Escape, inert (designer F6)
- 44px touch targets on buttons (designer F6)
