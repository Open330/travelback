# Architectural Review — Travelback (Cycle 1, 2026-05-04)

**Reviewer**: architect
**Scope**: Component architecture, state management, data flow, design patterns

## Summary

Architecture is sound for a client-side-only Next.js app. State is centralized in page.tsx with custom hooks for playback and export. However, page.tsx has grown too large and component coupling could be improved.

## Findings

### AR-01: page.tsx is an architectural bottleneck
**Severity**: High
**File**: `src/app/page.tsx` (658 lines, ~30 state variables)
**Description**: `HomeInner` owns all application state creating a "prop waterfall" of 15+ props to deeply nested components. Any state change re-renders the entire tree.
**Recommendation**: Extract state domains into context providers (ThemeContext, SceneContext, ModalContext).

### AR-02: MapView exposes imperative handle via forwardRef
**Severity**: Medium
**File**: `src/components/MapView.tsx:27-36,545-758`
**Description**: `MapViewHandle` exposes 8 imperative methods mixing export concerns (resize, renderFrameAndWait) with camera concerns (applyCameraState).
**Recommendation**: Split into narrower interfaces.

### AR-03: Playback and export controllers have implicit coupling
**Severity**: Medium
**File**: `src/lib/useExportController.ts:47-48`
**Description**: Export controller receives `pausePlayback` and `setPlaybackProgress` from playback controller, creating implicit ordering dependency.
**Recommendation**: Document coupling contract. Consider shared PlaybackState interface.

### AR-04: Scene normalization scattered across codebase
**Severity**: Medium
**File**: `src/lib/camera.ts:19-44`, `src/components/MapView.tsx:519`, `src/lib/videoEncoder.ts:111`
**Description**: `normalizeScenes` called in MapView, videoEncoder, and potentially every `computeCameraForProgress`. The `preNormalized` flag is a band-aid.
**Recommendation**: Normalize at creation time, remove `preNormalized` flag.

### AR-05: Single top-level ErrorBoundary
**Severity**: Medium
**File**: `src/app/page.tsx:511`
**Description**: One ErrorBoundary wraps the entire app. A MapView crash takes down everything.
**Recommendation**: Add component-level ErrorBoundary wrappers around MapView and TrackWorkspace.

### AR-06: Direct DOM manipulation alongside React in MapView
**Severity**: Low
**File**: `src/components/MapView.tsx:968-990`
**Description**: `ensureMarker` creates DOM elements directly for MapLibre markers. Necessary for MapLibre integration, cleanup is handled.
**Risk**: Low — standard pattern.

## Summary

| Severity | Count |
|----------|-------|
| High     | 1     |
| Medium   | 4     |
| Low      | 1     |
