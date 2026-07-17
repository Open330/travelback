// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CAMERA_PARAMS, type Scene } from '@/types'

const localeState = vi.hoisted(() => ({ current: 'ko' as 'en' | 'ko' }))

vi.mock('@/lib/i18n', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/i18n')>()
  return {
    ...original,
    useLocale: () => ({
      locale: localeState.current,
      t: (key: keyof typeof original.translations.en) => original.translations[localeState.current][key] ?? key,
    }),
  }
})

import SceneEditor, { findFirstAvailableSceneRange, SceneRangeEditor } from './SceneEditor'

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
  localeState.current = 'ko'
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

describe('findFirstAvailableSceneRange', () => {
  it.each([
    { caseName: 'empty coverage', scenes: [], expectedStart: 0, expectedEnd: 0.15 },
    { caseName: 'leading gap', scenes: [{ startPercent: 0.2, endPercent: 1 }], expectedStart: 0, expectedEnd: 0.15 },
    { caseName: 'interior gap', scenes: [{ startPercent: 0, endPercent: 0.3 }, { startPercent: 0.7, endPercent: 1 }], expectedStart: 0.3, expectedEnd: 0.45 },
    { caseName: 'trailing gap', scenes: [{ startPercent: 0, endPercent: 0.9 }], expectedStart: 0.9, expectedEnd: 1 },
  ])('returns the first usable range for $caseName', ({ scenes, expectedStart, expectedEnd }) => {
    const result = findFirstAvailableSceneRange(scenes)
    expect(result?.startPercent).toBeCloseTo(expectedStart)
    expect(result?.endPercent).toBeCloseTo(expectedEnd)
  })

  it('returns null when coverage has no minimum-size gap', () => {
    expect(findFirstAvailableSceneRange([
      { startPercent: 0, endPercent: 0.5 },
      { startPercent: 0.505, endPercent: 1 },
    ])).toBeNull()
  })
})

describe('SceneEditor normalization feedback', () => {
  it('rerenders retained boundary warnings in the current locale', async () => {
    localeState.current = 'en'
    const scenes: Scene[] = [
      {
        id: 'first',
        name: 'First',
        cameraMode: 'flyover',
        startPercent: 0,
        endPercent: 0.6,
        params: { ...DEFAULT_CAMERA_PARAMS.flyover },
      },
      {
        id: 'second',
        name: 'Second',
        cameraMode: 'orbit',
        startPercent: 0.5,
        endPercent: 1,
        params: { ...DEFAULT_CAMERA_PARAMS.orbit },
      },
    ]
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const props = {
      scenes,
      onChange: vi.fn(),
      onClose: vi.fn(),
      transitionDuration: 0.03,
      onTransitionDurationChange: vi.fn(),
    }
    const render = async () => {
      await act(() => root?.render(createElement(SceneEditor, { ...props, onClose: vi.fn() })))
    }

    await render()
    const nameInput = container.querySelector<HTMLInputElement>('input[value="First"]')
    if (!nameInput) throw new Error('Missing first scene name input')
    await act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(nameInput, 'First updated')
      nameInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(container.querySelector('[data-testid="scene-editor-status"]')?.textContent).toContain(
      'Scene "Second" start adjusted from 50% to 60%.',
    )

    localeState.current = 'ko'
    await render()
    const localizedStatus = container.querySelector('[data-testid="scene-editor-status"]')?.textContent
    expect(localizedStatus).toContain('"Second" 장면의 시작이 50%에서 60%로 조정되었습니다.')
    expect(localizedStatus).not.toContain('Scene "Second" start adjusted')
  })

  it('fills an interior gap after a scene is deleted and disables Add at full coverage', async () => {
    const fullCoverage: Scene[] = [
      {
        id: 'first',
        name: 'First',
        cameraMode: 'flyover',
        startPercent: 0,
        endPercent: 0.3,
        params: { ...DEFAULT_CAMERA_PARAMS.flyover },
      },
      {
        id: 'middle',
        name: 'Middle',
        cameraMode: 'orbit',
        startPercent: 0.3,
        endPercent: 0.7,
        params: { ...DEFAULT_CAMERA_PARAMS.orbit },
      },
      {
        id: 'last',
        name: 'Last',
        cameraMode: 'ground',
        startPercent: 0.7,
        endPercent: 1,
        params: { ...DEFAULT_CAMERA_PARAMS.ground },
      },
    ]
    const onChange = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    const render = async (scenes: Scene[]) => {
      await act(() => root?.render(createElement(SceneEditor, {
        scenes,
        onChange,
        onClose: vi.fn(),
        transitionDuration: 0.03,
        onTransitionDurationChange: vi.fn(),
      })))
    }

    await render(fullCoverage)
    const addButton = container.querySelector<HTMLButtonElement>('button.vitro-btn-primary')
    expect(addButton?.disabled).toBe(true)

    const deleteMiddle = container.querySelector<HTMLButtonElement>('button[aria-label*="Middle"]')
    if (!deleteMiddle) throw new Error('Missing Middle delete button')
    await act(() => deleteMiddle.click())
    const scenesAfterDelete = onChange.mock.calls.at(-1)?.[0] as Scene[]
    expect(scenesAfterDelete.map(scene => scene.id)).toEqual(['first', 'last'])

    await render(scenesAfterDelete)
    const enabledAddButton = container.querySelector<HTMLButtonElement>('button.vitro-btn-primary')
    expect(enabledAddButton?.disabled).toBe(false)
    await act(() => enabledAddButton?.click())

    const scenesAfterAdd = onChange.mock.calls.at(-1)?.[0] as Scene[]
    expect(scenesAfterAdd).toHaveLength(3)
    expect(scenesAfterAdd[0]).toEqual(fullCoverage[0])
    expect(scenesAfterAdd[2]).toEqual(fullCoverage[2])
    expect(scenesAfterAdd[1].cameraMode).toBe('flyover')
    expect(scenesAfterAdd[1].startPercent).toBeCloseTo(0.3)
    expect(scenesAfterAdd[1].endPercent).toBeCloseTo(0.45)
  })

  it('publishes the exact committed snapshot after a camera-mode change', async () => {
    const scenes: Scene[] = [{
      id: 'first',
      name: '첫 번째',
      cameraMode: 'flyover',
      startPercent: 0,
      endPercent: 1,
      params: { ...DEFAULT_CAMERA_PARAMS.flyover },
    }]
    const onChange = vi.fn()
    const onScenesCommitted = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(() => root?.render(createElement(SceneEditor, {
      scenes,
      onChange,
      onScenesCommitted,
      onClose: vi.fn(),
      transitionDuration: 0.03,
      onTransitionDurationChange: vi.fn(),
    })))

    const modeSelect = container.querySelector<HTMLSelectElement>('select')
    if (!modeSelect) throw new Error('Missing camera-mode select')
    await act(() => {
      modeSelect.value = 'orbit'
      modeSelect.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const expectedScene = expect.objectContaining({
      id: 'first',
      cameraMode: 'orbit',
      params: DEFAULT_CAMERA_PARAMS.orbit,
    })
    expect(onChange).toHaveBeenCalledWith([expectedScene])
    expect(onScenesCommitted).toHaveBeenCalledOnce()
    expect(onScenesCommitted).toHaveBeenCalledWith([expectedScene])
  })

  it.each([
    { caseName: 'ordinary scene names', secondSceneName: '두 번째' },
    { caseName: 'placeholder-like scene names', secondSceneName: '{from} / {to}' },
  ])('localizes adjusted boundaries for $caseName in visible and live feedback', async ({ secondSceneName }) => {
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
        name: secondSceneName,
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

    const expectedStart = `"${secondSceneName}" 장면의 시작이 50%에서 60%로 조정되었습니다.`
    const expectedEnd = `"${secondSceneName}" 장면의 끝이 120%에서 100%로 조정되었습니다.`
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
