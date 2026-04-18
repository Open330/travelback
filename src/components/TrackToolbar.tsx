'use client'

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Plus, Settings } from 'lucide-react'
import { useLocale, type Locale } from '@/lib/i18n'
import type { MapStyleKey } from '@/types'
import type { UnitSystem } from '@/lib/interpolate'
import ThemeToggle from '@/components/ThemeToggle'

interface TrackToolbarProps {
  mapStyleKey: MapStyleKey
  showSceneEditor: boolean
  locale: Locale
  setLocale: Dispatch<SetStateAction<Locale>> | ((locale: Locale) => void)
  units: UnitSystem
  mode: 'dark' | 'light'
  onUnitsChange: (units: UnitSystem) => void
  onModeChange: (mode: 'dark' | 'light') => void
  onOpenHelp: () => void
  onStartNewTrack: () => void
  onToggleSceneEditor: () => void
  onCycleStyle: () => void
  onOpenExport: () => void
}

export default function TrackToolbar({
  mapStyleKey,
  showSceneEditor,
  locale,
  setLocale,
  units,
  mode,
  onUnitsChange,
  onModeChange,
  onOpenHelp,
  onStartNewTrack,
  onToggleSceneEditor,
  onCycleStyle,
  onOpenExport,
}: TrackToolbarProps) {
  const { t } = useLocale()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      setMenuOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown, { passive: true })
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const runAndCloseMenu = (action: () => void) => {
    action()
    setMenuOpen(false)
  }

  return (
    <div
      data-testid="track-toolbar"
      className={`absolute top-4 right-4 z-10 flex items-center gap-1.5 sm:flex-wrap sm:justify-end sm:gap-2 ${showSceneEditor ? 'sm:right-[18rem] sm:max-w-[calc(100vw-20rem)]' : 'sm:max-w-[calc(100vw-2rem)]'}`}
    >
      <button
        type="button"
        onClick={onStartNewTrack}
        title={t('app.newJourneyAria')}
        className="gi hidden min-h-11 items-center gap-1.5 px-3 py-2 text-sm font-medium cursor-pointer sm:inline-flex"
        style={{ color: 'var(--t1)', boxShadow: '0 0 0 1px rgba(var(--gl),.35), 0 4px 12px rgba(0,0,0,.1)' }}
      >
        <Plus size={14} strokeWidth={2.5} />
        {t('app.new')}
      </button>

      <button
        type="button"
        onClick={onToggleSceneEditor}
        title={t('app.openSceneEditor')}
        className="gi min-h-11 px-2.5 py-2 text-sm font-medium cursor-pointer sm:px-3"
        style={showSceneEditor
          ? { background: 'rgba(var(--gl),.85)', color: '#fff', border: '1px solid rgba(var(--gl),.5)' }
          : { color: 'var(--t1)' }
        }
      >
        {t('app.scenes')}
      </button>

      <button
        type="button"
        data-testid="map-style-button"
        onClick={onCycleStyle}
        title={t('app.cycleMapStyle')}
        className="gi hidden min-h-11 px-3 py-2 text-sm font-medium cursor-pointer sm:inline-flex"
        style={{ color: 'var(--t1)' }}
      >
        {t('app.mapStylePrefix')} {t(`mapStyle.${mapStyleKey}` as 'mapStyle.voyager')}
      </button>

      <button
        type="button"
        onClick={onOpenExport}
        title={t('app.exportVideoKey')}
        className="vitro-btn-primary min-h-11 px-3 py-2 text-sm font-medium cursor-pointer sm:px-4"
      >
        {t('app.export')}
      </button>

      <div className="relative sm:hidden" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={t('app.moreControls')}
          aria-expanded={menuOpen}
          className="gi flex min-h-11 min-w-11 items-center justify-center px-2.5 py-2 text-sm font-medium cursor-pointer sm:px-3"
          style={{ color: 'var(--t1)' }}
        >
          <Settings size={18} strokeWidth={2.5} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            data-testid="track-toolbar-mobile-menu"
            data-disable-playback-hotkeys="true"
            className="gs absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] space-y-3 p-3"
            style={{ borderRadius: 'var(--r-glass)' }}
          >
            <div className="space-y-2">
              <button
                type="button"
                role="menuitem"
                onClick={() => runAndCloseMenu(onStartNewTrack)}
                className="gi flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm font-medium cursor-pointer"
                style={{ color: 'var(--t1)' }}
              >
                <span>{t('app.new')}</span>
                <Plus size={14} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => runAndCloseMenu(onCycleStyle)}
                className="gi flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm font-medium cursor-pointer"
                style={{ color: 'var(--t1)' }}
              >
                <span>{t('app.mapStylePrefix')} {t(`mapStyle.${mapStyleKey}` as 'mapStyle.voyager')}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => runAndCloseMenu(onOpenHelp)}
                className="gi flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm font-medium cursor-pointer"
                style={{ color: 'var(--t1)' }}
              >
                <span>{t('app.help')}</span>
              </button>
            </div>

            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--t4)' }}>
                {t('units.label')}
              </div>
              <div className="gi inline-flex w-full items-center overflow-hidden text-[11px] font-medium" style={{ color: 'var(--t2)' }}>
                <button
                  type="button"
                  onClick={() => onUnitsChange('metric')}
                  className="flex min-h-11 flex-1 items-center justify-center px-2 py-1.5 cursor-pointer"
                  style={units === 'metric' ? { background: 'rgba(var(--gl),.85)', color: '#fff' } : undefined}
                >
                  {t('units.km')}
                </button>
                <button
                  type="button"
                  onClick={() => onUnitsChange('imperial')}
                  className="flex min-h-11 flex-1 items-center justify-center px-2 py-1.5 cursor-pointer"
                  style={units === 'imperial' ? { background: 'rgba(var(--gl),.85)', color: '#fff' } : undefined}
                >
                  {t('units.mi')}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--t4)' }}>
                {t('locale.label')}
              </label>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
                aria-label={t('locale.label')}
                className="vitro-select min-h-11 w-full px-3 py-2 text-sm"
              >
                <option value="en">EN</option>
                <option value="ko">KO</option>
                <option value="ja">JA</option>
                <option value="zh">ZH</option>
                <option value="es">ES</option>
              </select>
            </div>

            <div className="gi flex min-h-11 items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm font-medium" style={{ color: 'var(--t2)' }}>{t('theme.label')}</span>
              <ThemeToggle mode={mode} onModeChange={onModeChange} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
