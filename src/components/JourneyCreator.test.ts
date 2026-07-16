// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type maplibregl from 'maplibre-gl'
import type { MapViewHandle } from './MapView'

vi.mock('@/lib/i18n', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/i18n')>(),
  useLocale: () => ({ t: (key: string) => key }),
}))

import JourneyCreator, { syncJourneySources } from './JourneyCreator'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

type MapHandler = (event?: unknown) => void

function createMapMock() {
  const handlers = new Map<string, Set<MapHandler>>()
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>()
  const layers = new Map<string, unknown>()
  const canvas = document.createElement('canvas')
  const disable = vi.fn()
  const enable = vi.fn()

  const eventKey = (event: string, layer?: string) => layer ? `${event}:${layer}` : event
  const map = {
    on(event: string, layerOrHandler: string | MapHandler, maybeHandler?: MapHandler) {
      const layer = typeof layerOrHandler === 'string' ? layerOrHandler : undefined
      const handler = typeof layerOrHandler === 'function' ? layerOrHandler : maybeHandler
      if (!handler) return map
      const key = eventKey(event, layer)
      const listeners = handlers.get(key) ?? new Set<MapHandler>()
      listeners.add(handler)
      handlers.set(key, listeners)
      return map
    },
    once(event: string, handler: MapHandler) {
      return map.on(event, handler)
    },
    off(event: string, layerOrHandler: string | MapHandler, maybeHandler?: MapHandler) {
      const layer = typeof layerOrHandler === 'string' ? layerOrHandler : undefined
      const handler = typeof layerOrHandler === 'function' ? layerOrHandler : maybeHandler
      if (handler) handlers.get(eventKey(event, layer))?.delete(handler)
      return map
    },
    trigger(event: string, payload?: unknown, layer?: string) {
      for (const handler of [...(handlers.get(eventKey(event, layer)) ?? [])]) handler(payload)
    },
    listenerCount(event: string) {
      return handlers.get(event)?.size ?? 0
    },
    isStyleLoaded: () => true,
    getCanvas: () => canvas,
    dragPan: { disable, enable },
    queryRenderedFeatures: () => [],
    getSource: (id: string) => sources.get(id),
    addSource(id: string) {
      sources.set(id, { setData: vi.fn() })
    },
    removeSource(id: string) {
      sources.delete(id)
    },
    getLayer: (id: string) => layers.get(id),
    addLayer(layer: { id: string }) {
      layers.set(layer.id, layer)
    },
    removeLayer(id: string) {
      layers.delete(id)
    },
    flyTo: vi.fn(),
  }

  return { map, canvas, disable, enable, sources }
}

async function renderJourneyCreator() {
  const mapMock = createMapMock()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(() => root?.render(createElement(JourneyCreator, {
    isActive: true,
    onComplete: vi.fn(),
    onCancel: vi.fn(),
    mapRef: {
      current: {
        getMap: () => mapMock.map as unknown as maplibregl.Map,
      } as unknown as MapViewHandle,
    },
    units: 'metric',
  })))
  return mapMock
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

afterEach(async () => {
  if (root) await act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('syncJourneySources', () => {
  it('clears the journey line after undoing to one point and after clearing all points', () => {
    const setPointsData = vi.fn()
    const setLineData = vi.fn()
    const map = {
      getSource: (id: string) => ({
        setData: id === 'journey-line' ? setLineData : setPointsData,
      }),
    } as unknown as Pick<maplibregl.Map, 'getSource'>
    const route = [
      { lat: 37.5, lng: 126.9 },
      { lat: 37.6, lng: 127 },
    ]

    syncJourneySources(map, route, '🚶', '#f97316')
    expect(setLineData.mock.calls.at(-1)?.[0]).toMatchObject({
      geometry: { type: 'LineString', coordinates: [[126.9, 37.5], [127, 37.6]] },
    })

    syncJourneySources(map, route.slice(0, 1), '🚶', '#f97316')
    expect(setLineData.mock.calls.at(-1)?.[0]).toMatchObject({
      geometry: { type: 'LineString', coordinates: [] },
    })

    syncJourneySources(map, [], '🚶', '#f97316')
    expect(setLineData.mock.calls.at(-1)?.[0]).toMatchObject({
      geometry: { type: 'LineString', coordinates: [] },
    })
  })
})

describe('JourneyCreator waypoint drag lifecycle', () => {
  it('settles a mouse drag released outside the map exactly once', async () => {
    const { map, canvas, disable, enable, sources } = await renderJourneyCreator()
    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 126.9, lat: 37.5 } }))

    const pointsSource = sources.get('journey-points')
    pointsSource?.setData.mockClear()
    await act(() => map.trigger('mousedown', {
      preventDefault: vi.fn(),
      features: [{ properties: { index: 0 } }],
    }, 'journey-points'))
    await act(() => map.trigger('mousemove', { lngLat: { lng: 127, lat: 37.6 } }))

    expect(disable).toHaveBeenCalledOnce()
    expect(canvas.style.cursor).toBe('grabbing')
    expect(pointsSource?.setData).toHaveBeenCalled()

    await act(() => window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })))
    const updatesAfterRelease = pointsSource?.setData.mock.calls.length
    await act(() => map.trigger('mousemove', { lngLat: { lng: 128, lat: 38 } }))
    await act(() => window.dispatchEvent(new Event('blur')))
    await act(() => map.trigger('mouseup'))

    expect(pointsSource?.setData).toHaveBeenCalledTimes(updatesAfterRelease ?? 0)
    expect(map.listenerCount('mousemove')).toBe(0)
    expect(canvas.style.cursor).toBe('')
    expect(enable).toHaveBeenCalledOnce()
  })

  it('settles a cancelled touch drag and ignores later map movement', async () => {
    const { map, enable, sources } = await renderJourneyCreator()
    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 126.9, lat: 37.5 } }))

    const pointsSource = sources.get('journey-points')
    pointsSource?.setData.mockClear()
    await act(() => map.trigger('touchstart', {
      preventDefault: vi.fn(),
      features: [{ properties: { index: 0 } }],
    }, 'journey-points'))
    await act(() => map.trigger('touchmove', { lngLat: { lng: 127, lat: 37.6 } }))
    await act(() => window.dispatchEvent(new Event('touchcancel', { bubbles: true })))

    const updatesAfterCancel = pointsSource?.setData.mock.calls.length
    await act(() => map.trigger('touchmove', { lngLat: { lng: 128, lat: 38 } }))
    await act(() => map.trigger('touchend'))

    expect(pointsSource?.setData).toHaveBeenCalledTimes(updatesAfterCancel ?? 0)
    expect(map.listenerCount('touchmove')).toBe(0)
    expect(enable).toHaveBeenCalledOnce()
  })
})
