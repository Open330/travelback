// @vitest-environment jsdom

import { act, createElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider, useLocale, type Locale } from './i18n'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function LocaleProbe() {
  return createElement('span', null, useLocale().locale)
}

async function expectCleanPreferredLocaleHydration({
  storedLocale,
  browserLanguage,
  expectedLocale,
}: {
  storedLocale?: Locale
  browserLanguage: string
  expectedLocale: Locale
}) {
  if (storedLocale) localStorage.setItem('travelback-locale', storedLocale)
  vi.spyOn(window.navigator, 'language', 'get').mockReturnValue(browserLanguage)

  const tree = createElement(LocaleProvider, null, createElement(LocaleProbe))
  vi.stubGlobal('window', undefined)
  let serverMarkup: string
  try {
    serverMarkup = renderToString(tree)
  } finally {
    vi.unstubAllGlobals()
  }

  expect(serverMarkup).toBe('<span>en</span>')

  const container = document.createElement('div')
  container.innerHTML = serverMarkup
  document.body.append(container)
  const recoverableErrors: unknown[] = []
  let root: Root | null = null

  try {
    await act(async () => {
      root = hydrateRoot(container, tree, {
        onRecoverableError: error => recoverableErrors.push(error),
      })
    })

    expect(recoverableErrors).toEqual([])
    expect(container.textContent).toBe(expectedLocale)
    expect(document.documentElement.lang).toBe(expectedLocale)
  } finally {
    if (root) {
      await act(async () => root?.unmount())
    }
    container.remove()
  }
}

afterEach(() => {
  localStorage.clear()
  document.documentElement.lang = 'en'
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('LocaleProvider hydration', () => {
  it('hydrates deterministically before applying the browser locale', async () => {
    await expectCleanPreferredLocaleHydration({
      browserLanguage: 'ko-KR',
      expectedLocale: 'ko',
    })
  })

  it('hydrates deterministically before applying a stored locale', async () => {
    await expectCleanPreferredLocaleHydration({
      storedLocale: 'es',
      browserLanguage: 'en-US',
      expectedLocale: 'es',
    })
  })
})
