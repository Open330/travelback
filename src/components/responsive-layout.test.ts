// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Track } from '@/types'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  resolveTrackDisplayName: (track: Track) => track.name ?? 'Untitled',
  useLocale: () => ({ t: (key: string) => key }),
}))

vi.mock('@/components/TrackToolbar', () => ({
  default: () => createElement('div', { 'data-testid': 'track-toolbar' }),
}))
vi.mock('@/components/Controls', () => ({
  default: () => createElement('div', { 'data-testid': 'controls' }),
}))
vi.mock('@/components/ElevationProfile', () => ({
  default: () => createElement('div', { 'data-testid': 'elevation-profile' }),
}))
vi.mock('@/components/SceneEditor', () => ({
  default: () => null,
}))
vi.mock('@/components/TimelineSelector', () => ({
  default: () => createElement('div', { 'data-testid': 'timeline-selector' }),
}))
vi.mock('@/components/ThemeToggle', () => ({
  default: () => createElement('button', { type: 'button' }, 'theme'),
}))

import GlobalToolbar from './GlobalToolbar'
import TrackWorkspace from './TrackWorkspace'

class TestResizeObserver {
  static instances: TestResizeObserver[] = []
  readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    TestResizeObserver.instances.push(this)
  }

  observe() {}
  unobserve() {}
  disconnect() {}

  trigger() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

function makeRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  }
}

let root: Root | null = null
let container: HTMLElement | null = null
const originalResizeObserver = globalThis.ResizeObserver

beforeEach(() => {
  TestResizeObserver.instances = []
  globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver
  container = document.createElement('main')
  container.dataset.travelbackAppRoot = 'true'
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  if (root) await act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  globalThis.ResizeObserver = originalResizeObserver
})

describe('responsive root measurements', () => {
  it('publishes bottom-stack height and actual toolbar reservation', async () => {
    const track: Track = {
      name: 'A very long imported journey title',
      points: [
        { lat: 37, lng: 127 },
        { lat: 37.1, lng: 127.1 },
        { lat: 37.2, lng: 127.2 },
      ],
    }
    const noop = vi.fn()

    await act(() => root?.render(createElement(TrackWorkspace, {
      fullTrack: track,
      track,
      cumulativeDistances: [0, 1, 2],
      fullTrackCumulativeDistances: [0, 1, 2],
      trackSessionKey: 1,
      mapStyleKey: 'voyager',
      showSceneEditor: false,
      scenes: [],
      locale: 'en',
      setLocale: noop,
      mode: 'light',
      onModeChange: noop,
      units: 'metric',
      onUnitsChange: noop,
      onOpenHelp: noop,
      onOpenImportGuide: noop,
      onScenesChange: noop,
      onScenesCommitted: noop,
      transitionDuration: 1,
      onTransitionDurationChange: noop,
      onPreviewScene: noop,
      onStartNewTrack: noop,
      onToggleSceneEditor: noop,
      onCloseSceneEditor: noop,
      onCycleStyle: noop,
      onOpenExport: noop,
      onRangeChange: noop,
      acceptedTrimRange: { startIdx: 0, endIdx: 2 },
      trimSelectionRevision: 0,
      progress: 0,
      isPlaying: false,
      speed: 1,
      duration: 30,
      followCamera: true,
      onTogglePlay: noop,
      onSeek: noop,
      onSpeedChange: noop,
      onDurationChange: noop,
      onFollowCameraToggle: noop,
    })))

    const appRoot = container
    const bottomStack = container?.querySelector<HTMLElement>('[data-testid="track-bottom-stack"]')
    const toolbar = container?.querySelector<HTMLElement>('[data-testid="track-toolbar"]')
    expect(appRoot).not.toBeNull()
    expect(bottomStack).not.toBeNull()
    expect(toolbar).not.toBeNull()
    if (!appRoot || !bottomStack || !toolbar) return

    appRoot.getBoundingClientRect = () => makeRect(0, 0, 1024, 768)
    bottomStack.getBoundingClientRect = () => makeRect(0, 530, 1024, 238)
    toolbar.getBoundingClientRect = () => makeRect(550, 16, 458, 44)
    await act(() => TestResizeObserver.instances.forEach(observer => observer.trigger()))

    expect(appRoot.style.getPropertyValue('--track-bottom-stack-height')).toBe('238px')
    expect(appRoot.style.getPropertyValue('--track-toolbar-reserved-inline-end')).toBe('474px')
    expect(appRoot.querySelector('[data-testid="track-title"]')?.classList).toContain('track-title-desktop')

    bottomStack.getBoundingClientRect = () => makeRect(0, 488, 1024, 280)
    toolbar.getBoundingClientRect = () => makeRect(500, 16, 508, 44)
    await act(() => TestResizeObserver.instances.forEach(observer => observer.trigger()))

    expect(appRoot.style.getPropertyValue('--track-bottom-stack-height')).toBe('280px')
    expect(appRoot.style.getPropertyValue('--track-toolbar-reserved-inline-end')).toBe('524px')
  })

  it('reserves the measured landing toolbar block before the upload card', async () => {
    const noop = vi.fn()
    await act(() => root?.render(createElement(GlobalToolbar, {
      locale: 'en',
      setLocale: noop,
      units: 'metric',
      mode: 'light',
      onUnitsChange: noop,
      onModeChange: noop,
      hasTrack: false,
    })))

    const appRoot = container
    const toolbar = container?.querySelector<HTMLElement>('[data-testid="global-toolbar"]')
    expect(appRoot).not.toBeNull()
    expect(toolbar).not.toBeNull()
    if (!appRoot || !toolbar) return

    appRoot.getBoundingClientRect = () => makeRect(0, 0, 320, 480)
    toolbar.getBoundingClientRect = () => makeRect(84, 16, 220, 44)
    await act(() => TestResizeObserver.instances.forEach(observer => observer.trigger()))
    expect(appRoot.style.getPropertyValue('--landing-toolbar-safe-top')).toBe('68px')

    toolbar.getBoundingClientRect = () => makeRect(84, 16, 220, 88)
    await act(() => TestResizeObserver.instances.forEach(observer => observer.trigger()))
    expect(appRoot.style.getPropertyValue('--landing-toolbar-safe-top')).toBe('112px')
  })
})
