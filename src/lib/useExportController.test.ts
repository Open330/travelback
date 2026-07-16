// @vitest-environment jsdom

import { StrictMode, createElement, useEffect } from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MapViewHandle } from '@/components/MapView'
import type { ExportRequest, Track } from '@/types'

const exportVideo = vi.hoisted(() => vi.fn())

vi.mock('@/lib/videoEncoder', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/videoEncoder')>(),
  exportVideo,
}))

vi.mock('@/lib/test-stub', () => ({
  isLocalExportTestStubEnabled: () => false,
}))

import { useExportController } from './useExportController'

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

async function renderController(mapHandle: MapViewHandle, strictMode = false) {
  const addToast = vi.fn()
  const pausePlayback = vi.fn()
  const setPlaybackProgress = vi.fn()
  const controllerRef: { current: ReturnType<typeof useExportController> | null } = { current: null }

  function Harness() {
    const controller = useExportController({
      track,
      scenes: [],
      transitionDuration: 0.03,
      mapViewRef: { current: mapHandle },
      t: (key) => key,
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
})

afterEach(async () => {
  if (root) await act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
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
})
