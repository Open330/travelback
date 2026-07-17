# Cycle 9 performance review — 2026-07-17

## Result

**New performance findings: 0.** No new latency, frame-rate, GPU, memory, battery, thermal, parser-complexity, or export-throughput defect was established beyond the retained B04/D01-D04 ledger. CR9-01 is a visible camera-correctness failure, not a newly measured performance regression.

## Coverage

Reviewed exact HEAD `342b8c13` and the full Cycle 8 delta from `81342b7`, then read all 37 textual production sources, all 17 unit suites, the complete E2E specification and 19 fixtures, all 7 scripts, public text/map/worker assets, dependency/configuration files, and active architecture/development/plan/review context. The 913-file tracked inventory and 39 legacy plan plus 747 non-active context documents were catalogued and searched for performance provenance; binary font/icon payloads were limited to reference/delivery checks.

## Current areas checked clean

- `src/lib/camera.ts:258-268` caches overview bounding-box work by `Track`; `src/components/MapView.tsx:1090-1098` prepares cumulative distances and trail chunks on track ownership changes rather than on every pose.
- `src/lib/parse-utils.ts:7-89`, `src/lib/googleJsonParser.ts:226-336`, and `src/lib/parser.ts:32-33,146-177,491-516` bound file size, point count, JSON depth, XML tag count, and XML nesting. The Cycle 8 untimed-revisit repair removes a lossy deduplication step without adding a second unbounded pass.
- `src/lib/videoEncoder.ts:7,161-180,223-268` retains export memory admission and per-frame abort checks. The Cycle 8 changes do not add work to the encoding loop.
- `src/components/JourneyCreator.tsx:323-411` performs constant-time deadline checks for the corrected post-drag suppression; no timer or accumulating listener was introduced.
- `src/components/MapView.tsx:1101-1129` adds at most three revision-owned readiness listeners and removes all three on success, staleness, dependency cleanup, or unmount. Source inspection did not support a retry storm or retained-listener regression.
- `src/lib/i18n.ts:1883-1907` adds one post-mount preference resolution; the real-provider hydration regression covers the intended single transition and no render loop is present.

## Camera-boundary observation

`src/lib/camera.ts:540-631` can evaluate two camera endpoints during transition branches, but that bounded constant work is not the material problem. The confirmed fault is that touching boundaries and internal gaps repeat/reset the interpolation, producing discontinuous output in both `src/components/MapView.tsx:803-817` and `src/lib/videoEncoder.ts:228-237`. It is counted once as CR9-01/ARCH9-01/DB9-01/TRACE9-01, not reclassified as performance work.

## Dependency/build-tool observations

`npm audit --json` returned 0 vulnerabilities. The lock uses integrity-pinned registry tarballs. `npm outdated --json` found only two compatible direct patch refreshes (`tailwindcss` and `@tailwindcss/postcss` 4.3.2→4.3.3) plus major-version tooling migrations that require peer/runtime compatibility work. No performance claim can be made from version age alone, so this is not a finding.

## Existing ledger, not re-counted

- **B04 — Medium/Medium:** always-on `preserveDrawingBuffer` still needs representative mobile/low-end GPU frame-time, memory, battery, and thermal comparison (`src/components/MapView.tsx:920-930`).
- **D01 — High/High:** foreground playback progress still commits broad root React state each animation frame (`src/lib/usePlaybackController.ts:98-155`; `src/app/page.tsx:173-232,577-595`).
- **D02 — Medium/High:** elevation SVG geometry remains O(n) in samples (`src/components/ElevationProfile.tsx:20-60,91-133`).
- **D03 — Medium/High:** waypoint drag distance preview remains O(n) per move (`src/components/JourneyCreator.tsx:197-201,372-381`).
- **D04 — Medium/High:** export retains a second idle wait per captured frame (`src/lib/useExportController.ts:181-240`; `src/lib/videoEncoder.ts:223-268`).

These require representative profiling or capture-correctness evidence. This read-only review did not invent measurements or change behavior.

## Validation and final sweep

Lint, no-emit TypeScript, 17 suites/400 tests, generated-worker parity, and the dependency audit passed. No server, browser, build, profiler, export, or port was started, so no fresh runtime-performance number is claimed. The final pass covered render ownership, effect/listener cleanup, O(n) loops, per-frame camera/export paths, parser budgets, allocation/URL cleanup, generated-worker parity, and delivery scripts. No additional performance root cause survived.
