# Accessibility Review — Cycle r7 (2026-04-23)

## Methodology

WCAG 2.1 AA pass over the export-overlay ad-hoc dialog in
`src/app/page.tsx`, the ExportPanel / ModalDialog + GoogleGuide /
KeyboardHelp / scene-editor / journey-creator panels, and global
focus-ring coverage via `src/styles/vitro-base.css:602-609`.

## Findings

### A11Y-1 (LOW, HIGH) — Export-overlay dialog lacks Escape close

- **File + line**: `src/app/page.tsx:329-352`.
- **WCAG**: 2.1.1 Keyboard (A), 2.1.2 No Keyboard Trap (A), 2.4.11
  Focus Not Obscured (AA).
- **Evidence**: the overlay is marked `role="dialog"` + `aria-modal="true"`,
  but unlike `ModalDialog` it does not bind an Escape handler. A user on
  keyboard who opens Export + starts rendering cannot dismiss the
  progress dialog via Escape; they must discover the Cancel button
  manually. The Cancel button is also the only focusable element inside
  the overlay, so Tab cycles back to the MapLibre canvas — which is
  still inert under the overlay but means focus physically leaves the
  dialog region.
- **Fix**: add a `useEffect` while `isExporting` is true that binds
  `document.addEventListener('keydown', onEsc)` and calls `cancelExport()`
  on Escape. This aligns the export-overlay with `ModalDialog`'s
  Escape-to-close behavior.

### A11Y-2 (LOW, HIGH) — Export-overlay cancel button missing focus-visible ring

- **File + line**: `src/app/page.tsx:342-349`.
- **WCAG**: 2.4.7 Focus Visible (AA).
- **Evidence**: the cancel button relies on the global
  `button:focus-visible` rule in `src/styles/vitro-base.css:602` which
  maps to `box-shadow: var(--focus-ring)`. Against the semi-transparent
  `rgba(var(--err-rgb),.7)` red button background + the black/55
  backdrop, the focus-ring `box-shadow` may under-emphasize on some
  viewports. Adding the per-button `focus-visible:outline-2
  focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]`
  Tailwind triple aligns with the cycle-r3..r6 convention.
- **Fix**: append the focus-visible triple + `type="button"` to match
  the rest of the repo. Cheap, additive.

## Summary

Two LOW findings, both resolved by the same ~4-line page.tsx edit that
adds Escape handling + `type="button"` + the focus-visible Tailwind
triple to the export-overlay cancel button. No other a11y regressions
spotted this cycle.
