# Performance Reviewer — Deep Review (2026-07-16)

## Scope

Reviewed hot animation/export paths, WebGL lifecycle, parser allocation behavior, worker boundaries, large-file guards, and preset feasibility. Static reasoning was paired with the production build, 219 unit tests, and direct memory calculations. Browser/device costs marked Manual risk require profiling before choosing an implementation.

## Findings

### PR-01 — The trail “optimization” removes required per-frame work

Severity: High | Confidence: High | Status: Confirmed correctness regression

Files: src/components/MapView.tsx:568-578 and 1069-1080

The segmentIndexChanged guard avoids rebuilding GeoJSON while the marker moves inside a vertex pair. The active trail endpoint is itself per-frame data, so this optimization changes output rather than merely reducing work. It produces a frozen/stair-step trail in both playback and export.

Suggested fix: precompute and structurally share completed coordinates, then update only the active endpoint each frame. Measure source-update cost with 250,000-point fixtures; do not skip visual state changes.

### PR-02 — Segmented Google imports can allocate far beyond the advertised point budget

Severity: Medium | Confidence: High | Status: Likely under adversarial/large input

Files: src/lib/googleJsonParser.ts:74-117, 150-192, and 229-270; public/workers/trackParser.worker.js:68-105, 127-162, and 188-233

Each timeline/semantic segment enforces MAX_TRACK_POINTS against a fresh local array. The aggregate budget is checked only later, after all segment arrays have been retained, individually sorted, copied, and deduplicated. A file containing many sub-250,000-point segments can therefore allocate millions of point objects and several copies before rejection. Worker isolation protects the UI thread but not the tab/process memory budget.

Suggested fix: maintain a shared parse-wide count as points are appended, or flatten incrementally so the 250,000-point cap also bounds intermediate storage. Benchmark near-cap records, many small segments, and repeated-point data.

### PR-03 — The worker depth preflight leaves the expensive tail unchecked

Severity: Medium | Confidence: Medium | Status: Manual risk

Files: src/lib/googleJsonParser.ts:273-304 and public/workers/trackParser.worker.js:277-321

checkJsonDepth scans only the first 10 MiB of files allowed up to 100 MiB, relying on valid exports having uniform depth. Deep or pathological content after that prefix reaches JSON.parse without the intended guard and can cause a long parse, excessive allocation, or worker failure. The parser promise also has no deadline at src/lib/parser.ts:239-335, so loading UI can remain pending for an unbounded worker operation.

Suggested fix: scan the full transferred text in the worker, or use a streaming parser that enforces depth and aggregate point limits in one pass. Add a bounded timeout/cancellation path with a recovery message.

### PR-04 — Cancelled and failed exports retain encoder resources

Severity: Medium | Confidence: High | Status: Confirmed

Files: src/lib/videoEncoder.ts:115-173

Output is started before the frame loop, but only successful completion calls finalize. Abort, map-render rejection, wait failure, and CanvasSource.add failure leave the Output started. Mediabunny documents Output.cancel as releasing internal encoders; omitting it can make repeated cancel/retry sessions accumulate WebCodecs and GPU resources.

Suggested fix: await cancel on every non-completed path and verify repeated abort/restart with a resource-aware mock and a real-browser soak test.

### PR-05 — WebGL readback cost is paid for every interactive frame

Severity: Medium | Confidence: Medium | Status: Manual risk

File: src/components/MapView.tsx:745-762

The only map is created permanently with preserveDrawingBuffer true for export capture. MapLibre defaults this attribute to false, and buffer preservation/readback can reduce GPU throughput and increase memory bandwidth on integrated/mobile GPUs. The source comment calls the impact negligible without a measured budget.

Suggested fix: profile frame time, GPU memory, and battery on representative low-end/mobile hardware. If material, isolate export capture in a dedicated/offscreen map or use a capture path that does not require permanent preservation.

### PR-06 — 4K presets are dead choices under the memory model

Severity: Medium | Confidence: High | Status: Confirmed

Files: src/types.ts:96-104, src/lib/videoEncoder.ts:50-65, and src/components/ExportPanel.tsx:90-108

For 3840×2160, rawFrameBytes × 8 × 1.5 alone is 398,131,200 bytes, about 379.7 MiB. That exceeds MAX_IN_MEMORY_EXPORT_BYTES before duration, bitrate, or frame bookkeeping are added. Both 4K orientations are therefore disabled for all valid configurations.

Suggested fix: align the preset catalog with the actual capacity envelope, or redesign the output/memory strategy and validate it on browsers that support the selected codec.

## Positive observations

Distance arrays and wrapped route segments are precomputed, playback uses requestAnimationFrame with a hidden-page fallback, and large JSON work is normally transferred to a worker. Those choices are sound; the findings above concern broken cache granularity and incomplete resource/input bounds.

## Summary

6 findings: 1 High and 5 Medium. Three are confirmed; two need stress fixtures and one needs device profiling.
