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
  const effectiveMode = controlledMode ?? mode

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
      onClick={toggle}
      title={effectiveMode === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
      aria-label={effectiveMode === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
      className="gi flex h-11 w-11 items-center justify-center cursor-pointer"
      style={{ color: 'var(--t2)' }}
    >
      {effectiveMode === 'dark' ? (
        <Sun size={18} strokeWidth={2} />
      ) : (
        <Moon size={18} strokeWidth={2} />
      )}
    </button>
  )
}
