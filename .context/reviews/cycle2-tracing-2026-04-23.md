# Tracing Review — Cycle 2 (2026-04-23)

## Methodology
Examined all 28 source files for data flow traceability: callback ref patterns, state propagation, event handler chains, and cross-component data dependencies. Deduplicated against all prior cycles and deferred items.

## New Findings

**No new findings.**

## Verification of Prior Tracing Patterns

- **Unidirectional data flow**: HomeInner (page.tsx) is the single source of truth. State flows down via props, events flow up via callbacks. CONFIRMED.
- **Callback refs prevent stale closures**: usePlaybackController and useExportController use refs (isPlayingRef, progressRef, speedRef, etc.) to avoid stale closure issues in rAF callbacks. CONFIRMED.
- **Distance-based paradigm**: Consistent across TimelineSelector, ElevationProfile, and playback controller. Track progress is always distance-normalized (0-1). CONFIRMED.
- **Export abort propagation**: AbortController signal passed through exportTrack -> exportVideo -> waitForIdle. Clean cancellation path. CONFIRMED.

## Specific Checks

- **Playback progress flow**: page.tsx -> usePlaybackController -> rAF animate -> setPlaybackProgress -> MapView (via progress prop). CONFIRMED traceable.
- **Scene edit flow**: SceneEditor local state -> commitScenes callback -> page.tsx state update -> MapView re-render. CONFIRMED traceable.
- **Export progress flow**: useExportController -> exportVideo callback -> setExportProgress -> ExportPanel UI. CONFIRMED traceable.
- **Toast lifecycle**: addToast -> ToastProvider state -> Toast component render -> auto-dismiss timer -> onDismiss. CONFIRMED traceable.
