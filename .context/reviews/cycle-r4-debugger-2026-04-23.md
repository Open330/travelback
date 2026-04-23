# Cycle r4 — Debugger — 2026-04-23

Latent-bug surface scan.

## DB-1 (LOW, MEDIUM) — `src/components/MapView.tsx:429-441` `inert`/`aria-hidden` toggle: when `mapError` exists, the map container becomes interactive

- Intent: expose the error + reload control to AT.
- Side effect: when the user is still on the upload overlay (no track, but mapError is set), the container is reachable by tab (it has focusable `<summary>` and button inside).
- This is the cause of the "tab order puts canvas/Reload before Browse" observation (T-2).
- Fix: either hoist the map-error UI out of the container (render in its own wrapper with `inert` on the container) OR set `data-testid` + `role="alertdialog"` on the error panel so AT users at least know it's critical.
- Severity: LOW (only reproduces when WebGL fails). **Defer** with exit criterion: "if the repo adds an SSR-safe error UI for map failure, revisit".

## DB-2 (LOW, HIGH) — `src/components/FileUpload.tsx:44-50` (post-r3) scheduleDragEnd: no leak detected in probe

- Verified via source read. Timer cleanup is now both on unmount and on reschedule.
- **No action.**

## DB-3 (LOW, MEDIUM) — `src/components/TimelineSelector.tsx:262-284` global listeners register on every render

- `applyDrag` / `endDrag` are stable via `[]` deps on `applyDrag` and useCallback on `endDrag`. The effect dep array `[applyDrag, endDrag]` means remount risk is bounded. No leak.
- **No action.**

## Summary

No schedulable bugs. DB-1 queued as deferred.
