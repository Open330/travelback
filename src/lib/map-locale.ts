import type { TranslationKey } from '@/lib/i18n'

export interface MapLibreLocalePatch {
  [localeKey: string]: string
  'Map.Title': string
  'NavigationControl.ZoomIn': string
  'NavigationControl.ZoomOut': string
  'NavigationControl.ResetBearing': string
  'AttributionControl.ToggleAttribution': string
}

interface MapLibreLocaleTarget {
  getCanvas: () => HTMLCanvasElement
  getContainer: () => HTMLElement
}

const CONTROL_LABEL_TARGETS = [
  ['.maplibregl-ctrl-zoom-in', 'NavigationControl.ZoomIn'],
  ['.maplibregl-ctrl-zoom-out', 'NavigationControl.ZoomOut'],
  ['.maplibregl-ctrl-compass', 'NavigationControl.ResetBearing'],
  ['summary.maplibregl-ctrl-attrib-button', 'AttributionControl.ToggleAttribution'],
] as const satisfies ReadonlyArray<readonly [string, keyof MapLibreLocalePatch]>

export function createMapLibreLocalePatch(
  translate: (key: TranslationKey) => string,
): MapLibreLocalePatch {
  return {
    'Map.Title': translate('map.canvasLabel'),
    'NavigationControl.ZoomIn': translate('map.zoomIn'),
    'NavigationControl.ZoomOut': translate('map.zoomOut'),
    'NavigationControl.ResetBearing': translate('map.resetBearing'),
    'AttributionControl.ToggleAttribution': translate('map.toggleAttribution'),
  }
}

function setControlLabel(element: HTMLElement | null, label: string): void {
  if (!element) return
  element.title = label
  element.setAttribute('aria-label', label)
}

export function synchronizeMapLibreLocaleLabels(
  map: MapLibreLocaleTarget,
  localePatch: MapLibreLocalePatch,
): void {
  map.getCanvas().setAttribute('aria-label', localePatch['Map.Title'])

  const container = map.getContainer()
  for (const [selector, localeKey] of CONTROL_LABEL_TARGETS) {
    setControlLabel(container.querySelector<HTMLElement>(selector), localePatch[localeKey])
  }
}
