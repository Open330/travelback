// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import {
  applyExportPresentation,
  captureExportPresentation,
  restoreExportPresentation,
  type ExportPresentationMap,
} from './map-export-presentation'

function createMapHarness(devicePixelRatio: number) {
  const container = document.createElement('div')
  const canvas = document.createElement('canvas')
  container.style.width = '640px'
  container.style.height = '360px'
  let pixelRatio = devicePixelRatio

  const map: ExportPresentationMap = {
    getPixelRatio: () => pixelRatio,
    setPixelRatio: (nextPixelRatio) => {
      pixelRatio = nextPixelRatio
    },
    resize: () => {
      canvas.width = Number.parseInt(container.style.width, 10) * pixelRatio
      canvas.height = Number.parseInt(container.style.height, 10) * pixelRatio
    },
  }
  map.resize()
  return { canvas, container, map }
}

describe('map export presentation', () => {
  it.each([1, 2, 3])('uses exact requested pixels at device pixel ratio %i and restores the interactive ratio', (devicePixelRatio) => {
    const { canvas, container, map } = createMapHarness(devicePixelRatio)
    const snapshot = captureExportPresentation(map, container)

    applyExportPresentation(map, container, 1080, 1920)

    expect(map.getPixelRatio()).toBe(1)
    expect(canvas.width).toBe(1080)
    expect(canvas.height).toBe(1920)

    restoreExportPresentation(map, container, snapshot)

    expect(map.getPixelRatio()).toBe(devicePixelRatio)
    expect(container.style.width).toBe('640px')
    expect(container.style.height).toBe('360px')
    expect(canvas.width).toBe(640 * devicePixelRatio)
    expect(canvas.height).toBe(360 * devicePixelRatio)
  })
})
