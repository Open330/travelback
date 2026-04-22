# Aggregate Review — Cycle 4 (2026-04-23)

## Methodology
3 review agents: code-reviewer, debugger, security-reviewer. All 30+ source files examined. Findings deduplicated with prior cycle reviews. Cross-agent agreement noted.

---

## CYCLE 3 FIX VERIFICATION

Both cycle 3 fixes are confirmed applied:
- C3-F1 (worker segment remap filter): FIXED in `public/workers/trackParser.worker.js:200` (`idx >= 0`)
- C3-F3 (worker error code mapping): FIXED — `ERROR_CODE` constants and `WorkerParseError` class with `.code` property replace fragile string matching

---

## NEW FINDINGS (sorted by severity x confidence)

### C4-F1. NaN coordinates bypass Math.abs validation in pushE7/parseRecords
- **Severity**: HIGH | **Confidence**: HIGH
- **Cross-agent**: code-reviewer (C4-F2)
- **Files**: `src/lib/parser.ts:184-186` (pushE7), `src/lib/parser.ts:196` (parseRecords), `public/workers/trackParser.worker.js:30-31` (pushE7), `public/workers/trackParser.worker.js:44` (parseRecords)
- **Issue**: `Math.abs(NaN) > 90` evaluates to `false`, so NaN coordinates pass the validation check. If a malformed Google Location History record has non-numeric `latitudeE7`/`longitudeE7` values (e.g., strings, undefined after E7 conversion), the resulting NaN lat/lng will pass both `Math.abs(lat) > 90` and `Math.abs(lng) > 180` guards. This introduces NaN coordinates into the track data, causing rendering artifacts in MapLibre GL and broken distance calculations. Affects both the main-thread parser and the worker (primary code path).
- **Fix**: Add `Number.isFinite(lat)` and `Number.isFinite(lng)` checks in both `pushE7` and `parseRecords`, in both `parser.ts` and the worker file.

### C4-F2. FileUpload handleDrop missing loading guard — concurrent parse race
- **Severity**: MEDIUM | **Confidence**: HIGH
- **Cross-agent**: code-reviewer (C4-F1), debugger (D4-F2)
- **File**: `src/components/FileUpload.tsx:77-90`
- **Issue**: `handleDrop` calls `handleFile(file)` without checking the `loading` state. If a user drops a second file while the first is still parsing, both parse operations run concurrently. The second `setLoading(false)` in `finally` fires first, causing the UI to exit loading state while the first parse is still running. The second file's `onTrackLoaded` also overwrites the first file's track.
- **Fix**: Add `if (loading) return` guard at the top of `handleDrop`. Also check `handleFileInput` for the same issue.

### C4-F3. SceneEditor normalizes scenes on every name keystroke
- **Severity**: MEDIUM | **Confidence**: MEDIUM
- **File**: `src/components/SceneEditor.tsx:330-344` (updateScene), `442-443` (name input)
- **Issue**: `updateScene` calls `commitScenes` which calls `normalizeScenes` on every change. Name-only changes trigger a full normalization pass (sorting, zero-duration filtering) unnecessarily since name changes cannot affect scene ranges.
- **Fix**: Skip `normalizeScenes` when the patch only contains `name`. Call `onChange` with the updated scenes directly without normalization for name-only patches.

### C4-F4. ExportPanel estimated time multiplier may be inaccurate
- **Severity**: LOW | **Confidence**: MEDIUM
- **File**: `src/components/ExportPanel.tsx:105`
- **Issue**: `estimatedSeconds = Math.round(duration * 0.5 * resScale * codecScale)` uses a 0.5x base multiplier that underestimates 4K AV1 encoding time. The estimate is labeled with "~" and "approx" qualifiers, so user expectations are managed.
- **Fix**: Adjust the base multiplier or make it resolution/codec-dependent for better accuracy. Low priority since the estimate is clearly labeled as approximate.

---

## AGENT FAILURES
None. All 3 review perspectives covered.

## POSITIVE FINDINGS
- Cycle 3 fixes verified as correctly applied in both code paths
- Security posture remains strong — no new security issues
- Worker error code synchronization working correctly
- Export cleanup has good fallback behavior for resetSize failures
- FileUpload error code mapping is clean (no string matching on error messages)

---

## PRIOR DEFERRED FINDINGS CARRIED FORWARD

All 19 deferred items from `.context/plans/deferred-findings-cycle17-2026-04-23.md` remain valid and are carried forward without modification (DF-C17-001 through DF-C17-019).
