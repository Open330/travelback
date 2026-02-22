'use client'

import { useState, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import type { VideoCodec, ExportConfig, ResolutionPreset } from '@/types'
import { CODEC_LABELS, RESOLUTION_PRESETS } from '@/types'
import { isCodecSupported } from '@/lib/videoEncoder'
import { useLocale } from '@/lib/i18n'

interface ExportPanelProps {
  isOpen: boolean
  onClose: () => void
  onExport: (config: ExportConfig) => void
  isExporting: boolean
  exportProgress: number
}

export default function ExportPanel({
  isOpen,
  onClose,
  onExport,
  isExporting,
  exportProgress,
}: ExportPanelProps) {
  const { t } = useLocale()
  const [resolutionIdx, setResolutionIdx] = useState(0)
  const [codec, setCodec] = useState<VideoCodec>('h264')
  const [fps, setFps] = useState(30)
  const [duration, setDuration] = useState(30)
  const [bitrate, setBitrate] = useState(8)
  const [codecSupport, setCodecSupport] = useState<Record<VideoCodec, boolean | null>>({
    h264: null, h265: null, av1: null,
  })

  // Check codec support on mount
  useEffect(() => {
    let cancelled = false
    const checkAll = async () => {
      const codecs: VideoCodec[] = ['h264', 'h265', 'av1']
      const results: Record<string, boolean> = {}
      for (const c of codecs) {
        try {
          results[c] = await isCodecSupported(c)
        } catch {
          results[c] = false
        }
      }
      if (!cancelled) {
        setCodecSupport(results as Record<VideoCodec, boolean>)
      }
    }
    checkAll()
    return () => { cancelled = true }
  }, [])

  const handleExport = useCallback(() => {
    const resolution = RESOLUTION_PRESETS[resolutionIdx]
    onExport({ resolution, codec, fps, duration, bitrate, scenes: [] })
  }, [onExport, resolutionIdx, codec, fps, duration, bitrate])

  if (!isOpen) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="go p-6 w-full max-w-md mx-4" style={{ borderRadius: 'var(--r-glass)' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold" style={{ color: 'var(--t1)' }}>{t('export.title')}</h3>
          {!isExporting && (
            <button onClick={onClose}
              className="cursor-pointer" style={{ color: 'var(--t4)' }}>
              <X size={20} strokeWidth={2} />
            </button>
          )}
        </div>

        {isExporting ? (
          <div>
            <div className="mb-2 text-sm" style={{ color: 'var(--t3)' }}>
              {t('export.rendering')} {Math.round(exportProgress * 100)}%
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--div)' }}>
              <div className="h-full rounded-full transition-all duration-200"
                style={{ width: `${exportProgress * 100}%`, background: 'rgb(var(--gl))' }} />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--t4)' }}>
              {t('export.frame')} {Math.round(exportProgress * Math.ceil(duration * fps))} / {Math.ceil(duration * fps)}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {/* Resolution */}
              <div>
                <label className="vitro-label block text-sm font-medium mb-1">{t('export.resolution')}</label>
                <select value={resolutionIdx}
                  onChange={e => setResolutionIdx(parseInt(e.target.value))}
                  className="vitro-select w-full px-3 py-2 text-sm">
                  {RESOLUTION_PRESETS.map((r, i) => (
                    <option key={i} value={i}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Codec */}
              <div>
                <label className="vitro-label block text-sm font-medium mb-1">{t('export.codec')}</label>
                <select value={codec}
                  onChange={e => setCodec(e.target.value as VideoCodec)}
                  className="vitro-select w-full px-3 py-2 text-sm">
                  {(Object.entries(CODEC_LABELS) as [VideoCodec, string][]).map(([k, v]) => (
                    <option key={k} value={k} disabled={codecSupport[k] === false}>
                      {v}{codecSupport[k] === false ? ` ${t('export.unsupported')}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Duration */}
                <div>
                  <label className="vitro-label block text-sm font-medium mb-1">{t('export.duration')}</label>
                  <input type="number" min={5} max={600} value={duration}
                    onChange={e => setDuration(parseInt(e.target.value) || 30)}
                    className="vitro-input w-full px-3 py-2 text-sm" />
                </div>
                {/* FPS */}
                <div>
                  <label className="vitro-label block text-sm font-medium mb-1">{t('export.fps')}</label>
                  <select value={fps} onChange={e => setFps(parseInt(e.target.value))}
                    className="vitro-select w-full px-3 py-2 text-sm">
                    <option value={24}>24</option>
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                  </select>
                </div>
                {/* Bitrate */}
                <div>
                  <label className="vitro-label block text-sm font-medium mb-1">{t('export.mbps')}</label>
                  <input type="number" min={1} max={50} value={bitrate}
                    onChange={e => setBitrate(parseInt(e.target.value) || 8)}
                    className="vitro-input w-full px-3 py-2 text-sm" />
                </div>
              </div>
            </div>

            <p className="text-xs mb-4" style={{ color: 'var(--t4)' }}>
              {t('export.output')} {RESOLUTION_PRESETS[resolutionIdx].width}×{RESOLUTION_PRESETS[resolutionIdx].height} MP4
              ({CODEC_LABELS[codec]}) {t('export.at')} {bitrate} Mbps · ~{((bitrate * duration) / 8).toFixed(0)} MB
            </p>

            <button onClick={handleExport}
              className="vitro-btn-primary w-full py-3 font-medium cursor-pointer">
              {t('export.startExport')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
