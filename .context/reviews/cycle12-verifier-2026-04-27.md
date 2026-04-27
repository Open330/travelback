# Cycle 12 Verifier Review — 2026-04-27

Reviewer: verifier
Scope: Evidence-based correctness check against stated behavior

## Verification results

| ID | Claim | Verdict | Evidence |
|----|-------|---------|----------|
| V12-01 | `preflightXml` rejects DOCTYPE before `stripXmlEntities` runs | VERIFIED | `parser.ts:192` calls `preflightXml(text, formatName)` on raw input before `stripXmlEntities(text)` at line 193. Vitest tests `parseGPX — DOCTYPE rejection` and `parseKML — DOCTYPE rejection` pass (112/112 tests). |
| V12-02 | Export playback throttle uses time-based 100ms interval | VERIFIED | `useExportController.ts:207` checks `now - lastProgressUpdateTimeRef.current >= 100` where `now = performance.now()`. |
| V12-03 | Export progress bar aria-valuenow clamped to 100 | VERIFIED | `ExportPanel.tsx:295` uses `Math.min(100, Math.round(exportProgress * 100))`. |
| V12-04 | Degenerate GeoJSON fallback produces valid LineString | VERIFIED | Commit 9a943f3 fixed `buildTrackGeometry` to return `{ type: 'LineString', coordinates: [] }` instead of `{ type: 'LineString', coordinates: [undefined] }` when no segments exist. |
| V12-05 | `downloadVideo` user activation guard prevents save dialog after exports | NOT VERIFIED as desirable — the guard works as coded but produces undesirable UX (see C12-CR-01). The technical behavior matches the code, but the code's intent (only use save dialog when user is "active") conflicts with the user expectation (save dialog after export completes). |

## Summary

4 of 5 claims verified. 1 claim verified as technically correct but producing undesirable behavior.
