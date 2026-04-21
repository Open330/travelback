# Cycle 6 Tracer Review -- 2026-04-21

**Reviewer:** tracer
**Scope:** Causal tracing of suspicious flows, competing hypotheses

---

## Review Summary

Traced the full data flow for the recently fixed worker buffer transfer path and the playback accumulator. Both fixes are correct. No new traceable concerns found.

---

## New Findings

None.

---

## Traced Flows

**Worker buffer transfer fix (C5-A1):**
1. User uploads JSON file -> `parseTrackFile` -> `parseGoogleLocationHistoryInWorkerBuffer`
2. `textCopy = decodeJsonBuffer(buffer)` runs BEFORE `postMessage(..., [buffer])` -- correct order
3. Worker creation failure: falls back to `parseGoogleLocationHistory(textCopy)` -- uses pre-transfer copy, correct
4. Worker `onmessage` with error: rejects with `ParseError` from worker -- does NOT fall back to main-thread parse, correct
5. Worker `onmessage` with no track: falls back to `parseGoogleLocationHistory(textCopy)` -- uses pre-transfer copy, correct
6. Worker `onerror`: falls back to `parseGoogleLocationHistory(textCopy)` -- uses pre-transfer copy, correct
7. All fallback paths use `textCopy`, never the transferred (detached) `buffer` -- VERIFIED CORRECT

**Playback accumulator fix (C5-A2):**
1. `useEffect([isPlaying, track])` starts animation
2. `startTimestampRef.current = performance.now()` and `startProgressRef.current = progressRef.current` at animation start
3. Each frame: `elapsedSec = (now - startTimestampRef.current) / 1000`
4. `nextProgress = startProgressRef.current + (elapsedSec * speedRef.current) / durationRef.current`
5. This is wall-clock-based, not frame-count-based -- eliminates frame-rate dependency -- VERIFIED CORRECT

**Previously reported -- still valid:**
- C4-A16: Redundant DOM attribute application in useEffect
