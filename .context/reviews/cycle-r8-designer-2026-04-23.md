# Cycle r8 — Designer (UI/UX) + Accessibility (2026-04-23)

## Scope

UI/UX and accessibility review at cycle-r8 start — confirm cycle-r7
changes landed and nothing regressed.

## Observations

1. Export overlay cancel button now matches the rest of the repo:
   `type="button"`, pointer cursor, and focus-visible triple
   (`outline-2 outline-offset-2 outline-[rgb(var(--gl))]`). Verified
   by direct read of `src/app/page.tsx:358-366`.
2. `role="dialog"` + `aria-modal="true"` + `aria-labelledby` wiring
   is intact on the overlay; the spinner has `aria-hidden="true"`.
3. Keyboard flow: Escape cancels the export. Tab order from cancel
   button follows natural document order.
4. No regressions in region landmarks, main landmark, or
   theme/map-style toggle focus behavior.
5. **Still deferred** from prior cycles: primary CTA contrast
   (R4-AGG-D1), forced-colors audit (R4-AGG-D5), 320w + ko viewport
   probe (R4-AGG-D3), Windows forced-colors pass. None triggered by
   cycle r7 code changes.

## Findings

### UX8-1 — No new UI/UX or accessibility findings (INFO)

## Verdict

No action required this cycle.
