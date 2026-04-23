# Cycle 2 Implementation Plan (2026-04-23, orchestrator run r2)

Source: `.context/reviews/_aggregate.md` (cycle 2 aggregate, 2026-04-23 r2).

## Status at plan start
All gates green (lint 0/0, typecheck 0, build OK, audit 0, smoke OK, e2e 53 passed in 2.6 min). No regressions since cycle 1. One schedulable code fix; all other new findings deferred per `.context/plans/deferred-findings-cycle-r2-2026-04-23.md`.

## Scheduled tasks

### R2-T1 — Add `aria-hidden="true"` to decorative `Circle` bullet icon in GoogleGuide tips

Source finding: R2-AGG-1 (= R2-A11Y-1).

Priority: P2 (accessibility polish; matches the aria-hidden pattern already applied to the 7 illustration SVGs in the same file).

Files:
- `src/components/GoogleGuide.tsx:389` — add `aria-hidden="true"` to the `<Circle size={6} fill="currentColor" strokeWidth={0} className="mt-1.5 flex-shrink-0" />` element so the bullet marker is not announced as a graphic.

Acceptance:
- `npm run lint` still passes.
- `npm run typecheck` still passes.
- `npm run build` still succeeds.
- `npm run smoke:static` still passes.
- `npm run test:e2e:static:ci` still passes.
- `npm audit --audit-level=high` still passes.
- GoogleGuide tip list's bullet icons are excluded from the accessibility tree.

Risk / rollback: trivial. Single attribute change on a decorative element; no layout, behavior, or test-id impact.

Progress: **DONE** — implemented; see commit `fix(a11y): 🐛 add aria-hidden to GoogleGuide tip bullet icons`.

---

## Deferred tasks (per repo rules)

All 17 other new findings are recorded in `.context/plans/deferred-findings-cycle-r2-2026-04-23.md` with their severity, file+line citations, reasons, and exit criteria.

Prior deferred items (DF-C17-001..-019 minus -007 and -012, DF-C4-001, DF-C4-002, DF-C2-010) remain active with original exit criteria.

---

## Rationale for scheduling vs. deferring

- R2-AGG-1 is scheduled because it is a single-attribute accessibility fix with no regression risk and directly matches an established pattern in the same file.
- All other aggregate findings are below the scheduling threshold per the repo's convention of fine-grained, low-risk iteration. They are recorded as deferred with explicit exit criteria, severity preserved, and repo-rule compliance noted.

---

## Gate verification plan

1. Apply the single edit.
2. Run in sequence:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
   - `npm run smoke:static`
   - `npm run test:e2e:static:ci`
   - `npm audit --audit-level=high`
3. Commit fine-grained, GPG-signed, Conventional Commits + gitmoji. Push with `git pull --rebase` first.
