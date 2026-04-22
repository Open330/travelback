# Cycle 4 Implementation Plan (2026-04-23)

Source: `.context/reviews/_aggregate.md` (cycle 4 review, 3 agents)

## Cycle 3 Fix Verification -- All Confirmed Applied

Both P0/P1 items from cycle 3 are verified as correctly applied:
- C3-F1 (worker segment remap filter): FIXED — `idx >= 0` on line 200 of worker
- C3-F3 (worker error code mapping): FIXED — `ERROR_CODE` constants and `WorkerParseError` with `.code` property

## Active Implementation Items

### P0-1: Fix NaN coordinates bypassing Math.abs validation in pushE7/parseRecords
- **Source**: C4-F1
- **Severity / Confidence**: HIGH / HIGH
- **Cross-agent**: code-reviewer (C4-F2)
- **Files**: `src/lib/parser.ts:184-186` (pushE7), `src/lib/parser.ts:196` (parseRecords), `public/workers/trackParser.worker.js:30-31` (pushE7), `public/workers/trackParser.worker.js:44` (parseRecords)
- **Root Cause**: `Math.abs(NaN) > 90` evaluates to `false`, so NaN coordinates pass the validation check. If a malformed Google Location History record has non-numeric `latitudeE7`/`longitudeE7` values, the resulting NaN lat/lng will pass both `Math.abs(lat) > 90` and `Math.abs(lng) > 180` guards. This introduces NaN coordinates into the track data, causing rendering artifacts in MapLibre GL and broken distance calculations. Affects both the main-thread parser and the worker (primary code path).
- **Action**:
  1. In `src/lib/parser.ts` `pushE7` (line 186): add `Number.isFinite(lat) && Number.isFinite(lng)` check before the `out.push`. Can combine with the `Math.abs` check: `if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return`
  2. In `src/lib/parser.ts` `parseRecords` (line 196): add `Number.isFinite(lat) && Number.isFinite(lng)` check similarly.
  3. In `public/workers/trackParser.worker.js` `pushE7` (line 31): same fix.
  4. In `public/workers/trackParser.worker.js` `parseRecords` (line 44): same fix.
- **Verify**: After fixing, grep for `Math.abs` in parser files to confirm all coordinate validation checks also guard against NaN. Run `next build` and `tsc --noEmit`.
- **Status**: DONE

### P1-1: Fix FileUpload handleDrop missing loading guard
- **Source**: C4-F2
- **Severity / Confidence**: MEDIUM / HIGH
- **Cross-agent**: code-reviewer (C4-F1), debugger (D4-F2)
- **Files**: `src/components/FileUpload.tsx:77-90`
- **Root Cause**: `handleDrop` calls `handleFile(file)` without checking the `loading` state. If a user drops a second file while the first is still parsing, both parse operations run concurrently. The second `setLoading(false)` in `finally` fires first, causing the UI to exit loading state while the first parse is still running. The second file's `onTrackLoaded` also overwrites the first file's track.
- **Action**: Add `if (loading) return` guard at the top of `handleDrop` (line 77). Since `loading` is a React state variable, it needs to be in the dependency array of `useCallback`. Also check `handleFileInput` for the same issue — if there's a file input handler, it should have the same guard.
- **Verify**: After fixing, verify that dropping a file while another is loading is a no-op. Run `next build` and `tsc --noEmit`.
- **Status**: DONE

## Deferred Items

### New Deferrals This Cycle

- **DF-C4-001**: SceneEditor normalizes on every name keystroke (C4-F3, MEDIUM/MEDIUM)
  - **Reason**: The performance impact is negligible with typical scene counts (2-10). The fix requires adding logic to detect name-only patches and skip normalization, which adds complexity to `updateScene` and `commitScenes`. Not a correctness bug.
  - **Exit criterion**: Re-open if SceneEditor performance becomes an issue with large scene counts, or during a SceneEditor refactor pass.

- **DF-C4-002**: ExportPanel estimated time multiplier inaccuracy (C4-F4, LOW/MEDIUM)
  - **Reason**: The estimate is clearly labeled as approximate with "~" and "approx" qualifiers. The inaccuracy is a cosmetic issue, not a correctness bug. Making the estimate more accurate would require benchmarking actual encoding times across resolutions/codecs, which is hardware-dependent.
  - **Exit criterion**: Re-open when export panel is next modified or if users report confusion about estimates.

### Previously Deferred (Carried Forward from Cycle 17)

All deferred items from `deferred-findings-cycle17-2026-04-23.md` remain valid and are carried forward without modification:

- DF-C17-001: normalizeScenes silently drops zero-duration scenes (MEDIUM/HIGH)
- DF-C17-002: Worker fallback path inconsistency (MEDIUM/MEDIUM)
- DF-C17-003: CSP unsafe-inline CI check (MEDIUM/HIGH)
- DF-C17-004: Video export sequential waitForIdle performance (MEDIUM/HIGH)
- DF-C17-005: MapView re-renders every progress change (MEDIUM/HIGH)
- DF-C17-006: HomeInner 440-line god component (MEDIUM/HIGH)
- DF-C17-007: Missing aria-valuetext on SceneEditor sliders (MEDIUM/HIGH) -- addressed by C2-F2
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
- DF-C17-019: Export frame count display inaccuracy (LOW/MEDIUM) -- addressed by C2-F3

## Convergence Note

Cycle 4 found 4 new issues (1 High, 2 Medium, 1 Low), continuing the convergence trend. The High-severity finding (C4-F1) is a NaN validation gap that has existed since the parser was first written — `Math.abs(NaN) > N` is always false in JavaScript, so malformed E7 values that produce NaN after division would silently pass coordinate validation. After this fix, both the main-thread parser and worker will reject NaN coordinates. The two Medium findings (concurrent parse race, unnecessary normalization) are correctness and performance improvements respectively.
