// @vitest-environment jsdom

import { act, createElement, Fragment } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ModalDialog from './ModalDialog'
import Toast from './Toast'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let appRoot: HTMLDivElement | null = null

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

afterEach(async () => {
  if (root) await act(() => root?.unmount())
  appRoot?.remove()
  document.querySelectorAll('.travelback-toast').forEach(element => element.remove())
  root = null
  appRoot = null
  vi.unstubAllGlobals()
})

describe('Toast modal composition', () => {
  it('keeps its live region outside the inert application root', async () => {
    appRoot = document.createElement('div')
    appRoot.dataset.travelbackAppRoot = 'true'
    document.body.append(appRoot)
    root = createRoot(appRoot)
    const dialogProps = {
      open: true,
      onClose: vi.fn(),
      labelledBy: 'dialog-title',
      children: createElement('h2', { id: 'dialog-title' }, 'Export'),
    }

    await act(() => root?.render(createElement(Fragment, null,
      createElement(Toast, {
        messages: [{ id: 'cancelled', text: 'Export cancelled', type: 'info' }],
        onDismiss: vi.fn(),
        hasTrack: true,
      }),
      createElement(ModalDialog, dialogProps),
    )))

    const liveRegion = document.querySelector<HTMLElement>('.travelback-toast')
    expect(appRoot.getAttribute('inert')).toBe('')
    expect(appRoot.getAttribute('aria-hidden')).toBe('true')
    expect(liveRegion).not.toBeNull()
    expect(liveRegion?.dataset.hasTrack).toBe('true')
    expect(liveRegion?.closest('[inert], [aria-hidden="true"]')).toBeNull()
  })
})
