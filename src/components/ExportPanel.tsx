'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, ChevronDown, Check, Share2, RotateCcw } from 'lucide-react'
import type { VideoCodec, ExportConfig } from '@/types'
import { CODEC_LABELS, RESOLUTION_PRESETS, EXPORT_LIMITS } from '@/types'
import { isCodecSupported } from '@/lib/videoEncoder'
import { useLocale } from '@/lib/i18n'
import ModalDialog from '@/components/ModalDialog'

type ExportState = 'idle' | 'exporting' | 'done'

const QUALITY_MAP: Record<string, number> = {
  low: 2,
  medium: 5,
  high: 8,
  maximum: 20,
}

const RESOLUTION_KEYS = [
  'resolution.youtube',
  'resolution.tiktok',
  'resolution.instagramSquare',
  'resolution.instagramPost',
  'resolution.hd',
  'resolution.4k',
  'resolution.4kPortrait',
] as const

interface ExportPanelProps {
  isOpen: boolean
  onClose: () => void
  onExport: (config: ExportConfig) => void
  isExporting: boolean
  exportProgress: number
  exportState: ExportState
  exportedVideoUrl?: string | null
  exportedVideoBlob?: Blob | null
  onResetExport: () => void
  playbackDuration?: number
}

export default function ExportPanel({
  isOpen,
  onClose,
  onExport,
  isExporting,
  exportProgress,
  exportState,
  exportedVideoUrl,
  exportedVideoBlob,
  onResetExport,
  playbackDuration,
}: ExportPanelProps) {
  const { t } = useLocale()
  const [resolutionIdx, setResolutionIdx] = useState(0)
  const [codec, setCodec] = useState<VideoCodec>('h264')
  const [fps, setFps] = useState(30)
  const [duration, setDuration] = useState(playbackDuration ?? 30)

  useEffect(() => {
    if (playbackDuration != null) setDuration(playbackDuration)
  }, [playbackDuration])
  const [quality, setQuality] = useState<string>('high')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [codecSupport, setCodecSupport] = useState<Record<VideoCodec, boolean | null>>({
    h264: null, h265: null, av1: null,
  })

  const bitrate = QUALITY_MAP[quality] ?? 8

  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || isExporting) return
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    touchStartRef.current = null
    if (dy > 80 && Math.abs(dx) < Math.abs(dy)) onClose()
  }, [onClose, isExporting])

  const resScale = (() => {
    const px = RESOLUTION_PRESETS[resolutionIdx].width * RESOLUTION_PRESETS[resolutionIdx].height
    if (px <= 921600) return 0.6
    if (px <= 2073600) return 1.0
    return 3.0
  })()
  const codecScale = codec === 'av1' ? 2.5 : codec === 'h265' ? 1.5 : 1.0
  const estimatedSeconds = Math.round(duration * 0.5 * resScale * codecScale)

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
    if (codecSupport[codec] === false) return
    const resolution = RESOLUTION_PRESETS[resolutionIdx]
    const safeDuration = Math.max(EXPORT_LIMITS.duration.min, Math.min(duration, EXPORT_LIMITS.duration.max))
    const safeBitrate = Math.max(EXPORT_LIMITS.bitrate.min, Math.min(bitrate, EXPORT_LIMITS.bitrate.max))
    onExport({ resolution, codec, fps, duration: safeDuration, bitrate: safeBitrate, scenes: [] })
  }, [onExport, resolutionIdx, codec, fps, duration, bitrate, codecSupport])

  const handleShare = useCallback(async () => {
    if (!exportedVideoBlob) return
    try {
      const file = new File([exportedVideoBlob], 'travelback.mp4', { type: 'video/mp4' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Travelback' })
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error('Share failed:', err instanceof Error ? err.message : 'Unknown error')
    }
  }, [exportedVideoBlob])

  if (!isOpen) return null

  const platformTip = (() => {
    const r = RESOLUTION_PRESETS[resolutionIdx]
    if (r.width === 1080 && r.height === 1920) return t('export.tipTikTok')
    if (r.width === 1080 && (r.height === 1080 || r.height === 1350)) return t('export.tipInstagram')
    return t('export.tipYouTube')
  })()

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <ModalDialog
      open={isOpen}
      onClose={isExporting ? () => undefined : onClose}
      labelledBy="export-panel-title"
      overlayClassName="z-30 flex items-center justify-center bg-black/35 backdrop-blur-md"
      panelClassName="go mx-4 w-full max-w-md max-h-[min(90vh,42rem)] overflow-y-auto p-6"
      closeOnBackdrop={!isExporting}
    >
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} data-disable-playback-hotkeys="true">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3 id="export-panel-title" className="text-lg font-bold" style={{ color: 'var(--t1)' }}>
            {t('export.title')}
          </h3>
          {!isExporting && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('app.closePanel')}
              className="flex h-11 w-11 items-center justify-center rounded-full cursor-pointer"
              style={{ color: 'var(--t4)' }}
            >
              <X size={20} strokeWidth={2} />
            </button>
          )}
        </div>

        {exportState === 'done' ? (
          <div className="text-center">
            <div className="export-checkmark mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(var(--gl),.15)' }}>
              <Check size={32} strokeWidth={2.5} style={{ color: 'rgb(var(--gl))' }} />
            </div>
            <h4 className="mb-1 text-lg font-bold" style={{ color: 'var(--t1)' }}>
              {t('export.success')}
            </h4>
            <p className="mb-4 text-sm" style={{ color: 'var(--t3)' }}>
              {t('export.savedToDownloads')}
            </p>

            {exportedVideoUrl && (
              <div className="mb-4 overflow-hidden rounded-lg" style={{ border: '1px solid var(--div)' }}>
                <video src={exportedVideoUrl} controls playsInline preload="metadata" className="block w-full bg-black" style={{ maxHeight: '200px' }} />
              </div>
            )}

            <div className="gi mb-4 p-3 text-left text-xs" style={{ borderRadius: '10px', color: 'var(--t3)' }}>
              💡 {platformTip}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onResetExport}
                className="gi inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium cursor-pointer"
                style={{ color: 'var(--t1)' }}
              >
                <RotateCcw size={14} strokeWidth={2} />
                {t('export.exportAgain')}
              </button>
              {canShare && exportedVideoUrl && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="vitro-btn-primary inline-flex min-h-11 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium cursor-pointer"
                >
                  <Share2 size={14} strokeWidth={2} />
                  {t('export.share')}
                </button>
              )}
            </div>
          </div>
        ) : isExporting ? (
          <div>
            <div className="mb-2 text-sm" style={{ color: 'var(--t3)' }}>
              {t('export.rendering')} {Math.round(exportProgress * 100)}%
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full" style={{ background: 'var(--div)' }}>
              <div className="h-full rounded-full" style={{ width: `${exportProgress * 100}%`, background: 'rgb(var(--gl))', transition: 'width .3s linear' }} />
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--t4)' }}>
              {t('export.frame')} {Math.round(exportProgress * Math.ceil(duration * fps))} / {Math.ceil(duration * fps)}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-4">
              <div>
                <label className="vitro-label mb-1 block text-sm font-medium">{t('export.resolution')}</label>
                <select value={resolutionIdx} onChange={e => setResolutionIdx(parseInt(e.target.value))} className="vitro-select min-h-11 w-full px-3 py-2 text-sm">
                  {RESOLUTION_PRESETS.map((_r, i) => (
                    <option key={i} value={i}>{t(RESOLUTION_KEYS[i] as 'resolution.youtube')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="vitro-label mb-1 block text-sm font-medium">{t('export.duration')}</label>
                <input
                  type="number"
                  min={5}
                  max={600}
                  value={duration}
                  onChange={e => setDuration(Math.max(5, Math.min(600, parseInt(e.target.value) || 30)))}
                  className="vitro-input min-h-11 w-full px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="vitro-label mb-1 block text-sm font-medium">{t('export.quality')}</label>
                <select value={quality} onChange={e => setQuality(e.target.value)} className="vitro-select min-h-11 w-full px-3 py-2 text-sm">
                  <option value="low">{t('export.qualityLow')}</option>
                  <option value="medium">{t('export.qualityMedium')}</option>
                  <option value="high">{t('export.qualityHigh')}</option>
                  <option value="maximum">{t('export.qualityMaximum')}</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="inline-flex min-h-11 items-center gap-2 px-1 text-sm cursor-pointer"
                style={{ color: 'var(--t4)' }}
                aria-expanded={showAdvanced}
              >
                <ChevronDown size={14} strokeWidth={2} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                {t('export.advanced')}
              </button>

              {showAdvanced && (
                <div className="space-y-4 pt-1">
                  <div>
                    <label className="vitro-label mb-1 block text-sm font-medium">{t('export.codec')}</label>
                    <select value={codec} onChange={e => setCodec(e.target.value as VideoCodec)} className="vitro-select min-h-11 w-full px-3 py-2 text-sm">
                      {(Object.entries(CODEC_LABELS) as [VideoCodec, string][]).map(([k]) => (
                        <option key={k} value={k} disabled={codecSupport[k] === false}>
                          {t(`codec.${k}Desc` as 'codec.h264Desc' | 'codec.h265Desc' | 'codec.av1Desc')}{codecSupport[k] === false ? ` ${t('export.unsupported')}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="vitro-label mb-1 block text-sm font-medium">{t('export.fps')}</label>
                      <select value={fps} onChange={e => setFps(parseInt(e.target.value))} className="vitro-select min-h-11 w-full px-3 py-2 text-sm">
                        <option value={24}>24</option>
                        <option value={30}>30</option>
                        <option value={60}>60</option>
                      </select>
                    </div>
                    <div>
                      <label className="vitro-label mb-1 block text-sm font-medium">{t('export.mbps')}</label>
                      <input type="number" min={1} max={50} value={bitrate} className="vitro-input min-h-11 w-full px-3 py-2 text-sm opacity-60 cursor-not-allowed" readOnly />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="mb-2 text-xs" style={{ color: 'var(--t4)' }}>
              {t('export.output')} {RESOLUTION_PRESETS[resolutionIdx].width}×{RESOLUTION_PRESETS[resolutionIdx].height} MP4
              {showAdvanced && <> ({CODEC_LABELS[codec]}) {t('export.at')} {bitrate} Mbps</>}
              {' '}· ~{((bitrate * duration) / 8).toFixed(0)} MB
            </p>
            <p className="mb-4 text-xs" style={{ color: 'var(--t4)' }}>
              {t('export.estimatedTime')}{' '}
              {estimatedSeconds >= 60
                ? t('export.minutes').replace('{n}', String(Math.round(estimatedSeconds / 60)))
                : t('export.seconds').replace('{n}', String(estimatedSeconds))}
            </p>

            <button type="button" onClick={handleExport} className="vitro-btn-primary min-h-11 w-full py-3 font-medium cursor-pointer">
              {t('export.startExport')}
            </button>
          </>
        )}
      </div>
    </ModalDialog>
  )
}
