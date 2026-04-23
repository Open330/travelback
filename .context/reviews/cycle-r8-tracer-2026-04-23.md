# Cycle r8 — Tracer (2026-04-23)

## Scope

Trace-style walkthrough of the export-overlay Escape path to confirm
the cycle-r7 fix didn't regress neighboring flows.

## Trace 1 — Escape during export

1. User clicks "Start Export" → `ExportPanel.handleExport` →
   `onExport(config)` in `useExportController.exportTrack`.
2. `exportTrack` sets `setIsExporting(true)` at `useExportController.ts:94`.
3. `page.tsx:143-155` useEffect re-runs (deps: `[isExporting,
   cancelExport]`); condition `!isExporting` no longer early-returns,
   so `document.addEventListener('keydown', onKeyDown, true)` installs.
4. User presses Escape.
5. Capture-phase listener fires FIRST (before `usePlaybackHotkeys`'s
   window/bubble listener).
6. `event.preventDefault()` + `event.stopPropagation()` prevent the
   later phase. `cancelExport()` calls `exportAbortRef.current?.abort()`.
7. `videoEncoder.exportVideo()` observes the `AbortSignal` and throws
   a `DOMException('AbortError')`.
8. `exportTrack.catch` runs: the toast addsTask is `app.exportCancelled`,
   `setExportState('idle')`.
9. `exportTrack.finally` runs: `setIsExporting(false)`.
10. `page.tsx:143-155` useEffect re-runs (isExporting === false); the
    early-return path triggers; cleanup from the previous effect run
    removes the listener.

No invariants are broken. No phantom listeners survive.

## Trace 2 — Unmount during export

If the user closes the tab mid-export:
1. `HomeInner` unmounts.
2. `page.tsx:143-155` useEffect cleanup runs, calling
   `removeEventListener('keydown', onKeyDown, true)`. Listener gone.
3. `useExportController`'s cleanup also runs, which revokes the
   object URL ref. No double-abort issue.

## Findings

### TR8-1 — No new tracer findings (INFO)

## Verdict

No action required this cycle.
