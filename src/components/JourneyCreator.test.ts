// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import type maplibregl from 'maplibre-gl'
import { syncJourneySources } from './JourneyCreator'

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
