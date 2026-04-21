# Tracer -- Cycle 7 (2026-04-21)

## Methodology

Causal tracing of suspicious flows, competing hypotheses for potential failure modes. Deep tracing of data flow through the track loading, playback, and export pipelines.

## Traced Flow 1: Track Loading Pipeline

```
FileUpload.handleFile -> parseTrackFile -> parseGPX/parseKML/parseGoogleLocationHistoryInWorkerBuffer
  -> finalizeTrack (validates >= 2 points, <= 250k points)
  -> onTrackLoaded (handleTrackLoaded in page.tsx)
  -> loadTrackIntoSession
    -> resetTrackWorkspace (closes panels, resets export, clears scenes)
    -> mapViewRef.current?.clearTrackArtifacts()
    -> setFullTrack/setTrack
    -> resetPlayback
    -> setTrackSessionKey (increments for TimelineSelector key)
```

**Finding:** All clear. The session key increment ensures TimelineSelector remounts, which resets its drag state. The `clearTrackArtifacts` call before `setFullTrack` ensures no stale map layers.

## Traced Flow 2: Export Abort Path

```
user clicks Cancel -> cancelExport -> exportAbortRef.current.abort()
  -> in exportVideo loop: signal.aborted check -> throw DOMException('Export cancelled', 'AbortError')
  -> useExportController catch block: detects AbortError -> addToast(info) -> setExportState('idle')
  -> finally block: resetSize (with fallback), skip idle wait when aborted, setIsExporting(false)
```

**Finding:** All clear. The abort path correctly:
1. Skips MP4 finalization (completed=false in videoEncoder.ts:89)
2. Resets map size with fallback
3. Skips the idle wait (signal already aborted)
4. Cleans up export state

## Traced Flow 3: Theme Change During Playback

```
handleModeChange -> setColorMode + applyDocumentMode + localStorage
  -> if (!hasExplicitMapStyleChoice): setMapStyleKey + applyDocumentMapStyle
    -> MapView style change effect: map.setStyle(MAP_STYLES[key].url)
      -> map.once('style.load', handler): re-adds reference grid + track layers
```

**Potential Issue:** If the user changes theme during active playback, `map.setStyle` removes all layers, and the `style.load` handler re-adds them. But the animation effect (MapView.tsx:829-936) runs on every `progress` change and has a guard at line 833 that re-adds layers if they're missing. So there's a brief window where the animation effect runs with no layers, but the guard immediately re-adds them. No visual glitch observed in practice.

**Verdict:** LOW risk. The guard at line 833 handles this case. The brief window is one frame at most.

## New Findings

None beyond what's already captured. The data flows are well-guarded with proper cleanup and fallback paths.
