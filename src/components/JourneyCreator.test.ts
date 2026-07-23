// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type maplibregl from 'maplibre-gl'
import { formatDistance, totalDistance } from '@/lib/interpolate'
import type { MapViewHandle } from './MapView'

const localeState = vi.hoisted(() => ({ current: 'en' as 'en' | 'ko' }))

vi.mock('@/lib/i18n', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/i18n')>()
  return {
    ...original,
    useLocale: () => ({
      locale: localeState.current,
      t: (key: keyof typeof original.translations.en) => key === 'journey.searchInvalid'
        ? original.translations[localeState.current][key]
        : key,
    }),
  }
})

import JourneyCreator, { syncJourneySources } from './JourneyCreator'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

type MapHandler = (event?: unknown) => void

function createMapMock(initialStyleLoaded = true) {
  const handlers = new Map<string, Set<MapHandler>>()
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>()
  const layers = new Map<string, unknown>()
  const canvas = document.createElement('canvas')
  const disable = vi.fn()
  const enable = vi.fn()
  let styleLoaded = initialStyleLoaded

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
    isStyleLoaded: () => styleLoaded,
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

  return {
    map,
    canvas,
    disable,
    enable,
    sources,
    setStyleLoaded(value: boolean) {
      styleLoaded = value
    },
  }
}

async function renderJourneyCreator(mapMock = createMapMock(), onComplete = vi.fn()) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const props = {
    isActive: true,
    onComplete,
    onCancel: vi.fn(),
    mapRef: {
      current: {
        getMap: () => mapMock.map as unknown as maplibregl.Map,
      } as unknown as MapViewHandle,
    },
    units: 'metric',
  } as const
  const rerender = async () => {
    await act(() => root?.render(createElement(JourneyCreator, props)))
  }
  await rerender()
  return { ...mapMock, onComplete, rerender }
}

beforeEach(() => {
  localeState.current = 'en'
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

describe('JourneyCreator interaction readiness', () => {
  it('rerenders a retained coordinate error in the current locale', async () => {
    const { rerender } = await renderJourneyCreator()
    const enableSearch = container?.querySelector<HTMLButtonElement>('[data-testid="journey-enable-search"]')
    await act(() => enableSearch?.click())

    const searchInput = container?.querySelector<HTMLInputElement>('[role="combobox"]')
    if (!searchInput) throw new Error('Missing Journey search input')
    await act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(searchInput, 'not coordinates')
      searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const submit = container?.querySelector<HTMLButtonElement>('[data-testid="journey-search-submit"]')
    await act(() => submit?.click())
    expect(container?.querySelector('[role="alert"]')?.textContent).toContain('Could not read that location')

    localeState.current = 'ko'
    await rerender()
    const localizedAlert = container?.querySelector('[role="alert"]')?.textContent
    expect(localizedAlert).toContain('위치를 해석할 수 없습니다')
    expect(localizedAlert).not.toContain('Could not read that location')
  })

  it('recovers when an existing style settles without another style-load event', async () => {
    const mapMock = createMapMock(false)
    await renderJourneyCreator(mapMock)

    const panel = container?.querySelector('[data-testid="journey-creator-panel"]')
    expect(panel?.getAttribute('data-map-interaction-ready')).toBe('false')
    expect(mapMock.map.listenerCount('styledata')).toBe(1)
    expect(mapMock.map.listenerCount('idle')).toBe(1)

    mapMock.setStyleLoaded(true)
    await act(() => mapMock.map.trigger('styledata'))
    expect(panel?.getAttribute('data-map-interaction-ready')).toBe('true')
    expect(mapMock.map.listenerCount('idle')).toBe(0)

    await act(() => mapMock.map.trigger('styledata'))
    expect(panel?.getAttribute('data-map-interaction-ready')).toBe('true')

    await act(() => root?.unmount())
    root = null
    expect(mapMock.map.listenerCount('style.load')).toBe(0)
    expect(mapMock.map.listenerCount('styledata')).toBe(0)
    expect(mapMock.map.listenerCount('idle')).toBe(0)
  })
})

describe('JourneyCreator short viewport layout', () => {
  it('bounds the panel to the safe viewport with pinned controls around an internal scroller', async () => {
    await renderJourneyCreator()

    const panel = container?.querySelector<HTMLElement>('[data-testid="journey-creator-panel"]')
    const header = container?.querySelector<HTMLElement>('[data-testid="journey-creator-header"]')
    const scrollRegion = container?.querySelector<HTMLElement>('[data-testid="journey-creator-scroll-region"]')
    const actions = container?.querySelector<HTMLElement>('[data-testid="journey-creator-actions"]')

    expect(panel?.classList.contains('flex')).toBe(true)
    expect(panel?.classList.contains('flex-col')).toBe(true)
    expect(panel?.style.top).toContain('safe-area-inset-top')
    expect(panel?.style.left).toContain('safe-area-inset-left')
    expect(panel?.style.maxWidth).toContain('safe-area-inset-right')
    expect(panel?.style.maxHeight).toContain('100dvh')
    expect(panel?.style.maxHeight).toContain('safe-area-inset-bottom')

    expect(header?.parentElement).toBe(panel)
    expect(header?.classList.contains('sticky')).toBe(true)
    expect(header?.classList.contains('top-0')).toBe(true)
    expect(scrollRegion?.parentElement).toBe(panel)
    expect(scrollRegion?.classList.contains('min-h-0')).toBe(true)
    expect(scrollRegion?.classList.contains('overflow-y-auto')).toBe(true)
    expect(actions?.parentElement).toBe(panel)
    expect(actions?.classList.contains('sticky')).toBe(true)
    expect(actions?.classList.contains('bottom-0')).toBe(true)
  })

  it('keeps Cancel, Clear, Done, and confirmation actions outside the scroll region', async () => {
    const { map, onComplete } = await renderJourneyCreator()
    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 126.9, lat: 37.5 } }))
    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 127.1, lat: 37.7 } }))

    const header = container?.querySelector<HTMLElement>('[data-testid="journey-creator-header"]')
    const scrollRegion = container?.querySelector<HTMLElement>('[data-testid="journey-creator-scroll-region"]')
    const actions = container?.querySelector<HTMLElement>('[data-testid="journey-creator-actions"]')
    const cancelButton = [...(container?.querySelectorAll('button') ?? [])]
      .find(button => button.textContent === 'journey.cancel')
    const clearButton = [...(container?.querySelectorAll('button') ?? [])]
      .find(button => button.textContent === 'journey.clear')
    const doneButton = [...(container?.querySelectorAll('button') ?? [])]
      .find(button => button.textContent === 'journey.done')

    expect(header?.contains(cancelButton ?? null)).toBe(true)
    expect(actions?.contains(clearButton ?? null)).toBe(true)
    expect(actions?.contains(doneButton ?? null)).toBe(true)
    expect(clearButton?.disabled).toBe(false)
    expect(doneButton?.disabled).toBe(false)

    await act(() => doneButton?.click())
    const createButton = [...(container?.querySelectorAll('button') ?? [])]
      .find(button => button.textContent?.includes('journey.confirmCreate'))
    expect(actions?.contains(createButton ?? null)).toBe(true)
    expect(scrollRegion?.querySelector('#journey-name')).not.toBeNull()

    await act(() => createButton?.click())
    expect(onComplete).toHaveBeenCalledOnce()
  })
})

describe('JourneyCreator confirmation ownership', () => {
  it('freezes map mutations and commits a copied valid snapshot', async () => {
    const { map, canvas, disable, sources, onComplete } = await renderJourneyCreator()
    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 126.9, lat: 37.5 } }))
    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 127.1, lat: 37.7 } }))

    const doneButton = [...(container?.querySelectorAll('button') ?? [])]
      .find(button => button.textContent === 'journey.done')
    await act(() => doneButton?.click())

    expect(canvas.style.pointerEvents).toBe('none')
    expect(canvas.dataset.journeyConfirming).toBe('true')

    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 128, lat: 38 } }))
    await act(() => map.trigger('click', {
      preventDefault: vi.fn(),
      features: [{ properties: { index: 0 } }],
    }, 'journey-points'))
    await act(() => map.trigger('mousedown', {
      preventDefault: vi.fn(),
      features: [{ properties: { index: 0 } }],
    }, 'journey-points'))
    await act(() => map.trigger('mousemove', { lngLat: { lng: 129, lat: 39 } }))

    expect(sources.get('journey-points')?.setData.mock.calls.at(-1)?.[0]).toMatchObject({
      features: [{ properties: { index: 0 } }, { properties: { index: 1 } }],
    })
    expect(disable).not.toHaveBeenCalled()
    expect(map.listenerCount('mousemove')).toBe(0)

    const createButton = [...(container?.querySelectorAll('button') ?? [])]
      .find(button => button.textContent?.includes('journey.confirmCreate'))
    await act(() => createButton?.click())

    expect(onComplete).toHaveBeenCalledOnce()
    const committedTrack = onComplete.mock.calls[0][0]
    expect(committedTrack.points).toHaveLength(2)
    expect(committedTrack.points[0].lng).toBeCloseTo(126.9, 10)
    expect(committedTrack.points[0].lat).toBeCloseTo(37.5, 10)
    expect(committedTrack.points[1].lng).toBeCloseTo(127.1, 10)
    expect(committedTrack.points[1].lat).toBeCloseTo(37.7, 10)
    expect(canvas.style.pointerEvents).toBe('')
    expect(canvas.dataset.journeyConfirming).toBeUndefined()

    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 130, lat: 40 } }))
    expect(committedTrack.points).toHaveLength(2)
  })

  it('restores map editing when confirmation returns to the draft', async () => {
    const { map, canvas, sources } = await renderJourneyCreator()
    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 126.9, lat: 37.5 } }))
    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 127.1, lat: 37.7 } }))

    const doneButton = [...(container?.querySelectorAll('button') ?? [])]
      .find(button => button.textContent === 'journey.done')
    await act(() => doneButton?.click())
    expect(canvas.style.pointerEvents).toBe('none')

    const editButton = [...(container?.querySelectorAll('button') ?? [])]
      .find(button => button.textContent === 'journey.confirmEdit')
    await act(() => editButton?.click())
    expect(canvas.style.pointerEvents).toBe('')
    expect(canvas.dataset.journeyConfirming).toBeUndefined()

    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 128, lat: 38 } }))
    expect(sources.get('journey-points')?.setData.mock.calls.at(-1)?.[0]).toMatchObject({
      features: [
        { properties: { index: 0 } },
        { properties: { index: 1 } },
        { properties: { index: 2 } },
      ],
    })
  })
})

describe('JourneyCreator waypoint drag lifecycle', () => {
  it('coalesces pointer bursts and publishes the exact terminal waypoint and distance', async () => {
    let nextFrameId = 0
    const scheduledFrames = new Map<number, FrameRequestCallback>()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = ++nextFrameId
      scheduledFrames.set(id, callback)
      return id
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      scheduledFrames.delete(id)
    })

    const { map, sources } = await renderJourneyCreator()
    await act(() => {
      for (const [id, callback] of [...scheduledFrames]) {
        scheduledFrames.delete(id)
        callback(0)
      }
    })
    const initialPoints = [
      { lng: 126.9, lat: 37.5 },
      { lng: 127, lat: 37.6 },
      { lng: 127.1, lat: 37.7 },
    ]
    for (const point of initialPoints) {
      await act(() => map.trigger('click', { point: {}, lngLat: point }))
    }

    const pointsSource = sources.get('journey-points')
    pointsSource?.setData.mockClear()
    await act(() => map.trigger('mousedown', {
      preventDefault: vi.fn(),
      features: [{ properties: { index: 1 } }],
    }, 'journey-points'))

    for (let index = 0; index < 20; index += 1) {
      map.trigger('mousemove', {
        lngLat: { lng: 127.2 + index / 100, lat: 37.8 + index / 100 },
      })
    }
    expect(pointsSource?.setData).not.toHaveBeenCalled()
    expect(scheduledFrames.size).toBe(1)

    await act(() => {
      const [id, callback] = [...scheduledFrames][0]
      scheduledFrames.delete(id)
      callback(16)
    })
    expect(pointsSource?.setData).toHaveBeenCalledOnce()
    const previewData = pointsSource?.setData.mock.calls.at(-1)?.[0] as {
      features: Array<{ geometry: { coordinates: [number, number] } }>
    }
    expect(previewData.features).toHaveLength(3)
    expect(previewData.features[1].geometry.coordinates[0]).toBeCloseTo(127.39, 10)
    expect(previewData.features[1].geometry.coordinates[1]).toBeCloseTo(37.99, 10)

    map.trigger('mousemove', { lngLat: { lng: 128, lat: 38.2 } })
    map.trigger('mousemove', { lngLat: { lng: 128.1, lat: 38.3 } })
    expect(pointsSource?.setData).toHaveBeenCalledOnce()
    expect(scheduledFrames.size).toBe(1)

    await act(() => map.trigger('mouseup'))
    expect(scheduledFrames.size).toBe(0)
    expect(pointsSource?.setData).toHaveBeenCalledTimes(2)
    const terminalData = pointsSource?.setData.mock.calls.at(-1)?.[0] as {
      features: Array<{ geometry: { coordinates: [number, number] } }>
    }
    expect(terminalData.features).toHaveLength(3)
    expect(terminalData.features[1].geometry.coordinates[0]).toBeCloseTo(128.1, 10)
    expect(terminalData.features[1].geometry.coordinates[1]).toBeCloseTo(38.3, 10)

    const finalPoints = [initialPoints[0], { lng: 128.1, lat: 38.3 }, initialPoints[2]]
    expect(container?.textContent).toContain(formatDistance(totalDistance(finalPoints), 'metric'))
  })

  it('cancels a queued drag preview when the creator unmounts', async () => {
    let nextFrameId = 0
    const scheduledFrames = new Map<number, FrameRequestCallback>()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = ++nextFrameId
      scheduledFrames.set(id, callback)
      return id
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      scheduledFrames.delete(id)
    })

    const { map, sources } = await renderJourneyCreator()
    await act(() => {
      for (const [id, callback] of [...scheduledFrames]) {
        scheduledFrames.delete(id)
        callback(0)
      }
    })
    await act(() => map.trigger('click', {
      point: {},
      lngLat: { lng: 126.9, lat: 37.5 },
    }))
    const pointsSource = sources.get('journey-points')
    pointsSource?.setData.mockClear()

    await act(() => map.trigger('mousedown', {
      preventDefault: vi.fn(),
      features: [{ properties: { index: 0 } }],
    }, 'journey-points'))
    map.trigger('mousemove', { lngLat: { lng: 127.1, lat: 37.7 } })
    expect(scheduledFrames.size).toBe(1)

    await act(() => root?.unmount())
    root = null
    expect(scheduledFrames.size).toBe(0)
    expect(pointsSource?.setData).not.toHaveBeenCalled()
  })

  it.each([
    ['generic map then point layer', ['map', 'point']],
    ['point layer then generic map', ['point', 'map']],
  ] as const)('suppresses both immediate post-drag click handlers in %s order', async (_name, order) => {
    vi.spyOn(performance, 'now').mockReturnValue(1000)
    const { map, sources } = await renderJourneyCreator()
    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 126.9, lat: 37.5 } }))
    await act(() => map.trigger('mousedown', {
      preventDefault: vi.fn(),
      features: [{ properties: { index: 0 } }],
    }, 'journey-points'))
    await act(() => map.trigger('mousemove', { lngLat: { lng: 127, lat: 37.6 } }))
    await act(() => map.trigger('mouseup'))

    for (const handler of order) {
      if (handler === 'map') {
        await act(() => map.trigger('click', { point: {}, lngLat: { lng: 128, lat: 38 } }))
      } else {
        await act(() => map.trigger('click', {
          preventDefault: vi.fn(),
          features: [{ properties: { index: 0 } }],
        }, 'journey-points'))
      }
    }

    expect(sources.get('journey-points')?.setData.mock.calls.at(-1)?.[0]).toMatchObject({
      features: [{ properties: { index: 0 } }],
    })
  })

  it('allows the first intentional point click after drag suppression expires', async () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000)
    const { map, sources } = await renderJourneyCreator()
    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 126.9, lat: 37.5 } }))
    await act(() => map.trigger('touchstart', {
      preventDefault: vi.fn(),
      features: [{ properties: { index: 0 } }],
    }, 'journey-points'))
    await act(() => map.trigger('touchmove', { lngLat: { lng: 127, lat: 37.6 } }))
    await act(() => map.trigger('touchend'))

    now.mockReturnValue(1251)
    await act(() => map.trigger('click', {
      preventDefault: vi.fn(),
      features: [{ properties: { index: 0 } }],
    }, 'journey-points'))

    expect(sources.get('journey-points')?.setData.mock.calls.at(-1)?.[0]).toMatchObject({ features: [] })
  })

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

  it('settles an active mouse drag before undoing', async () => {
    const { map, canvas, enable, sources } = await renderJourneyCreator()
    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 126.9, lat: 37.5 } }))

    const pointsSource = sources.get('journey-points')
    await act(() => map.trigger('mousedown', {
      preventDefault: vi.fn(),
      features: [{ properties: { index: 0 } }],
    }, 'journey-points'))
    await act(() => map.trigger('mousemove', { lngLat: { lng: 127, lat: 37.6 } }))

    const undoButton = [...(container?.querySelectorAll('button') ?? [])]
      .find(button => button.textContent === 'journey.undo')
    await act(() => undoButton?.click())

    expect(enable).toHaveBeenCalledOnce()
    expect(canvas.style.cursor).toBe('')
    expect(map.listenerCount('mousemove')).toBe(0)
    expect(undoButton?.disabled).toBe(true)
    const updatesAfterUndo = pointsSource?.setData.mock.calls.length
    await act(() => map.trigger('mousemove', { lngLat: { lng: 128, lat: 38 } }))
    expect(pointsSource?.setData).toHaveBeenCalledTimes(updatesAfterUndo ?? 0)
  })

  it('settles an active touch drag before clearing without recreating points', async () => {
    const { map, canvas, enable, sources } = await renderJourneyCreator()
    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 126.9, lat: 37.5 } }))
    await act(() => map.trigger('click', { point: {}, lngLat: { lng: 127.1, lat: 37.7 } }))

    const pointsSource = sources.get('journey-points')
    await act(() => map.trigger('touchstart', {
      preventDefault: vi.fn(),
      features: [{ properties: { index: 0 } }],
    }, 'journey-points'))
    await act(() => map.trigger('touchmove', { lngLat: { lng: 127, lat: 37.6 } }))

    const clearButton = [...(container?.querySelectorAll('button') ?? [])]
      .find(button => button.textContent === 'journey.clear')
    await act(() => clearButton?.click())

    expect(enable).toHaveBeenCalledOnce()
    expect(canvas.style.cursor).toBe('')
    expect(map.listenerCount('touchmove')).toBe(0)
    expect(clearButton?.disabled).toBe(true)
    expect(pointsSource?.setData.mock.calls.at(-1)?.[0]).toMatchObject({ features: [] })
    const updatesAfterClear = pointsSource?.setData.mock.calls.length
    await act(() => map.trigger('touchmove', { lngLat: { lng: 128, lat: 38 } }))
    expect(pointsSource?.setData).toHaveBeenCalledTimes(updatesAfterClear ?? 0)
  })
})
