# Tracer -- Cycle 4 (2026-04-21)

## Summary
Traced the critical user flows for correctness and edge cases. Found 2 trace issues.

## Traces

### Trace 1: Theme Toggle Flow
1. User clicks ThemeToggle button
2. `toggle()` in ThemeToggle calls `onModeChange?.(next)`
3. `handleModeChange` in HomeInner sets `setColorMode(mode)`, applies DOM attribute, writes localStorage
4. If no explicit map style choice, also sets `setMapStyleKey(key)` and `applyDocumentMapStyle(key)`
5. `useEffect` in HomeInner re-applies both `data-mode` and `data-mapstyle` attributes
6. MapView's `mapStyleKey` prop changes, triggering `useEffect` that calls `map.setStyle()`
7. `style.load` event fires, `addReferenceGridLayers` and `addTrackLayers` re-execute

**Finding:** Step 5 is redundant with step 3 -- `handleModeChange` already applies both attributes, then the `useEffect` re-applies them. This causes a double-write to the DOM on every mode change. Not a bug (idempotent operations) but wasteful.

### Trace 2: Track Load Flow
1. User drops/selects a file in FileUpload
2. `handleFile` -> `parseTrackFile` -> resolves with Track
3. `handleTrackLoaded` -> `loadTrackIntoSession`
4. `resetTrackWorkspace()` -> closes export, clears scenes, resets export session
5. `mapViewRef.current?.clearTrackArtifacts()` -> removes route/trail layers and marker from map
6. `setFullTrack(nextTrack)` and `setTrack(nextTrack)` -- two separate state updates (batched by React 18+)
7. `resetPlayback()` -> sets progress to 0, isPlaying to false
8. MapView's `track` prop change triggers useEffect that adds track layers and fits bounds

**Finding:** In step 6, `fullTrack` and `track` are set to the same value initially. `fullTrack` is only used for range slicing (`handleRangeChange`), while `track` is the displayed/animated track. This dual-track state is correct but could be confusing -- `fullTrack` could be derived from `track` + `trackSessionKey` rather than stored separately.

### Trace 3: Export Cancel Flow
1. User clicks cancel button during export
2. `cancelExport` -> `exportAbortRef.current?.abort()`
3. In `exportVideo`, the abort signal is checked at top of loop and after `renderFrame`
4. `DOMException('Export cancelled', 'AbortError')` is thrown
5. `waitForIdle` rejects with `AbortError` if signal is already aborted
6. In `useExportController`, the catch block checks `error.name === 'AbortError'` and shows info toast
7. `finally` block: `mapViewRef.current?.resetSize()` -- but skips `waitForIdle` because `abortController.signal.aborted` is true

**Finding:** The abort flow is clean and well-handled. The `completed` flag in `exportVideo` prevents finalizing a partial MP4, which would be corrupt. Good.

## Findings

### TR4-001: Redundant DOM attribute application in handleModeChange + useEffect [LOW]
- **File:** `src/app/page.tsx` lines 267-307
- **Issue:** `handleModeChange` calls `applyDocumentMode` and `applyDocumentMapStyle`, then the `useEffect` on lines 304-307 also calls both. Every mode change writes to DOM attributes twice.
- **Impact:** Negligible. DOM attribute writes are cheap and idempotent. But the pattern is confusing -- it's unclear which is the "source of truth" for DOM updates.

### TR4-002: `fullTrack` and `track` set to same value on initial load [LOW]
- **File:** `src/app/page.tsx` lines 147-148
- **Issue:** `setFullTrack(nextTrack)` and `setTrack(nextTrack)` always set both to the same Track object initially. `fullTrack` is only used for slicing. This could be simplified by storing only `fullTrack` and deriving `track` from it + a slice range.
- **Impact:** Low. The current pattern works correctly but adds cognitive overhead.
