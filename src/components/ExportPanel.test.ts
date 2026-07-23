// @vitest-environment jsdom

import { act, createElement, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/i18n')>(),
  useLocale: () => ({ t: (key: string) => key }),
}))

vi.mock('@/lib/videoEncoder', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/videoEncoder')>(),
  isCodecSupported: vi.fn().mockResolvedValue(true),
}))

import { isCodecSupported } from '@/lib/videoEncoder'
import ExportPanel from './ExportPanel'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function touchEvent(type: string, clientX: number, clientY: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  const touches = [{ clientX, clientY }]
  Object.defineProperties(event, {
    touches: { value: type === 'touchend' || type === 'touchcancel' ? [] : touches },
    changedTouches: { value: touches },
  })
  return event
}

async function renderExportPanel(
  onClose: () => void,
  overrides: Partial<ComponentProps<typeof ExportPanel>> = {},
) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => {
    root?.render(createElement(ExportPanel, {
      isOpen: true,
      onClose,
      onExport: vi.fn(),
      isExporting: false,
      exportProgress: 0,
      exportState: 'idle',
      onResetExport: vi.fn(),
      onCancelExport: vi.fn(),
      ...overrides,
    }))
    await Promise.resolve()
  })

  const swipeHandle = document.querySelector<HTMLElement>('[data-export-swipe-handle="true"]')
  const panelContent = document.querySelector<HTMLElement>('[data-disable-playback-hotkeys="true"]')
  if (!swipeHandle || !panelContent) throw new Error('Missing export swipe controls')
  return { swipeHandle, panelContent }
}

beforeEach(() => {
  vi.mocked(isCodecSupported).mockClear().mockResolvedValue(true)
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

describe('ExportPanel swipe lifecycle', () => {
  it('forgets a cancelled swipe before accepting a fresh dismissal gesture', async () => {
    const onClose = vi.fn()
    const { swipeHandle, panelContent } = await renderExportPanel(onClose)

    await act(() => swipeHandle.dispatchEvent(touchEvent('touchstart', 100, 10)))
    await act(() => panelContent.dispatchEvent(touchEvent('touchcancel', 100, 40)))
    await act(() => panelContent.dispatchEvent(touchEvent('touchend', 100, 160)))
    expect(onClose).not.toHaveBeenCalled()

    await act(() => swipeHandle.dispatchEvent(touchEvent('touchstart', 100, 10)))
    await act(() => panelContent.dispatchEvent(touchEvent('touchend', 105, 100)))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('ExportPanel codec discovery', () => {
  it('re-probes codecs with the selected dimensions and bitrate', async () => {
    await renderExportPanel(vi.fn())
    await vi.waitFor(() => expect(isCodecSupported).toHaveBeenCalledTimes(3))

    for (const [, config] of vi.mocked(isCodecSupported).mock.calls) {
      expect(config).toEqual({ width: 1080, height: 1920, bitrateMbps: 8 })
    }

    const resolutionSelect = document.querySelector<HTMLSelectElement>('select')
    if (!resolutionSelect) throw new Error('Missing resolution selector')
    await act(() => {
      resolutionSelect.value = '4'
      resolutionSelect.dispatchEvent(new Event('change', { bubbles: true }))
    })

    await vi.waitFor(() => expect(isCodecSupported).toHaveBeenCalledTimes(6))
    for (const [, config] of vi.mocked(isCodecSupported).mock.calls.slice(3)) {
      expect(config).toEqual({ width: 1280, height: 720, bitrateMbps: 8 })
    }
  })
})

describe('ExportPanel completion state', () => {
  it.each([
    ['picker', 'export.success', 'export.videoSaved', true],
    ['fallback', 'export.downloadStarted', 'export.savedToDownloads', true],
    ['ready', 'export.ready', 'export.readyDescription', false],
  ] as const)('renders truthful %s completion copy', async (downloadMethod, headingKey, descriptionKey, showsPlatformTip) => {
    await renderExportPanel(vi.fn(), {
      exportState: 'done',
      downloadMethod,
      exportedVideoUrl: 'blob:ready-video',
      exportedVideoFilename: 'Travelback.mp4',
    })

    const heading = document.querySelector<HTMLHeadingElement>('h4')
    if (!heading) throw new Error('Missing completion heading')
    expect(heading.textContent).toBe(headingKey)
    expect(document.body.textContent).toContain(descriptionKey)
    expect(document.body.textContent?.includes('export.tipTikTok')).toBe(showsPlatformTip)
    expect(document.activeElement).toBe(heading)
  })

  it('defaults an unspecified completion method to the unsaved ready state', async () => {
    await renderExportPanel(vi.fn(), { exportState: 'done' })

    expect(document.querySelector('h4')?.textContent).toBe('export.ready')
    expect(document.body.textContent).toContain('export.readyDescription')
    expect(document.body.textContent).not.toContain('export.tipTikTok')
  })

  it('returns focus to the idle export form after Export Again', async () => {
    const onClose = vi.fn()
    const onResetExport = vi.fn()
    await renderExportPanel(onClose, {
      exportState: 'done',
      onResetExport,
      exportedVideoUrl: 'blob:ready-video',
      exportedVideoFilename: 'Travelback.mp4',
    })

    const exportAgain = [...document.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('export.exportAgain'))
    if (!exportAgain) throw new Error('Missing Export Again button')
    await act(() => exportAgain.click())
    expect(onResetExport).toHaveBeenCalledOnce()

    await act(async () => {
      root?.render(createElement(ExportPanel, {
        isOpen: true,
        onClose,
        onExport: vi.fn(),
        isExporting: false,
        exportProgress: 0,
        exportState: 'idle',
        onResetExport,
        onCancelExport: vi.fn(),
      }))
      await Promise.resolve()
    })

    const idleHeading = document.querySelector<HTMLHeadingElement>('#export-panel-title')
    if (!idleHeading) throw new Error('Missing idle Export heading')
    expect(document.activeElement).toBe(idleHeading)
  })

  it('clears a failed share before the next export completion', async () => {
    const onClose = vi.fn()
    const onResetExport = vi.fn()
    const onExport = vi.fn()
    const onCancelExport = vi.fn()
    const share = vi.fn().mockRejectedValue(new Error('Share failed'))
    const shareNavigator = Object.create(navigator) as Navigator
    Object.defineProperties(shareNavigator, {
      share: { configurable: true, value: share },
      canShare: { configurable: true, value: vi.fn().mockReturnValue(true) },
    })
    vi.stubGlobal('navigator', shareNavigator)

    await renderExportPanel(onClose, {
      onExport,
      onResetExport,
      onCancelExport,
      exportState: 'done',
      exportedVideoUrl: 'blob:first-video',
      exportedVideoBlob: new Blob(['first'], { type: 'video/mp4' }),
      exportedVideoFilename: 'first.mp4',
    })

    const findButton = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes(label))

    const firstShare = findButton('export.share')
    if (!firstShare) throw new Error('Missing Share button')
    await act(async () => {
      firstShare.click()
      await Promise.resolve()
    })

    const firstAlert = document.querySelector<HTMLElement>('[role="alert"]')
    expect(firstAlert?.textContent).toBe('export.shareFailed')

    const exportAgain = findButton('export.exportAgain')
    if (!exportAgain) throw new Error('Missing Export Again button')
    const actionRow = exportAgain.parentElement
    expect(actionRow?.contains(firstAlert)).toBe(false)
    expect(firstAlert?.parentElement).toBe(actionRow?.parentElement)

    await act(() => exportAgain.click())
    expect(onResetExport).toHaveBeenCalledOnce()
    expect(document.querySelector('[role="alert"]')).toBeNull()

    await act(async () => {
      root?.render(createElement(ExportPanel, {
        isOpen: true,
        onClose,
        onExport,
        isExporting: false,
        exportProgress: 0,
        exportState: 'idle',
        onResetExport,
        onCancelExport,
      }))
      await Promise.resolve()
    })

    await act(async () => {
      root?.render(createElement(ExportPanel, {
        isOpen: true,
        onClose,
        onExport,
        isExporting: false,
        exportProgress: 1,
        exportState: 'done',
        exportedVideoUrl: 'blob:second-video',
        exportedVideoBlob: new Blob(['second'], { type: 'video/mp4' }),
        exportedVideoFilename: 'second.mp4',
        onResetExport,
        onCancelExport,
      }))
      await Promise.resolve()
    })

    expect(document.querySelector('[role="alert"]')).toBeNull()

    const secondShare = findButton('export.share')
    if (!secondShare) throw new Error('Missing Share button after second export')
    await act(async () => {
      secondShare.click()
      await Promise.resolve()
    })

    expect(document.querySelector('[role="alert"]')?.textContent).toBe('export.shareFailed')
    expect(share).toHaveBeenCalledTimes(2)
  })
})

describe('ExportPanel duration editing', () => {
  const setDurationDraft = async (input: HTMLInputElement, value: string) => {
    await act(() => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      if (!setValue) throw new Error('Missing native input value setter')
      setValue.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  const findStartButton = () => [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => button.textContent?.includes('export.startExport'))

  it('preserves sequential keyboard input and exports the committed value', async () => {
    const onExport = vi.fn()
    await renderExportPanel(vi.fn(), { onExport, playbackDuration: 30 })
    await vi.waitFor(() => expect(isCodecSupported).toHaveBeenCalledTimes(3))

    const input = document.querySelector<HTMLInputElement>('input[type="number"][min="5"][max="180"]')
    if (!input) throw new Error('Missing duration input')

    await setDurationDraft(input, '1')
    expect(input.value).toBe('1')
    await setDurationDraft(input, '15')
    expect(input.value).toBe('15')

    await act(() => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    expect(input.value).toBe('15')
    expect(input.getAttribute('aria-invalid')).toBe('false')

    const startButton = findStartButton()
    if (!startButton) throw new Error('Missing Start Export button')
    await vi.waitFor(() => expect(startButton.disabled).toBe(false))
    await act(() => startButton.click())

    expect(onExport).toHaveBeenCalledOnce()
    expect(onExport.mock.calls[0]?.[0]).toMatchObject({ duration: 15 })
  })

  it('keeps an empty draft until validation and associates the range error', async () => {
    const onExport = vi.fn()
    await renderExportPanel(vi.fn(), { onExport, playbackDuration: 30 })
    await vi.waitFor(() => expect(isCodecSupported).toHaveBeenCalledTimes(3))

    const input = document.querySelector<HTMLInputElement>('input[type="number"][min="5"][max="180"]')
    if (!input) throw new Error('Missing duration input')
    input.focus()
    await setDurationDraft(input, '')
    expect(input.value).toBe('')

    await act(() => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    const errorId = input.getAttribute('aria-describedby')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(errorId).toBeTruthy()
    expect(document.getElementById(errorId ?? '')?.textContent).toBe('export.durationRange')

    const startButton = findStartButton()
    if (!startButton) throw new Error('Missing Start Export button')
    await vi.waitFor(() => expect(startButton.disabled).toBe(false))
    await act(() => startButton.click())

    expect(onExport).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('')
  })

  it.each(['4', '181', '5.5'])('rejects out-of-range or non-integer draft %s on Enter', async (draft) => {
    const onExport = vi.fn()
    await renderExportPanel(vi.fn(), { onExport })

    const input = document.querySelector<HTMLInputElement>('input[type="number"][min="5"][max="180"]')
    if (!input) throw new Error('Missing duration input')
    await setDurationDraft(input, draft)
    await act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))

    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('export.durationRange')
    expect(onExport).not.toHaveBeenCalled()
  })

  it('clears the error and commits a corrected value with Enter', async () => {
    await renderExportPanel(vi.fn())
    const input = document.querySelector<HTMLInputElement>('input[type="number"][min="5"][max="180"]')
    if (!input) throw new Error('Missing duration input')

    await setDurationDraft(input, '4')
    await act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(input.getAttribute('aria-invalid')).toBe('true')

    await setDurationDraft(input, '45')
    expect(input.getAttribute('aria-invalid')).toBe('false')
    await act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(input.value).toBe('45')
    expect(document.querySelector('[role="alert"]')).toBeNull()
  })
})

describe('ExportPanel rendering focus', () => {
  it('moves focus to cancel when rendering replaces the idle form', async () => {
    const onClose = vi.fn()
    const onExport = vi.fn()
    const onResetExport = vi.fn()
    const onCancelExport = vi.fn()
    await renderExportPanel(onClose, { onExport, onResetExport, onCancelExport })
    await vi.waitFor(() => expect(isCodecSupported).toHaveBeenCalledTimes(3))

    const startButton = [...document.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('export.startExport'))
    if (!startButton) throw new Error('Missing Start Export button')
    startButton.focus()
    expect(document.activeElement).toBe(startButton)

    await act(async () => {
      root?.render(createElement(ExportPanel, {
        isOpen: true,
        onClose,
        onExport,
        isExporting: true,
        exportProgress: 0.25,
        exportState: 'exporting',
        onResetExport,
        onCancelExport,
      }))
      await Promise.resolve()
    })

    const cancelButton = document.querySelector<HTMLButtonElement>('button[aria-label="app.cancelExportAria"]')
    if (!cancelButton) throw new Error('Missing Cancel Export button')
    expect(document.activeElement).toBe(cancelButton)

    await act(async () => {
      root?.render(createElement(ExportPanel, {
        isOpen: true,
        onClose,
        onExport,
        isExporting: false,
        exportProgress: 0,
        exportState: 'idle',
        onResetExport,
        onCancelExport,
      }))
      await Promise.resolve()
    })

    const idleHeading = document.querySelector<HTMLHeadingElement>('#export-panel-title')
    if (!idleHeading) throw new Error('Missing idle Export heading')
    expect(document.activeElement).toBe(idleHeading)
  })
})
