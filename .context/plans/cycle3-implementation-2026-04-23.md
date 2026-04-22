# Cycle 3 Implementation Plan (2026-04-23)

Source: `.context/reviews/_aggregate.md` (cycle 3 review, 3 agents)

## Cycle 2 Fix Verification -- All Confirmed Applied in Main-Thread Code

All 3 P0/P1 items from cycle 2 are verified as correctly applied in the main-thread code. See `_aggregate.md` for details. However, C2-F1 was NOT applied to the worker file, which is the primary code path.

## Active Implementation Items

### P0-1: Fix worker segment remap filter dropping index 0
- **Source**: C3-F1
- **Severity / Confidence**: HIGH / HIGH
- **Cross-agent**: code-reviewer (C3-F1), debugger (C3-F1 confirmed)
- **Files**: `public/workers/trackParser.worker.js:200`
- **Root Cause**: The worker file has `.filter(idx => idx > 0)` on line 200, which is the exact same bug that was fixed in `src/lib/parser.ts:424` during cycle 2 (changed to `idx >= 0`). The worker file was not updated when the main-thread parser was fixed. Since the worker is the PRIMARY code path for Google Location History parsing (used when `typeof Worker !== 'undefined'`, which is true in all modern browsers), this means the cycle 2 fix only applied to the fallback path.
- **Action**: Change `.filter(idx => idx > 0)` to `.filter(idx => idx >= 0)` on line 200 of `public/workers/trackParser.worker.js`.
- **Verify**: After fixing, grep for `idx > 0` across the entire codebase to confirm no other instances of this bug class remain.
- **Status**: TODO

### P1-1: Synchronize worker error code mapping with main-thread parser
- **Source**: C3-F3
- **Severity / Confidence**: MEDIUM / HIGH
- **Cross-agent**: debugger (C3-F3)
- **Files**: `public/workers/trackParser.worker.js:258-267`
- **Root Cause**: The worker maps errors to codes via `message.includes(...)` string matching, while the main-thread parser uses a `ParseError` class with explicit codes. If error messages in the main-thread parser are ever reworded, the worker's string matching will break silently, causing all worker errors to fall through to `'INVALID_GOOGLE_JSON'`.
- **Action**: Add explicit error code constants at the top of the worker file and use them in both the throw sites and the catch block, rather than relying on message string matching. Define constants like `const ERROR_CODES = { UNSUPPORTED_FORMAT: 'UNSUPPORTED_GOOGLE_FORMAT', JSON_DEPTH: 'JSON_DEPTH_EXCEEDED', TOO_LARGE: 'FILE_TOO_LARGE', INVALID: 'INVALID_GOOGLE_JSON' }` and throw errors with a `.code` property, then check `.code` in the catch block instead of matching on message text.
- **Verify**: Ensure that after the change, all worker error paths still produce the correct error codes that the main-thread `parseGoogleLocationHistoryInWorkerBuffer` handler expects (UNSUPPORTED_GOOGLE_FORMAT, JSON_DEPTH_EXCEEDED, FILE_TOO_LARGE, INVALID_GOOGLE_JSON).
- **Status**: TODO

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

Cycle 3 found 2 new issues (1 High, 1 Medium), continuing the convergence trend. The High-severity finding (C3-F1) is a same-class variant of the C2-F1 fix that was missed because it was in a different file (the worker). The worker code path is the primary execution path, making this finding more impactful than the original C2-F1 fix. After this cycle, the segment filter bug class should be fully eliminated across all code paths.
