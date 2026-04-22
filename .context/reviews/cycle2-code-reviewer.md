# Code Reviewer — Cycle 2 (2026-04-23)

## Verified Cycle 1 Fixes

| Finding | Status |
|---------|--------|
| F1: FileUpload duplicate size check | FIXED — duplicate check removed, ParseError code path works |
| F2: Map style not persisted to localStorage | FIXED — cycleStyle and handleModeChange both persist |
| F3: handleRangeChange segment index filter | FIXED — now uses `index >= 0` (line 187) |
| F4: Scene overlap detection | FIXED — overlap detection in commitScenes |
| F6: usePlaybackController unmount guard | FIXED — mountedRef pattern in place |
| F7: Korean export.at translation | FIXED — now 'at' |
| F8: reader.onerror ParseError | FIXED — uses ParseError with READ_FAILED code |
| F9: ThemeToggle matchMedia controlled mode | FIXED — onModeChange inside guard |
| F10: TimelineSelector onRangeChange during drag | FIXED — applyDrag calls onRangeChangeRef |
| F18: Export cleanup waitForIdle guard | PARTIALLY FIXED — mapViewRef.current null check on line 196 |

## New Findings

### N1. Parser segment remap drops valid segment starts at index 0
- **Severity**: Medium | **Confidence**: High
- **File**: `src/lib/parser.ts:424`
- **Issue**: `adjustedSegStarts` is filtered with `.filter(idx => idx > 0)`. After the dedup-remap logic, a valid segment start that maps to index 0 would be dropped. This is the same class of bug as the fixed F3 in page.tsx. If the first point in the original data (index 0) maps to new index 0 after dedup/sort, it should be preserved — but the filter removes it. A segment start at index 0 means "the very first point is the start of a segment," which is already implied and typically excluded. However, if multiple branches contribute points and dedup removes some early entries, a non-first original segment start could remap to index 0, and dropping it would lose the segment boundary.
- **Fix**: Change `.filter(idx => idx > 0)` to `.filter(idx => idx >= 0)` on line 424. Note: index 0 is actually the default implied start, so filtering it out is arguably correct for the first segment. However, for consistency with the page.tsx fix and to handle edge cases where a later segment maps to 0, the filter should be `>= 0` — or explicitly exclude only the first implied segment start with a comment explaining why.
- **Concrete scenario**: A Google Location History file where dedup removes early points, causing a segment that was originally at index 5 to remap to index 0. The segment boundary would be lost, merging two distinct activity segments.

### N2. ExportPanel frame count display uses stale duration/fps
- **Severity**: Low | **Confidence**: High
- **File**: `src/components/ExportPanel.tsx:260`
- **Issue**: The frame count display `Math.round(exportProgress * Math.ceil(duration * fps))` uses the ExportPanel's local `duration` and `fps` state. If the export config was clamped by the controller (EXPORT_LIMITS), the displayed frame count could differ from the actual frame count used by videoEncoder. The videoEncoder clamps `safeDuration` and `safeFps` before computing `totalFrames`.
- **Fix**: Either pass the actual totalFrames from the export controller, or apply the same clamping in the display formula. This is a display-only inaccuracy (F30 from cycle 1, deferred), but the root cause is the mismatch between display values and encoder values.
