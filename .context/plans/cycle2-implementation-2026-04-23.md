# Cycle 2 Implementation Plan (2026-04-23)

Source: `.context/reviews/_aggregate.md` (cycle 2 fresh review, 9 agents)

## Cycle 1 Fix Verification -- All Confirmed Applied

All 11 P0/P1 items from cycle 1 are verified as correctly applied in the codebase. See `_aggregate.md` for details.

## Active Implementation Items

### P0-1: Fix parser segment remap filter dropping index 0
- **Source**: C2-F1
- **Severity / Confidence**: MEDIUM / HIGH
- **Cross-agent**: code-reviewer (N1), debugger (N1), verifier (N1), critic (N1)
- **Files**: `src/lib/parser.ts:424`
- **Root Cause**: The `adjustedSegStarts` array is filtered with `.filter(idx => idx > 0)`, which drops segment starts that remap to index 0 after the dedup+sort reordering. The same bug class was fixed in page.tsx (F3) where the filter was changed from `> 0` to `>= 0`, but this parser instance was not identified in cycle 1.
- **Action**: Change `.filter(idx => idx > 0)` to `.filter(idx => idx >= 0)` on line 424 of `src/lib/parser.ts`.
- **Verify**: Load a Google Location History JSON file with multiple semantic segments where dedup removes enough early points that a segment start remaps to index 0. Confirm the segment boundary is preserved in the resulting Track object.
- **Status**: PENDING

### P1-1: Add aria-valuetext to SceneEditor sliders
- **Source**: C2-F2
- **Severity / Confidence**: LOW / HIGH
- **Cross-agent**: designer (N1, N2), critic (N2)
- **Files**: `src/components/SceneEditor.tsx:171-228, 521-582`
- **Root Cause**: All slider elements in SceneEditor have `aria-valuenow` but no `aria-valuetext`. Screen readers announce only the raw number without context. The SceneRangeEditor handles (lines 171-228) show "50" instead of "50% start of Scene 2". The parameter sliders (zoom, pitch, bearing, rotation) similarly lack value text context.
- **Action**:
  1. For `SceneRangeEditor` slider handles (lines 165-228): Add `aria-valuetext={`${Math.round(value * 100)}% ${type === 'start' ? 'start' : 'end'}`}`.
  2. For zoom slider (~line 521): Add `aria-valuetext={`Zoom ${scene.params.zoom}`}`.
  3. For pitch slider (~line 535): Add `aria-valuetext={`Tilt ${scene.params.pitch}°`}`.
  4. For bearing slider (~line 553): Add `aria-valuetext={`Direction ${scene.params.bearingOffset}°`}`.
  5. For rotation slider (~line 569): Add `aria-valuetext={`Orbit speed ${scene.params.rotationSpeed}°/s`}`.
- **Verify**: Use screen reader to navigate scene editor sliders, confirm values announced with context.
- **Status**: PENDING

### P1-2: Fix ExportPanel frame count display to match encoder clamping
- **Source**: C2-F3
- **Severity / Confidence**: LOW / MEDIUM
- **Cross-agent**: code-reviewer (N2)
- **Files**: `src/components/ExportPanel.tsx:260`
- **Root Cause**: Frame count display uses `Math.round(exportProgress * Math.ceil(duration * fps))` with the panel's local `duration`/`fps` state, but the videoEncoder clamps these values via EXPORT_LIMITS before computing `totalFrames`. This means the displayed frame count can differ from the actual encoder frame count when clamping occurs.
- **Action**: Apply the same EXPORT_LIMITS clamping to the display formula: `const clampedDuration = Math.max(EXPORT_LIMITS.duration.min, Math.min(duration, EXPORT_LIMITS.duration.max))` and `const clampedFps = Math.max(EXPORT_LIMITS.fps.min, Math.min(fps, EXPORT_LIMITS.fps.max))`, then use `Math.ceil(clampedDuration * clampedFps)` for the total frame count display.
- **Verify**: Set duration to 1 (below min of 5), confirm displayed total frames shows the clamped value (5 * fps), not the raw value.
- **Status**: PENDING

## Deferred Items

### No New Deferred Findings This Cycle

### Previously Deferred (Carried Forward from Cycle 17)

All deferred items from `deferred-findings-cycle17-2026-04-23.md` remain valid and are carried forward without modification:

- DF-C17-001: normalizeScenes silently drops zero-duration scenes (MEDIUM/HIGH)
- DF-C17-002: Worker fallback path inconsistency (MEDIUM/MEDIUM)
- DF-C17-003: CSP unsafe-inline CI check (MEDIUM/HIGH)
- DF-C17-004: Video export sequential waitForIdle performance (MEDIUM/HIGH)
- DF-C17-005: MapView re-renders every progress change (MEDIUM/HIGH)
- DF-C17-006: HomeInner 440-line god component (MEDIUM/HIGH)
- DF-C17-007: Missing aria-valuetext on SceneEditor sliders (MEDIUM/HIGH) -- partially addressed by P1-1 above
- DF-C17-008: No unit tests (HIGH/HIGH)
- DF-C17-009: No undo/redo for scene edits (MEDIUM/HIGH)
- DF-C17-010: CSS custom properties without fallbacks (LOW/MEDIUM)
- DF-C17-011: No granular error boundaries (LOW/MEDIUM)
- DF-C17-012: GoogleGuide tabs not keyboard accessible (LOW/HIGH)
- DF-C17-013: interpolateAlongTrack edge case at progress=1.0 (LOW/MEDIUM)
- DF-C17-014: showSaveFilePicker type casting (LOW/HIGH)
- DF-C17-015: JourneyCreator totalDistance without segmentStartIndices (LOW/HIGH)
- DF-C17-016: i18n translations bundled inline (LOW/HIGH)
- DF-C17-017: Mobile density on small screens (LOW/MEDIUM)
- DF-C17-018: FileUpload drop zone focus indicator (LOW/MEDIUM)
- DF-C17-019: Export frame count display inaccuracy (LOW/MEDIUM) -- partially addressed by P1-2 above

## Convergence Note

Cycle 2 found 3 new issues (1 Medium, 2 Low), down from 30 in cycle 1. The codebase continues to converge. All correctness bugs from cycle 1 are fixed, and the only Medium-severity finding is a same-class variant of a previously fixed bug that was missed due to being in a different file. The deferred items are architectural or feature-level changes that require dedicated passes.
