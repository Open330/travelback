# Cycle 17 Implementation Plan — 2026-04-27

## Review summary

- 0 new findings identified
- 5 C16 fixes verified as resolved
- 14 carried findings remain open (all architectural/infrastructure, appropriately deferred)

## Scheduled tasks

None — no actionable findings this cycle.

## Deferred items (carried forward)

All 14 carried findings from the aggregate remain deferred:

| ID | Severity | Reason for deferral |
|----|----------|-------------------|
| N02 | HIGH | Requires unit test framework setup (vitest/jest) |
| N03 | HIGH | Requires E2E export infrastructure with real codec |
| N04 | MEDIUM-HIGH | Requires worker/main parser refactor |
| N01 | MEDIUM-HIGH | Requires trail rendering architecture change |
| N08 | MEDIUM | ARIA attributes need dynamic range computation |
| N11 | MEDIUM | Requires MapView layer management refactor |
| N12 | MEDIUM | Requires state management architecture change |
| N14 | MEDIUM | Requires memory profiling on 4K displays |
| N17 | MEDIUM | Requires mobile dialog architecture change |
| C13-F03 | LOW | iOS Safari edge case |
| C13-F05 | LOW | UX enhancement |
| C15-F03 | LOW | Dev-only improvement |
| C15-F06 | LOW | Idempotent guard already prevents double-add |
| C15-F07 | INFO | Cosmetic only |

## Gate plan

Run all gates: eslint, tsc --noEmit, next build
