# Cycle r5 — debugger (2026-04-23)

## Scope

Hunt for latent bugs that tests don't catch: race conditions, off-by-one errors, stale refs, cleanup leaks, event leaks.

## Findings

### DB-1 (LOW, HIGH) — `TrackToolbar.useEffect` outside-click listener targets moving ref

- **Files**: `src/components/TrackToolbar.tsx:55-77`.
- **Evidence**: same root cause as CR-1 / CT-1 / T-1. Side effect of the dual-ref is that `handlePointerDown` does not reliably early-exit when the target is the trigger button.
- **Schedule**: YES (merged with CR-1).

### DB-2 (LOW, HIGH) — `FileUpload` drag-state race vs. scheduled timer

- **Files**: `src/components/FileUpload.tsx:111-119`.
- **Evidence**: see CR-2 / CT-2 / T-2. Pending 200ms timer can overwrite immediate state.
- **Schedule**: YES (merged with CR-2).

### DB-3 (LOW, MEDIUM) — `TimelineSelector.applyDrag` never listens to `dragging === false`

- **Files**: `src/components/TimelineSelector.tsx:182-233, 263-284`.
- **Evidence**: `applyDrag` uses `rAF` + mutation of `dragState.current`. It mutates `dragMovedRef.current = true` and fires `onRangeChangeRef.current(startIdx, endIdx)` every rAF frame until released. Listeners registered once at mount. No bug — just noting the high-volume `onRangeChange` burst during a slow drag, which is debounced by rAF. Acceptable.
- **Schedule**: no action.

### DB-4 (LOW, MEDIUM) — `MapView` reference-grid painted before track sometimes

- **Files**: `src/components/MapView.tsx:326-369, 757-816`.
- **Evidence**: when a track loads before the style finishes, `attachTrackToReadyStyle` defers; `addReferenceGridLayers` re-runs with `track` on retry. OK. But when the style reloads after a mapStyleKey change, the effect at L645-667 adds grid then track — if track is null, grid alone. OK.
- **Schedule**: no action.

### DB-5 (LOW, MEDIUM) — `SceneEditor.SceneRangeEditor` `dragging` state gate can leak listener

- **Files**: `src/components/SceneEditor.tsx:92-137`.
- **Evidence**: `useEffect` adds `pointermove` / `pointerup` listeners while `dragging === true`; removes on cleanup. If `setDragging(true)` fires but `pointerup` never arrives (e.g., tab switched), the effect still cleans up on unmount. Low risk. If tab hidden mid-drag, pointerup may never dispatch; but the window blur doesn't stop the effect from existing. Minor; not scheduled.

### DB-6 (LOW, MEDIUM) — `useExportController` revoke path on unmount

- **Files**: `src/lib/useExportController.ts:54-60, 152-155`.
- **Evidence**: the unmount cleanup uses `exportedVideoUrlRef.current` snapshot; also `revokeExportedVideoUrl` writes state. If export completes, then user navigates away immediately, the blob URL is revoked. OK.

## Confidence summary

DB-1 and DB-2 are scheduled (merged with code-reviewer). No independent new findings.
