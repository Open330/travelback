# Cycle 2 Critic Review (2026-04-23, orchestrator run r2)

Multi-perspective critique of the current change surface, open deferrals, and overall posture.

## What is being done well

1. **Small commit cadence.** Cycle-1 alone shows 3 fine-grained commits for the same logical fix (revert map styles, drop CSP entry, doc the revert in the plan). Each gpg-signed and gitmoji-tagged.
2. **Gate discipline.** Every cycle enumerates gate status in the aggregate and blocks on regression. Cycle-1 caught the smoke gate regression and fixed it without touching other scope.
3. **Deferred-findings record is actually maintained.** 21 items are tracked with severity, file+line, reason, and exit criterion. Reviews explicitly carry them forward or mark resolved.
4. **Tests cover the important behavioral paths.** 53 e2e tests for a ~9500-line codebase is a healthy ratio for a static export app.
5. **Offline/local product contract is enforced by a gate.** `assertMapStylesPinnedLocally` is a rare example of a product constraint that's auto-verified on every CI-equivalent run.
6. **Documentation matches code.** This cycle's verifier review found no doc/code inconsistencies.

## What is worth pushing on

### R2-CR-1 — Deferrals are piling up without a scheduled re-open date

Of 21 deferred items, several are **correctness / reliability** (DF-C17-002 worker fallback, DF-C17-008 unit tests, DF-C4-001 SceneEditor normalize on keystroke). Their exit criteria are phrased conditionally ("when a parser reliability pass is scheduled") rather than "by cycle N". Risk: the deferrals become invisible backlog.

Recommendation: once per 10 cycles, pick one deferred item and schedule it. Avoids regression of attention.

### R2-CR-2 — `HomeInner` at 413 lines (DF-C17-006) is the single biggest reasoning tax

Every new hook in `page.tsx` adds to the surface and multiplies the cross-effect coupling. Concrete cost: cycle 1's theme regression (C1 composite) is still the leading user-visible bug class; each investigation requires reading all of HomeInner because theme state, map-style state, and map-style storage are interleaved.

Recommendation: schedule a `useThemeAndMapStyle()` hook extraction as a single-cycle task. Low-risk refactor with testable boundary.

### R2-CR-3 — MapView is where perf cost and debuggability cost concentrate (DF-C17-005)

`MapView.tsx` is 958 lines; the animation effect is 100+ lines with ref indirection for mutable props. The performance cost (R2-PF-1 buildTrackGeometry allocations) and the debuggability cost (R2-AR-2 ref-proliferation) both point at a single refactor: move playback-driven map updates out of the React effect into a direct rAF subscription that reads refs.

Recommendation: schedule this when perf becomes a user complaint (not before). The deferral remains valid.

### R2-CR-4 — Silence on bundled basemap visuals (DF-C2-010)

Styles render as solid background colors — a deliberate trade-off to preserve zero-network-dependency. But users who land on the sample trip see a map with no geographic context. DF-C2-010 is active; the exit criterion is "a richer-basemap project." No concrete roadmap.

Recommendation: defer remains valid. Document in the README that the bundled map surfaces are intentionally minimal and link to the scene-based camera animation as the primary visual output.

### R2-CR-5 — No performance telemetry

There is no instrumentation of LCP/CLS/INP in the deployed static site. Perf regressions would be invisible until a user reports them.

Recommendation: out of scope for a static export — introducing telemetry would contradict the privacy posture. Accept the trade-off. This is **not** a deferral.

### R2-CR-6 — i18n quality control

The `src/lib/i18n.ts` file has 1784 lines across 5 locales. Translations are bundled but there is no linting pipeline that would catch missing keys across locales. Cycle reviews have repeatedly not flagged this; it could become a landmine when adding a new locale.

Recommendation: a script that verifies all locales have the same key set. Bonus: part of DF-C17-016 (code-splitting locales) when picked up.

## Agreement with other reviewers (cross-angle)

- **Architecture + Code-Quality**: both call out duplicated angular-delta / distance helpers (R2-CQ-3 / R2-AR-3). Agreement elevates this; record as a higher-signal deferral.
- **Performance + Architecture**: both point at `MapView`'s render-loop coupling (R2-PF-1 / R2-AR-2 / DF-C17-005).
- **Test-Engineer + Debugger**: both flag the worker-fallback path as under-tested (R2-TE-5 / DF-C17-002).

## Net critic outcome
The review/plan/fix loop is healthy. The biggest long-term risk is deferral accumulation, not any single code defect. Recommend scheduling one long-standing deferral per 10 cycles.
