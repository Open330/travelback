# Architect — Cycle 5 (2026-04-27)

Repository: `/Users/hletrd/flash-shared/Travelback`
Reviewer: architect

## Findings

### ARCH5-01 — MapView mixes declarative props with imperative side effects, creating ordering dependencies
- **Severity:** MEDIUM-HIGH
- **Confidence:** High
- **File:** `src/components/MapView.tsx:430-1146`
- **Description:** MapView uses a complex pattern of `useEffect` hooks that interact through shared refs (`mapRef`, `trackRef`, `cumulDistRef`, `lastCameraStateRef`, etc.). The effects have ordering dependencies: the map initialization effect must run before the track-loading effect, which must run before the animation state effect. React doesn't guarantee effect ordering across renders — it only guarantees cleanup runs before the next effect for the same hook. This creates subtle race conditions where, for example, the animation state effect might try to update layers that haven't been added yet because the track-loading effect hasn't run yet.
- **Failure scenario:** A React concurrent-mode re-render delays the track-loading effect. The animation state effect runs first and tries to call `addTrackLayers` on a map that doesn't have the style loaded yet. The guard at line 1000 (`map.isStyleLoaded()`) catches this case, but the timing dependency creates a fragile architecture where every new feature must be carefully sequenced against existing effects.
- **Suggested fix:** Consider replacing the multi-effect pattern with a single effect that manages the MapLibre lifecycle based on a computed "desired state" object. This eliminates ordering issues by computing the desired map state in a single pass. Alternatively, use a state machine to model the MapView lifecycle (initializing -> ready -> has-track -> animating -> exporting).

---

### ARCH5-02 — Export pipeline crosses three module boundaries without a unified error model
- **Severity:** MEDIUM
- **Confidence:** High
- **File:** `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/components/MapView.tsx`
- **Description:** The export pipeline involves: (1) `useExportController` orchestrating the export, (2) `exportVideo` encoding frames, (3) `MapView.renderFrameAndWait` capturing frames. Errors in this pipeline are represented as: `DOMException` (abort), `ExportError` (encoding failure), generic `Error` (map render failure, idle timeout), and string messages (MapLibre errors). The `useExportController` error handler at lines 206-223 must handle all these types differently. The `isMapRenderExportError` function checks `error.message.includes('Map did not finish rendering')` — this is fragile string-based error classification.
- **Failure scenario:** A new error type is added to the video encoder (e.g., "codec initialization failed"). The error handler doesn't recognize it, so the user sees a generic "Export failed" message without actionable details. The error code for i18n mapping is lost.
- **Suggested fix:** Define a unified `ExportPipelineError` hierarchy with machine-readable codes. All export errors should flow through this model, not through string matching on error messages.

---

### ARCH5-03 — `precomputedSegmentsRef` is populated in one effect but consumed in another
- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **File:** `src/components/MapView.tsx:939, 1016-1046`
- **Description:** `precomputedSegmentsRef` is populated in the track-loading effect (line 939) but consumed in the animation state effect (line 1016). If the animation state effect runs before the track-loading effect (which can happen during concurrent renders), `precomputedSegmentsRef.current` is empty and the trail falls back to the slower `buildTrackGeometry` path. This isn't a correctness bug (the fallback path works), but it means the optimization is unreliable.
- **Failure scenario:** After a track change, the first few animation frames use the slow trail rebuild path instead of the precomputed segments. On large tracks, this causes a visible stutter on the first frame after track load.
- **Suggested fix:** Move `precomputedSegmentsRef` population into the same effect that consumes it, or ensure the animation effect waits for precomputation to complete.

---

## Summary

| ID | Severity | Confidence | File |
|----|----------|------------|------|
| ARCH5-01 | MEDIUM-HIGH | High | MapView.tsx |
| ARCH5-02 | MEDIUM | High | useExportController.ts / videoEncoder.ts / MapView.tsx |
| ARCH5-03 | LOW-MEDIUM | High | MapView.tsx |
