'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useLocale } from '@/lib/i18n'

function detectInitialMode(): 'dark' | 'light' {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return 'light'
  }

  const current = document.documentElement.getAttribute('data-mode')
  if (current === 'dark' || current === 'light') {
    return current
  }

  if (typeof window.matchMedia !== 'function') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle({ mode: controlledMode, onModeChange }: { mode?: 'dark' | 'light'; onModeChange?: (mode: 'dark' | 'light') => void }) {
  const { t } = useLocale()
  const [mode, setMode] = useState<'dark' | 'light'>(() => detectInitialMode())
  const [hydrated, setHydrated] = useState(false)
  const effectiveMode = controlledMode ?? mode
  const visualMode = effectiveMode
  const actionLabel = visualMode === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')
  const buttonLabel = hydrated ? actionLabel : t('theme.toggle')

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setHydrated(true))
    return () => cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const newMode = e.matches ? 'dark' : 'light'
      if (controlledMode == null) {
        setMode(newMode)
        onModeChange?.(newMode)
      }
      // When a parent controls the mode, ignore OS-level preference changes
      // so the user's explicit choice is preserved.
    }
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    }
    mql.addListener(handler)
    return () => mql.removeListener(handler)
  }, [controlledMode, onModeChange])

  const toggle = useCallback(() => {
    const next = effectiveMode === 'dark' ? 'light' : 'dark'
    if (controlledMode == null) {
      setMode(next)
    }
    onModeChange?.(next)
  }, [controlledMode, effectiveMode, onModeChange])

  return (
    <button
      type="button"
      onClick={toggle}
      title={buttonLabel}
      aria-label={buttonLabel}
      className="gi flex h-11 w-11 items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
      style={{ color: 'var(--t2)' }}
    >
      {!hydrated ? (
        <span aria-hidden="true" className="block h-[18px] w-[18px] rounded-full border" style={{ borderColor: 'currentColor' }} />
      ) : visualMode === 'dark' ? (
        <Sun size={18} strokeWidth={2} />
      ) : (
        <Moon size={18} strokeWidth={2} />
      )}
    </button>
  )
}
