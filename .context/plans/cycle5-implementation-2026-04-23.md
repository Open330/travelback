# Cycle 5 Implementation Plan (2026-04-23)

Source: `.context/reviews/_aggregate.md` (cycle 5 review, 10 agents)

## Cycle 4 Fix Verification -- All Confirmed Applied

Both P0/P1 items from cycle 4 are verified as correctly applied:
- C4-F1 (NaN coordinates bypass): FIXED — `Number.isFinite()` checks in all 4 code paths
- C4-F2 (FileUpload concurrent parse race): FIXED — `if (loading) return` guards

## Active Implementation Items

### P0-1: Fix SceneEditor aria-valuetext hardcoded English — i18n accessibility gap
- **Source**: C5-F1
- **Severity / Confidence**: MEDIUM / HIGH
- **Cross-agent**: code-reviewer (C5-F1), designer (C5-D1), critic (C5-CR1)
- **Files**: `src/components/SceneEditor.tsx:531, 547, 565, 581`; `src/lib/i18n.ts`
- **Root Cause**: The `aria-valuetext` attributes on zoom, pitch, bearing, and rotation sliders use hardcoded English words ("Zoom", "Tilt", "Direction", "Orbit speed") instead of i18n translation keys. The existing translation keys `scenes.zoom`, `scenes.pitch`, `scenes.bearing`, and `scenes.rotation` already exist for the labels, so we can reuse them.
- **Action**:
  1. In `src/components/SceneEditor.tsx:531`: Change `aria-valuetext={`Zoom ${scene.params.zoom}`}` to `aria-valuetext={`${t('scenes.zoom')} ${scene.params.zoom}`}`
  2. In `src/components/SceneEditor.tsx:547`: Change `aria-valuetext={`Tilt ${scene.params.pitch}°`}` to `aria-valuetext={`${t('scenes.pitch')} ${scene.params.pitch}°`}`
  3. In `src/components/SceneEditor.tsx:565`: Change `aria-valuetext={`Direction ${scene.params.bearingOffset}°`}` to `aria-valuetext={`${t('scenes.bearing')} ${scene.params.bearingOffset}°`}`
  4. In `src/components/SceneEditor.tsx:581`: Change `aria-valuetext={`Orbit speed ${scene.params.rotationSpeed}°/s`}` to `aria-valuetext={`${t('scenes.rotation')} ${scene.params.rotationSpeed}°/s`}`
- **Verify**: After fixing, run `next build` and `tsc --noEmit`. Confirm that screen readers in Korean/Japanese/Chinese/Spanish locales announce the slider values in the correct language.
- **Status**: TODO

### P1-1: Refactor parseSemanticSegments visit path for consistency
- **Source**: C5-F2
- **Severity / Confidence**: LOW / HIGH
- **Cross-agent**: code-reviewer (C5-F2), debugger (C5-DB1), verifier (C5-V1), critic (C5-CR2)
- **Files**: `src/lib/parser.ts:305`, `public/workers/trackParser.worker.js:128`
- **Root Cause**: The visit path in `parseSemanticSegments` uses a different comparison pattern (`<=` and `&&`) than all other coordinate validation paths (`>` and `||`). While the behavior is identical (both accept lat=90 and lng=180), the inconsistent style creates maintenance risk. The double-negative form is harder to reason about.
- **Action**:
  1. In `src/lib/parser.ts:305`: Replace `if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) > 90 || Math.abs(lng) > 180))` with the consistent pattern: check for null/NaN first, then check bounds. Something like:
     ```
     if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
     out.push({ lat, lng, time: gTime(dur) })
     ```
  2. In `public/workers/trackParser.worker.js:128`: Apply the same refactor to match the main-thread parser.
- **Verify**: After fixing, run `next build` and `tsc --noEmit`. Grep for `Math.abs(lat)` in both files to confirm all coordinate validations follow the same pattern.
- **Status**: TODO

### P2-1: Deduplicate longitude wrapping functions
- **Source**: C5-F3
- **Severity / Confidence**: LOW / HIGH
- **Files**: `src/lib/interpolate.ts:5-6`, `src/lib/camera.ts`, `src/components/MapView.tsx:61-63`
- **Root Cause**: `normalizeLng`, `shortestLngDelta`, and `shortestLongitudeDelta` are reimplemented locally in three files. `interpolate.ts` exports the functions, but `camera.ts` and `MapView.tsx` have their own copies.
- **Action**:
  1. In `src/lib/camera.ts`: Remove the local `normalizeLng` and `shortestLngDelta` functions. Add imports from `./interpolate`.
  2. In `src/components/MapView.tsx`: Remove the local `shortestLongitudeDelta` function. Add import from `@/lib/interpolate` (the function is named `shortestLngDelta` there). Update call sites to use the imported name.
- **Verify**: After fixing, run `next build` and `tsc --noEmit`. Verify no behavioral change by checking the import resolution.
- **Status**: TODO

## Deferred Items

### New Deferrals This Cycle

- **DF-C5-001**: Worker ERROR_CODE and MAX_MESSAGE_SIZE constants not enforced against parser.ts (C5-F4, LOW/HIGH)
  - **Reason**: Adding build-time validation for worker/main-thread constant synchronization is infra work outside the current code-fix scope. The constants currently match. Converting the worker to TypeScript would be the proper fix but is a larger refactor.
  - **Exit criterion**: Re-open when the worker is converted to TypeScript or when a build validation step is added.

### Previously Deferred (Carried Forward from Cycle 17 and Cycle 4)

All deferred items from `deferred-findings-cycle17-2026-04-23.md` and `cycle4-implementation-2026-04-23.md` remain valid and are carried forward without modification:

- DF-C17-001: normalizeScenes silently drops zero-duration scenes (MEDIUM/HIGH)
- DF-C17-002: Worker fallback path inconsistency (MEDIUM/MEDIUM)
- DF-C17-003: CSP unsafe-inline CI check (MEDIUM/HIGH)
- DF-C17-004: Video export sequential waitForIdle performance (MEDIUM/HIGH)
- DF-C17-005: MapView re-renders every progress change (MEDIUM/HIGH)
- DF-C17-006: HomeInner 440-line god component (MEDIUM/HIGH)
- DF-C17-007: Missing aria-valuetext on SceneEditor sliders (MEDIUM/HIGH) -- addressed by C5-F1
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
- DF-C17-019: Export frame count display inaccuracy (LOW/MEDIUM)
- DF-C4-001: SceneEditor normalizes on every name keystroke (MEDIUM/MEDIUM)
- DF-C4-002: ExportPanel estimated time multiplier inaccuracy (LOW/MEDIUM)
