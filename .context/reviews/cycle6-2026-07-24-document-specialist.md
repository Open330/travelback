# Cycle 6 document-specialist review — 2026-07-24

## Result

The public and project documentation describe GPX as a supported route input,
but a Cycle 5 parser regression now rejects a valid documented subset. This is
cross-role confirmation of V6-01/D6-01, not a second causal root.

### DOC6-01 — documented GPX route support is narrower in code than the stated contract

- **Severity / confidence / status:** Medium / High / Confirmed
- **Documentation contract:**
  - `README.md:24-26,40-43,66-72` tells users to drop GPX and lists GPX as a
    supported input format.
  - `.context/project/01-overview.md:3,12,37-40,81-84` describes GPX animation,
    `@tmcw/togeojson` parsing, and standard GPX tracks as supported.
  - `.context/project/02-architecture.md:24-43` promises that uploaded route
    data flows through `parser.ts` into a `Track`.
- **Contradicting implementation:** `src/lib/parser.ts:318-400` suppresses the
  route-capable `@tmcw/togeojson` fallback if an owned `trkseg` exists even
  when that segment retains zero valid points. A valid `rte` with two valid
  `rtept` children is then rejected at `src/lib/parser.ts:670-702`.
- **Concrete reader impact:** an exporter can legitimately leave an empty
  track container or one invalid recorded point alongside its usable route.
  Travelback identifies the `.gpx` extension as supported, yet reports that
  the file has too few points although its route has enough points.
- **Evidence:** a read-only fallback-converter probe produced the two route
  coordinates; the pre-`d5d7506` implementation reached that fallback; and
  Cycle 5 P02's written acceptance contract required fallback behavior to
  remain unchanged
  (`.context/plans/cycle5-implementation-2026-07-23.md:97-125`).
- **Resolution:** repair code by treating a zero-retained-point semantic
  extraction as absent and add the two mixed segment/route parser regressions.
  Do not weaken the supported-GPX wording to document an unintended,
  newly-introduced failure. No user-facing copy change is required once the
  implementation again satisfies the existing contract.

## Deduplication note

Historical item `C4-CT04` records the separate choice not to merge a valid
track with route/waypoint data. DOC6-01 concerns a document with **no valid
track points**, which fell back before Cycle 5 and which the Cycle 5 plan
explicitly promised to preserve. The proposed fix leaves usable-track
precedence untouched.

## Documentation consistency sweep

The final audit compared README, project/development context, plan indexes,
package scripts/dependencies, Next/static configuration, GitHub Pages
workflow, worker/build/static-server scripts, local map-style assets,
translated UI copy, parser/export limits, camera defaults, resolution presets,
privacy/network claims, base-path instructions, and the POSIX-only supervised
E2E warning. No separate new documentation mismatch survived verification.

The review used only read-only/static inspection, a direct library probe, and
one file-scoped Vitest run. No supervisor, E2E, Playwright, Chromium,
agent-browser, server, deploy, push, commit, process-kill, or source/plan
mutation command was attempted.
