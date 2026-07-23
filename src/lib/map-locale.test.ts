// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { t, type Locale } from '@/lib/i18n'
import {
  createMapLibreLocalePatch,
  synchronizeMapLibreLocaleLabels,
} from '@/lib/map-locale'

function localePatch(locale: Locale) {
  return createMapLibreLocalePatch((key) => t(key, locale))
}

function createMapTarget() {
  const container = document.createElement('div')
  container.innerHTML = `
    <canvas class="maplibregl-canvas" aria-label="Map"></canvas>
    <button class="maplibregl-ctrl-zoom-in" title="Zoom in" aria-label="Zoom in"></button>
    <button class="maplibregl-ctrl-zoom-out" title="Zoom out" aria-label="Zoom out"></button>
    <button class="maplibregl-ctrl-compass" title="Reset bearing" aria-label="Reset bearing"></button>
    <details>
      <summary class="maplibregl-ctrl-attrib-button" title="Toggle attribution" aria-label="Toggle attribution"></summary>
    </details>
  `
  const canvas = container.querySelector<HTMLCanvasElement>('canvas')
  if (!canvas) throw new Error('Missing test canvas')

  return {
    container,
    canvas,
    map: {
      getCanvas: () => canvas,
      getContainer: () => container,
    },
  }
}

describe('MapLibre locale integration', () => {
  it('maps every shipped locale to all MapLibre strings used by the app', () => {
    const expectedTitles: Record<Locale, string> = {
      en: 'Map',
      ko: '지도',
      ja: '地図',
      zh: '地图',
      es: 'Mapa',
    }

    for (const locale of Object.keys(expectedTitles) as Locale[]) {
      const patch = localePatch(locale)
      expect(patch['Map.Title']).toBe(expectedTitles[locale])
      expect(Object.values(patch)).toHaveLength(5)
      expect(Object.values(patch).every(Boolean)).toBe(true)
    }
  })

  it('updates existing canvas and control labels without replacing their nodes', () => {
    const { container, canvas, map } = createMapTarget()
    const zoomIn = container.querySelector<HTMLElement>('.maplibregl-ctrl-zoom-in')
    const compass = container.querySelector<HTMLElement>('.maplibregl-ctrl-compass')
    const attribution = container.querySelector<HTMLElement>('.maplibregl-ctrl-attrib-button')

    synchronizeMapLibreLocaleLabels(map, localePatch('ko'))
    expect(canvas.getAttribute('aria-label')).toBe('지도')
    expect(zoomIn?.getAttribute('title')).toBe('확대')
    expect(zoomIn?.getAttribute('aria-label')).toBe('확대')
    expect(compass?.getAttribute('aria-label')).toBe('드래그하여 지도를 회전하고 클릭하여 북쪽으로 초기화')
    expect(attribution?.getAttribute('aria-label')).toBe('지도 출처 정보 전환')

    synchronizeMapLibreLocaleLabels(map, localePatch('ja'))
    expect(map.getCanvas()).toBe(canvas)
    expect(container.querySelector('.maplibregl-ctrl-zoom-in')).toBe(zoomIn)
    expect(container.querySelector('.maplibregl-ctrl-compass')).toBe(compass)
    expect(container.querySelector('.maplibregl-ctrl-attrib-button')).toBe(attribution)
    expect(canvas.getAttribute('aria-label')).toBe('地図')
    expect(zoomIn?.getAttribute('title')).toBe('拡大')
    expect(compass?.getAttribute('aria-label')).toBe('ドラッグして地図を回転、クリックして北向きに戻す')
    expect(attribution?.getAttribute('aria-label')).toBe('地図の帰属表示を切り替え')
  })
})
