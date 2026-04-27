'use client'

import { useState, useRef, useEffect, useCallback, type RefObject } from 'react'
import type { ExportConfig, ExportRequest, Scene, Track } from '@/types'
import type { ToastMessage } from '@/components/Toast'
import type { MapViewHandle } from '@/components/MapView'
import { computeCumulativeDistances } from '@/lib/interpolate'
import { generateDefaultScenes } from '@/lib/camera'
import type { TranslationKey } from '@/lib/i18n'
import { exportVideo, downloadVideo, ExportError } from '@/lib/videoEncoder'
import { isLocalExportTestStubEnabled } from '@/lib/test-stub'

export type ExportState = 'idle' | 'exporting' | 'done'
export type DownloadMethod = 'picker' | 'fallback' | 'ready'

/** Map ExportError codes to i18n keys for localized toast messages */
const EXPORT_ERROR_I18N: Record<string, TranslationKey> = {
  EXPORT_TOO_LARGE: 'app.exportFailedSuffix',
  EXPORT_NO_BUFFER: 'app.exportFailedSuffix',
}

function isMapRenderExportError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.message.includes('Map did not finish rendering')
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

  const exportAbortRef = useRef<AbortController | null>(null)
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
    return () => {
      mountedRef.current = false
      // Abort any in-progress export when the owning component unmounts.
      // Without this, the export loop continues against a destroyed map,
      // producing a video with blank/stale frames.
      exportAbortRef.current?.abort()
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
    setExportedVideoUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl)
      }
      return null
    })
    setExportedVideoBlob(null)
    setExportedVideoFilename(null)
  }, [])


  const resetExportSession = useCallback(() => {
    setExportState('idle')
    setExportProgress(0)
    setDownloadMethod(null)
    revokeExportedVideoUrl()
  }, [revokeExportedVideoUrl])

  const cancelExport = useCallback(() => {
    exportAbortRef.current?.abort()
  }, [])

  const exportTrack = useCallback(async (config: ExportRequest) => {
    const mapHandle = mapViewRef.current
    const canvas = mapHandle?.getCanvas()
    if (!canvas || !track || !mapHandle) {
      addToast(`${tRef.current('app.exportFailed')} ${tRef.current('app.mapLoadFailed')}`, 'error')
      return
    }

    const abortController = new AbortController()
    exportAbortRef.current = abortController
    const preExportProgress = playbackProgressRef.current
    let pendingVideoUrl: string | null = null
    let pendingVideoUrlStored = false

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

    try {
      const exportScenes = scenesRef.current.length > 0
        ? scenesRef.current
        : generateDefaultScenes()

      const exportConfig: ExportConfig = {
        ...config,
        scenes: exportScenes,
        transitionDuration,
      }

      mapHandle.resize(config.resolution.width, config.resolution.height)

      const mapSettledAfterResize = await mapHandle.waitForIdle(abortController.signal)
      if (!mapSettledAfterResize) {
        throw new Error('Map did not finish rendering after resize')
      }

      let consecutiveIdleTimeouts = 0
      const waitForStableMap = async () => {
        const didIdle = await mapHandle.waitForIdle(abortController.signal)
        if (didIdle) {
          consecutiveIdleTimeouts = 0
          return
        }

        consecutiveIdleTimeouts += 1
        if (consecutiveIdleTimeouts >= 2) {
          throw new Error('Map did not finish rendering in time for export')
        }
      }

	      const cumulDist = cumulativeDistancesProp?.length
	        ? cumulativeDistancesProp
	        : computeCumulativeDistances(track.points, track.segmentStartIndices)

	      const result = isLocalExportTestStubEnabled()
	        ? await new Promise<{ buffer: ArrayBuffer; filename: string; mimeType: string }>((resolve) => {
	            setPlaybackProgress(1)
	            setExportProgress(1)
	            requestAnimationFrame(() => {
	              resolve({
	                buffer: new TextEncoder().encode('travelback-test-export').buffer,
	                filename: `Travelback - ${track.name}.mp4`,
	                mimeType: 'video/mp4',
	              })
	            })
	          })
	        : await exportVideo(
	            canvas,
	            track,
	            exportConfig,
	            async (nextProgress, cameraState) => {
	              await mapHandle.renderFrameAndWait(cameraState, nextProgress, abortController.signal)
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

      const blob = new Blob([result.buffer], { type: result.mimeType })
      pendingVideoUrl = URL.createObjectURL(blob)
      const downloadResult = await downloadVideo(pendingVideoUrl, result.filename, blob)
      if (exportedVideoUrlRef.current) {
        URL.revokeObjectURL(exportedVideoUrlRef.current)
      }
      setDownloadMethod(downloadResult.method === 'fallback' || downloadResult.saved ? downloadResult.method : 'ready')
      setExportedVideoBlob(blob)
      setExportedVideoFilename(result.filename)
      setExportedVideoUrl(pendingVideoUrl)
      exportedVideoUrlRef.current = pendingVideoUrl
      pendingVideoUrlStored = true
      setExportState('done')
      addToast(tRef.current('app.exportSuccess'), 'success')
      // Restore playback progress to final position after export
      setPlaybackProgress(1)
      exportProgressRef.current = undefined
    } catch (error) {
      if (pendingVideoUrl && !pendingVideoUrlStored) {
        URL.revokeObjectURL(pendingVideoUrl)
      }
      if (mountedRef.current) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          addToast(tRef.current('app.exportCancelled'), 'info')
        } else {
          console.error('Export failed:', error instanceof Error ? error.message : 'Unknown error')
          const detailKey: TranslationKey = isMapRenderExportError(error)
            ? 'app.exportMapRenderFailed'
            : error instanceof ExportError && EXPORT_ERROR_I18N[error.code]
              ? EXPORT_ERROR_I18N[error.code]
              : 'app.exportFailedSuffix'
          addToast(`${tRef.current('app.exportFailed')} ${tRef.current(detailKey)}`, 'error')
        }
        setExportState('idle')
      }
    } finally {
      exportAbortRef.current = null
      try {
        mapViewRef.current?.resetSize()
      } catch (resetError) {
        // resetSize() is expected to clear forced dimensions itself; this log
        // keeps unexpected map teardown failures visible without reaching into
        // MapView's DOM from the controller.
        console.warn('[Travelback] mapHandle.resetSize() failed during export cleanup:', resetError instanceof Error ? resetError.message : String(resetError))
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
      if (mountedRef.current) {
        setPlaybackProgress(preExportProgress)
        setIsExporting(false)
        setExportProgress(0)
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
    exportTrack,
    resetExportSession,
  }
}
