# Cycle 11 performance review

Target: `7273d464fdce24fc06350ce1444c3a2e8d26829d`
Role: performance reviewer
Date: 2026-07-17

## Result

No fresh performance finding met the reporting bar. The review confirmed two fresh correctness roots (`C11-CORE-01`, `C11-CORE-02`) and one reopened async-lifecycle edge (`C11-REOPEN-01`), but none is primarily a throughput, memory, load-time, or energy defect. Existing `D01`-`D04` and evidence-gated `B04` remain the accurate performance inventory.

## Inventory and coverage

The pass covered all 56 tracked `src/` files, all 20 E2E/fixture paths, all 19 public assets, all seven scripts, workflow/README/manifests/configs, and the lock metadata. It traced hot/frame paths in playback, MapLibre rendering, timeline/elevation geometry, camera scenes, waypoint dragging, parsing/worker transfer, and per-frame export. It catalogued all 787 `.context/` and 39 `plan/` paths; current instructions, Cycle 10 aggregate/plan, pending inventory, and performance history were read or searched for deduplication. Binary/generated assets were inventoried, with worker source ownership inspected. Dependency/build/report trees were excluded.

Fresh lint/unit/worker commands were unavailable because the primary dependency tree lacks working ESLint, Vitest, and esbuild installations; no installation or server was started. Target application code is identical to accepted code commit `cc720a2`, whose isolated historical matrix passed 431 unit tests, both 106-case browser suites, build/static smoke, audit, and a real MP4 case. This is provenance context, not fresh performance measurement.

## Performance assessment

- `C11-CORE-01` — Medium/High, fresh, at `src/components/JourneyCreator.tsx:336-369,705-721,925-962`, `src/app/page.tsx:196-210,332-347`, and `src/components/MapView.tsx:836-856`. Scenario: delete a confirmed route to zero points, then Create; the app accepts a settled `0 / 0 locations` workspace while empty cumulative distances prevent track-layer hydration. Fix: freeze/revalidate and copy a valid draft. This is a cardinality/commit correctness invariant, not a new hot-path cost.
- `C11-CORE-02` — Medium/High, fresh, at `src/lib/usePlaybackController.ts:199-249` and `src/app/page.tsx:243-259`. Scenario: focus remains on Camera or a Scene control and Escape is returned before dispatch. Fix: route global dismissal before playback-only interactive suppression. Runtime cost is negligible, so this is not counted as performance.
- `C11-REOPEN-01` — Medium/High, reopened `AG2-02`, at `src/components/FileUpload.tsx:64-66,126-140` and `src/app/page.tsx:414-447,604-609`. Scenario: a held sample fetch survives a newer unsupported drop and later installs itself. Fix: invalidate sample ownership at every file attempt before preflight. It may perform needless fetch/parse work, but its actionable root is the already-owned stale-result boundary, not a separate performance problem.
- Cycle 10's 256-code-point imported-name bound closes the prior unbounded DOM/live-region amplification. Parser file/point/depth/tag budgets, transferable JSON worker buffer, and abort/timeout cleanup remain bounded.
- Static assets are local, map styles contain no tile/glyph/sprite sources, and runtime worker/style cache policy intentionally revalidates mutable public assets.

## Existing performance ledger (not fresh)

- `D01` High/High at `src/lib/usePlaybackController.ts:98-168` and `src/app/page.tsx:173-232,577-595`: root playback-progress commits still rerender broad UI; reopen only with representative profiling and a frame-frequency ownership redesign.
- `D02` Medium/High at `src/components/ElevationProfile.tsx:23-184`: elevation SVG still includes every sample; reopen with near-ceiling profiles and endpoint/extrema-preserving downsampling.
- `D03` Medium/High at `src/components/JourneyCreator.tsx:197-201,373-383`: every drag update calls `syncUI`, which recomputes route distance in O(n); reopen with measured route sizes and incremental/throttled evidence.
- `D04` Medium/High at `src/lib/useExportController.ts:186-197,219-231` and `src/lib/videoEncoder.ts:223-247`: export performs a second idle check per frame; change only after real-export profiling proves it redundant without capture corruption.
- `B04` Medium/Medium at `src/components/MapView.tsx:923-933`: always-on `preserveDrawingBuffer` remains evidence-gated on representative GPU frame time, memory, battery, and thermal comparison.

The workflow's missing unit gate (`B01`), permission scope (`B02`), legal-license input (`B03`), physical-device items `M10-01`/`M9-01`, and cleanup inventory are non-performance carryovers and were not duplicated.

## Final missed-issue sweep

The last pass searched for per-frame allocation, quadratic scans, retained RAF/timers/listeners, duplicate parse or fetch work, unbounded strings/arrays, image/font/network bloat, cache mistakes, object/blob leaks, synchronous large-file work, and tests that hide responsiveness regressions. Every credible item reduced to `D01`-`D04`, `B04`, the already-fixed Cycle 10 name bound, or the reopened `AG2-02` lifecycle edge. No new causal performance root survived.
