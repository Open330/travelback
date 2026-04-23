# Cycle r4 — Performance Reviewer — 2026-04-23

Scope: CPU/memory/UI responsiveness. Measured against the live static build on localhost.

## PR-1 (LOW, HIGH) — Cold-boot FCP measured

- Browser Navigation Timing across 6 viewports:
  - 320w: DOM complete 102 ms, FCP 56 ms
  - 375w: DOM complete 84 ms, FCP 56 ms
  - 768w: DOM complete 90 ms, FCP 88 ms
  - 1024w: DOM complete 91 ms, FCP 92 ms
  - 1440w: < 100 ms, FCP ~60 ms
  - 1920w: < 100 ms, FCP ~60 ms
- longTasks: 0 on every viewport.
- **No action needed.**

## PR-2 (LOW, MEDIUM) — `src/components/MapView.tsx:553-558`: `preserveDrawingBuffer: true` is on for every session, not just during export

- This was documented as a known trade-off (comment on lines 551-556). The cost is real on integrated GPUs.
- Alternative: create the map with `preserveDrawingBuffer: false` and `true`-flip only during export via `map.resize()` trick. But MapLibre does not support that flip; a redesign would require re-initialization.
- **Defer** (deliberate trade-off, documented in source).

## PR-3 (LOW, MEDIUM) — `src/components/TimelineSelector.tsx:103-121`: `buckets` useMemo is O(N × BUCKET_COUNT) but runs every track change and only outputs a 60-element array

- Current cost: linear in points per render. For 200K-point tracks this is ~12M ops — but only runs on track/cumulDist change, not during drag. Drag path uses refs. No measurement showed a slowdown.
- **No action needed.**

## PR-4 (LOW, MEDIUM) — `src/components/MapView.tsx:849-932`: `progress` useEffect runs on every frame and re-reads refs; jumpTo cost is amortized by `shouldApplyCamera` threshold

- Already threshold-guarded (`MIN_CAMERA_MOVE_METERS`, etc.). Not a hotspot.
- **No action needed.**

## PR-5 (LOW, MEDIUM) — `src/lib/videoEncoder.ts` dynamic-imports `mediabunny` on every `isCodecSupported` call, so the first modal open has up to 3 module loads in parallel

- ExportPanel probes all three codecs in parallel (`Promise.all`), so one module load covers all three. Good.
- **No action needed.**

## Summary

No schedulable findings this cycle. Perf posture is healthy.
