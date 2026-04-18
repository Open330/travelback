'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useLocale } from '@/lib/i18n'

function detectInitialMode(): { mode: 'dark' | 'light'; hadExplicitMode: boolean } {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return { mode: 'light', hadExplicitMode: true }
  }

  const current = document.documentElement.getAttribute('data-mode')
  if (current === 'dark' || current === 'light') {
    return { mode: current, hadExplicitMode: true }
  }

  const inferredMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.setAttribute('data-mode', inferredMode)
  return { mode: inferredMode, hadExplicitMode: false }
}

export default function ThemeToggle({ mode: controlledMode, onModeChange }: { mode?: 'dark' | 'light'; onModeChange?: (mode: 'dark' | 'light') => void }) {
  const { t } = useLocale()
  const [initialMode] = useState(() => detectInitialMode())
  const [mode, setMode] = useState<'dark' | 'light'>(initialMode.mode)
  const effectiveMode = controlledMode ?? mode

  useEffect(() => {
    if (!initialMode.hadExplicitMode) {
      onModeChange?.(initialMode.mode)
    }
  }, [initialMode, onModeChange])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const newMode = e.matches ? 'dark' : 'light'
      if (controlledMode == null) {
        setMode(newMode)
        onModeChange?.(newMode)
      }
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
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
