# Cycle 2 Documentation Review (2026-04-23, orchestrator run r2)

Scope: `.context/**` docs, JSDoc comments, README claims, plan documents, code comments that double as contract.

## Re-verified still-accurate

- `.context/project/02-architecture.md` — component tree, data flow, export pipeline, and privacy/security notes all match the current code. No stale references after the cycle-1 map-style revert.
- `.context/development/01-conventions.md` — language/runtime/toolchain versions, naming, file organization, git rules. All match `package.json` and the actual repo.
- `.context/plans/deferred-findings-cycle17-2026-04-23.md` — 19 items. Two marked RESOLVED (DF-C17-007 aria-valuetext, DF-C17-012 keyboard tabs) — both verified still resolved in this cycle.
- `.context/plans/deferred-findings-cycle1-2026-04-19.md` — DF-C4-001, DF-C4-002 carry-forwards still valid.
- `.context/reviews/_aggregate.md` — accurately reflects cycle-1 status; this cycle supersedes it.

## Findings

### R2-DOC-1 (low) — Architecture doc does not mention the frame-breaker script in the security section
- File: `.context/project/02-architecture.md:114-118`.
- Evidence: the section lists CSP hardening and mentions that meta CSP alone isn't sufficient for frame-ancestors. It doesn't mention that `src/app/layout.tsx:49` implements a JS-based frame-breaker as a defense-in-depth. A reader could miss that layer.
- Fix: add a single sentence noting the inline bootstrap script's frame-break logic. Confidence: **Medium** (doc completeness). *Below threshold; record as deferred.*

### R2-DOC-2 (low) — `src/lib/interpolate.ts` exports `formatDistance`, `formatElevation`, `formatDuration` but has no JSDoc on those three
- File: `src/lib/interpolate.ts:161-185`.
- Evidence: function signatures are self-documenting (e.g., `formatDistance(meters: number, units?: UnitSystem): string`), but a single-line JSDoc noting "Formats a distance in meters to the user's preferred unit system" would help IDE hover hints.
- Fix: add brief JSDoc. Confidence: **High** (trivial). *Below threshold; record as deferred.*

### R2-DOC-3 (low) — Cycle 1 implementation plan references "ba5bd23" and "5788949" commit hashes that are gitminer-rewritten
- File: `.context/plans/cycle1-implementation-2026-04-23.md:7-9, 67`.
- Evidence: per repo convention (`~/.claude/CLAUDE.md`: "mine every git commit to have 7 leading hex zeros"), these commit IDs are historical placeholders that won't resolve on the current branch. `git log --oneline` shows the commits exist with `00000000d` leading zeros, not the pre-mine short hashes.
- Fix: not strictly needed — the plan document is a historical record. But future readers searching for "ba5bd23" in git log will miss them.
- Confidence: **Low** (historical record). *Record but no action.*

### R2-DOC-4 (low) — `.context/plans/archive/` not inspected this cycle
- Directory: `.context/plans/archive/`.
- Evidence: archived plans should not contain stale "do this" entries that contradict current code. Out-of-scope for a deep review but worth a periodic audit.
- **Below threshold; no action.**

### R2-DOC-5 (info) — Comments in `src/` accurately describe intent
- Sampled: `src/lib/interpolate.ts:125-133` explains the backward-walking bearing fix; `src/lib/usePlaybackController.ts:89-96` explains the accumulator rationale; `src/components/MapView.tsx:552-556` explains `preserveDrawingBuffer: true` trade-off; `src/components/FileUpload.tsx:44-54` maps error codes to i18n keys.
- **Positive finding.**

### R2-DOC-6 (info) — `scripts/smoke-static.mjs` includes human-readable assertion names (`assertStaticCspWasHardened`, `assertMapStylesPinnedLocally`, etc.)
- File: `scripts/smoke-static.mjs`.
- Evidence: Grep-friendly function names match the exact invariants they enforce, making this the primary "contract file" between docs and code.
- **Positive finding.**

## Net documentation outcome
- Zero stale/incorrect documentation detected.
- 2 low-priority doc-completeness items (R2-DOC-1, R2-DOC-2) for deferral.
- 1 observation (R2-DOC-3) noted for awareness.
