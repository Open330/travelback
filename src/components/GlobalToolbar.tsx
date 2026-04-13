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
  onUnitsChange: (units: UnitSystem) => void
  onModeChange: (mode: 'dark' | 'light') => void
}

export default function GlobalToolbar({ locale, setLocale, units, onUnitsChange, onModeChange }: GlobalToolbarProps) {
  const { t } = useLocale()

  return (
    <div data-testid="global-toolbar" className="absolute top-4 right-4 z-10 flex items-center gap-2">
      <div className="gi inline-flex items-center overflow-hidden text-[11px] font-medium" style={{ color: 'var(--t2)' }}>
        <button
          type="button"
          onClick={() => onUnitsChange('metric')}
          className="px-2 py-1.5 cursor-pointer"
          style={units === 'metric' ? { background: 'rgba(var(--gl),.85)', color: '#fff' } : undefined}
          aria-label={t('units.metric')}
          title={t('units.metric')}
        >
          km
        </button>
        <button
          type="button"
          onClick={() => onUnitsChange('imperial')}
          className="px-2 py-1.5 cursor-pointer"
          style={units === 'imperial' ? { background: 'rgba(var(--gl),.85)', color: '#fff' } : undefined}
          aria-label={t('units.imperial')}
          title={t('units.imperial')}
        >
          mi
        </button>
      </div>
      <select
        value={locale}
        onChange={e => setLocale(e.target.value as Locale)}
        aria-label={t('locale.label')}
        className="gi px-2 py-1.5 text-xs font-medium cursor-pointer appearance-none text-center"
        style={{ color: 'var(--t2)', minWidth: '3.5rem' }}
      >
        <option value="en">EN</option>
        <option value="ko">KO</option>
        <option value="ja">JA</option>
        <option value="zh">ZH</option>
        <option value="es">ES</option>
      </select>
      <div className="gi flex items-center gap-1.5 px-1.5 py-1">
        <span className="hidden text-[10px] font-medium sm:inline" style={{ color: 'var(--t4)' }}>
          {t('theme.label')}
        </span>
        <ThemeToggle onModeChange={onModeChange} />
      </div>
    </div>
  )
}
