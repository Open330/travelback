# Cycle r8 — Debugger (2026-04-23)

## Scope

Debugger/defensive-posture review at cycle-r8 start — particularly the
cycle-r7 Escape-to-cancel listener.

## Observations

1. The listener is correctly cleaned up on every `[isExporting,
   cancelExport]` change. `cancelExport` is memoized with
   `useCallback(() => exportAbortRef.current?.abort(), [])` so the
   dependency is stable; no churn-driven double-bind.
2. `preventDefault()` + `stopPropagation()` on capture phase
   correctly isolates the Escape from bubbling into
   `usePlaybackHotkeys`'s "close all panels" which otherwise would
   also attempt to close ExportPanel. The double-close would be
   harmless but avoiding it is good hygiene.
3. No unhandled rejections in the abort path — `exportTrack.catch`
   handles `DOMException('AbortError')` specifically.

## Findings

### DBG8-1 — No new debugger findings (INFO)

## Verdict

No action required this cycle.
