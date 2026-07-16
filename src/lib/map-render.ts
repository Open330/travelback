export interface RenderEventMap {
  once: (event: 'render', listener: () => void) => unknown
  off: (event: 'render', listener: () => void) => unknown
  triggerRepaint: () => void
}

export interface RenderWaitOptions {
  signal?: AbortSignal
  timeoutMs?: number
  requestFrame?: (callback: FrameRequestCallback) => number
  cancelFrame?: (handle: number) => void
}

const DEFAULT_RENDER_TIMEOUT_MS = 5000

/**
 * Subscribe before mutating the map and settle only after its render event has
 * reached the browser's next animation frame.
 */
export function mutateMapAndWaitForRender(
  map: RenderEventMap,
  mutate: () => void,
  options: RenderWaitOptions = {},
): Promise<void> {
  const {
    signal,
    timeoutMs = DEFAULT_RENDER_TIMEOUT_MS,
    requestFrame = (callback) => requestAnimationFrame(callback),
    cancelFrame = (handle) => cancelAnimationFrame(handle),
  } = options

  return new Promise<void>((resolve, reject) => {
    let settled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let frameId: number | null = null

    const cleanup = () => {
      map.off('render', onRender)
      if (timeoutId != null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (frameId != null) {
        cancelFrame(frameId)
        frameId = null
      }
      signal?.removeEventListener('abort', onAbort)
    }

    const finish = (error?: unknown) => {
      if (settled) return
      settled = true
      cleanup()
      if (error == null) resolve()
      else reject(error)
    }

    const onAbort = () => {
      finish(new DOMException('Export cancelled', 'AbortError'))
    }

    const onRender = () => {
      map.off('render', onRender)
      if (settled || frameId != null) return
      frameId = requestFrame(() => {
        frameId = null
        finish()
      })
    }

    if (signal?.aborted) {
      onAbort()
      return
    }

    try {
      map.once('render', onRender)
      signal?.addEventListener('abort', onAbort, { once: true })
      timeoutId = setTimeout(() => {
        finish(new Error('Timed out waiting for the map frame to render'))
      }, timeoutMs)

      mutate()
      // Source data can change while the camera remains identical. Explicitly
      // request a paint so those frames still produce a render event.
      map.triggerRepaint()
    } catch (error) {
      finish(error)
    }
  })
}
