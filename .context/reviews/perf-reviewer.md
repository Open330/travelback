# Performance Reviewer — Cycle 5 (2026-07-16)

Reviewed revision: bdfb1d7

## Result

New performance findings: **0**. I found no new confirmed regression relative to Cycle 4. The known architecture costs below are still present and remain carryovers, not Cycle 5 IDs.

## Inventory and evidence

Reviewed all 53 files under src, including parser/worker boundaries, MapLibre rendering, playback and export loops, camera math, timeline/elevation construction, Journey Creator gestures, all 15 Vitest files, the 2,214-line/93-test Playwright suite, 18 fixtures, scripts, package/framework configuration, static assets, Pages workflow, and current project/development/plan context.

Actual-app checks covered 1440×1000 and 390×844, dark/light, playback, Camera, Export, responsive fit, network/console state, and reduced-motion behavior. The full dev E2E run reported 91 passed, 1 skipped, and 1 flaky in 12.3 minutes; the flaky map-retry case passed a separate retries-disabled 3/3 run. That timing is unsuitable as a performance benchmark because a separate browser export probe was active, so it is not used to infer a product slowdown.

## Confirmed carryovers

### PERF5-CARRY-01 — Root-owned React progress is still committed per playback frame

Original severity/confidence: **High / High**

Current region: src/lib/usePlaybackController.ts:98-155, with root consumers in src/app/page.tsx:180-232, 577-595.

The animation loop calls setPlaybackProgress on each foreground frame, and page-owned progress fans into map, controls, scenes, and export-related consumers. This remains D01 from the Cycle 4 plan.

Exit criterion: profile representative tracks, then introduce an imperative/external-store animation boundary while preserving seek, camera follow, scenes, and export.

### PERF5-CARRY-02 — Elevation SVG strings scale with every track point

Original severity/confidence: **Medium / High**

Current region: src/components/ElevationProfile.tsx:20-60, 91-133.

Both pathD and areaD contain every elevation sample. This remains D02; browser emulation did not establish a new measured failure.

Exit criterion: profile near the supported point ceiling, choose distance-aware downsampling with endpoint/extrema guarantees, and add visual regressions.

### PERF5-CARRY-03 — Waypoint dragging scans the full route on every move

Original severity/confidence: **Medium / High**

Current region: src/components/JourneyCreator.tsx:194-198, 363-373.

Each drag move updates map sources and calls syncUI, whose totalDistance call is O(n). This remains D03.

Exit criterion: use incremental adjacent-segment updates or a throttled preview with an exact terminal reconciliation, verified at a documented route-size target.

### PERF5-CARRY-04 — Always-on preserved WebGL buffers still lack representative hardware evidence

Original severity/confidence: **Medium / Medium**

Current region: src/components/MapView.tsx:582-595.

preserveDrawingBuffer remains required by the current export capture path. The nearby claim that impact is negligible is not supported by low-end/mobile GPU, memory, battery, or thermal evidence. This remains B04 rather than a new finding.

Exit criterion: compare p50/p95 frame time and memory on representative low-end/mobile hardware, then isolate export capture only if the impact is material.

### PERF5-CARRY-05 — Export still performs an idle check for every captured frame

Original severity/confidence: **Medium / High**

Current region: src/lib/useExportController.ts:174-239 and src/lib/videoEncoder.ts:223-247.

renderFrameAndWait already waits for a render event; exportVideo then calls waitForIdle for each frame. The fast path can return immediately for bundled local styles, so source inspection alone does not quantify the cost. This is historical DF-C17-004, not a new regression.

Exit criterion: profile real exports and prove whether the second wait is redundant before changing frame correctness.

## Positive checks

Trail publication remains chunk-bounded, cumulative distance lookups are reused, visible export progress is throttled, local map styles avoid runtime tile networks, and no new unbounded loop, per-frame allocation multiplier, or asset/network expansion was introduced.

## Final missed-issue sweep

Rechecked parser limits, render ownership, all requestAnimationFrame sites, map source updates, export capture, codec probing, layout paths, and build scripts against Cycle 4 history. No additional performance issue met the evidence threshold. No deployment was attempted.
