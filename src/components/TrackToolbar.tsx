'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Plus, Settings } from 'lucide-react'
import { useLocale, type Locale } from '@/lib/i18n'
import type { MapStyleKey } from '@/types'
import type { UnitSystem } from '@/lib/interpolate'
import ThemeToggle from '@/components/ThemeToggle'

// Reusable focus-first-button effect for menu panels
function useFocusFirstOnOpen(isOpen: boolean, panelRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.querySelector<HTMLButtonElement>('button')?.focus()
    }
  }, [isOpen, panelRef])
}

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
  onOpenImportGuide: () => void
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
  onOpenImportGuide,
  onStartNewTrack,
  onToggleSceneEditor,
  onCycleStyle,
  onOpenExport,
}: TrackToolbarProps) {
  const { t } = useLocale()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuPanelRef = useRef<HTMLDivElement | null>(null)
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const sceneEditorTriggerRef = useRef<HTMLButtonElement | null>(null)
  const wasSceneEditorOpenRef = useRef(showSceneEditor)
  useFocusFirstOnOpen(menuOpen, menuPanelRef)

  useEffect(() => {
    const didClose = wasSceneEditorOpenRef.current && !showSceneEditor
    wasSceneEditorOpenRef.current = showSceneEditor
    if (!didClose || document.activeElement === sceneEditorTriggerRef.current) return

    const frame = requestAnimationFrame(() => {
      sceneEditorTriggerRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [showSceneEditor])

  const closeMenu = useCallback((restoreFocus = true) => {
    setMenuOpen(false)
    if (restoreFocus) {
      requestAnimationFrame(() => menuTriggerRef.current?.focus({ preventScroll: true }))
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      closeMenu(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const target = event.target instanceof Element ? event.target : null
        if (target?.closest('[role="dialog"][aria-modal="true"]')) return
        event.preventDefault()
        event.stopPropagation()
        closeMenu()
        return
      }
      // Focus trap: keep Tab/Shift+Tab within the menu panel
      if (event.key === 'Tab' && menuPanelRef.current) {
        const focusable = menuPanelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('mousedown', handlePointerDown, { passive: true })
    document.addEventListener('touchstart', handlePointerDown, { passive: true })
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeMenu, menuOpen])

  const runAndCloseMenu = (action: () => void) => {
    action()
    closeMenu()
  }

  const runModalActionFromMenu = (action: () => void) => {
    closeMenu(false)
    requestAnimationFrame(() => {
      menuTriggerRef.current?.focus({ preventScroll: true })
      action()
    })
  }

  return (
    <div
      data-testid="track-toolbar"
      className={`absolute top-4 right-4 z-20 flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 ${showSceneEditor ? 'sm:right-[20rem] sm:max-w-[calc(100vw-22rem)]' : 'sm:max-w-[calc(100vw-2rem)]'}`}
      style={{ rowGap: '0.375rem' }}
    >
      <button
        type="button"
        onClick={onStartNewTrack}
        title={t('app.newJourneyAria')}
        className="gi hidden shrink-0 min-h-11 items-center gap-1.5 px-3 py-2 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))] sm:inline-flex"
        style={{ color: 'var(--t1)', boxShadow: '0 0 0 1px rgba(var(--gl),.35), 0 4px 12px rgba(0,0,0,.1)' }}
      >
        <Plus size={14} strokeWidth={2.5} />
        {t('app.new')}
      </button>

      <button
        ref={sceneEditorTriggerRef}
        type="button"
        onClick={onToggleSceneEditor}
        title={t('app.openSceneEditor')}
        className="gi shrink-0 min-h-11 px-2.5 py-2 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))] sm:px-3"
        style={showSceneEditor
          ? { background: 'rgba(var(--gl),.85)', color: 'var(--gl-fg)', border: '1px solid rgba(var(--gl),.5)' }
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
        className="gi hidden shrink-0 min-h-11 px-3 py-2 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))] sm:inline-flex"
        style={{ color: 'var(--t1)' }}
      >
        {t('app.mapStylePrefix')} {t(`mapStyle.${mapStyleKey}` as 'mapStyle.voyager')}
      </button>

      <button
        type="button"
        data-testid="desktop-keyboard-help"
        onClick={onOpenHelp}
        aria-label={t('shortcuts.title')}
        title={t('shortcuts.title')}
        className="gi hidden shrink-0 min-h-11 items-center px-3 py-2 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))] sm:inline-flex"
        style={{ color: 'var(--t1)' }}
      >
        {t('app.help')}
      </button>

      <button
        type="button"
        onClick={onOpenExport}
        title={t('app.exportVideoKey')}
        className="vitro-btn-primary shrink-0 min-h-11 px-3 py-2 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))] sm:px-4"
      >
        {t('app.export')}
      </button>

      <div className="relative sm:hidden" ref={menuRef}>
          <button
            ref={menuTriggerRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={t('app.moreControls')}
            aria-expanded={menuOpen}
            aria-controls="track-toolbar-mobile-menu"
            aria-haspopup="dialog"
          className="gi flex min-h-11 min-w-11 items-center justify-center px-2.5 py-2 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))] sm:px-3"
          style={{ color: 'var(--t1)' }}
        >
          <Settings size={18} strokeWidth={2.5} />
        </button>

        {menuOpen && (
          <div
              ref={menuPanelRef}
              id="track-toolbar-mobile-menu"
              role="dialog"
              aria-labelledby="track-toolbar-mobile-menu-title"
            data-testid="track-toolbar-mobile-menu"
            data-disable-playback-hotkeys="true"
            className="gs absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] space-y-3 p-3"
            style={{ borderRadius: 'var(--r-glass)' }}
            // Keep menuRef on the wrapper for outside-click detection; focus uses
            // this panel ref so the first popup action receives focus on open.
          >
            <h2 id="track-toolbar-mobile-menu-title" className="sr-only">{t('app.moreControls')}</h2>
            <div className="space-y-2">
              <button
                    type="button"
                onClick={() => runAndCloseMenu(onStartNewTrack)}
                className="gi flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
                style={{ color: 'var(--t1)' }}
              >
                <span>{t('app.new')}</span>
                <Plus size={14} strokeWidth={2.5} />
              </button>
              <button
                    type="button"
                onClick={() => runAndCloseMenu(onCycleStyle)}
                className="gi flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
                style={{ color: 'var(--t1)' }}
              >
                <span>{t('app.mapStylePrefix')} {t(`mapStyle.${mapStyleKey}` as 'mapStyle.voyager')}</span>
              </button>
              <button
                    type="button"
                onClick={() => runModalActionFromMenu(onOpenImportGuide)}
                className="gi flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
                style={{ color: 'var(--t1)' }}
              >
                <span>{t('fileUpload.importGuideLink')}</span>
              </button>
              <button
                    type="button"
                onClick={() => runModalActionFromMenu(onOpenHelp)}
                className="gi flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
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
                    aria-pressed={units === 'metric'}
                    aria-label={t('units.metric')}
                    title={t('units.metric')}
                    onClick={() => onUnitsChange('metric')}
                  className="segmented-unit-button flex min-h-11 flex-1 items-center justify-center px-2 py-1.5 cursor-pointer"
                  style={units === 'metric' ? { background: 'rgba(var(--gl),.85)', color: 'var(--gl-fg)' } : undefined}
                >
                  {t('units.km')}
                </button>
                  <button
                    type="button"
                    aria-pressed={units === 'imperial'}
                    aria-label={t('units.imperial')}
                    title={t('units.imperial')}
                    onClick={() => onUnitsChange('imperial')}
                  className="segmented-unit-button flex min-h-11 flex-1 items-center justify-center px-2 py-1.5 cursor-pointer"
                  style={units === 'imperial' ? { background: 'rgba(var(--gl),.85)', color: 'var(--gl-fg)' } : undefined}
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
