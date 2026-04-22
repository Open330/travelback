# Verifier — Cycle 2 (2026-04-23)

## Verification of Cycle 1 Fixes

| Finding | Fix Applied? | Verified? |
|---------|-------------|-----------|
| F1: FileUpload duplicate size check | Yes | Yes — removed, ParseError code path works |
| F2: Map style persisted to localStorage | Yes | Yes — cycleStyle and handleModeChange both write, bootstrap reads |
| F3: handleRangeChange segment filter | Yes | Yes — changed to `index >= 0` |
| F4: Scene overlap detection | Yes | Yes — overlap check in commitScenes with i18n keys |
| F6: usePlaybackController unmount guard | Yes | Yes — mountedRef with guard in animate |
| F7: Korean export.at | Yes | Yes — now 'at' instead of '' |
| F8: reader.onerror ParseError | Yes | Yes — uses ParseError with READ_FAILED |
| F9: ThemeToggle matchMedia | Yes | Yes — onModeChange inside controlledMode guard |
| F10: TimelineSelector onRangeChange | Yes | Yes — fires during drag via rAF |
| F18: Export cleanup guard | Partially | Yes — mapViewRef.current checked on line 196 |

## New Findings

### N1. Parser segment remap filter still uses `idx > 0` instead of `idx >= 0`
- **Severity**: Medium | **Confidence**: High
- **File**: `src/lib/parser.ts:424`
- **Issue**: The `adjustedSegStarts` filter drops segment starts that remap to index 0. This is the same pattern as the fixed F3 in page.tsx, but in the parser's Google Location History import path. The page.tsx fix changed `> 0` to `>= 0`, but the parser was not identified as having the same issue in cycle 1.
- **Evidence**: Line 424: `.filter(idx => idx > 0)` — if `idx` is 0, the segment boundary is lost.
- **Fix**: Change to `.filter(idx => idx >= 0)`.

### N2. ESLint and TypeScript gates pass cleanly
- **Verification**: Ran `npx eslint src/` and `npx tsc --noEmit` — both pass with zero errors.

## Summary

All cycle 1 fixes verified as applied. One new medium-severity issue found (parser segment filter). The codebase is in good shape.
