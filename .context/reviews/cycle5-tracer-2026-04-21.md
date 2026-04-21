# Cycle 5 Tracer Review -- 2026-04-21

**Reviewer:** tracer
**Scope:** Causal tracing of suspicious flows, competing hypotheses

---

## Review Summary

Traced the full data flow for theme initialization, file import, and export pipelines. Found 1 new traceable concern.

---

## New Findings

### C5-TR1: Worker buffer transfer creates a silent failure path in parser fallback

**Severity:** MEDIUM
**Confidence:** MEDIUM
**File:** `src/lib/parser.ts:440-510`

This is the same finding as C5-DB1 from the debugger, traced through the causal chain:

1. User uploads a JSON file
2. `parseTrackFile` calls `parseGoogleLocationHistoryInWorkerBuffer`
3. Worker is created, buffer is transferred via `postMessage({ ext: 'json', buffer }, [buffer])`
4. At this point, `buffer` in the main thread closure is detached (zero-length)
5. Worker encounters a parse error and sends `onmessage` with `{ error: '...' }`
6. Main thread handler falls back to `parseGoogleLocationHistory(decodeJsonBuffer(buffer))`
7. `decodeJsonBuffer(detachedBuffer)` decodes an empty string
8. `JSON.parse('')` throws a SyntaxError
9. This SyntaxError is caught by the outer `catch` in `parseTrackFile`
10. User sees a generic "Failed to parse file" error instead of the specific error from the worker

The same flow occurs for `worker.onerror` (lines 498-506).

**Hypothesis:** The fallback was intended to handle cases where the Worker API fails entirely (not where the worker runs but produces an error). The current code conflates these two cases.

**Fix:** Split the fallback logic: if the worker *exists* and reports an error, just reject with the worker's error message. Only fall back to main-thread parsing if the Worker *cannot be created* (which is handled at lines 447-457).

---

## Previously Reported -- Still Valid

- C4-A16: Redundant DOM attribute application in useEffect
- C4-A17: fullTrack and track set to same value initially
