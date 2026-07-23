'use client'

import { useState, useRef, useEffect, useCallback, type RefObject } from 'react'
import type { ExportConfig, ExportRequest, Scene, Track } from '@/types'
import type { ToastMessage } from '@/components/Toast'
import type { MapViewHandle } from '@/components/MapView'
import { computeCumulativeDistances } from '@/lib/interpolate'
import { computeCameraForProgress } from '@/lib/camera'
import { resolveTrackDisplayName, type TranslationKey } from '@/lib/i18n'
import { exportVideo, downloadVideo, ExportError } from '@/lib/videoEncoder'
import {
  isLocalExportTestStubEnabled,
  LOCAL_EXPORT_TEST_STUB_PAYLOAD,
  shouldRenderLocalExportTestFrame,
} from '@/lib/test-stub'

export type ExportState = 'idle' | 'exporting' | 'done'
export type DownloadMethod = 'picker' | 'fallback' | 'ready'

interface ExportLease {
  abortController: AbortController
  generation: number
  settlement: Promise<void>
  release: () => void
  suppressCancellationToast: boolean
}

/** Map ExportError codes to i18n keys for localized toast messages */
const EXPORT_ERROR_I18N: Record<string, TranslationKey> = {
  EXPORT_TOO_LARGE: 'app.exportFailedSuffix',
  EXPORT_NO_BUFFER: 'app.exportFailedSuffix',
  EXPORT_MAP_RENDER: 'app.exportMapRenderFailed',
  EXPORT_MAP_IDLE: 'app.exportMapRenderFailed',
  EXPORT_CAPTURE_CANVAS: 'app.exportCaptureFailed',
  EXPORT_FINALIZE_TIMEOUT: 'app.exportFinalizeTimeout',
}

interface UseExportControllerOptions {
  track: Track | null
  scenes: Scene[]
  transitionDuration: number
  mapViewRef: RefObject<MapViewHandle | null>
  t: (key: TranslationKey) => string
  addToast: (text: string, type: ToastMessage['type']) => void
  pausePlayback: () => void
  setPlaybackProgress: (progress: number) => void
  playbackProgress: number
  cumulativeDistances?: number[]
}

export function useExportController({
  track,
  scenes,
  transitionDuration,
  mapViewRef,
  t,
  addToast,
  pausePlayback,
  setPlaybackProgress,
  playbackProgress,
  cumulativeDistances: cumulativeDistancesProp,
}: UseExportControllerOptions) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportState, setExportState] = useState<ExportState>('idle')
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null)
  const [exportedVideoBlob, setExportedVideoBlob] = useState<Blob | null>(null)
  const [exportedVideoFilename, setExportedVideoFilename] = useState<string | null>(null)
  const [downloadMethod, setDownloadMethod] = useState<DownloadMethod | null>(null)

  const exportLeaseRef = useRef<ExportLease | null>(null)
  const exportGenerationRef = useRef(0)
  const exportedVideoUrlRef = useRef<string | null>(null)
  const exportProgressRef = useRef<number | undefined>(undefined)
  const lastProgressUpdateTimeRef = useRef<number>(0)
  const lastExportProgressUpdateTimeRef = useRef<number>(0)
  const playbackProgressRef = useRef(playbackProgress)
  const mountedRef = useRef(true)
  const tRef = useRef(t)
  const scenesRef = useRef(scenes)

  // Keep the ref in sync with the prop so exportTrack can read the latest
  // value without closing over the rapidly-changing state variable.
  useEffect(() => {
    playbackProgressRef.current = playbackProgress
  }, [playbackProgress])

  // Keep t in sync so exportTrack can read the latest locale without
  // closing over the t callback (which changes on every locale change).
  useEffect(() => {
    tRef.current = t
  }, [t])

  // Keep scenes ref in sync so exportTrack can read the latest scenes
  // without closing over the state variable (which changes on every edit).
  useEffect(() => {
    scenesRef.current = scenes
  }, [scenes])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      exportGenerationRef.current += 1
      // Abort any in-progress export when the owning component unmounts.
      // Without this, the export loop continues against a destroyed map,
      // producing a video with blank/stale frames.
      exportLeaseRef.current?.abortController.abort()
    }
  }, [])

  useEffect(() => {
    exportedVideoUrlRef.current = exportedVideoUrl
  }, [exportedVideoUrl])

  useEffect(() => {
    return () => {
      if (exportedVideoUrlRef.current) {
        URL.revokeObjectURL(exportedVideoUrlRef.current)
      }
    }
  }, [])

  const revokeExportedVideoUrl = useCallback(() => {
    const previousUrl = exportedVideoUrlRef.current
    exportedVideoUrlRef.current = null
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl)
    }
    setExportedVideoUrl(null)
    setExportedVideoBlob(null)
    setExportedVideoFilename(null)
  }, [])

  const invalidateExportSession = useCallback(() => {
    exportGenerationRef.current += 1
    const lease = exportLeaseRef.current
    if (lease) {
      lease.suppressCancellationToast = true
      lease.abortController.abort()
    }
  }, [])

  const resetExportSession = useCallback(() => {
    invalidateExportSession()
    setIsExporting(false)
    setExportState('idle')
    setExportProgress(0)
    setDownloadMethod(null)
    revokeExportedVideoUrl()
  }, [invalidateExportSession, revokeExportedVideoUrl])

  const cancelExport = useCallback(() => {
    exportLeaseRef.current?.abortController.abort()
  }, [])

  const cancelExportAndWait = useCallback(async () => {
    const lease = exportLeaseRef.current
    if (!lease) return

    lease.suppressCancellationToast = true
    lease.abortController.abort()
    await lease.settlement
  }, [])

  const exportTrack = useCallback(async (config: ExportRequest) => {
    // State updates do not become visible until React renders, so isExporting
    // cannot serialize two calls made in the same tick. The abort controller is
    // also the export lease: acquire it synchronously and let only its owner run
    // export and cleanup work.
    if (exportLeaseRef.current) return

    const mapHandle = mapViewRef.current
    const canvas = mapHandle?.getCanvas()
    if (!canvas || !track || !mapHandle) {
      addToast(`${tRef.current('app.exportFailed')} ${tRef.current('app.mapLoadFailed')}`, 'error')
      return
    }

    const abortController = new AbortController()
    let releaseSettlement!: () => void
    const lease: ExportLease = {
      abortController,
      generation: exportGenerationRef.current,
      settlement: new Promise<void>((resolve) => {
        releaseSettlement = resolve
      }),
      release: () => releaseSettlement(),
      suppressCancellationToast: false,
    }
    exportLeaseRef.current = lease
    const trackForExport: Track = {
      ...track,
      name: resolveTrackDisplayName(track, tRef.current),
    }
    const preExportProgress = playbackProgressRef.current
    let pendingVideoUrl: string | null = null
    let pendingVideoUrlStored = false
    let exportSucceeded = false
    const ownsPublication = () => (
      mountedRef.current
      && exportLeaseRef.current === lease
      && exportGenerationRef.current === lease.generation
    )
    const requireActiveLease = () => {
      if (!ownsPublication() || abortController.signal.aborted) {
        throw new DOMException('Export cancelled', 'AbortError')
      }
    }

    try {
      setIsExporting(true)
      setExportState('exporting')
      setExportProgress(0)
      exportProgressRef.current = undefined
      lastProgressUpdateTimeRef.current = 0
      lastExportProgressUpdateTimeRef.current = 0
      // Clear any stale video from a previous export so a failed new export
      // cannot show the old video in "done" state (CF5-03).
      revokeExportedVideoUrl()
      pausePlayback()

      const exportConfig: ExportConfig = {
        ...config,
        scenes: scenesRef.current,
        transitionDuration,
      }

      mapHandle.resize(config.resolution.width, config.resolution.height)

      const mapSettledAfterResize = await mapHandle.waitForIdle(abortController.signal)
      requireActiveLease()
      if (!mapSettledAfterResize) {
        throw new ExportError('Map did not finish rendering after resize', 'EXPORT_MAP_RENDER')
      }

      let consecutiveIdleTimeouts = 0
      const waitForStableMap = async () => {
        requireActiveLease()
        const didIdle = await mapHandle.waitForIdle(abortController.signal)
        requireActiveLease()
        if (didIdle) {
          consecutiveIdleTimeouts = 0
          return
        }

        consecutiveIdleTimeouts += 1
        if (consecutiveIdleTimeouts >= 2) {
          throw new ExportError('Map did not finish rendering in time for export', 'EXPORT_MAP_IDLE')
        }
      }

      const cumulDist = cumulativeDistancesProp?.length
        ? cumulativeDistancesProp
        : computeCumulativeDistances(track.points, track.segmentStartIndices)

      const result = isLocalExportTestStubEnabled()
        ? await (async () => {
            if (shouldRenderLocalExportTestFrame()) {
              const frameProgress = 0.75
              const frameCamera = computeCameraForProgress(
                trackForExport,
                cumulDist,
                exportConfig.scenes,
                frameProgress,
                exportConfig.duration * frameProgress,
                exportConfig.transitionDuration,
              )
              await mapHandle.renderFrameAndWait(
                frameCamera,
                frameProgress,
                abortController.signal,
              )
              requireActiveLease()
            }

            if (ownsPublication() && !abortController.signal.aborted) {
              setPlaybackProgress(1)
              setExportProgress(1)
            }
            return new Promise<{ buffer: ArrayBuffer; filename: string; mimeType: string }>((resolve) => {
              requestAnimationFrame(() => {
                resolve({
                  buffer: new TextEncoder().encode(LOCAL_EXPORT_TEST_STUB_PAYLOAD).buffer,
                  filename: `Travelback - ${trackForExport.name}.mp4`,
                  mimeType: 'video/mp4',
                })
              })
            })
          })()
        : await exportVideo(
            canvas,
            trackForExport,
            exportConfig,
            async (nextProgress, cameraState) => {
              requireActiveLease()
              await mapHandle.renderFrameAndWait(cameraState, nextProgress, abortController.signal)
              requireActiveLease()
              // Throttle visible playback state updates to ~10 Hz using
              // a time-based interval so UI refresh rate is consistent
              // regardless of export duration or frame rate.
              const now = performance.now()
              if (exportProgressRef.current === undefined || now - lastProgressUpdateTimeRef.current >= 100) {
                setPlaybackProgress(nextProgress)
                exportProgressRef.current = nextProgress
                lastProgressUpdateTimeRef.current = now
              }
            },
            waitForStableMap,
            (nextProgress) => {
              if (!ownsPublication() || abortController.signal.aborted) return
              // Throttle export progress display updates to ~10 Hz so the
              // progress bar does not re-render on every frame (same pattern
              // as the playback progress throttle above).
              const now = performance.now()
              if (now - lastExportProgressUpdateTimeRef.current >= 100) {
                setExportProgress(nextProgress)
                lastExportProgressUpdateTimeRef.current = now
              }
            },
            abortController.signal,
            cumulDist,
          )

      requireActiveLease()
      const blob = new Blob([result.buffer], { type: result.mimeType })
      pendingVideoUrl = URL.createObjectURL(blob)
      requireActiveLease()
      const downloadResult = await downloadVideo(pendingVideoUrl, result.filename, blob)
      requireActiveLease()
      if (exportedVideoUrlRef.current) {
        URL.revokeObjectURL(exportedVideoUrlRef.current)
      }
      setDownloadMethod(downloadResult.method === 'fallback' || downloadResult.saved ? downloadResult.method : 'ready')
      setExportedVideoBlob(blob)
      setExportedVideoFilename(result.filename)
      setExportedVideoUrl(pendingVideoUrl)
      exportedVideoUrlRef.current = pendingVideoUrl
      pendingVideoUrlStored = true
      exportSucceeded = true
      setExportState('done')
      if (downloadResult.saveError) {
        console.error('Video save failed:', downloadResult.saveError.message)
        addToast(tRef.current('app.exportSaveFailed'), 'error')
      } else {
        addToast(tRef.current('app.exportSuccess'), 'success')
      }
      // Restore playback progress to final position after export
      setPlaybackProgress(1)
      exportProgressRef.current = undefined
    } catch (error) {
      if (pendingVideoUrl && !pendingVideoUrlStored) {
        URL.revokeObjectURL(pendingVideoUrl)
      }
      if (ownsPublication()) {
        if (abortController.signal.aborted) {
          if (!lease.suppressCancellationToast) {
            addToast(tRef.current('app.exportCancelled'), 'info')
          }
        } else {
          console.error('Export failed:', error instanceof Error ? error.message : 'Unknown error')
          const detailKey: TranslationKey = error instanceof ExportError && EXPORT_ERROR_I18N[error.code]
            ? EXPORT_ERROR_I18N[error.code]
            : 'app.exportFailedSuffix'
          addToast(`${tRef.current('app.exportFailed')} ${tRef.current(detailKey)}`, 'error')
        }
        setExportState('idle')
      }
    } finally {
      try {
        // Only reset map size when the component is still mounted — calling
        // resetSize() on a destroyed map can throw (C15-F05).
        if (mountedRef.current) {
          try {
            mapViewRef.current?.resetSize()
          } catch (resetError) {
            // resetSize() is expected to clear forced dimensions itself; this log
            // keeps unexpected map teardown failures visible without reaching into
            // MapView's DOM from the controller.
            console.warn('[Travelback] mapHandle.resetSize() failed during export cleanup:', resetError instanceof Error ? resetError.message : String(resetError))
          }
        } else {
          // Component unmounted during export — attempt a best-effort container
          // style cleanup only (resetSize clears container style + calls
          // map.resize). The container style clear is non-throwing.
          try {
            mapViewRef.current?.resetSize()
          } catch { /* map destroyed — container already cleaned by unmount */ }
        }
        // Wait for map to settle after resize on the normal-completion path.
        // Skip the idle wait when the export was aborted — the signal is already
        // aborted so waitForIdle would reject immediately, making the wait a no-op.
        // Also skip if the map was destroyed during export to avoid unhandled rejections.
        if (!abortController.signal.aborted && mapViewRef.current) {
          try {
            await mapViewRef.current?.waitForIdle(abortController.signal)
          } catch {
            // Timeout is acceptable during cleanup
          }
        }
        if (ownsPublication()) {
          // Only restore pre-export progress on abort/failure — on success,
          // progress was already set to 1 in the try block above.
          if (!exportSucceeded) {
            setPlaybackProgress(preExportProgress)
          }
          setIsExporting(false)
          setExportProgress(0)
        }
      } finally {
        // A stale invocation must never clear a newer export's cancellation
        // handle. Retain the lease through map/progress cleanup so re-entry
        // cannot start while the previous owner is still restoring shared state.
        if (exportLeaseRef.current === lease) {
          exportLeaseRef.current = null
        }
        lease.release()
      }
    }
  }, [
    addToast,
    mapViewRef,
    pausePlayback,
    revokeExportedVideoUrl,
    setPlaybackProgress,
    track,
    transitionDuration,
    cumulativeDistancesProp,
  ])

  return {
    isExporting,
    exportProgress,
    exportState,
    exportedVideoUrl,
    exportedVideoBlob,
    exportedVideoFilename,
    downloadMethod,
    cancelExport,
    cancelExportAndWait,
    invalidateExportSession,
    exportTrack,
    resetExportSession,
  }
}
