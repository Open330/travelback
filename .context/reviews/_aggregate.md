# Aggregate Deep Review — Cycle 7

Date: 2026-07-24
Reviewed revision: `216001ff2bc4ff8c31da333e50e6d0e982816b5b`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment: prohibited and not attempted

## Result

The 12-role reviewer fan-out plus the registered non-technical-traveler
reviewer produced **3 genuinely new, deduplicated findings**:

- 0 Critical
- 1 High
- 0 Medium
- 2 Low

All three roots are actionable in Cycle 7 and none is deferred. Reports
shared by multiple roles count once at the highest supported severity and
confidence. All Cycle 1–6 fixes, the three explicit native/host process
boundaries, and the final-loop-only user cleanup task were excluded.

Fresh browser-free review evidence:

- A Node 24 boundary probe confirmed that array spreading succeeds with
  100,000 arguments but deterministically throws `RangeError` at 125,000,
  150,000, and 250,000 arguments.
- Parser and worker file-scoped Vitest passed 203/203 existing tests; those
  tests do not cover the accepted 250,000-point boundary.
- A deterministic filename probe confirmed that
  `'a'.repeat(63) + '😀'` becomes a 64-code-unit string ending in the
  unpaired high surrogate `0xD83D` under the current sanitizer.
- Static source tracing disproved two current architecture-diagram edges.
- No reviewer ran a full suite, supervisor, E2E, Playwright, Chromium,
  browser, server, deployment, commit, push, or process signal.

## Review provenance

Current Cycle 7 reports:

- `cycle7-2026-07-24-code-reviewer.md`
- `cycle7-2026-07-24-architect.md`
- `cycle7-2026-07-24-critic.md`
- `cycle7-2026-07-24-perf-reviewer.md`
- `cycle7-2026-07-24-security-reviewer.md`
- `cycle7-2026-07-24-verifier.md`
- `cycle7-2026-07-24-tracer.md`
- `cycle7-2026-07-24-debugger.md`
- `cycle7-2026-07-24-test-engineer.md`
- `cycle7-2026-07-24-document-specialist.md`
- `cycle7-2026-07-24-designer.md`
- `cycle7-2026-07-24-non-tech-traveler-reviewer.md`

All requested roles completed. Concurrency limits required compatible roles
to be grouped. One grouped reviewer completed its underlying sweep but was
delayed while synthesizing reports; its first turn was interrupted at a
message boundary and the skill's single retry completed all five reports.
No operating-system process was signaled and no reviewer-owned browser or
server exists.

## Deduplicated findings

### AGG7-01 — Point-budget-compliant imports exceed the VM function-argument limit

Severity: **High**
Confidence: **High**
Agreement: performance reviewer, security reviewer

Evidence:

- `src/lib/parse-utils.ts:7,54-64,109-113`
- `src/lib/googleJsonParser.ts:63-83,244-275,317-381`
- `src/lib/parser.ts:39-67,388-415,670-703`
- `src/workers/trackParser.worker.ts:14-45`
- `public/workers/trackParser.worker.js:185-193,215-249,252-275`

The parsers correctly enforce the advertised 250,000-point budget, then
expand user-sized arrays as JavaScript call arguments:

```ts
points.push(...nextPoints)
segments.push(...parseTimelineObjects(root.timelineObjects, budget))
segments.push(...parseSemanticSegments(root.semanticSegments, budget))
```

A flat 250,000-record Google input is only 7,250,001 bytes, remains within
the JSON and point limits, and reaches `points.push(...nextPoints)` with
250,000 arguments. Current V8 rejects substantially fewer arguments, so the
valid import throws `RangeError` and is misreported as malformed. A single
KML `LineString` below the XML byte cap reaches the same root, and many
singleton semantic segments can fail at the segment-array spreads. The
checked-in worker reproduces the same expressions.

This is distinct from the earlier over-budget materialization repair, which
moved the budget check before these spreads but left the accepted boundary
unsafe. It is also distinct from the historical elevation
`Math.min(...values)` repair.

Fix: replace every untrusted-length array spread with bounded iteration,
preserve point budgets and segment-start indexes, regenerate the worker, and
add direct plus worker boundary regressions that prove accepted counts work
and the first point over budget still fails with `TOO_MANY_POINTS`.

### AGG7-02 — Export filename truncation can split an astral character

Severity: **Low**
Confidence: **High**
Agreement: code reviewer, architect, test engineer, tracer, debugger

Evidence:

- `src/lib/videoEncoder.ts:290-299,323-338,374-398`
- `src/lib/parse-utils.ts:89-105`
- `src/lib/videoEncoder.test.ts:230-477`

The exporter applies UTF-16 `.slice(0, 64)` after sanitizing the track name.
With 63 ASCII characters followed by an emoji, the result keeps only the
emoji's high surrogate. `ExportResult.filename` is therefore ill-formed
before it reaches either `showSaveFilePicker` or the fallback anchor; a
Unicode-scalar sink replaces the broken unit with `U+FFFD`.

This is not the historical non-Latin filename issue. Imported names already
use code-point iteration specifically to avoid splitting surrogate pairs,
while the exporter still defines its length in UTF-16 code units.

Fix: cap the sanitized export name by Unicode code point while retaining the
current normalization, reserved-character removal, whitespace, suffix, and
fallback rules. Add a focused successful-export regression at the 63-ASCII
plus emoji boundary.

### AGG7-03 — The authoritative architecture diagram has stale ownership edges

Severity: **Low**
Confidence: **High**
Agreement: critic, verifier, document specialist

Evidence:

- `.context/project/02-architecture.md:5-43`
- `src/components/TrackToolbar.tsx:149-335`
- `src/components/JourneyCreator.tsx:791-807`
- `src/components/FileUpload.tsx:79-94`
- `src/app/page.tsx:416-447`

The component tree calls `TrackToolbar` a theme/locale/reset toolbar, but its
current responsibilities are loaded-session actions such as New Route,
Camera, map style, Help, and Export, with theme/locale only in the mobile
overflow menu and no Reset action. The data-flow diagram also routes both
file imports and Journey Creator through `parser.ts`; Journey Creator instead
constructs a validated `Track` directly and enters the shared session loader.

A maintainer following these false edges can place an invariant in the parser
and incorrectly assume manual journeys receive it, or edit the wrong owner
for loaded-session and responsive toolbar behavior.

Fix: show parsed-file/sample and direct-journey ingress as separate branches
converging at `loadTrackIntoSession()`, and describe the toolbar's current
loaded-session actions plus mobile settings responsibility.

## Exclusions and final sweep

- All completed Cycle 1–6 causal roots and gate corrections.
- The three explicit platform boundaries: pre-observation identity erasure,
  pidfd-grade atomic signaling, and exact host-environment marker discovery.
- The final-loop-only task in
  `.context/plans/user-injected/pending-next-cycle.md`.
- Historical parser over-budget allocation, non-Latin filenames, imported
  name bounding, and earlier architecture claims that did not identify the
  current direct JourneyCreator edge.
- Browser-only observations without a distinct source-backed failure.

The final missed-issue sweep found no fourth genuinely new root. No
deployment occurred.
