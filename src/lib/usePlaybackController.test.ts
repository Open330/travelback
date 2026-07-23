// @vitest-environment jsdom

import { act, createElement, createRef, forwardRef, useImperativeHandle, type RefObject } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Track } from '@/types'
import { usePlaybackController, usePlaybackHotkeys } from './usePlaybackController'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const track: Track = {
  name: 'Test route',
  points: [
    { lat: 37.5, lng: 127 },
    { lat: 37.6, lng: 127.1 },
  ],
}

type PlaybackController = ReturnType<typeof usePlaybackController>
type PlaybackHotkeysProps = Parameters<typeof usePlaybackHotkeys>[0]

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

function HotkeyHarness(props: PlaybackHotkeysProps) {
  usePlaybackHotkeys(props)
  return createElement('div', null,
    createElement('button', { id: 'hotkey-button', type: 'button' }, 'Button'),
    createElement('input', { id: 'hotkey-input' }),
    createElement('select', { id: 'hotkey-select', defaultValue: 'one' },
      createElement('option', { value: 'one' }, 'One'),
    ),
    createElement('input', { id: 'hotkey-range', type: 'range' }),
    createElement('div', { role: 'dialog' },
      createElement('button', { id: 'dialog-button', type: 'button' }, 'Dialog button'),
    ),
  )
}

async function renderHotkeys(overrides: Partial<PlaybackHotkeysProps> = {}) {
  const callbacks = {
    onTogglePlay: vi.fn(),
    onStepSeek: vi.fn(),
    onToggleFollowCamera: vi.fn(),
    onToggleExport: vi.fn(),
    onToggleKeyboardHelp: vi.fn(),
    onClosePanels: vi.fn(),
  }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(() => root?.render(createElement(HotkeyHarness, {
    track,
    isExporting: false,
    ...callbacks,
    ...overrides,
  })))
  return callbacks
}

function pressKey(target: Element, key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
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

  it('rejects a queued frame after a synchronous session reset', async () => {
    await renderController()

    await act(() => currentController().togglePlay())
    await runNextFrame(100)
    const staleFrame = [...frames.values()][0]
    if (!staleFrame) throw new Error('Missing queued playback frame')

    await act(() => currentController().resetPlaybackSession())
    expect(frames.size).toBe(0)
    expect(currentController().progress).toBe(0)

    await act(() => staleFrame(1_100))

    expect(currentController().isPlaying).toBe(false)
    expect(currentController().progress).toBe(0)
    expect(frames.size).toBe(0)
  })
})

describe('usePlaybackHotkeys Escape ownership', () => {
  it.each([
    ['button', '#hotkey-button'],
    ['text input', '#hotkey-input'],
    ['select', '#hotkey-select'],
    ['range', '#hotkey-range'],
  ])('closes nonmodal panels from a focused %s', async (_name, selector) => {
    const { onClosePanels } = await renderHotkeys()
    const target = container?.querySelector(selector)
    if (!target) throw new Error(`Missing hotkey target: ${selector}`)

    const event = pressKey(target, 'Escape')

    expect(event.defaultPrevented).toBe(true)
    expect(onClosePanels).toHaveBeenCalledOnce()
  })

  it('leaves playback keys suppressed on interactive controls', async () => {
    const { onTogglePlay, onStepSeek } = await renderHotkeys()
    const button = container?.querySelector('#hotkey-button')
    const range = container?.querySelector('#hotkey-range')
    if (!button || !range) throw new Error('Missing interactive hotkey targets')

    pressKey(button, ' ')
    pressKey(range, 'ArrowRight')

    expect(onTogglePlay).not.toHaveBeenCalled()
    expect(onStepSeek).not.toHaveBeenCalled()
  })

  it('defers Escape to an owning dialog', async () => {
    const { onClosePanels } = await renderHotkeys()
    const dialogButton = container?.querySelector('#dialog-button')
    if (!dialogButton) throw new Error('Missing dialog hotkey target')

    pressKey(dialogButton, 'Escape')

    expect(onClosePanels).not.toHaveBeenCalled()
  })

  it('suppresses global Escape while export owns keyboard cancellation', async () => {
    const { onClosePanels } = await renderHotkeys({ isExporting: true })
    const button = container?.querySelector('#hotkey-button')
    if (!button) throw new Error('Missing export hotkey target')

    pressKey(button, 'Escape')

    expect(onClosePanels).not.toHaveBeenCalled()
  })
})
