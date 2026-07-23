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
let nextAnimationFrameId = 1
let animationFrames = new Map<number, FrameRequestCallback>()

function pointerEvent(type: string, pointerId: number, clientX: number) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, button: 0 })
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: 'mouse' },
  })
  return event
}

async function renderRangeEditor(
  onCommit: (startPercent: number, endPercent: number) => void,
) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(() => root?.render(createElement(SceneRangeEditor, {
    sceneName: 'Scene 1',
    startPercent: 0,
    endPercent: 0.5,
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

function flushAnimationFrames() {
  const pendingFrames = [...animationFrames.values()]
  animationFrames = new Map()
  for (const callback of pendingFrames) callback(performance.now())
}

function changeInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  valueSetter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  localeState.current = 'ko'
  nextAnimationFrameId = 1
  animationFrames = new Map()
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    const id = nextAnimationFrameId++
    animationFrames.set(id, callback)
    return id
  }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
    animationFrames.delete(id)
  }))
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
  vi.unstubAllGlobals()
})

describe('SceneRangeEditor pointer lifecycle', () => {
  it('coalesces a pointer burst and commits its final range exactly once', async () => {
    const onCommit = vi.fn()
    const { endHandle } = await renderRangeEditor(onCommit)

    await act(() => endHandle.dispatchEvent(pointerEvent('pointerdown', 1, 50)))
    await act(() => {
      window.dispatchEvent(pointerEvent('pointermove', 1, 60))
      window.dispatchEvent(pointerEvent('pointermove', 1, 70))
      window.dispatchEvent(pointerEvent('pointermove', 1, 80))
    })

    expect(requestAnimationFrame).toHaveBeenCalledOnce()
    expect(onCommit).not.toHaveBeenCalled()
    await act(() => flushAnimationFrames())
    expect(endHandle.getAttribute('aria-valuenow')).toBe('80')

    await act(() => window.dispatchEvent(pointerEvent('pointerup', 1, 80)))
    await act(() => endHandle.dispatchEvent(pointerEvent('lostpointercapture', 1, 80)))

    expect(onCommit).toHaveBeenCalledOnce()
    expect(onCommit).toHaveBeenCalledWith(0, 0.8)
  })

  it('restores the original range on pointer cancellation and can drag again', async () => {
    const onCommit = vi.fn()
    const { endHandle } = await renderRangeEditor(onCommit)

    await act(() => endHandle.dispatchEvent(pointerEvent('pointerdown', 1, 50)))
    await act(() => window.dispatchEvent(pointerEvent('pointermove', 1, 70)))
    await act(() => flushAnimationFrames())
    await act(() => window.dispatchEvent(pointerEvent('pointercancel', 1, 70)))
    await act(() => endHandle.dispatchEvent(pointerEvent('lostpointercapture', 1, 70)))

    expect(endHandle.getAttribute('aria-valuenow')).toBe('50')
    expect(onCommit).not.toHaveBeenCalled()

    await act(() => endHandle.dispatchEvent(pointerEvent('pointerdown', 2, 50)))
    await act(() => window.dispatchEvent(pointerEvent('pointermove', 2, 60)))
    await act(() => window.dispatchEvent(pointerEvent('pointerup', 2, 60)))
    expect(onCommit).toHaveBeenCalledOnce()
    expect(onCommit).toHaveBeenCalledWith(0, 0.6)
  })

  it('ignores other pointers and cancels the active drag on blur', async () => {
    const onCommit = vi.fn()
    const { endHandle } = await renderRangeEditor(onCommit)

    await act(() => endHandle.dispatchEvent(pointerEvent('pointerdown', 3, 50)))
    await act(() => window.dispatchEvent(pointerEvent('pointermove', 4, 90)))
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    await act(() => window.dispatchEvent(pointerEvent('pointermove', 3, 65)))
    await act(() => window.dispatchEvent(new Event('blur')))

    expect(endHandle.getAttribute('aria-valuenow')).toBe('50')
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('commits keyboard changes immediately without waiting for a frame', async () => {
    const onCommit = vi.fn()
    const { endHandle } = await renderRangeEditor(onCommit)

    await act(() => endHandle.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    })))

    expect(onCommit).toHaveBeenCalledOnce()
    expect(onCommit).toHaveBeenCalledWith(0, 0.49)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('does not commit a pointer drag that returns to its origin', async () => {
    const onCommit = vi.fn()
    const { endHandle } = await renderRangeEditor(onCommit)

    await act(() => endHandle.dispatchEvent(pointerEvent('pointerdown', 5, 50)))
    await act(() => window.dispatchEvent(pointerEvent('pointermove', 5, 70)))
    await act(() => flushAnimationFrames())
    expect(endHandle.getAttribute('aria-valuenow')).toBe('70')

    await act(() => window.dispatchEvent(pointerEvent('pointermove', 5, 50)))
    await act(() => window.dispatchEvent(pointerEvent('pointerup', 5, 50)))

    expect(endHandle.getAttribute('aria-valuenow')).toBe('50')
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

describe('SceneEditor camera controls', () => {
  const scene: Scene = {
    id: 'first',
    name: '첫 번째',
    cameraMode: 'flyover',
    startPercent: 0,
    endPercent: 1,
    params: { ...DEFAULT_CAMERA_PARAMS.flyover },
  }

  async function renderExpandedEditor(overrides: {
    onChange?: (scenes: Scene[]) => void
    onScenesCommitted?: (scenes: Scene[]) => void
    onPreviewScene?: (scene: Scene | null) => void
  } = {}) {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const callbacks = {
      onChange: overrides.onChange ?? vi.fn(),
      onScenesCommitted: overrides.onScenesCommitted ?? vi.fn(),
      onPreviewScene: overrides.onPreviewScene ?? vi.fn(),
    }
    await act(() => root?.render(createElement(SceneEditor, {
      scenes: [scene],
      ...callbacks,
      onClose: vi.fn(),
      transitionDuration: 0.03,
      onTransitionDurationChange: vi.fn(),
    })))
    const customizeButton = container.querySelector<HTMLButtonElement>('button[aria-expanded="false"]')
    if (!customizeButton) throw new Error('Missing scene customization button')
    await act(() => customizeButton.click())
    const zoomSlider = container.querySelector<HTMLInputElement>('input[aria-label="첫 번째의 줌"]')
    if (!zoomSlider) throw new Error('Missing zoom slider')
    return { ...callbacks, zoomSlider }
  }

  it('coalesces camera pointer previews to one frame and commits once on pointerup', async () => {
    const onChange = vi.fn()
    const onScenesCommitted = vi.fn()
    const onPreviewScene = vi.fn()
    const { zoomSlider } = await renderExpandedEditor({ onChange, onScenesCommitted, onPreviewScene })

    await act(() => zoomSlider.dispatchEvent(pointerEvent('pointerdown', 7, 0)))
    await act(() => {
      changeInputValue(zoomSlider, '14')
      changeInputValue(zoomSlider, '15')
      changeInputValue(zoomSlider, '16')
    })

    expect(requestAnimationFrame).toHaveBeenCalledOnce()
    expect(onPreviewScene).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    expect(onScenesCommitted).not.toHaveBeenCalled()
    expect(zoomSlider.previousElementSibling?.textContent).toBe('줌 16')

    await act(() => flushAnimationFrames())
    expect(onPreviewScene).toHaveBeenCalledOnce()
    expect(onPreviewScene).toHaveBeenCalledWith(expect.objectContaining({
      id: 'first',
      params: expect.objectContaining({ zoom: 16 }),
    }))

    await act(() => window.dispatchEvent(pointerEvent('pointerup', 7, 0)))
    const committedScenes = onChange.mock.calls[0]?.[0] as Scene[]
    expect(onChange).toHaveBeenCalledOnce()
    expect(onScenesCommitted).toHaveBeenCalledOnce()
    expect(onScenesCommitted).toHaveBeenCalledWith(committedScenes)
    expect(committedScenes[0].params.zoom).toBe(16)
    expect(onPreviewScene).toHaveBeenCalledOnce()
  })

  it('rolls a cancelled camera pointer gesture back without publishing root scenes', async () => {
    const onChange = vi.fn()
    const onScenesCommitted = vi.fn()
    const onPreviewScene = vi.fn()
    const { zoomSlider } = await renderExpandedEditor({ onChange, onScenesCommitted, onPreviewScene })

    await act(() => zoomSlider.dispatchEvent(pointerEvent('pointerdown', 8, 0)))
    await act(() => changeInputValue(zoomSlider, '18'))
    await act(() => flushAnimationFrames())
    await act(() => window.dispatchEvent(pointerEvent('pointercancel', 8, 0)))

    expect(onChange).not.toHaveBeenCalled()
    expect(onScenesCommitted).not.toHaveBeenCalled()
    expect(onPreviewScene).toHaveBeenLastCalledWith(null)
    expect(zoomSlider.value).toBe(String(scene.params.zoom))
  })

  it('publishes keyboard camera changes immediately before the preview frame', async () => {
    const onChange = vi.fn()
    const onScenesCommitted = vi.fn()
    const onPreviewScene = vi.fn()
    const { zoomSlider } = await renderExpandedEditor({ onChange, onScenesCommitted, onPreviewScene })

    await act(() => changeInputValue(zoomSlider, '14.5'))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onScenesCommitted).toHaveBeenCalledOnce()
    expect((onChange.mock.calls[0]?.[0] as Scene[])[0].params.zoom).toBe(14.5)
    expect(onPreviewScene).not.toHaveBeenCalled()
    expect(requestAnimationFrame).toHaveBeenCalledOnce()

    await act(() => flushAnimationFrames())
    expect(onPreviewScene).toHaveBeenCalledWith(expect.objectContaining({
      params: expect.objectContaining({ zoom: 14.5 }),
    }))
  })

  it('restores an applied preview after a net-zero camera pointer gesture', async () => {
    const onChange = vi.fn()
    const onScenesCommitted = vi.fn()
    const onPreviewScene = vi.fn()
    const { zoomSlider } = await renderExpandedEditor({ onChange, onScenesCommitted, onPreviewScene })

    await act(() => zoomSlider.dispatchEvent(pointerEvent('pointerdown', 9, 0)))
    await act(() => changeInputValue(zoomSlider, '16'))
    await act(() => flushAnimationFrames())
    await act(() => changeInputValue(zoomSlider, String(scene.params.zoom)))
    await act(() => flushAnimationFrames())
    await act(() => window.dispatchEvent(pointerEvent('pointerup', 9, 0)))

    expect(onChange).not.toHaveBeenCalled()
    expect(onScenesCommitted).not.toHaveBeenCalled()
    expect(onPreviewScene).toHaveBeenCalledTimes(3)
    expect(onPreviewScene).toHaveBeenLastCalledWith(null)
  })

  it('restores an applied keyboard preview when the editor unmounts before keyup', async () => {
    const onPreviewScene = vi.fn()
    const { zoomSlider } = await renderExpandedEditor({ onPreviewScene })

    await act(() => changeInputValue(zoomSlider, '14.5'))
    await act(() => flushAnimationFrames())
    expect(onPreviewScene).toHaveBeenCalledOnce()

    await act(() => root?.unmount())
    root = null

    expect(onPreviewScene).toHaveBeenCalledTimes(2)
    expect(onPreviewScene).toHaveBeenLastCalledWith(null)
  })

  it('cancels an unpublished preview on unmount without restoring the camera', async () => {
    const onPreviewScene = vi.fn()
    const { zoomSlider } = await renderExpandedEditor({ onPreviewScene })

    await act(() => changeInputValue(zoomSlider, '14.5'))
    expect(requestAnimationFrame).toHaveBeenCalledOnce()
    expect(onPreviewScene).not.toHaveBeenCalled()

    await act(() => root?.unmount())
    root = null

    expect(cancelAnimationFrame).toHaveBeenCalledOnce()
    expect(onPreviewScene).not.toHaveBeenCalled()
  })

  it('publishes one normalized parent snapshot at the end of a scene-range drag', async () => {
    const scenes: Scene[] = [
      { ...scene, id: 'first', name: '첫 번째', startPercent: 0, endPercent: 0.5 },
      { ...scene, id: 'second', name: '두 번째', startPercent: 0.5, endPercent: 1 },
    ]
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
    const customizeButton = container.querySelector<HTMLButtonElement>('button[aria-expanded="false"]')
    if (!customizeButton) throw new Error('Missing scene customization button')
    await act(() => customizeButton.click())
    const range = container.querySelector<HTMLElement>('[aria-label="첫 번째 시작 % / 끝 %"]')
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
    const endHandle = range.querySelectorAll<HTMLElement>('[role="slider"]')[1]

    await act(() => endHandle.dispatchEvent(pointerEvent('pointerdown', 10, 50)))
    await act(() => {
      window.dispatchEvent(pointerEvent('pointermove', 10, 60))
      window.dispatchEvent(pointerEvent('pointermove', 10, 70))
    })
    expect(onChange).not.toHaveBeenCalled()
    expect(onScenesCommitted).not.toHaveBeenCalled()
    await act(() => window.dispatchEvent(pointerEvent('pointerup', 10, 70)))

    const normalizedScenes = onChange.mock.calls[0]?.[0] as Scene[]
    expect(onChange).toHaveBeenCalledOnce()
    expect(onScenesCommitted).toHaveBeenCalledOnce()
    expect(onScenesCommitted).toHaveBeenCalledWith(normalizedScenes)
    expect(normalizedScenes[0].endPercent).toBeCloseTo(0.7)
    expect(normalizedScenes[1].startPercent).toBeCloseTo(0.7)
  })

  it('gives duplicate-name camera-mode comboboxes unique localized names', async () => {
    const duplicateNameScenes: Scene[] = [
      { ...scene, id: 'first', name: '같은 이름', startPercent: 0, endPercent: 0.5 },
      { ...scene, id: 'second', name: '같은 이름', startPercent: 0.5, endPercent: 1 },
    ]
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(() => root?.render(createElement(SceneEditor, {
      scenes: duplicateNameScenes,
      onChange: vi.fn(),
      onClose: vi.fn(),
      transitionDuration: 0.03,
      onTransitionDurationChange: vi.fn(),
    })))

    const comboboxes = [...container.querySelectorAll<HTMLSelectElement>('select')]
    expect(comboboxes.map(combobox => combobox.getAttribute('aria-label'))).toEqual([
      '1번 장면 같은 이름의 카메라 모드',
      '2번 장면 같은 이름의 카메라 모드',
    ])
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

    const modeSelect = container.querySelector<HTMLSelectElement>(
      'select[aria-label="1번 장면 첫 번째의 카메라 모드"]',
    )
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
