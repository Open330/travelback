# Aggregate Review — Cycle 10

**Date:** 2026-04-19
**Source:** `comprehensive-deep-code-review-2026-04-19-cycle10.md`

## New Findings (Deduplicated)

| ID | Finding | Severity | Confidence | Action |
|----|---------|----------|------------|--------|
| NEW-C12-1 | Ref updates during render (Toast.tsx:23, ModalDialog.tsx:85) — `react-hooks/refs` ESLint errors | MEDIUM | HIGH | Fix: move ref assignments into useEffect |
| NEW-C12-2 | setState-in-effect warnings (ExportPanel.tsx:61, GoogleGuide.tsx:141) | LOW | HIGH | Fix: derive state or reset via callback/key |
| NEW-C12-3 | Unused `useMemo` import in SceneEditor.tsx:3 | INFO | HIGH | Remove unused import |
| NEW-C12-4 | Unused `computeOverviewCamera` function in camera.ts:97 | INFO | HIGH | Remove dead code |
| NEW-C12-5 | Missing `aria-selected` on JourneyCreator.tsx:610 option elements | LOW | HIGH | Add aria-selected attribute |
| NEW-C12-6 | Missing `t` dependency in FileUpload.tsx:94 handleDrop useCallback | LOW | MEDIUM | Add t to dependency array |
| NEW-C12-7 | checkJsonDepth spot-check depth undercount in parser.ts:338-360 | LOW | MEDIUM | Defer |
| NEW-C12-8 | downloadVideo fetch fallback for revoked URL (videoEncoder.ts:162) | MEDIUM | LOW | Already deferred as F7 |

## Previously Fixed Findings (Verified Still Fixed)

| ID | Finding | Fix Status |
|----|---------|------------|
| NEW-C11-1 | TimelineSelector distance-ratio to point-index mapping mismatch | Confirmed fixed |
| NEW-C11-2 | ExportPanel Share button silently fails when file sharing unsupported | Confirmed fixed |
| NEW-C8-1 | Playback hotkeys not suppressed during export | Confirmed fixed |
| NEW-C8-2 | Export overlay missing `data-disable-playback-hotkeys` | Confirmed fixed |
| NEW-C9-1 | `setExportState('idle')` not guarded by `mountedRef` | Confirmed fixed |

## Deferred Findings

All 10 previously deferred findings remain deferred (F4, F5, F7, F8, F9, F11, F12, F14, F16, NEW-R3-2).

New deferred items from this cycle:
- **NEW-C12-7**: checkJsonDepth spot-check depth undercount. LOW/MEDIUM. The current spot-check is a reasonable performance/safety tradeoff for a DoS mitigation. Exit criterion: If a concrete attack vector is identified, or if parser performance allows full-file scanning.
- **NEW-C12-8**: Overlaps with existing deferred F7 — no change.

## Agent Failures

None. Single-reviewer cycle (multi-angle analysis within one pass).

## Overall Assessment

The codebase has reached a mature, well-hardened state. Cycle 10 produced 2 actionable MEDIUM-severity findings (ESLint `react-hooks/refs` errors), 3 LOW-severity items, and 2 INFO-level cleanup items. The ESLint errors are the most impactful — they represent React 19 anti-patterns that should be corrected. Diminishing returns from further review cycles are now very strong.
