# Cycle r8 — Code Reviewer (2026-04-23)

## Scope

Reviewed repository at cycle-r8 start commit (`0000000f8`, the cycle-r7
doc commit). Six quality gates were green at cycle-r7 end, and no
source changed since that commit — cycle r8 is an evidence-gathering
pass against the already-fixed codebase.

## Gate status at cycle start

- ESLint: PASS
- TypeScript strict: PASS
- Next.js build: PASS (harden-static-export ran on 3 HTML files)
- `smoke:static`: PASS
- `test:e2e:static:ci`: in progress (tracked in cycle closing report)
- `npm audit --audit-level=high`: PASS (0 vulnerabilities)

## Observations

1. `<button>` sweep: `grep` for `<button(?![^>]*type=)` yields zero
   matches across `src/`. The cycle r6/r7 sweep remains intact.
2. Focus-visible coverage: 61 occurrences of `focus-visible` across
   17 source files (count matches cycle r7 tally + cycle r7 export
   overlay addition).
3. `role="dialog"` sources: three — `ModalDialog.tsx:177`,
   `usePlaybackController.ts:153` (keyboard guard), and
   `src/app/page.tsx:348` (the export overlay which is now
   Escape-cancelable as of cycle r7).
4. Export overlay a11y: cycle r7 commit `0000000a5` installed a
   capture-phase keydown listener gated by `isExporting` that binds
   Escape to `cancelExport()`. The useEffect cleans up via
   `removeEventListener('keydown', onKeyDown, true)`.

## Findings

### CR8-1 — No new source findings (INFO)

No new review findings for this cycle. Previously-flagged items not
yet exited remain deferred (R4-AGG-D1..D13, R5-AGG-D14..D17,
R6-AGG-D18..D20, R7-AGG-D21..D22).

## Verdict

No action required this cycle from the code-reviewer lane.
