# Critic Review — Cycle r7 (2026-04-23)

## Methodology

Contrarian pass over the proposed cycle-r7 fix and the aggregate
deferred queue.

## Findings

### CT-1 (LOW, MEDIUM) — Export overlay also deserves focus-trap parity with ModalDialog

- **File + line**: `src/app/page.tsx:329-352`.
- **Evidence**: ModalDialog traps Tab/Shift-Tab inside its panel and
  restores focus to the previously-active element on close. The
  export-overlay does neither. Because the overlay has exactly one
  focusable element (the cancel button), the visible Tab loop stays
  inside the button by default, but the focused element on overlay
  open is whatever was previously focused (typically the Export Video
  button on the now-closed ExportPanel, or an input). Users on
  keyboard may not realize the overlay is open until they hit
  Escape — which today does nothing (A11Y-1).
- **Fix option A (minimal)**: schedule only the Escape listener +
  `type="button"` + focus-visible ring in this cycle, matching A11Y-1
  and A11Y-2. Focus-trap + autofocus + restore is a higher-risk edit.
- **Fix option B (fuller)**: swap the ad-hoc `<div role="dialog">` for
  `<ModalDialog>` and let its existing focus-trap + Escape + restore
  logic apply.
- **Recommendation**: go with option A this cycle. Option B is
  carrying risk (ModalDialog renders via `createPortal` to
  `document.body`, which may conflict with the `inert`/`aria-hidden`
  pattern on `[data-travelback-app-root="true"]` during export), and
  the current overlay stays on-screen through the export flow so any
  subtle portal re-order could disrupt the `canvas` capture. Record
  the fuller rewrite as a deferred item.

## Summary

One nudge: option A (land minimal fix) + defer option B.
