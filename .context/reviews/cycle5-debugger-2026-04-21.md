# Cycle 5 Debugger Review -- 2026-04-21

**Reviewer:** debugger
**Scope:** Latent bug surface, failure modes, regressions, edge cases

---

## Review Summary

Systematic search for latent bugs, failure modes, and edge cases across all source files. The codebase has good defensive programming with NaN guards, null checks, and error boundaries. Found 1 new issue.

---

## New Findings

### C5-DB1: Worker error handler falls back to main-thread parse with the same buffer that was transferred (detached)

**Severity:** MEDIUM
**Confidence:** LOW
**File:** `src/lib/parser.ts:467-477, 498-506`

When `worker.onmessage` receives an error from the worker, it falls back to calling `parseGoogleLocationHistory(decodeJsonBuffer(buffer))` (lines 473, 481). However, the buffer was transferred to the worker via `worker.postMessage({ ext: 'json', buffer }, [buffer])` on line 509, which detaches it from the main thread. The `buffer` variable in the closure should be a zero-length detached ArrayBuffer after transfer.

In practice, the `worker.onmessage` and `worker.onerror` handlers fire *after* `postMessage` with the transfer list. At that point, `buffer` in the closure is detached and `decodeJsonBuffer(buffer)` would decode an empty string, causing `JSON.parse` to throw.

However, the worker's `onmessage` handler fires when the *worker* sends a message back, meaning the worker already has the buffer. If the worker reports an error via `onmessage`, it means the worker successfully received and tried to parse the data but failed. The fallback to main-thread parse with the same (now detached) buffer would fail silently.

The `worker.onerror` handler (line 498) has the same issue -- it falls back to main-thread parsing with the detached buffer.

**Impact:** Fallback to main-thread parsing silently fails when the worker reports errors. The user gets a generic error instead of a useful retry.
**Fix:** Either (a) keep a copy of the buffer data before transferring (e.g., `const bufferCopy = buffer.slice(0)` before `postMessage`), or (b) remove the main-thread fallback in `onmessage`/`onerror` and just reject with the error from the worker.

---

## Edge Case Verification

- **Empty track points:** `interpolateAlongTrack` handles 0 and 1 point cases
- **Degenerate bounds:** `buildFitBounds` expands single-point bounds with DEGENERATE_PADDING
- **Antimeridian crossing:** Longitude wrapping handled in `buildTrackGeometry`, `buildFitBounds`, `lerpCamera`
- **NaN guards:** All `parseFloat`/`parseInt` in onChange handlers checked with `Number.isFinite()`
- **Export abort:** AbortSignal checked at top of frame loop and after `renderFrame`
- **Map resize on export failure:** `useExportController.ts:176-190` has fallback reset via DOM query
