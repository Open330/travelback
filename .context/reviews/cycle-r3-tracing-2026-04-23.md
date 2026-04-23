# Cycle r3 — tracer review (2026-04-23)

Scope: causal tracing of suspicious flows; competing hypotheses.

## Traces performed

### T-1 — "FileUpload setTimeout leaking on unmount"
- **Hypothesis A**: The `setTimeout(() => setIsDragging(false), 200)` pair at `FileUpload.tsx:85, 90` fires after unmount.
- **Hypothesis B**: The overlay only unmounts via `hasTrack`, which is set via `onTrackLoaded` → `loadTrackIntoSession`. `parseTrackFile` is async; on a very small valid GPX, it can complete in <200 ms on fast hardware.
- **Verification**: Read `FileUpload.handleDrop`, `handleFile`, and `page.tsx:347` (`{!isCreatingJourney && <FileUpload … />}`). When a track is loaded, `setTrack(nextTrack)` runs, flipping `hasTrack`. `FileUpload` is kept mounted (it has a different rendering when `hasTrack` is true at `:109-129`) — so in fact the component does NOT unmount after drop. The timer is simply redundant because the drag-drop visual should already have ended.
- **Conclusion**: R3-DB-1 / R3-CR-1 is still real (the timer still fires `setState` on a component that is now in a different render), but does NOT cause an unmount warning — only a redundant setState call. Severity remains LOW, fix justifies scheduling only for code-quality reasons.

### T-2 — "approxDistanceMeters antimeridian failure"
- **Hypothesis A**: Journey drawn across the antimeridian hits the proximity-suppression threshold (5 m) — at the dateline, `b.lng - a.lng` can be ~360, and multiplying by `cos(avgLat)` gives a huge "distance", NOT a small one. So the 5 m suppression *fails open* (fires the point), not *fails closed* (blocks the point).
- **Verification**: `JourneyCreator.tsx:29-34` math: `dLng = (b.lng - a.lng) * π/180 * cos(avgLat π/180)`. For a=179.9 and b=-179.9, `(b-a) = -359.8`. Result ~ -6.28 rad; squared and multiplied by R=6_371_000 gives ~40,000 km — well above the 5 m threshold. So the suppression correctly allows the click. Not a *bug*, but a silent mismatch with `MapView.centerDistanceMeters` which uses `shortestLngDelta` (returning -0.2° in the same case, giving ~22 km).
- **Conclusion**: No user-visible bug today. The DF-R2-001 carry-over is correct as a cosmetic/DRY finding.

### T-3 — "CSP blocks Nominatim fetch in hardened production"
- **Hypothesis**: `connect-src 'self'` in prod → `fetch('https://nominatim.openstreetmap.org/…')` throws → JourneyCreator search silently fails.
- **Verification**: did not open `harden-static-export.mjs` this cycle. Flagged as R3-SEC-2 for future verification. Given the dev-mode CSP also says `connect-src 'self'`, the fetch should already fail in dev too — unless the dev overlay is lenient. Needs hands-on confirmation.
- **Conclusion**: Low-confidence finding; documented as R3-SEC-2 deferred.

### T-4 — "Export cancel during rAF waitForIdle causes hang"
- **Hypothesis**: If `signal.aborted` flips between the per-frame check and `waitForIdle` call, the promise blocks forever.
- **Verification**: `MapView.waitForIdle` attaches `signal.addEventListener('abort', onAbort)` and calls `finishAbort()` that resolves the promise immediately. Correctly handled.
- **Conclusion**: No bug.

## Recommendations

No unique tracer findings beyond what other lanes cover. Confirming DF-R2-001 as architecturally valid (not a bug today).
