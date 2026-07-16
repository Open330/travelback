// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CAMERA_PARAMS, type Scene } from '@/types'

vi.mock('@/lib/i18n', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/i18n')>()
  return {
    ...original,
    useLocale: () => ({
      locale: 'ko',
      t: (key: keyof typeof original.translations.en) => original.translations.ko[key] ?? key,
    }),
  }
})

import SceneEditor, { SceneRangeEditor } from './SceneEditor'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function pointerEvent(type: string, pointerId: number, clientX: number) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, button: 0 })
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: 'mouse' },
  })
  return event
}

async function renderRangeEditor(
  onChange: (startPercent: number, endPercent: number) => void,
  onCommit: (startPercent: number, endPercent: number) => void,
) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(() => root?.render(createElement(SceneRangeEditor, {
    sceneName: 'Scene 1',
    startPercent: 0,
    endPercent: 0.5,
    onChange,
    onCommit,
    ariaLabel: 'Scene 1 range',
  })))
  const range = container.querySelector<HTMLElement>('[aria-label="Scene 1 range"]')
  if (!range) throw new Error('Missing scene range editor')
  range.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 100,
    bottom: 32,
    width: 100,
    height: 32,
    toJSON: () => ({}),
  })
  const handles = container.querySelectorAll<HTMLElement>('[role="slider"]')
  return { range, endHandle: handles[1] }
}

beforeEach(() => {
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    releasePointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
  })
})

afterEach(async () => {
  if (root) await act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

describe('SceneRangeEditor pointer lifecycle', () => {
  it('commits a completed drag exactly once', async () => {
    const onChange = vi.fn()
    const onCommit = vi.fn()
    const { endHandle } = await renderRangeEditor(onChange, onCommit)

    await act(() => endHandle.dispatchEvent(pointerEvent('pointerdown', 1, 50)))
    await act(() => window.dispatchEvent(pointerEvent('pointermove', 1, 70)))
    await act(() => window.dispatchEvent(pointerEvent('pointerup', 1, 70)))
    await act(() => endHandle.dispatchEvent(pointerEvent('lostpointercapture', 1, 70)))

    expect(onChange).toHaveBeenLastCalledWith(0, 0.7)
    expect(onCommit).toHaveBeenCalledOnce()
    expect(onCommit).toHaveBeenCalledWith(0, 0.7)
  })

  it('restores the original range on pointer cancellation and can drag again', async () => {
    const onChange = vi.fn()
    const onCommit = vi.fn()
    const { endHandle } = await renderRangeEditor(onChange, onCommit)

    await act(() => endHandle.dispatchEvent(pointerEvent('pointerdown', 1, 50)))
    await act(() => window.dispatchEvent(pointerEvent('pointermove', 1, 70)))
    await act(() => window.dispatchEvent(pointerEvent('pointercancel', 1, 70)))
    await act(() => endHandle.dispatchEvent(pointerEvent('lostpointercapture', 1, 70)))

    expect(onChange).toHaveBeenLastCalledWith(0, 0.5)
    expect(onCommit).not.toHaveBeenCalled()

    await act(() => endHandle.dispatchEvent(pointerEvent('pointerdown', 2, 50)))
    await act(() => window.dispatchEvent(pointerEvent('pointermove', 2, 60)))
    await act(() => window.dispatchEvent(pointerEvent('pointerup', 2, 60)))
    expect(onCommit).toHaveBeenCalledOnce()
    expect(onCommit).toHaveBeenCalledWith(0, 0.6)
  })

  it('ignores other pointers and cancels the active drag on blur', async () => {
    const onChange = vi.fn()
    const onCommit = vi.fn()
    const { endHandle } = await renderRangeEditor(onChange, onCommit)

    await act(() => endHandle.dispatchEvent(pointerEvent('pointerdown', 3, 50)))
    await act(() => window.dispatchEvent(pointerEvent('pointermove', 4, 90)))
    expect(onChange).not.toHaveBeenCalled()
    await act(() => window.dispatchEvent(pointerEvent('pointermove', 3, 65)))
    await act(() => window.dispatchEvent(new Event('blur')))

    expect(onChange).toHaveBeenLastCalledWith(0, 0.5)
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('SceneEditor normalization feedback', () => {
  it('localizes adjusted start and end boundaries in visible and live feedback', async () => {
    const scenes: Scene[] = [
      {
        id: 'first',
        name: '첫 번째',
        cameraMode: 'flyover',
        startPercent: 0,
        endPercent: 0.6,
        params: { ...DEFAULT_CAMERA_PARAMS.flyover },
      },
      {
        id: 'second',
        name: '두 번째',
        cameraMode: 'orbit',
        startPercent: 0.5,
        endPercent: 1.2,
        params: { ...DEFAULT_CAMERA_PARAMS.orbit },
      },
    ]
    const onChange = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(() => root?.render(createElement(SceneEditor, {
      scenes,
      onChange,
      onClose: vi.fn(),
      transitionDuration: 0.03,
      onTransitionDurationChange: vi.fn(),
    })))

    const nameInput = container.querySelector<HTMLInputElement>('input[value="첫 번째"]')
    if (!nameInput) throw new Error('Missing first scene name input')
    await act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(nameInput, '첫 번째 수정')
      nameInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const expectedStart = '"두 번째" 장면의 시작이 50%에서 60%로 조정되었습니다.'
    const expectedEnd = '"두 번째" 장면의 끝이 120%에서 100%로 조정되었습니다.'
    const status = container.querySelector('[data-testid="scene-editor-status"]')
    expect(status?.textContent).toContain(expectedStart)
    expect(status?.textContent).toContain(expectedEnd)
    expect(status?.textContent).not.toMatch(/\bstart:|\bend:/i)
    const visibleWarnings = [...container.querySelectorAll('p')]
      .map(element => element.textContent ?? '')
      .join(' ')
    expect(visibleWarnings).toContain(expectedStart)
    expect(visibleWarnings).toContain(expectedEnd)
    expect(onChange).toHaveBeenCalledOnce()
  })
})
