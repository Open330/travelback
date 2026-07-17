// @vitest-environment jsdom

import { act, createElement, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/i18n')>(),
  useLocale: () => ({ t: (key: string) => key }),
}))

import TrackToolbar from './TrackToolbar'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

const defaultProps: ComponentProps<typeof TrackToolbar> = {
  mapStyleKey: 'voyager',
  showSceneEditor: false,
  locale: 'en',
  setLocale: vi.fn(),
  units: 'metric',
  mode: 'light',
  onUnitsChange: vi.fn(),
  onModeChange: vi.fn(),
  onOpenHelp: vi.fn(),
  onOpenImportGuide: vi.fn(),
  onStartNewTrack: vi.fn(),
  onToggleSceneEditor: vi.fn(),
  onCycleStyle: vi.fn(),
  onOpenExport: vi.fn(),
}

async function renderToolbar(overrides: Partial<ComponentProps<typeof TrackToolbar>> = {}) {
  if (!container) {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  }
  await act(() => root?.render(createElement(TrackToolbar, { ...defaultProps, ...overrides })))
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

afterEach(async () => {
  if (root) await act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('TrackToolbar Escape ownership', () => {
  it.each([
    ['Help', 'app.help', 'onOpenHelp'],
    ['import guide', 'fileUpload.importGuideLink', 'onOpenImportGuide'],
  ] as const)('establishes More as the focus owner before opening %s', async (_label, buttonText, callbackName) => {
    let trigger: HTMLButtonElement | null = null
    const callback = vi.fn(() => {
      expect(document.activeElement).toBe(trigger)
    })
    await renderToolbar({ [callbackName]: callback })
    trigger = container?.querySelector<HTMLButtonElement>('[aria-label="app.moreControls"]') ?? null
    if (!trigger) throw new Error('Missing mobile menu trigger')
    await act(() => trigger?.click())

    const action = [...(container?.querySelectorAll<HTMLButtonElement>('[data-testid="track-toolbar-mobile-menu"] button') ?? [])]
      .find((button) => button.textContent === buttonText)
    if (!action) throw new Error(`Missing ${buttonText} action`)
    await act(() => action.click())

    expect(callback).toHaveBeenCalledOnce()
    expect(container?.querySelector('[data-testid="track-toolbar-mobile-menu"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('consumes mobile-menu Escape and restores its trigger', async () => {
    await renderToolbar()
    const trigger = container?.querySelector<HTMLButtonElement>('[aria-label="app.moreControls"]')
    if (!trigger) throw new Error('Missing mobile menu trigger')
    await act(() => trigger.click())

    const menu = container?.querySelector<HTMLElement>('[data-testid="track-toolbar-mobile-menu"]')
    const menuButton = menu?.querySelector<HTMLButtonElement>('button')
    if (!menu || !menuButton) throw new Error('Missing mobile menu content')
    expect(document.activeElement).toBe(menuButton)

    const reachedWindow = vi.fn()
    window.addEventListener('keydown', reachedWindow)
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    await act(() => menuButton.dispatchEvent(escape))
    window.removeEventListener('keydown', reachedWindow)

    expect(escape.defaultPrevented).toBe(true)
    expect(reachedWindow).not.toHaveBeenCalled()
    expect(container?.querySelector('[data-testid="track-toolbar-mobile-menu"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('restores Camera focus when the Scene Editor closes from an internal control', async () => {
    await renderToolbar({ showSceneEditor: true })
    const trigger = [...(container?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      .find((button) => button.textContent === 'app.scenes')
    if (!trigger) throw new Error('Missing Camera trigger')

    const panel = document.createElement('div')
    panel.dataset.testid = 'scene-editor-panel'
    const internalButton = document.createElement('button')
    panel.append(internalButton)
    document.body.append(panel)
    internalButton.focus()
    expect(document.activeElement).toBe(internalButton)

    await renderToolbar({ showSceneEditor: false })

    expect(document.activeElement).toBe(trigger)
    panel.remove()
  })
})
