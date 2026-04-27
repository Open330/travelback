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
  const mountedRef = useRef(true)

  useEffect(() => { return () => { mountedRef.current = false } }, [])

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
      addToast(`${t('app.exportFailed')} ${t('app.mapLoadFailed')}`, 'error')
      return
    }

    const abortController = new AbortController()
    exportAbortRef.current = abortController
    const preExportProgress = playbackProgress
    const hadExistingExport = exportedVideoUrlRef.current !== null
    let pendingVideoUrl: string | null = null
    let pendingVideoUrlStored = false

    setIsExporting(true)
    setExportState('exporting')
    setExportProgress(0)
    exportProgressRef.current = undefined
    pausePlayback()

    try {
      const exportScenes = scenes.length > 0
        ? scenes
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
	              await mapHandle.renderFrameAndWait(cameraState, abortController.signal)
	              // Throttle visible playback state updates to ~10 Hz
	              if (exportProgressRef.current === undefined || nextProgress - exportProgressRef.current >= 0.02) {
	                setPlaybackProgress(nextProgress)
	                exportProgressRef.current = nextProgress
	              }
	            },
	            waitForStableMap,
	            (nextProgress) => setExportProgress(nextProgress),
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
      addToast(t('app.exportSuccess'), 'success')
      // Restore playback progress to final position after export
      setPlaybackProgress(1)
      exportProgressRef.current = undefined
    } catch (error) {
      if (pendingVideoUrl && !pendingVideoUrlStored) {
        URL.revokeObjectURL(pendingVideoUrl)
      }
      if (mountedRef.current) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          addToast(t('app.exportCancelled'), 'info')
        } else {
          console.error('Export failed:', error instanceof Error ? error.message : 'Unknown error')
          const detailKey: TranslationKey = isMapRenderExportError(error)
            ? 'app.exportMapRenderFailed'
            : error instanceof ExportError && EXPORT_ERROR_I18N[error.code]
              ? EXPORT_ERROR_I18N[error.code]
              : 'app.exportFailedSuffix'
          addToast(`${t('app.exportFailed')} ${t(detailKey)}`, 'error')
        }
        setExportState(hadExistingExport ? 'done' : 'idle')
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
    playbackProgress,
    scenes,
    setPlaybackProgress,
    t,
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
