export interface ExportPresentationMap {
  getPixelRatio: () => number
  setPixelRatio: (pixelRatio: number) => unknown
  resize: () => unknown
}

export type PixelRatioOwnershipMode = 'automatic' | 'explicit'

export type ExportPixelRatioSnapshot =
  | { mode: 'automatic' }
  | { mode: 'explicit'; value: number }

export interface ExportPresentationSnapshot {
  width: string
  height: string
  pixelRatio: ExportPixelRatioSnapshot
}

export function captureExportPresentation(
  map: ExportPresentationMap,
  container: HTMLElement,
  pixelRatioMode: PixelRatioOwnershipMode = 'automatic',
): ExportPresentationSnapshot {
  return {
    width: container.style.width,
    height: container.style.height,
    pixelRatio: pixelRatioMode === 'automatic'
      ? { mode: 'automatic' }
      : { mode: 'explicit', value: map.getPixelRatio() },
  }
}

function setMapPixelRatio(map: ExportPresentationMap, pixelRatio: number | null): void {
  // MapLibre documents null as the way to release an explicit override, but
  // its current declaration still accepts only number.
  const setPixelRatio = map.setPixelRatio as unknown as (value: number | null) => unknown
  setPixelRatio.call(map, pixelRatio)
}

export function applyExportPresentation(
  map: ExportPresentationMap,
  container: HTMLElement,
  width: number,
  height: number,
): void {
  map.setPixelRatio(1)
  container.style.width = `${width}px`
  container.style.height = `${height}px`
  map.resize()
}

export function restoreExportPresentation(
  map: ExportPresentationMap,
  container: HTMLElement,
  snapshot: ExportPresentationSnapshot,
): void {
  container.style.width = snapshot.width
  container.style.height = snapshot.height
  setMapPixelRatio(
    map,
    snapshot.pixelRatio.mode === 'automatic' ? null : snapshot.pixelRatio.value,
  )
  map.resize()
}
