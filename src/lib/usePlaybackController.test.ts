// @vitest-environment jsdom

import { act, createElement, createRef, forwardRef, useImperativeHandle, type RefObject } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Track } from '@/types'
import { usePlaybackController } from './usePlaybackController'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const track: Track = {
  name: 'Test route',
  points: [
    { lat: 37.5, lng: 127 },
    { lat: 37.6, lng: 127.1 },
  ],
}

type PlaybackController = ReturnType<typeof usePlaybackController>

let root: Root | null = null
let container: HTMLDivElement | null = null
let controllerRef: RefObject<PlaybackController | null> = createRef()
let frameId = 0
let now = 0
let frames = new Map<number, FrameRequestCallback>()

const Harness = forwardRef<PlaybackController>(function Harness(_props, ref) {
  const playbackController = usePlaybackController(track)
  useImperativeHandle(ref, () => playbackController, [playbackController])
  return createElement('output', null, String(playbackController.progress))
})

function currentController(): PlaybackController {
  if (!controllerRef.current) throw new Error('Playback controller is not mounted')
  return controllerRef.current
}

async function renderController() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(() => root?.render(createElement(Harness, { ref: controllerRef })))
}

async function runNextFrame(timestamp: number) {
  const next = [...frames.entries()].sort(([left], [right]) => left - right)[0]
  if (!next) throw new Error('No animation frame is scheduled')
  const [id, callback] = next
  frames.delete(id)
  now = timestamp
  await act(() => callback(timestamp))
}

beforeEach(() => {
  controllerRef = createRef()
  frameId = 0
  now = 0
  frames = new Map()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++frameId
    frames.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames.delete(id)
  })
  vi.spyOn(performance, 'now').mockImplementation(() => now)
})

afterEach(async () => {
  if (root) await act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  frames.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('usePlaybackController active seeking', () => {
  it('keeps a seek made before the first frame as the playback origin', async () => {
    await renderController()

    await act(() => currentController().togglePlay())
    await act(() => currentController().seekTo(0.6))
    await runNextFrame(16)

    expect(currentController().isPlaying).toBe(true)
    expect(currentController().progress).toBeGreaterThanOrEqual(0.6)
    expect(currentController().progress).toBeLessThan(0.61)
  })

  it('continues from a mid-playback seek instead of the stale accumulator', async () => {
    await renderController()

    await act(() => currentController().togglePlay())
    await runNextFrame(100)
    await runNextFrame(1_100)
    expect(currentController().progress).toBeCloseTo(1 / 30, 4)

    await act(() => currentController().seekTo(0.8))
    await runNextFrame(1_116)

    expect(currentController().isPlaying).toBe(true)
    expect(currentController().progress).toBeGreaterThan(0.8)
    expect(currentController().progress).toBeLessThan(0.81)
  })

  it('settles at an endpoint seek and can replay from zero', async () => {
    await renderController()

    await act(() => currentController().togglePlay())
    await runNextFrame(100)
    await act(() => currentController().seekTo(1))

    expect(currentController().progress).toBe(1)
    expect(currentController().isPlaying).toBe(false)
    expect(frames.size).toBe(0)

    await act(() => currentController().togglePlay())
    await runNextFrame(200)
    expect(currentController().isPlaying).toBe(true)
    expect(currentController().progress).toBe(0)
  })
})
