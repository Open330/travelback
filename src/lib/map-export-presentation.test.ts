// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import {
  applyExportPresentation,
  captureExportPresentation,
  restoreExportPresentation,
  type ExportPresentationMap,
  type PixelRatioOwnershipMode,
} from './map-export-presentation'

function createMapHarness(
  devicePixelRatio: number,
  pixelRatioMode: PixelRatioOwnershipMode = 'automatic',
  explicitPixelRatio = devicePixelRatio,
) {
  const container = document.createElement('div')
  const canvas = document.createElement('canvas')
  container.style.width = '640px'
  container.style.height = '360px'
  let simulatedDevicePixelRatio = devicePixelRatio
  let pixelRatioOverride = pixelRatioMode === 'explicit' ? explicitPixelRatio : null
  const setPixelRatioCalls: Array<number | null> = []

  const resize = () => {
    const activePixelRatio = pixelRatioOverride ?? simulatedDevicePixelRatio
    canvas.width = Number.parseInt(container.style.width, 10) * activePixelRatio
    canvas.height = Number.parseInt(container.style.height, 10) * activePixelRatio
  }

  const map: ExportPresentationMap = {
    getPixelRatio: () => pixelRatioOverride ?? simulatedDevicePixelRatio,
    setPixelRatio: (nextPixelRatio: number | null) => {
      setPixelRatioCalls.push(nextPixelRatio)
      pixelRatioOverride = nextPixelRatio
      resize()
    },
    resize,
  }
  map.resize()
  return {
    canvas,
    container,
    map,
    setPixelRatioCalls,
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
})
