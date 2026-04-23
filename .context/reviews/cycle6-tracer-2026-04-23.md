# Cycle 6 Tracer Review -- 2026-04-23

**Reviewer:** tracer
**Scope:** Causal tracing of suspicious flows, competing hypotheses

---

## Review Summary

Causal tracing of data flows through parser, interpolation, camera, and export paths. All flows are correct after 5 cycles of fixes. Found 0 new issues.

---

## New Findings

None.

---

## Flow Traces

**Parse -> Display flow:**
1. File upload -> `parseTrackFile` -> worker or main-thread parser
2. Worker: `JSON.parse` -> `parseGoogleLocationHistory` -> dedup -> sort -> remap segment starts -> return Track
3. Main thread: `finalizeTrack` validates min 2 points, max 250K points
4. Track stored in state -> `computeCumulativeDistances` -> MapView renders

**Playback -> Camera flow:**
1. `usePlaybackController` computes progress via accumulator (timestamp-based)
2. Progress flows to MapView via props
3. MapView calls `interpolateAlongTrack` -> `computeCameraForProgress`
4. Camera smoothing applied -> `map.jumpTo` updates map

**Export flow:**
1. `exportTrack` -> resize map -> `waitForIdle` -> frame loop
2. Each frame: compute camera -> apply -> waitForIdle -> capture
3. On completion: `output.finalize()` -> Blob -> download
4. On abort: skip finalize (prevents corrupt MP4)

**All flows verified correct. No data-loss or state-corruption paths found.**
