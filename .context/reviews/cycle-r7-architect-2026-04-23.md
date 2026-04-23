# Architect Review — Cycle r7 (2026-04-23)

## Methodology

Compared export-overlay dialog vs. ModalDialog contract.

## Findings

### AR-1 (LOW, MEDIUM) — Export-overlay is an ad-hoc dialog; ModalDialog exists

- **File + line**: `src/app/page.tsx:329-352` vs. `src/components/ModalDialog.tsx`.
- **Evidence**: the codebase has a first-class `ModalDialog` component
  that provides focus-trap, Escape handler, focus restore, body-scroll
  lock, and inert-root sibling handling. The export-overlay re-creates
  a subset of this (role+aria-modal+backdrop) but skips the keyboard
  UX. Replacing the ad-hoc overlay with `ModalDialog` would be a
  cleaner refactor but carries risk per critic CT-1 (portal re-order
  during active canvas capture).
- **Recommendation**: land the minimal fix (Escape + type + focus-ring)
  this cycle; schedule the full `ModalDialog` migration as a deferred
  item with exit criterion "canvas capture is verified invariant
  under portal re-mount."

## Summary

One architectural observation. Resolved in full by the deferred path,
or pragmatically by the minimal-fix path this cycle.
