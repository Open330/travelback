# Document Specialist Review — Cycle r7 (2026-04-23)

## Methodology

Spot-check the approach against WAI-ARIA authoring guidance for modal
dialogs.

## Evidence

- WAI-ARIA APG "Dialog (Modal) Pattern" requires: Escape closes the
  dialog, focus is moved into the dialog on open, Tab cycles stay
  inside the dialog, focus is restored on close. See
  https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/.
- `ModalDialog.tsx` implements all four; the export-overlay at
  page.tsx:329 implements none fully.

## Findings

### DOC-1 (LOW, MEDIUM) — Spec alignment gap on export-overlay

- **File + line**: `src/app/page.tsx:329-352`.
- **Evidence**: spec requires Escape at minimum; current overlay does
  not bind it.
- **Fix**: per A11Y-1 minimal fix — bind Escape while exporting.

## Summary

One spec-alignment nudge. No fresh external-doc lookup required; WAI-ARIA
APG guidance is stable.
