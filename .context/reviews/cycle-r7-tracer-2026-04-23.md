# Tracer Review — Cycle r7 (2026-04-23)

## Methodology

Traced the export-overlay keyboard trap hypothesis:
`A11Y-1: users on keyboard cannot dismiss the export progress dialog
via Escape`.

## Trace

1. `src/app/page.tsx:329` — overlay rendered while
   `isExporting === true`.
2. `usePlaybackHotkeys` (`src/lib/usePlaybackController.ts:125-139` bound
   in page.tsx) — listens for keys globally but its handler early-exits
   inside any element with `data-disable-playback-hotkeys="true"`
   (L153). The overlay carries that attribute at L331, so global
   playback hotkeys (space for play/pause, etc.) are silenced.
3. No overlay-local keydown binding exists — the cancel button only
   responds to click. Escape thus flows to the document but no handler
   listens for it, so the user is keyboard-trapped (can only Tab onto
   the cancel button and Enter/Space to fire).

## Findings

### T-1 (LOW, HIGH) — Escape key is swallowed by the export-overlay

- **File + line**: `src/app/page.tsx:329-352`.
- **Evidence**: per the trace above, Escape neither triggers
  `cancelExport()` nor closes the overlay. Same root cause as A11Y-1.
- **Fix**: identical to A11Y-1 — bind `keydown` while
  `isExporting === true`, call `cancelExport()` on Escape.

## Summary

Single causal chain. One LOW finding that overlaps with A11Y-1.
