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
    const addToast = vi.fn()
    const mapHandle: MapViewHandle = {
      getMap: () => null,
      getCanvas: () => document.createElement('canvas'),
      applyCameraState: vi.fn(),
      renderFrameAndWait: vi.fn(),
      clearTrackArtifacts: vi.fn(),
      resize: vi.fn(),
      resetSize: vi.fn(),
      waitForIdle: vi.fn().mockResolvedValue(true),
    }
    const controllerRef: { current: ReturnType<typeof useExportController> | null } = { current: null }

    function Harness() {
      const controller = useExportController({
        track,
        scenes: [],
        transitionDuration: 0.03,
        mapViewRef: { current: mapHandle },
        t: (key) => key,
        addToast,
        pausePlayback: vi.fn(),
        setPlaybackProgress: vi.fn(),
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
    await act(() => root?.render(createElement(StrictMode, null, createElement(Harness))))

    await act(async () => {
      await controllerRef.current?.exportTrack(request)
    })

    expect(exportVideo).toHaveBeenCalledOnce()
    expect(addToast).toHaveBeenCalledWith('app.exportFailed app.exportFailedSuffix', 'error')
    expect(mapHandle.resetSize).toHaveBeenCalledOnce()
    expect(consoleError).toHaveBeenCalledWith('Export failed:', 'encoder failed')
  })
})
