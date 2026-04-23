# Cycle r7 Implementation Plan (2026-04-23)

Source-side plan derived from the eleven per-agent reviews + aggregate
at `.context/reviews/cycle-r7-*.md` / `_aggregate.md`.

## Context

- Starting commit: `0000000e5` (cycle-r6 doc commit).
- Gates at start: all green (lint / typecheck / build / smoke / e2e
  54/54 / audit 0).
- User-injected queue: empty.

## Scheduled items

### P-1 (LOW, HIGH) — Export-overlay dialog a11y + defensive posture (R7-AGG-1)

Harden the rendering-progress overlay in `src/app/page.tsx:329-352`
so that a keyboard user can dismiss it via Escape and the cancel
button matches the repo's defensive-posture convention.

Files touched: `src/app/page.tsx`.

Edits:

1. Add a `useEffect` gated by `isExporting` that installs a
   `document.addEventListener('keydown', ...)` listener. On Escape:
   call `cancelExport()` and `preventDefault()` so the event does not
   propagate into the (inert) app root beneath the overlay. Clean up
   the listener in the effect's return.
2. Add `type="button"` to the cancel `<button>` at L342.
3. Append the Tailwind focus-visible triple
   `focus-visible:outline-2 focus-visible:outline-offset-2
   focus-visible:outline-[rgb(var(--gl))]` to the cancel button
   className so it matches every other command-surface button in the
   repo.

Acceptance:

- Keyboard Escape fires `cancelExport()` while the overlay is visible.
- `<button>` coverage across `src/` is 100% typed (ast-grep / grep
  shows zero `<button>` elements without `type=`).
- `npm run lint`, `typecheck`, `build`, `smoke:static`, `test:e2e:static:ci`,
  `audit --audit-level=high` all remain green.

## Dependencies

Single file edit; no inter-commit dependencies.

## Out of scope (carryover deferred)

- R7-AGG-D21 (full `ModalDialog` migration for export-overlay) — see
  `.context/plans/deferred-findings-cycle-r7-2026-04-23.md`.
- R7-AGG-D22 (e2e regression guard for export-overlay a11y) — ditto.
- R6-AGG-D18..D20: all cycle-r6 deferreds unchanged.
- R5-AGG-D14..D17: all cycle-r5 deferreds unchanged.
- R4-AGG-D1..D13: all cycle-r4 deferreds unchanged.

## DEPLOY

DEPLOY_MODE = none (record `DEPLOY: none` in the end-of-cycle report).
