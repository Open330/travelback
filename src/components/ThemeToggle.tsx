'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [mode, setMode] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-mode') as 'dark' | 'light' | null
    if (current) setMode(current)
  }, [])

  const toggle = useCallback(() => {
    const next = mode === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-mode', next)
    setMode(next)
  }, [mode])

  return (
    <button
      onClick={toggle}
      title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
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

