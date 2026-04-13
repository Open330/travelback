'use client'

import { Plus } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import type { MapStyleKey } from '@/types'

interface TrackToolbarProps {
  mapStyleKey: MapStyleKey
  showSceneEditor: boolean
  onStartNewTrack: () => void
  onToggleSceneEditor: () => void
  onCycleStyle: () => void
  onOpenExport: () => void
}

export default function TrackToolbar({
  mapStyleKey,
  showSceneEditor,
  onStartNewTrack,
  onToggleSceneEditor,
  onCycleStyle,
  onOpenExport,
}: TrackToolbarProps) {
  const { t } = useLocale()

  return (
    <div data-testid="track-toolbar" className="absolute left-4 right-4 top-20 z-10 flex flex-wrap justify-end gap-2 sm:left-auto sm:right-[8rem] sm:top-4 sm:max-w-[calc(100vw-16rem)]">
      <button
        onClick={onStartNewTrack}
        aria-label={t('app.newJourneyAria')}
        title={t('app.newJourneyAria')}
        className="gi px-3 py-2 text-sm font-medium cursor-pointer"
        style={{ color: 'var(--t1)', boxShadow: '0 0 0 1px rgba(var(--gl),.35), 0 4px 12px rgba(0,0,0,.1)' }}
      >
        <Plus size={14} strokeWidth={2.5} className="inline -mt-px" />{' '}{t('app.new')}
      </button>
      <button
        onClick={onToggleSceneEditor}
        title={t('app.openSceneEditor')}
        className="gi px-3 py-2 text-sm font-medium cursor-pointer"
        style={showSceneEditor
          ? { background: 'rgba(var(--gl),.85)', color: '#fff', border: '1px solid rgba(var(--gl),.5)' }
          : { color: 'var(--t1)' }
        }
      >
        {t('app.scenes')}
      </button>
      <button
        data-testid="map-style-button"
        onClick={onCycleStyle}
        title={t('app.cycleMapStyle')}
        className="gi px-3 py-2 text-sm font-medium cursor-pointer"
        style={{ color: 'var(--t1)' }}
      >
        {t('app.mapStylePrefix')} {t(`mapStyle.${mapStyleKey}` as 'mapStyle.voyager')}
      </button>
      <button
        onClick={onOpenExport}
        title={t('app.exportVideoKey')}
        className="vitro-btn-primary px-4 py-2 text-sm font-medium cursor-pointer"
      >
        {t('app.export')}
      </button>
    </div>
  )
}
