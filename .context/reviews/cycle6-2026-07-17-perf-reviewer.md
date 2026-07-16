# Performance Reviewer — Cycle 6 (2026-07-17)

Reviewed revision: `1d2755c` on `codex/review-plan-fix-2026-07-16`

## Result

**No new performance findings.** CR6-01 is a camera-state correctness defect, not evidence of a new hot-path regression. The four measured-redesign deferrals and preserved-buffer evidence gate remain the complete known performance backlog.

## Coverage

- Read all 53 tracked `src/` files and all 15 unit suites, with focused tracing of playback RAF ownership, interpolation/cumulative distance work, wrapped route and trail chunk generation, elevation SVG construction, timeline/scene drag handlers, Journey Creator distance previews, map hydration/style swaps, export capture/encoding, and Google worker parsing.
- Read the full 19-file E2E inventory, all seven scripts, both Playwright configurations, Vitest/Next/TypeScript/ESLint/PostCSS configuration, package graph metadata, all public style/map/worker assets, README, current context, Cycle 5 aggregate, performance provenance, and implementation record.
- Reviewed allocation, asymptotic cost, render breadth, event frequency, backpressure, memory ceilings, cleanup, and work duplication. This was a read-only source review; no profiler or representative-device claim is made.

## Existing items deliberately not re-reported

- **D01:** `src/lib/usePlaybackController.ts:98-155` and `src/app/page.tsx:180-232,577-595` keep per-frame progress in broad root React ownership. It remains a High/High measured architecture deferral.
- **D02:** `src/components/ElevationProfile.tsx:20-60,91-133` renders every selected elevation point. It remains a Medium/High profiling/downsampling deferral.
- **D03:** `src/components/JourneyCreator.tsx:194-198,363-373` performs a full route-distance scan for drag previews. It remains a Medium/High incremental/throttled-preview deferral.
- **D04:** `src/lib/useExportController.ts:174-239` and `src/lib/videoEncoder.ts:223-247` retain a second per-frame idle check pending proof that it is redundant for every render state.
- **B04:** `src/components/MapView.tsx:903-914` still enables preserved drawing buffers globally. The cost assertion remains representative-hardware evidence-gated; static inspection is not materially new evidence.

## Verified current safeguards

- `src/lib/videoEncoder.ts:117-133,162-180` clamps export inputs, rejects estimated in-memory use above 256 MiB before encoder allocation, computes cumulative distances once, and normalizes scenes outside the frame loop.
- `src/lib/videoEncoder.ts:184-215,245-270` reuses one staging canvas, closes captured frames and samples in `finally`, and awaits encoder backpressure.
- Map trail data is precomputed/chunked and updated incrementally; wrapped-segment geometry avoids rebuilding the entire traveled route for each frame.
- JSON parsing transfers the original buffer to a worker and retains a fallback copy only at or below the documented 16 MiB bound. XML and point/tag/depth budgets remain bounded.
- Script polling and static-server shutdown paths have deadlines and bounded retries; no unbounded review-time loop or newly introduced busy wait was found.

## Final missed-issue sweep

Rechecked large-track import, near-ceiling point counts, disconnected segments, antimeridian wrapping, high-FPS export, cancellation/finalization, style retry, manual dragging, resize, and locale/theme transitions for accidental repeated work or retained resources. No new regression had both a concrete performance failure scenario and evidence beyond the already recorded B04/D01-D04 items.

## Explicit skipped-file accounting

- Of 721 tracked `.context/` files, 21 active/provenance files were read and 700 superseded historical artifacts were skipped. All 39 legacy root `plan/` files were likewise skipped as superseded.
- The WOFF2 font payload was not decoded; its CSS/load/CSP path was reviewed. Lockfile graph and package contracts were inspected structurally rather than treating every generated integrity line as authored source.
- No tracked implementation, configuration, script, textual public asset, test, or fixture was skipped.
