// @vitest-environment jsdom

import {
  act,
  createElement,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/i18n')>(),
  useLocale: () => ({ locale: 'en' }),
}))

import ErrorBoundary from './ErrorBoundary'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const TestBoundary = ErrorBoundary as ComponentType<{
  children?: ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
  onReset?: () => void | Promise<void>
}>

let root: Root | null = null
let container: HTMLDivElement | null = null

async function renderBoundary({
  onError,
  onReset,
  child,
}: {
  onError?: (error: Error, info: React.ErrorInfo) => void
  onReset?: () => void | Promise<void>
  child: React.ReactNode
}) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(() => root?.render(createElement(TestBoundary, { onError, onReset }, child)))

  const retry = [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => button.textContent === 'Try Again')
  if (!retry) throw new Error('Missing error-boundary retry button')
  return retry
}

afterEach(async () => {
  if (root) await act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

describe('ErrorBoundary recovery', () => {
  it('invalidates at capture and keeps retry disabled until asynchronous recovery settles', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let shouldThrow = true
    let settleRecovery!: () => void
    const recovery = new Promise<void>((resolve) => {
      settleRecovery = resolve
    })
    const onError = vi.fn()
    const onReset = vi.fn(() => recovery)

    function Child() {
      if (shouldThrow) throw new Error('descendant crashed')
      return createElement('p', null, 'Recovered workspace')
    }

    const retry = await renderBoundary({
      onError,
      onReset,
      child: createElement(Child),
    })

    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ message: 'descendant crashed' })
    expect(retry.disabled).toBe(false)

    await act(() => retry.click())

    expect(onReset).toHaveBeenCalledOnce()
    expect(retry.disabled).toBe(true)
    expect(document.querySelector('main')?.getAttribute('aria-busy')).toBe('true')
    expect(document.body.textContent).toContain('Something went wrong')
    expect(document.body.textContent).not.toContain('Recovered workspace')

    shouldThrow = false
    await act(async () => {
      settleRecovery()
      await recovery
    })

    expect(document.body.textContent).toContain('Recovered workspace')
    expect(document.querySelector('main')).toBeNull()
  })

  it('leaves the fallback retryable when asynchronous recovery fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const resetError = new Error('cleanup failed')

    function Child(): ReactNode {
      throw new Error('descendant crashed')
    }

    const retry = await renderBoundary({
      onReset: () => Promise.reject(resetError),
      child: createElement(Child),
    })

    await act(async () => {
      retry.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(document.body.textContent).toContain('Something went wrong')
    expect(retry.disabled).toBe(false)
    expect(document.querySelector('main')?.getAttribute('aria-busy')).toBe('false')
    expect(consoleError).toHaveBeenCalledWith('ErrorBoundary reset failed:', 'cleanup failed')
  })
})
