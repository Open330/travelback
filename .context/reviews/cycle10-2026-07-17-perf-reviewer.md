# Cycle 10 performance review

Target: `3d74754369d22ad1bb9e7970634e0f0163d5b777`
Role: performance reviewer
Date: 2026-07-17

## Result

One new Low, likely/manual-validation responsiveness issue was found. No new CPU, memory, animation-throughput, or load-path issue met the reporting bar beyond performance work already present in the deferred ledger.

## Inventory and coverage

The performance pass covered all 55 `src/` paths; the complete 20-path E2E surface; all 19 public assets; all seven scripts; root build/test/type/lint/Playwright/PostCSS/Next manifests and configs; the Pages workflow; and `README.md`. Binary/generated assets were inventoried, the generated worker was provenance-checked, and the lock graph was audited. All 774 `.context/` and 39 `plan/` paths were catalogued, with current instructions and historical performance findings read or searched for deduplication. Dependency and build-output trees were excluded.

`npm run check:worker` passed and `npm audit --audit-level=low --json` returned zero vulnerabilities. Runtime unit/lint gates were unavailable because the pre-existing primary dependency tree is incomplete and lacks `node_modules/.bin`; no dependency installation was performed.

## Finding

### C10-CORE-03 — A legal XML import can amplify its name into multi-megabyte DOM/live-region work

- Severity: Low
- Confidence: Medium
- Status: Likely; requires browser/AT measurement
- Locations: `src/lib/parse-utils.ts:18-27`, `src/lib/parser.ts:214-230`, `src/app/page.tsx:330-340`, `src/app/page.tsx:636-640`, `src/components/TrackWorkspace.tsx:126-140`

The 4 MiB XML budget constrains the file, not the extracted display field. GPX/KML name text is retained without a field bound, rendered in both responsive title nodes, and copied into a focused `aria-live="polite"` status. A file containing two valid points and roughly 3.9 MiB of name text therefore turns one parse result into several large DOM/accessibility strings. Modern browsers may tolerate the raw text allocation, but layout, accessibility-tree updates, focus announcement, and subsequent reconciliation can become visibly unresponsive; that impact was not measurable in the current incomplete runtime environment.

Root fix: normalize and cap the canonical parsed display name before it reaches React, then add parser boundary tests and a browser measurement around import-to-interactive time. A limit in the low hundreds of Unicode code points preserves real names while eliminating the amplification path.

## Performance sweep and non-findings

- Rechecked the playback RAF/fallback timer, map render waiting, export frame loop, object-URL ownership, event/timer cleanup, parser size/point/depth/tag budgets, worker transfer ownership, timeline/elevation memoization, scene scans, large-track cumulative-distance calculations, local static assets, and CSS animation/reduced-motion behavior.
- `C10-CORE-01` is a playback correctness failure, not an animation-throughput finding; `C10-CORE-02` is visualization correctness, not excess computation. They are documented in the code/tracer/debugger reports rather than inflated into performance duplicates.
- Deferred D01-D04 work (root playback rerenders, `preserveDrawingBuffer`, glass effects, and repeated timeline/elevation scans) was recognized and not counted again.

## Final missed-issue sweep

The last sweep looked specifically for unbounded loops, per-frame allocation, retained listeners/timers, blob/URL leaks, duplicate parsing, main-thread work on large inputs, unnecessary network assets, cache mistakes, and tests that hide responsiveness regressions. Apart from the unbounded display-name field, no new causal performance issue survived source tracing and deduplication.
