'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useLocale } from '@/lib/i18n'

export default function ThemeToggle({ onModeChange }: { onModeChange?: (mode: 'dark' | 'light') => void }) {
  const { t } = useLocale()
  const [mode, setMode] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    // Check if user already set a mode, otherwise detect system preference
    const current = document.documentElement.getAttribute('data-mode') as 'dark' | 'light' | null
    if (current) {
      setMode(current)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const systemMode = prefersDark ? 'dark' : 'light'
      document.documentElement.setAttribute('data-mode', systemMode)
      setMode(systemMode)
      onModeChange?.(systemMode)
    }

    // Listen for system preference changes
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const newMode = e.matches ? 'dark' : 'light'
      document.documentElement.setAttribute('data-mode', newMode)
      setMode(newMode)
      onModeChange?.(newMode)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [onModeChange])

  const toggle = useCallback(() => {
    const next = mode === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-mode', next)
    setMode(next)
    onModeChange?.(next)
  }, [mode, onModeChange])

  return (
    <button
      onClick={toggle}
      title={mode === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
      aria-label={mode === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
      className="gi w-9 h-9 flex items-center justify-center cursor-pointer"
      style={{ color: 'var(--t2)' }}
    >
      {mode === 'dark' ? (
        <Sun size={18} strokeWidth={2} />
      ) : (
        <Moon size={18} strokeWidth={2} />
      )}
    </button>
  )
}

