import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MapRenderTimeoutError,
  mutateMapAndWaitForRender,
  type RenderEventMap,
} from './map-render'

class FakeRenderMap implements RenderEventMap {
  listener: (() => void) | null = null
  calls: string[] = []

  once(_event: 'render', listener: () => void) {
    this.calls.push('listen')
    this.listener = listener
  }

  off(_event: 'render', listener: () => void) {
    this.calls.push('off')
    if (this.listener === listener) this.listener = null
  }

  triggerRepaint() {
    this.calls.push('repaint')
  }

  render() {
    const listener = this.listener
    this.listener = null
    listener?.()
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('mutateMapAndWaitForRender', () => {
  it('listens before mutation and requests a repaint for unchanged cameras', async () => {
    const map = new FakeRenderMap()
    const frameCallbacks: FrameRequestCallback[] = []
    let resolved = false
    const promise = mutateMapAndWaitForRender(map, () => {
      map.calls.push('mutate')
    }, {
      requestFrame: (callback) => {
        frameCallbacks.push(callback)
        return 1
      },
      cancelFrame: vi.fn(),
    }).then(() => {
      resolved = true
    })

    expect(map.calls).toEqual(['listen', 'mutate', 'repaint'])
    map.render()
    await Promise.resolve()
    expect(resolved).toBe(false)

    expect(frameCallbacks).toHaveLength(1)
    frameCallbacks[0](0)
    await promise
    expect(resolved).toBe(true)
    expect(map.listener).toBeNull()
  })

  it('rejects on timeout and removes the render listener', async () => {
    vi.useFakeTimers()
    const map = new FakeRenderMap()
    const promise = mutateMapAndWaitForRender(map, () => undefined, { timeoutMs: 25 })
    const rejection = expect(promise).rejects.toBeInstanceOf(MapRenderTimeoutError)

    await vi.advanceTimersByTimeAsync(25)
    await rejection
    expect(map.listener).toBeNull()
  })

  it('aborts while waiting for the animation frame and cancels it', async () => {
    const map = new FakeRenderMap()
    const controller = new AbortController()
    const cancelFrame = vi.fn()
    const promise = mutateMapAndWaitForRender(map, () => undefined, {
      signal: controller.signal,
      requestFrame: () => 42,
      cancelFrame,
    })

    map.render()
    controller.abort()

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    expect(cancelFrame).toHaveBeenCalledWith(42)
    expect(map.listener).toBeNull()
  })

  it('cleans up when a map mutation throws', async () => {
    const map = new FakeRenderMap()
    const promise = mutateMapAndWaitForRender(map, () => {
      throw new Error('source update failed')
    })

    await expect(promise).rejects.toThrow('source update failed')
    expect(map.listener).toBeNull()
  })
})
