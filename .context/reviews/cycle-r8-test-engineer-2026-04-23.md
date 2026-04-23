# Cycle r8 — Test Engineer (2026-04-23)

## Scope

Review test coverage and identify regression-guard gaps at cycle-r8
start.

## Observations

1. `e2e/travelback.spec.ts` has 54 tests covering landmark, dialog
   semantics, track loading, camera stability, theme, map style
   cycling, and export panel opening.
2. **Still uncovered**: `Escape` on the export-overlay itself — the
   existing export e2e tests don't enter the overlay (virtual-codec
   path skips it) so the cycle-r7 fix has no regression guard. This
   is **R7-AGG-D22** (carried forward) — exit criterion is an
   export flow mockable in CI.
3. **Still uncovered (carryover)**: real-WebGL LCP/INP/CLS probes,
   320w + ko viewport probes, Windows forced-colors. All remain
   deferred pending probe infrastructure.

## Findings

### TE8-1 — No new test-engineer findings (INFO)

Existing gaps continue as deferred items — no new ones flagged this
cycle.

## Verdict

No action required this cycle.
