# Code-Reviewer Review — Cycle r7 (2026-04-23)

## Methodology

Source-side pass over `src/app/page.tsx`, `src/components/*.tsx`, and
`src/lib/*.ts` at cycle-r6 tip `0000000e5`. All six gates were green at
start (lint, typecheck, build, smoke, e2e 54/54, audit).

Focused on defensive-posture carryovers that might have slipped through
the cycle-r6 `type="button"` + focus-visible sweep because cycle-r6
scoped its sweep to `src/components/**` only. `src/app/page.tsx` hosts
its own ad-hoc dialog and was never in scope.

## Findings

### CR-1 (LOW, HIGH) — Export-overlay cancel button lacks defensive `type="button"`

- **File + line**: `src/app/page.tsx:342-349`.
- **Evidence**: the `<button>` in the export-overlay dialog uses
  `onClick={cancelExport}` but omits `type` entirely. If any ancestor
  ever becomes a `<form>` (export preset save form, etc.), the default
  `type="submit"` semantics would fire — the same defensive posture the
  cycle-r6 sweep applied to every other component button.
- **Fix**: add `type="button"`. Zero behavioral risk on current code,
  closes the `<button>` coverage across the entire repo.

### CR-2 (LOW, MEDIUM) — Cycle-r6 sweep claim "page.tsx has zero `<button>`" is stale

- **File**: `.context/plans/cycle-r6-implementation-2026-04-23.md:52`.
- **Evidence**: the cycle-r6 plan asserts "ast-grep or grep shows zero
  `<button` in `src/components` without a `type=` attribute" — which
  was true — but the sweep file list did not include `src/app/page.tsx`.
  The export-overlay `<button>` at L342 falls outside `src/components`
  and thus outside the cycle-r6 scope. No plan-level bug, but the
  per-repo `<button>` coverage guarantee the plan implied is incomplete.
- **Fix**: land CR-1 + update the repo-wide guarantee by ensuring every
  `<button>` in `src/` has an explicit `type=`. Grep-wide scan already
  shows only this one is missing.

## Summary

One concrete fix (CR-1), one meta-note (CR-2). Both resolve via the same
one-line edit.
