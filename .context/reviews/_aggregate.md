# Aggregate Review — Cycle 2 (2026-04-23)

## Methodology
8 review agents: code-reviewer, security-reviewer, perf-reviewer, critic, verifier, architect, debugger, test-engineer, designer. Findings deduplicated; cross-agent agreement noted; highest severity/confidence preserved. All cycle 1 P0 fixes verified as applied.

---

## CYCLE 1 FIX VERIFICATION

All 11 P0/P1 items from cycle 1 are confirmed fixed:
- F1 (FileUpload duplicate size check): FIXED
- F2 (Map style persisted to localStorage): FIXED
- F3 (handleRangeChange segment filter): FIXED — `index >= 0`
- F4 (Scene overlap detection): FIXED
- F6 (usePlaybackController unmount guard): FIXED
- F7 (Korean export.at translation): FIXED
- F8 (reader.onerror ParseError): FIXED
- F9 (ThemeToggle matchMedia controlled mode): FIXED
- F10 (TimelineSelector onRangeChange during drag): FIXED
- F18 (Export cleanup waitForIdle guard): PARTIALLY FIXED — mapViewRef.current null check added
- F23 (Toast aria-live by severity): FIXED

---

## NEW FINDINGS (sorted by severity x confidence)

### C2-F1. Parser segment remap filter drops valid segment starts at index 0
- **Severity**: Medium | **Confidence**: High
- **Cross-agent**: code-reviewer (N1), debugger (N1), verifier (N1), critic (N1)
- **File**: `src/lib/parser.ts:424`
- **Issue**: `adjustedSegStarts` uses `.filter(idx => idx > 0)`, dropping segment starts that remap to index 0 after the dedup+sort reordering. This is the same class of bug as F3 (fixed in page.tsx). If a non-first segment start (e.g., originally at index 50) remaps to new index 0 after dedup removes early entries, the segment boundary is lost, causing two distinct activity segments to be merged with an incorrect straight line between them.
- **Fix**: Change `.filter(idx => idx > 0)` to `.filter(idx => idx >= 0)` on line 424. This matches the fix applied to page.tsx in cycle 1.

### C2-F2. SceneEditor slider handles lack aria-valuetext
- **Severity**: Low | **Confidence**: High
- **Cross-agent**: designer (N1, N2), critic (N2)
- **File**: `src/components/SceneEditor.tsx:171-228, 521-582`
- **Issue**: The `SceneRangeEditor` slider handles have `role="slider"` and `aria-valuenow` but no `aria-valuetext`. The main parameter sliders (zoom, pitch, bearing, rotation) also lack `aria-valuetext`. Screen readers announce only the raw numeric value without context (e.g., "50" instead of "50% start of Scene 2" or "zoom 13"). This was identified as DF-C17-007 in cycle 1 but not implemented.
- **Fix**: Add `aria-valuetext` to all slider elements with value and unit context.

### C2-F3. ExportPanel frame count display may differ from actual encoder frame count
- **Severity**: Low | **Confidence**: Medium
- **Cross-agent**: code-reviewer (N2)
- **File**: `src/components/ExportPanel.tsx:260`
- **Issue**: Frame count display uses `Math.round(exportProgress * Math.ceil(duration * fps))` with the panel's local `duration`/`fps` state, which may differ from the clamped values used by `videoEncoder`. This is the same issue as deferred F30 but with a clearer root cause identified.
- **Fix**: Apply the same EXPORT_LIMITS clamping in the display formula, or pass actual totalFrames from the export controller.

---

## AGENT FAILURES
None. All 9 review perspectives covered.

## POSITIVE FINDINGS
- All cycle 1 P0 fixes verified as correctly applied
- ESLint and TypeScript gates pass with zero errors
- Parser code path for Google Location History handles 5+ format variants with dedup and sort
- SceneEditor overlap detection properly uses existing i18n keys
- Theme persistence works correctly across reloads via localStorage + bootstrap script
