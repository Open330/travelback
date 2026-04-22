# Debugger — Cycle 5 (2026-04-23)

## Methodology
Analyzed the codebase for latent bug surface, failure modes, edge cases, race conditions, and regression risks. Traced data flows through critical paths.

## New Findings

### C5-DB1. Coordinate validation boundary inconsistency (duplicates C5-F2)
- **Severity**: LOW | **Confidence**: HIGH
- **Files**: `src/lib/parser.ts:281 vs 305`, `public/workers/trackParser.worker.js:110 vs 128`
- **Issue**: Same as C5-F2. The `parseSemanticSegments` timelinePath branch uses strict inequality (`Math.abs(lat) > 90`) while the visit branch uses `<=` comparison (`Math.abs(lat) <= 90`). The two branches handle the boundary case (lat=90, lng=180) differently.
- **Cross-agent agreement**: code-reviewer (C5-F2)

### C5-DB2. Worker textCopy allocation doubles memory for large files
- **Severity**: LOW | **Confidence**: HIGH
- **File**: `src/lib/parser.ts:450`
- **Issue**: `parseGoogleLocationHistoryInWorkerBuffer` creates `textCopy = decodeJsonBuffer(buffer)` before transferring the ArrayBuffer to the worker. For a 100MB JSON file, this means ~200MB of memory is held simultaneously (100MB buffer + 100MB textCopy string). The textCopy is needed for the fallback path if the worker fails, but it's allocated even when the worker succeeds. This is a known tradeoff — without the copy, the fallback path can't recover from worker failures.
- **Impact**: Memory pressure on low-end devices. The 100MB JSON limit mitigates the worst case.
- **Fix consideration**: Could lazily decode the fallback text only if the worker fails, but this requires keeping the original buffer (which gets detached on transfer). The current approach is the simplest correct solution.

### C5-DB3. Race between worker creation failure and textCopy fallback
- **Severity**: LOW | **Confidence**: LOW
- **File**: `src/lib/parser.ts:456-464`
- **Issue**: If `new Worker(...)` throws, the code falls back to `parseGoogleLocationHistory(textCopy)`. If the fallback also throws, the error is caught and `reject`ed. This is correct. However, if the Worker constructor throws due to a CSP violation (which could also prevent the main-thread parse), the user would see a generic error. This is a very unlikely edge case.
- **Impact**: Negligible — CSP violations are caught at a different level.

## Previously Deferred (Carried Forward)
All prior deferred items remain valid.
