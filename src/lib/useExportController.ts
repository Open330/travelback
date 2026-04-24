'use client'

import { useState, useRef, useEffect, useCallback, type RefObject } from 'react'
import type { ExportConfig, Scene, Track } from '@/types'
import type { ToastMessage } from '@/components/Toast'
import type { MapViewHandle } from '@/components/MapView'
import { computeCumulativeDistances } from '@/lib/interpolate'
import { generateDefaultScenes } from '@/lib/camera'
import type { TranslationKey } from '@/lib/i18n'
import { exportVideo, downloadVideo } from '@/lib/videoEncoder'

export type ExportState = 'idle' | 'exporting' | 'done'
export type DownloadMethod = 'picker' | 'fallback' | 'ready'

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
  const [downloadMethod, setDownloadMethod] = useState<DownloadMethod | null>(null)

  const exportAbortRef = useRef<AbortController | null>(null)
  const exportedVideoUrlRef = useRef<string | null>(null)
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

  const exportTrack = useCallback(async (config: ExportConfig) => {
    const mapHandle = mapViewRef.current
    const canvas = mapHandle?.getCanvas()
    if (!canvas || !track || !mapHandle) {
      addToast(`${t('app.exportFailed')} ${t('app.mapLoadFailed')}`, 'error')
      return
    }

    const abortController = new AbortController()
    exportAbortRef.current = abortController
    const preExportProgress = playbackProgress
    let pendingVideoUrl: string | null = null
    let pendingVideoUrlStored = false

    revokeExportedVideoUrl()

    setIsExporting(true)
    setExportState('exporting')
    setExportProgress(0)
    pausePlayback()

    try {
      const exportScenes = config.scenes.length > 0
        ? config.scenes
        : scenes.length > 0
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

      const result = await exportVideo(
        canvas,
        track,
        exportConfig,
        async (nextProgress, cameraState) => {
          mapHandle.applyCameraState(cameraState)
          setPlaybackProgress(nextProgress)
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        },
        (nextProgress) => setExportProgress(nextProgress),
        waitForStableMap,
        abortController.signal,
        cumulDist,
      )

      const blob = new Blob([result.buffer], { type: result.mimeType })
      pendingVideoUrl = URL.createObjectURL(blob)
      const downloadResult = await downloadVideo(pendingVideoUrl, result.filename, blob)
      if (exportedVideoUrlRef.current) {
        URL.revokeObjectURL(exportedVideoUrlRef.current)
      }
      setDownloadMethod(downloadResult.saved ? downloadResult.method : 'ready')
      setExportedVideoBlob(blob)
      setExportedVideoUrl(pendingVideoUrl)
      exportedVideoUrlRef.current = pendingVideoUrl
      pendingVideoUrlStored = true
      setExportState('done')
      addToast(t('app.exportSuccess'), 'success')
    } catch (error) {
      if (pendingVideoUrl && !pendingVideoUrlStored) {
        URL.revokeObjectURL(pendingVideoUrl)
      }
      if (mountedRef.current) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          addToast(t('app.exportCancelled'), 'info')
        } else {
          console.error('Export failed:', error instanceof Error ? error.message : 'Unknown error')
          addToast(`${t('app.exportFailed')} ${t('app.exportFailedSuffix')}`, 'error')
        }
        setExportState('idle')
      }
    } finally {
      exportAbortRef.current = null
      try {
        mapViewRef.current?.resetSize()
      } catch (resetError) {
        // resetSize() can fail if the map was destroyed during export.
        // Force-reset the container dimensions as a fallback so the layout
        // isn't stuck at the export resolution (e.g. 3840x2160 for 4K).
        console.warn('[Travelback] mapHandle.resetSize() failed during export cleanup:', resetError instanceof Error ? resetError.message : String(resetError))
        try {
          const container = document.querySelector('[data-testid="map-container"]') as HTMLElement | null
          if (container) {
            container.style.width = ''
            container.style.height = ''
          }
        } catch { /* best effort */ }
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
    revokeExportedVideoUrl,
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
    downloadMethod,
    cancelExport,
    exportTrack,
    resetExportSession,
  }
}
