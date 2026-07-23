// @vitest-environment jsdom

import { StrictMode, createElement, useEffect } from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MapViewHandle } from '@/components/MapView'
import type { ExportConfig, ExportRequest, Scene, Track } from '@/types'
import type { TranslationKey } from '@/lib/i18n'

const exportVideo = vi.hoisted(() => vi.fn())
const downloadVideo = vi.hoisted(() => vi.fn())

vi.mock('@/lib/videoEncoder', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/videoEncoder')>(),
  exportVideo,
  downloadVideo,
}))

vi.mock('@/lib/test-stub', () => ({
  isLocalExportTestStubEnabled: () => false,
}))

import { useExportController } from './useExportController'
import { ExportError } from './videoEncoder'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const track: Track = {
  name: 'Strict Mode lifecycle',
  points: [
    { lat: 37.5, lng: 126.9 },
    { lat: 37.6, lng: 127 },
  ],
}

const request: ExportRequest = {
  resolution: { label: 'Test', width: 1280, height: 720, aspect: '16:9' },
  codec: 'h264',
  fps: 15,
  duration: 2,
  bitrate: 1,
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function createMapHandle(waitForIdle = vi.fn().mockResolvedValue(true)): MapViewHandle {
  return {
    getMap: () => null,
    getCanvas: () => document.createElement('canvas'),
    applyCameraState: vi.fn(),
    renderFrameAndWait: vi.fn(),
    clearTrackArtifacts: vi.fn(),
    resize: vi.fn(),
    resetSize: vi.fn(),
    waitForIdle,
  }
}

async function renderController(
  mapHandle: MapViewHandle,
  strictMode = false,
  controllerTrack: Track = track,
  translate: (key: TranslationKey) => string = (key) => key,
  controllerScenes: Scene[] = [],
) {
  const addToast = vi.fn()
  const pausePlayback = vi.fn()
  const setPlaybackProgress = vi.fn()
  const controllerRef: { current: ReturnType<typeof useExportController> | null } = { current: null }

  function Harness() {
    const controller = useExportController({
      track: controllerTrack,
      scenes: controllerScenes,
      transitionDuration: 0.03,
      mapViewRef: { current: mapHandle },
      t: translate,
      addToast,
      pausePlayback,
      setPlaybackProgress,
      playbackProgress: 0,
    })
    useEffect(() => {
      controllerRef.current = controller
    }, [controller])
    return null
  }

  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const harness = createElement(Harness)
  await act(() => root?.render(strictMode ? createElement(StrictMode, null, harness) : harness))

  return { addToast, controllerRef, pausePlayback, setPlaybackProgress }
}

beforeEach(() => {
  exportVideo.mockReset()
  downloadVideo.mockReset().mockResolvedValue({ saved: false, method: 'fallback' })
})

afterEach(async () => {
  if (root) await act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useExportController lifecycle', () => {
  it('restores mounted state after the Strict Mode effect probe', async () => {
    const encoderError = new Error('encoder failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    exportVideo.mockRejectedValue(encoderError)
    const mapHandle = createMapHandle()
    const { addToast, controllerRef } = await renderController(mapHandle, true)

    await act(async () => {
      await controllerRef.current?.exportTrack(request)
    })

    expect(exportVideo).toHaveBeenCalledOnce()
    expect(addToast).toHaveBeenCalledWith('app.exportFailed app.exportFailedSuffix', 'error')
    expect(mapHandle.resetSize).toHaveBeenCalledOnce()
    expect(consoleError).toHaveBeenCalledWith('Export failed:', 'encoder failed')
  })

  it('passes an empty scene list to the encoder unchanged', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    exportVideo.mockRejectedValue(new Error('stop after config capture'))
    const { controllerRef } = await renderController(createMapHandle())

    await act(async () => {
      await controllerRef.current?.exportTrack(request)
    })

    const encoderConfig = exportVideo.mock.calls[0]?.[2] as ExportConfig
    expect(encoderConfig.scenes).toEqual([])
  })

  it('preserves authored scene identity and ordering for export', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    exportVideo.mockRejectedValue(new Error('stop after config capture'))
    const authoredScenes: Scene[] = [
      {
        id: 'second-authored',
        name: 'Second authored',
        cameraMode: 'orbit',
        startPercent: 0.5,
        endPercent: 1,
        params: { zoom: 12, pitch: 55, bearingOffset: 20, rotationSpeed: 10 },
      },
      {
        id: 'first-authored',
        name: 'First authored',
        cameraMode: 'flyover',
        startPercent: 0,
        endPercent: 0.5,
        params: { zoom: 13, pitch: 45, bearingOffset: 0, rotationSpeed: 0 },
      },
    ]
    const { controllerRef } = await renderController(
      createMapHandle(),
      false,
      track,
      undefined,
      authoredScenes,
    )

    await act(async () => {
      await controllerRef.current?.exportTrack(request)
    })

    const encoderConfig = exportVideo.mock.calls[0]?.[2] as ExportConfig
    expect(encoderConfig.scenes).toBe(authoredScenes)
    expect(encoderConfig.scenes.map((scene) => scene.id)).toEqual([
      'second-authored',
      'first-authored',
    ])
  })

  it('gives same-tick export calls one cancellable owner and permits restart', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    let ownerSignal: AbortSignal | undefined
    exportVideo.mockImplementation((...args: unknown[]) => {
      ownerSignal = args[6] as AbortSignal
      return new Promise((_resolve, reject) => {
        ownerSignal?.addEventListener('abort', () => {
          reject(new DOMException('Export cancelled', 'AbortError'))
        }, { once: true })
      })
    })
    const mapHandle = createMapHandle()
    const { addToast, controllerRef, pausePlayback } = await renderController(mapHandle)

    let ownerExport!: Promise<void>
    let duplicateExport!: Promise<void>
    await act(async () => {
      ownerExport = controllerRef.current!.exportTrack(request)
      duplicateExport = controllerRef.current!.exportTrack(request)
      await vi.waitFor(() => expect(exportVideo).toHaveBeenCalledOnce())
      controllerRef.current!.cancelExport()
      await Promise.all([ownerExport, duplicateExport])
    })

    expect(ownerSignal?.aborted).toBe(true)
    expect(pausePlayback).toHaveBeenCalledOnce()
    expect(mapHandle.resize).toHaveBeenCalledOnce()
    expect(mapHandle.resetSize).toHaveBeenCalledOnce()
    expect(addToast).toHaveBeenCalledWith('app.exportCancelled', 'info')

    exportVideo.mockRejectedValueOnce(new Error('restart failed'))
    await act(async () => {
      await controllerRef.current!.exportTrack(request)
    })

    expect(exportVideo).toHaveBeenCalledTimes(2)
    expect(pausePlayback).toHaveBeenCalledTimes(2)
    expect(mapHandle.resize).toHaveBeenCalledTimes(2)
    expect(mapHandle.resetSize).toHaveBeenCalledTimes(2)
    expect(consoleError).toHaveBeenCalledWith('Export failed:', 'restart failed')
  })

  it('retains ownership through cleanup and releases it afterward', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    let finishCleanup!: () => void
    const cleanupWait = new Promise<boolean>((resolve) => {
      finishCleanup = () => resolve(true)
    })
    const waitForIdle = vi.fn()
      .mockResolvedValueOnce(true)
      .mockImplementationOnce(() => cleanupWait)
      .mockResolvedValue(true)
    const mapHandle = createMapHandle(waitForIdle)
    exportVideo
      .mockRejectedValueOnce(new Error('first failed'))
      .mockRejectedValueOnce(new Error('later failed'))
    const { controllerRef, pausePlayback } = await renderController(mapHandle)

    let firstExport!: Promise<void>
    await act(async () => {
      firstExport = controllerRef.current!.exportTrack(request)
      await vi.waitFor(() => expect(waitForIdle).toHaveBeenCalledTimes(2))
    })

    await act(async () => {
      await controllerRef.current!.exportTrack(request)
    })

    expect(exportVideo).toHaveBeenCalledOnce()
    expect(pausePlayback).toHaveBeenCalledOnce()
    expect(mapHandle.resize).toHaveBeenCalledOnce()
    expect(mapHandle.resetSize).toHaveBeenCalledOnce()

    await act(async () => {
      finishCleanup()
      await firstExport
    })
    await act(async () => {
      await controllerRef.current!.exportTrack(request)
    })

    expect(exportVideo).toHaveBeenCalledTimes(2)
    expect(pausePlayback).toHaveBeenCalledTimes(2)
    expect(mapHandle.resize).toHaveBeenCalledTimes(2)
    expect(mapHandle.resetSize).toHaveBeenCalledTimes(2)
    expect(consoleError).toHaveBeenCalledWith('Export failed:', 'first failed')
    expect(consoleError).toHaveBeenCalledWith('Export failed:', 'later failed')
  })

  it('passes a localized fallback name to the encoder without mutating the source track', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fallbackTrack: Track = {
      ...track,
      name: 'Google Location History',
      fallbackNameSource: 'google',
    }
    exportVideo.mockRejectedValue(new Error('stop after input capture'))
    const { controllerRef } = await renderController(
      createMapHandle(),
      false,
      fallbackTrack,
      (key) => key === 'track.defaultNameGoogle' ? 'Google 위치 기록' : key,
    )

    await act(async () => {
      await controllerRef.current?.exportTrack(request)
    })

    const encoderTrack = exportVideo.mock.calls[0]?.[1] as Track
    expect(encoderTrack).toMatchObject({
      name: 'Google 위치 기록',
      fallbackNameSource: 'google',
    })
    expect(fallbackTrack.name).toBe('Google Location History')
    expect(consoleError).toHaveBeenCalledWith('Export failed:', 'stop after input capture')
  })

  it('retains a completed in-memory video when the selected file cannot be written', async () => {
    const saveError = new ExportError('write failed', 'EXPORT_SAVE_FAILED')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:completed-video'),
      revokeObjectURL: vi.fn(),
    })
    exportVideo.mockResolvedValue({
      buffer: new Uint8Array([1, 2, 3]).buffer,
      filename: 'Travelback - Journey.mp4',
      mimeType: 'video/mp4',
    })
    downloadVideo.mockResolvedValue({ saved: false, method: 'picker', saveError })
    const { addToast, controllerRef } = await renderController(createMapHandle())

    await act(async () => {
      await controllerRef.current?.exportTrack(request)
    })

    expect(controllerRef.current).toMatchObject({
      exportState: 'done',
      exportedVideoUrl: 'blob:completed-video',
      exportedVideoFilename: 'Travelback - Journey.mp4',
      downloadMethod: 'ready',
    })
    expect(controllerRef.current?.exportedVideoBlob).toBeInstanceOf(Blob)
    expect(addToast).toHaveBeenCalledWith('app.exportSaveFailed', 'error')
    expect(addToast).not.toHaveBeenCalledWith('app.exportSuccess', 'success')
    expect(consoleError).toHaveBeenCalledWith('Video save failed:', 'write failed')
  })

  it.each([
    ['map render loss', new ExportError('map missing', 'EXPORT_MAP_RENDER'), 'app.exportMapRenderFailed'],
    ['capture canvas loss', new ExportError('canvas missing', 'EXPORT_CAPTURE_CANVAS'), 'app.exportCaptureFailed'],
  ])('shows localized recovery for %s', async (_name, failure, detailKey) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    exportVideo.mockRejectedValue(failure)
    const { addToast, controllerRef } = await renderController(createMapHandle())

    await act(async () => {
      await controllerRef.current?.exportTrack(request)
    })

    expect(addToast).toHaveBeenCalledWith(`app.exportFailed ${detailKey}`, 'error')
    expect(addToast).not.toHaveBeenCalledWith('app.exportCancelled', 'info')
  })

  it('does not misreport an unsignaled AbortError as user cancellation', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    exportVideo.mockRejectedValue(new DOMException('map disappeared', 'AbortError'))
    const { addToast, controllerRef } = await renderController(createMapHandle())

    await act(async () => {
      await controllerRef.current?.exportTrack(request)
    })

    expect(addToast).toHaveBeenCalledWith('app.exportFailed app.exportFailedSuffix', 'error')
    expect(addToast).not.toHaveBeenCalledWith('app.exportCancelled', 'info')
  })
})
