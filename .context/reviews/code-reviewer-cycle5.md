# Code Reviewer — Cycle 5 (2026-04-23)

## Methodology
Reviewed all 30+ source files with focus on logic correctness, error handling, edge cases, and maintainability. Cross-referenced with prior cycle findings to avoid duplicates.

## Cycle 4 Fix Verification
Both cycle 4 fixes confirmed applied:
- C4-F1 (NaN coordinates bypass): FIXED — `Number.isFinite()` checks added in both `parser.ts` and worker
- C4-F2 (FileUpload concurrent parse race): FIXED — `if (loading) return` guards in `handleDrop` and `handleInputChange`

## New Findings

### C5-F1. SceneEditor aria-valuetext uses hardcoded English strings (i18n gap)
- **Severity**: MEDIUM | **Confidence**: HIGH
- **File**: `src/components/SceneEditor.tsx:531, 547, 565, 581`
- **Issue**: The `aria-valuetext` attributes on zoom, pitch, bearing, and rotation sliders use hardcoded English words: "Zoom", "Tilt", "Direction", "Orbit speed". For Korean, Japanese, Chinese, and Spanish screen reader users, these labels are announced in English. The rest of the UI is properly internationalized.
  - Line 531: `aria-valuetext={`Zoom ${scene.params.zoom}`}`
  - Line 547: `aria-valuetext={`Tilt ${scene.params.pitch}°`}`
  - Line 565: `aria-valuetext={`Direction ${scene.params.bearingOffset}°`}`
  - Line 581: `aria-valuetext={`Orbit speed ${scene.params.rotationSpeed}°/s`}`
- **Fix**: Add translation keys for these label fragments and use `t()` in the `aria-valuetext` attributes. For example: `aria-valuetext={`${t('scenes.zoom')} ${scene.params.zoom}`}`.
- **Impact**: Screen reader users in non-English locales hear inconsistent language. WCAG 2.2 language of parts (3.1.2) concern.

### C5-F2. Coordinate validation boundary inconsistency in parseSemanticSegments visit path
- **Severity**: LOW | **Confidence**: HIGH
- **Files**: `src/lib/parser.ts:281 vs 305`, `public/workers/trackParser.worker.js:110 vs 128`
- **Issue**: In `parseSemanticSegments`, the timelinePath branch rejects coordinates at exactly ±90 lat / ±180 lng using `Math.abs(lat) > 90 || Math.abs(lng) > 180` (strict inequality, so ±90/±180 are rejected). But the visit branch uses `Math.abs(lat) <= 90 && Math.abs(lng) <= 180` (accepts exactly ±90/±180). The `pushE7` and `parseRecords` functions also reject ±90/±180 (strict inequality). This means a coordinate at exactly lat=90 would be accepted in the visit path but rejected everywhere else. In practice, GPS coordinates at exactly ±90/±180 are extremely rare (poles and antimeridian).
- **Fix**: Change the visit path in both `parser.ts:305` and the worker to use `!(Math.abs(lat) > 90 || Math.abs(lng) > 180)` consistently, or change all paths to use `<=` for consistency. The strict inequality (`> 90`) is the safer choice since ±90 latitude is a degenerate case at the poles.
- **Impact**: Inconsistent filtering at boundary values. Negligible practical impact but could cause subtle differences in parsed output between code paths.

### C5-F3. ExportPanel duration state captures value only on first open
- **Severity**: LOW | **Confidence**: MEDIUM
- **File**: `src/components/ExportPanel.tsx:66-76`
- **Issue**: The `useEffect` that syncs `duration` from `playbackDuration` prop has a `panelOpenedRef` guard that only applies the prop value on the *first* open. If the user opens the export panel, closes it, changes the animation duration in Controls, then reopens the export panel, the old duration value persists. The `panelOpenedRef` is set to `false` when `isOpen` becomes false (line 74), so on the next open the prop should be synced again. Wait — actually on re-read, line 74 sets `panelOpenedRef.current = false` when `isOpen` becomes false, and line 67-70 only syncs if `!panelOpenedRef.current`. So this DOES sync on each open. The `panelOpenedRef` guard prevents syncing on re-renders while the panel is already open. This is actually correct behavior. **Downgrading** to informational.
- **Impact**: None — the logic is correct.

## Previously Found Issues (Confirmed Still Present)
All 19 deferred items from DF-C17-001 through DF-C17-019, plus DF-C4-001 and DF-C4-002, remain valid and carried forward.

## Positive Findings
- NaN validation fix from cycle 4 is solid — covers all four code paths
- Concurrent parse race fix is clean — `loading` state checked in both `handleDrop` and `handleInputChange`
- Parser error code system is well-designed with `ParseError.code` for i18n mapping
- Worker/main-thread parser synchronization is consistent after recent fixes
- `useExportController` has good cleanup behavior with mounted ref and abort signal handling
