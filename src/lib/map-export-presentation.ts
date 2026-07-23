export interface ExportPresentationMap {
  getPixelRatio: () => number
  setPixelRatio: (pixelRatio: number) => unknown
  resize: () => unknown
}

export interface ExportPresentationSnapshot {
  width: string
  height: string
  pixelRatio: number
}

export function captureExportPresentation(
  map: ExportPresentationMap,
  container: HTMLElement,
): ExportPresentationSnapshot {
  return {
    width: container.style.width,
    height: container.style.height,
    pixelRatio: map.getPixelRatio(),
  }
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
  map.setPixelRatio(snapshot.pixelRatio)
  map.resize()
}
