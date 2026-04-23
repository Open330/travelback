# Debugger Review — Cycle r7 (2026-04-23)

## Methodology

Reproduced in my head the keyboard-flow on desktop starting from
"Export Video" button → ExportPanel → Export click → rendering overlay.

## Findings

### DBG-1 (LOW, HIGH) — Escape on export-overlay has no effect

- **File + line**: `src/app/page.tsx:329-352`.
- **Repro**: open app, load sample GPX, click Export, choose config,
  click "Export Video", wait for overlay to appear, press Escape.
- **Expected**: overlay dismisses or calls `cancelExport()`.
- **Actual**: nothing happens. Cancel button is reachable only via
  Tab + Enter/Space.
- **Root cause**: no keydown handler on the overlay and the global
  playback hotkeys block the Escape path via
  `data-disable-playback-hotkeys="true"`.
- **Fix**: same as A11Y-1 / T-1.

## Summary

One concrete repro. Overlap with A11Y-1 / T-1; resolve once.
