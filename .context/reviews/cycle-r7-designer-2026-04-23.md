# Designer (UI/UX) Review — Cycle r7 (2026-04-23)

## Methodology

Walked the keyboard/touch/mouse flow on export-overlay; compared
interaction affordances with the rest of the Travelback modals
(ModalDialog, ExportPanel, KeyboardHelp, GoogleGuide).

## Findings

### UX-1 (LOW, HIGH) — "Escape to cancel" is an implicit user expectation for a progress modal

- **File + line**: `src/app/page.tsx:329-352`.
- **Evidence**: every other modal in the repo (guide dialog, export
  panel, discard-journey confirmation) respects Escape via
  `ModalDialog`. The export-overlay diverges from this convention,
  which is surprising for keyboard users and mouse users who have
  learned the pattern elsewhere in the app. Adds inconsistency to
  the UX surface.
- **Fix**: bind Escape → cancelExport() while exporting. Same edit
  as A11Y-1.

### UX-2 (LOW, MEDIUM) — Cancel-export button visual focus weaker than peers

- **File + line**: `src/app/page.tsx:342-349`.
- **Evidence**: the cancel button renders on a semi-transparent red
  background over a heavily-blurred backdrop. The global
  `button:focus-visible` rule (box-shadow ring) may blend into the
  red tint. Peer buttons in the repo ship the explicit Tailwind
  focus-visible triple for stronger contrast.
- **Fix**: append the focus-visible triple — same edit as A11Y-2.

## Summary

Two LOW UX nudges that bundle with the A11Y edits into one commit.
