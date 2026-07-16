// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Track } from '@/types'

vi.mock('@/lib/i18n', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/i18n')>(),
  useLocale: () => ({ t: (key: string) => key, locale: 'en' }),
}))

import TimelineSelector, { clampTimelineRatios, indexToRatio, minimumTimelineRatioGap, ratioToIndex } from './TimelineSelector'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null
let nextFrameId = 1
let animationFrames = new Map<number, FrameRequestCallback>()

const TRACK: Track = {
  name: 'Timeline test',
  points: [
    { lat: 37, lng: 127 },
    { lat: 37.1, lng: 127.1 },
    { lat: 37.2, lng: 127.2 },
    { lat: 37.3, lng: 127.3 },
    { lat: 37.4, lng: 127.4 },
  ],
}
const TIMED_TRACK: Track = {
  ...TRACK,
  points: TRACK.points.map((point, index) => ({
    ...point,
    time: new Date(`2024-01-15T${String(index).padStart(2, '0')}:00:00Z`),
  })),
}
const CUMULATIVE_DISTANCES = [0, 10, 20, 30, 40]

function touchEvent(type: string, clientX?: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  const touches = clientX == null ? [] : [{ clientX }]
  Object.defineProperties(event, {
    touches: { value: touches },
    changedTouches: { value: touches },
  })
  return event
}

async function flushAnimationFrames() {
  const callbacks = [...animationFrames.values()]
  animationFrames.clear()
  await act(() => {
    for (const callback of callbacks) callback(performance.now())
  })
}

async function renderTimeline(onRangeChange = vi.fn(), track = TRACK) {
  localStorage.setItem('travelback-timeline-hint-dismissed', '1')
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(() => root?.render(createElement(TimelineSelector, {
    track,
    cumulativeDistances: CUMULATIVE_DISTANCES,
    acceptedRange: { startIdx: 1, endIdx: 3 },
    onRangeChange,
  })))

  const timeline = container.querySelector<HTMLElement>('[data-testid="timeline-selector"] > div')
  const startHandle = container.querySelector<HTMLElement>('[data-testid="timeline-start-handle"]')
  const endHandle = container.querySelector<HTMLElement>('[data-testid="timeline-end-handle"]')
  if (!timeline || !startHandle || !endHandle) throw new Error('Missing timeline controls')
  timeline.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 100,
    bottom: 48,
    width: 100,
    height: 48,
    toJSON: () => ({}),
  })
  onRangeChange.mockClear()
  return { onRangeChange, startHandle, endHandle }
}

beforeEach(() => {
  nextFrameId = 1
  animationFrames = new Map()
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    const id = nextFrameId++
    animationFrames.set(id, callback)
    return id
  }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
    animationFrames.delete(id)
  }))
})

afterEach(async () => {
  if (root) await act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ratioToIndex', () => {
  const cumulativeDistances = [0, 10, 20, 30, 40]

  it('round-trips an exact accepted end index', () => {
    expect(ratioToIndex(20 / 40, 'end', cumulativeDistances, 4)).toBe(2)
  })

  it('uses floor for a start edge and ceiling for an end edge', () => {
    expect(ratioToIndex(0.375, 'start', cumulativeDistances, 4)).toBe(1)
    expect(ratioToIndex(0.375, 'end', cumulativeDistances, 4)).toBe(2)
  })

  it('falls back to index space for a zero-distance track', () => {
    const stationaryDistances = [0, 0, 0, 0, 0]
    expect(ratioToIndex(0.375, 'start', stationaryDistances, 4)).toBe(1)
    expect(ratioToIndex(0.375, 'end', stationaryDistances, 4)).toBe(2)
  })

  it('round-trips a start edge at the end of a segment-boundary plateau', () => {
    const segmentedDistances = [0, 10, 10, 20]
    const ratio = indexToRatio(2, 'start', segmentedDistances, 3)

    expect(ratio).toBeGreaterThan(0.5)
    expect(ratioToIndex(ratio, 'start', segmentedDistances, 3)).toBe(2)
  })

  it('keeps an end edge at the first index of a distance plateau', () => {
    const segmentedDistances = [0, 10, 10, 20]
    const ratio = indexToRatio(1, 'end', segmentedDistances, 3)

    expect(ratioToIndex(ratio, 'end', segmentedDistances, 3)).toBe(1)
  })
})

describe('clampTimelineRatios', () => {
  it('allows a three-point track to select its two-point inclusive minimum', () => {
    expect(clampTimelineRatios(0, 0.42, [0, 0, 0], 3)).toEqual([0, 0.5])
  })

  it('keeps a two-point track on its only valid interval', () => {
    expect(clampTimelineRatios(0.25, 0.75, [0, 0], 2)).toEqual([0, 1])
  })

  it('uses the smallest adjacent distance interval for uneven tracks', () => {
    const cumulativeDistances = [0, 1, 1000]
    const minimumGap = minimumTimelineRatioGap(cumulativeDistances, 3)
    const [, end] = clampTimelineRatios(0, 0, cumulativeDistances, 3)

    expect(minimumGap).toBeCloseTo(0.001 - 0.000001, 9)
    expect(ratioToIndex(end, 'end', cumulativeDistances, 2)).toBe(1)
  })

  it('ignores zero-distance plateaus when deriving a distance gap', () => {
    expect(minimumTimelineRatioGap([0, 10, 10, 20], 4)).toBeCloseTo(0.5 - 0.000001, 9)
  })

  it('falls back to index space for an all-zero-distance track', () => {
    expect(minimumTimelineRatioGap([0, 0, 0], 3)).toBe(0.5)
  })
})

describe('TimelineSelector drag lifecycle', () => {
  it('restores the origin and never commits a cancelled touch drag', async () => {
    const { onRangeChange, endHandle } = await renderTimeline()

    await act(() => endHandle.dispatchEvent(touchEvent('touchstart', 75)))
    await act(() => window.dispatchEvent(touchEvent('touchmove', 90)))
    await flushAnimationFrames()
    expect(endHandle.getAttribute('aria-valuenow')).toBe('90')

    await act(() => window.dispatchEvent(touchEvent('touchmove', 95)))
    expect(animationFrames.size).toBe(1)
    await act(() => window.dispatchEvent(touchEvent('touchcancel')))

    expect(animationFrames.size).toBe(0)
    expect(endHandle.getAttribute('aria-valuenow')).toBe('75')
    expect(onRangeChange).not.toHaveBeenCalled()

    vi.mocked(requestAnimationFrame).mockClear()
    await act(() => window.dispatchEvent(touchEvent('touchend')))
    await act(() => window.dispatchEvent(touchEvent('touchmove', 10)))
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    expect(onRangeChange).not.toHaveBeenCalled()
  })

  it('restores the origin without committing when the window blurs', async () => {
    const { onRangeChange, startHandle } = await renderTimeline()

    await act(() => startHandle.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      clientX: 25,
    })))
    await act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10 })))
    await flushAnimationFrames()
    expect(startHandle.getAttribute('aria-valuenow')).toBe('10')

    await act(() => window.dispatchEvent(new Event('blur')))
    expect(startHandle.getAttribute('aria-valuenow')).toBe('25')
    expect(onRangeChange).not.toHaveBeenCalled()
  })

  it('commits an ordinary drag exactly once', async () => {
    const { onRangeChange, endHandle } = await renderTimeline()

    await act(() => endHandle.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      clientX: 75,
    })))
    await act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientX: 90 })))
    await act(() => window.dispatchEvent(new MouseEvent('mouseup')))
    await act(() => window.dispatchEvent(new MouseEvent('mouseup')))
    await act(() => window.dispatchEvent(new Event('blur')))

    expect(endHandle.getAttribute('aria-valuenow')).toBe('90')
    expect(onRangeChange).toHaveBeenCalledOnce()
    expect(onRangeChange).toHaveBeenCalledWith(1, 4)
  })

  it('does not schedule animation frames for idle global movement', async () => {
    await renderTimeline()
    vi.mocked(requestAnimationFrame).mockClear()

    await act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientX: 80 })))
    await act(() => window.dispatchEvent(touchEvent('touchmove', 80)))

    expect(requestAnimationFrame).not.toHaveBeenCalled()
    expect(animationFrames.size).toBe(0)
  })
})

describe('TimelineSelector accessible endpoint values', () => {
  it('keeps each dated handle value aligned with its visible endpoint', async () => {
    const { startHandle, endHandle } = await renderTimeline(vi.fn(), TIMED_TRACK)
    const startDate = container?.querySelector<HTMLElement>('[data-testid="timeline-start-date"]')
    const endDate = container?.querySelector<HTMLElement>('[data-testid="timeline-end-date"]')
    if (!startDate || !endDate) throw new Error('Missing visible timeline dates')

    expect(startHandle.getAttribute('aria-valuetext')).toContain(startDate.textContent)
    expect(endHandle.getAttribute('aria-valuetext')).toContain(endDate.textContent)
    const initialEndDate = endDate.textContent

    await act(() => endHandle.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Home',
      bubbles: true,
    })))

    expect(endDate.textContent).not.toBe(initialEndDate)
    expect(endHandle.getAttribute('aria-valuetext')).toContain(endDate.textContent)
  })

  it('retains a localized percentage fallback for a timeless track', async () => {
    const { startHandle, endHandle } = await renderTimeline()

    expect(startHandle.getAttribute('aria-valuetext')).toBe('25% timeline.startHandle')
    expect(endHandle.getAttribute('aria-valuetext')).toBe('75% timeline.endHandle')
    expect(container?.querySelector('[data-testid="timeline-date-row"]')).toBeNull()
  })
})
