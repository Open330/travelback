# Cycle r4 — Critic — 2026-04-23

Multi-perspective critique focused on surprising behaviors and whether the app
delivers the value it claims.

## CT-1 — "Load a sample trip" button label is confusing because the SR name is "Try with a sample trip" and the visible caption says "Sample output preview"/"Load demo"

- This is the same concern as BUI-4 / CR-2. The user hears three different labels depending on how they interact with the control.
- **Schedule this cycle** (folded into BUI-4).

## CT-2 — The app launches to the map, not to the upload prompt

- The map canvas pre-renders before the user does anything, but the MapLibre controls are hidden (`.hide-map-controls`). When WebGL fails, the map-error panel claims focus before the upload overlay — observed in the browser probe.
- Mitigation: once WebGL fails we show `role="alert"` correctly, but the user's next step (upload a file) requires them to tab past the map-error summary/reload to find the upload overlay. Could be confusing.
- **Defer**: UX redesign question; capture as a carry-over.

## CT-3 — The landing "Draw a route on the map" button sits below Browse in the tab order, even though it is an equally-primary entry path

- Visually, the sample preview, Browse Files, and "Draw a route" are all siblings. Keyboard users see them in that order which matches visual. Good.
- **No action.**

## CT-4 — The `<select>` language switcher uses 2-letter codes

- Same as BUI-7. Defer — stylistic.

## CT-5 — Export panel "Estimated time" copy

- The estimate in `ExportPanel.tsx:98-104` multiplies `duration * 0.5 * resScale * codecScale`. The 0.5 constant is a measured "approximate real-time factor" but is not explained in copy. For the 4K codec-av1 case it can be wildly pessimistic or wildly optimistic.
- Not a bug; log for potential telemetry-driven tuning.
- **No action.**

## Summary

CT-1 → covered. Everything else defers or is a no-op.
