// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import {
  applyExportPresentation,
  captureExportPresentation,
  restoreExportPresentation,
  type CameraOwnershipMode,
  type ExportPresentationMap,
  type PixelRatioOwnershipMode,
} from './map-export-presentation'
import type { CameraState } from './camera'

function createMapHarness(
  devicePixelRatio: number,
  pixelRatioMode: PixelRatioOwnershipMode = 'automatic',
  explicitPixelRatio = devicePixelRatio,
  initialCamera: CameraState = {
    center: [12.5, 48.25],
    zoom: 8,
    pitch: 35,
    bearing: 120,
  },
) {
  const container = document.createElement('div')
  const canvas = document.createElement('canvas')
  container.style.width = '640px'
  container.style.height = '360px'
  let simulatedDevicePixelRatio = devicePixelRatio
  let pixelRatioOverride = pixelRatioMode === 'explicit' ? explicitPixelRatio : null
  let camera: CameraState = {
    ...initialCamera,
    center: [...initialCamera.center],
  }
  const setPixelRatioCalls: Array<number | null> = []
  const presentationCalls: string[] = []

  const resize = () => {
    presentationCalls.push('resize')
    const activePixelRatio = pixelRatioOverride ?? simulatedDevicePixelRatio
    canvas.width = Number.parseInt(container.style.width, 10) * activePixelRatio
    canvas.height = Number.parseInt(container.style.height, 10) * activePixelRatio
  }

  const map: ExportPresentationMap = {
    getPixelRatio: () => pixelRatioOverride ?? simulatedDevicePixelRatio,
    setPixelRatio: (nextPixelRatio: number | null) => {
      presentationCalls.push(`pixel-ratio:${nextPixelRatio ?? 'automatic'}`)
      setPixelRatioCalls.push(nextPixelRatio)
      pixelRatioOverride = nextPixelRatio
      resize()
    },
    resize,
    getCenter: () => ({ lng: camera.center[0], lat: camera.center[1] }),
    getZoom: () => camera.zoom,
    getPitch: () => camera.pitch,
    getBearing: () => camera.bearing,
    jumpTo: (state: CameraState) => {
      presentationCalls.push('camera')
      camera = {
        ...state,
        center: [...state.center],
      }
    },
  }
  map.resize()
  presentationCalls.length = 0
  return {
    canvas,
    container,
    map,
    presentationCalls,
    setPixelRatioCalls,
    getCamera: () => camera,
    setCamera(nextCamera: CameraState) {
      camera = {
        ...nextCamera,
        center: [...nextCamera.center],
      }
    },
    setDevicePixelRatio(nextPixelRatio: number) {
      simulatedDevicePixelRatio = nextPixelRatio
      resize()
    },
  }
}

describe('map export presentation', () => {
  it.each([1, 2, 3])('uses exact requested pixels at device pixel ratio %i and restores automatic ownership', (devicePixelRatio) => {
    const { canvas, container, map } = createMapHarness(devicePixelRatio)
    const snapshot = captureExportPresentation(map, container)

    applyExportPresentation(map, container, 1080, 1920)

    expect(map.getPixelRatio()).toBe(1)
    expect(canvas.width).toBe(1080)
    expect(canvas.height).toBe(1920)

    restoreExportPresentation(map, container, snapshot)

    expect(snapshot.pixelRatio).toEqual({ mode: 'automatic' })
    expect(snapshot.camera).toEqual({ mode: 'follow' })
    expect(map.getPixelRatio()).toBe(devicePixelRatio)
    expect(container.style.width).toBe('640px')
    expect(container.style.height).toBe('360px')
    expect(canvas.width).toBe(640 * devicePixelRatio)
    expect(canvas.height).toBe(360 * devicePixelRatio)
  })

  it('follows simulated device DPR changes after restoring automatic ownership', () => {
    const {
      canvas,
      container,
      map,
      setDevicePixelRatio,
      setPixelRatioCalls,
    } = createMapHarness(2)
    const snapshot = captureExportPresentation(map, container)

    applyExportPresentation(map, container, 1280, 720)
    restoreExportPresentation(map, container, snapshot)
    setDevicePixelRatio(3)

    expect(setPixelRatioCalls).toEqual([1, null])
    expect(map.getPixelRatio()).toBe(3)
    expect(canvas.width).toBe(1920)
    expect(canvas.height).toBe(1080)
  })

  it('restores an explicit override only when capture declares explicit ownership', () => {
    const {
      canvas,
      container,
      map,
      setDevicePixelRatio,
      setPixelRatioCalls,
    } = createMapHarness(2, 'explicit', 1.5)
    const snapshot = captureExportPresentation(map, container, 'explicit')

    applyExportPresentation(map, container, 1280, 720)
    restoreExportPresentation(map, container, snapshot)
    setDevicePixelRatio(3)

    expect(snapshot.pixelRatio).toEqual({ mode: 'explicit', value: 1.5 })
    expect(setPixelRatioCalls).toEqual([1, 1.5])
    expect(map.getPixelRatio()).toBe(1.5)
    expect(canvas.width).toBe(960)
    expect(canvas.height).toBe(540)
  })

  it('captures an independent manual camera and restores it after dimensions and DPR', () => {
    const originalCamera: CameraState = {
      center: [-73.9857, 40.7484],
      zoom: 14.5,
      pitch: 52,
      bearing: -25,
    }
    const {
      container,
      getCamera,
      map,
      presentationCalls,
      setCamera,
    } = createMapHarness(2, 'automatic', 2, originalCamera)
    const snapshot = captureExportPresentation(map, container, 'automatic', 'manual')

    setCamera({
      center: [139.6917, 35.6895],
      zoom: 9,
      pitch: 10,
      bearing: 75,
    })
    applyExportPresentation(map, container, 1920, 1080)
    presentationCalls.length = 0

    restoreExportPresentation(map, container, snapshot, 'manual')

    expect(snapshot.camera).toEqual({ mode: 'manual', value: originalCamera })
    expect(getCamera()).toEqual(originalCamera)
    expect(container.style.width).toBe('640px')
    expect(container.style.height).toBe('360px')
    expect(presentationCalls).toEqual([
      'pixel-ratio:automatic',
      'resize',
      'resize',
      'camera',
    ])
  })

  it.each([
    ['follow', 'manual'],
    ['manual', 'follow'],
  ] as const)(
    'does not restore a stale camera captured in %s mode when cleanup is %s',
    (captureMode: CameraOwnershipMode, restoreMode: CameraOwnershipMode) => {
      const exportedCamera: CameraState = {
        center: [151.2093, -33.8688],
        zoom: 7,
        pitch: 20,
        bearing: 160,
      }
      const {
        container,
        getCamera,
        map,
        presentationCalls,
        setCamera,
      } = createMapHarness(3)
      const snapshot = captureExportPresentation(map, container, 'automatic', captureMode)

      setCamera(exportedCamera)
      applyExportPresentation(map, container, 720, 1280)
      presentationCalls.length = 0
      restoreExportPresentation(map, container, snapshot, restoreMode)

      expect(getCamera()).toEqual(exportedCamera)
      expect(presentationCalls).not.toContain('camera')
    },
  )
})
