import type { CameraState } from './camera'

export interface ExportPresentationMap {
  getPixelRatio: () => number
  setPixelRatio: (pixelRatio: number) => unknown
  resize: () => unknown
  getCenter: () => { lng: number; lat: number }
  getZoom: () => number
  getPitch: () => number
  getBearing: () => number
  jumpTo: (state: CameraState) => unknown
}

export type PixelRatioOwnershipMode = 'automatic' | 'explicit'
export type CameraOwnershipMode = 'follow' | 'manual'

export type ExportPixelRatioSnapshot =
  | { mode: 'automatic' }
  | { mode: 'explicit'; value: number }

export type ExportCameraSnapshot =
  | { mode: 'follow' }
  | { mode: 'manual'; value: CameraState }

export interface ExportPresentationSnapshot {
  width: string
  height: string
  pixelRatio: ExportPixelRatioSnapshot
  camera: ExportCameraSnapshot
}

export function captureExportPresentation(
  map: ExportPresentationMap,
  container: HTMLElement,
  pixelRatioMode: PixelRatioOwnershipMode = 'automatic',
  cameraMode: CameraOwnershipMode = 'follow',
): ExportPresentationSnapshot {
  const center = cameraMode === 'manual' ? map.getCenter() : null
  return {
    width: container.style.width,
    height: container.style.height,
    pixelRatio: pixelRatioMode === 'automatic'
      ? { mode: 'automatic' }
      : { mode: 'explicit', value: map.getPixelRatio() },
    camera: center
      ? {
          mode: 'manual',
          value: {
            center: [center.lng, center.lat],
            zoom: map.getZoom(),
            pitch: map.getPitch(),
            bearing: map.getBearing(),
          },
        }
      : { mode: 'follow' },
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
  cameraMode: CameraOwnershipMode = 'follow',
): void {
  container.style.width = snapshot.width
  container.style.height = snapshot.height
  setMapPixelRatio(
    map,
    snapshot.pixelRatio.mode === 'automatic' ? null : snapshot.pixelRatio.value,
  )
  map.resize()
  if (cameraMode === 'manual' && snapshot.camera.mode === 'manual') {
    map.jumpTo({
      ...snapshot.camera.value,
      center: [...snapshot.camera.value.center] as [number, number],
    })
  }
}
