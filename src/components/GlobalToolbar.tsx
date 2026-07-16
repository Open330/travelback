'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { Locale } from '@/lib/i18n'
import { useLocale } from '@/lib/i18n'
import type { UnitSystem } from '@/lib/interpolate'
import ThemeToggle from '@/components/ThemeToggle'

interface GlobalToolbarProps {
  locale: Locale
  setLocale: Dispatch<SetStateAction<Locale>> | ((locale: Locale) => void)
  units: UnitSystem
  mode: 'dark' | 'light'
  onUnitsChange: (units: UnitSystem) => void
  onModeChange: (mode: 'dark' | 'light') => void
  hasTrack: boolean
}

export default function GlobalToolbar({ locale, setLocale, units, mode, onUnitsChange, onModeChange, hasTrack }: GlobalToolbarProps) {
  const { t } = useLocale()

  return (
    <div
      data-testid="global-toolbar"
      className={`absolute right-4 z-20 items-center gap-2 ${hasTrack ? 'top-28 hidden sm:flex md:top-[4.5rem]' : 'top-4 flex'}`}
    >
      <div className="gi inline-flex shrink-0 items-center overflow-hidden text-[11px] font-medium" style={{ color: 'var(--t2)' }}>
        <button
          type="button"
          onClick={() => onUnitsChange('metric')}
          className="flex min-h-11 min-w-11 items-center justify-center px-2 py-1.5 cursor-pointer"
          style={units === 'metric' ? { background: 'rgba(var(--gl),.85)', color: 'var(--gl-fg)' } : undefined}
          aria-pressed={units === 'metric'}
          aria-label={t('units.metric')}
          title={t('units.metric')}
        >
          {t('units.km')}
        </button>
        <button
          type="button"
          onClick={() => onUnitsChange('imperial')}
          className="flex min-h-11 min-w-11 items-center justify-center px-2 py-1.5 cursor-pointer"
          style={units === 'imperial' ? { background: 'rgba(var(--gl),.85)', color: 'var(--gl-fg)' } : undefined}
          aria-pressed={units === 'imperial'}
          aria-label={t('units.imperial')}
          title={t('units.imperial')}
        >
          {t('units.mi')}
        </button>
      </div>
      <select
        value={locale}
        onChange={e => setLocale(e.target.value as Locale)}
        aria-label={t('locale.label')}
        className="gi min-h-11 shrink-0 px-2 py-1.5 text-xs font-medium cursor-pointer text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
        style={{ color: 'var(--t2)', minWidth: '3.75rem' }}
      >
        <option value="en">EN</option>
        <option value="ko">KO</option>
        <option value="ja">JA</option>
        <option value="zh">ZH</option>
        <option value="es">ES</option>
      </select>
      <div className="gi flex min-h-11 shrink-0 items-center gap-1.5 px-1.5 py-1">
        <span className="hidden text-[10px] font-medium sm:inline" style={{ color: 'var(--t4)' }}>
          {t('theme.label')}
        </span>
        <ThemeToggle mode={mode} onModeChange={onModeChange} />
      </div>
    </div>
  )
}
