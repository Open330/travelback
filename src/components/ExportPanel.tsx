'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, ChevronDown, Check, Share2, RotateCcw } from 'lucide-react'
import type { VideoCodec, ExportConfig } from '@/types'
import { CODEC_LABELS, RESOLUTION_PRESETS } from '@/types'
import { isCodecSupported } from '@/lib/videoEncoder'
import { useLocale } from '@/lib/i18n'

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
  onResetExport: () => void
}

export default function ExportPanel({
  isOpen,
  onClose,
  onExport,
  isExporting,
  exportProgress,
  exportState,
  exportedVideoUrl,
  onResetExport,
}: ExportPanelProps) {
  const { t } = useLocale()
  const [resolutionIdx, setResolutionIdx] = useState(0)
  const [codec, setCodec] = useState<VideoCodec>('h264')
  const [fps, setFps] = useState(30)
  const [duration, setDuration] = useState(30)
  const [quality, setQuality] = useState<string>('high')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [codecSupport, setCodecSupport] = useState<Record<VideoCodec, boolean | null>>({
    h264: null, h265: null, av1: null,
  })

  const bitrate = QUALITY_MAP[quality] ?? 8

  // Swipe-down to dismiss (mobile)
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

  // Estimate export time: base = duration * 0.5 for 1080p H.264, scaled by resolution and codec
  const resScale = (() => {
    const px = RESOLUTION_PRESETS[resolutionIdx].width * RESOLUTION_PRESETS[resolutionIdx].height
    if (px <= 921600) return 0.6   // 720p or smaller
    if (px <= 2073600) return 1.0  // 1080p
    return 3.0                      // 4K
  })()
  const codecScale = codec === 'av1' ? 2.5 : codec === 'h265' ? 1.5 : 1.0
  const estimatedSeconds = Math.round(duration * 0.5 * resScale * codecScale)

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
    const safeDuration = Math.max(5, Math.min(duration, 600))
    const safeBitrate = Math.max(1, Math.min(bitrate, 50))
    onExport({ resolution, codec, fps, duration: safeDuration, bitrate: safeBitrate, scenes: [] })
  }, [onExport, resolutionIdx, codec, fps, duration, bitrate])

  const handleShare = useCallback(async () => {
    if (!exportedVideoUrl) return
    try {
      const response = await fetch(exportedVideoUrl)
      const blob = await response.blob()
      const file = new File([blob], 'travelback.mp4', { type: 'video/mp4' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Travelback' })
      }
    } catch {
      // User cancelled or share not supported
    }
  }, [exportedVideoUrl])

  if (!isOpen) return null

  // Determine platform tip based on resolution
  const platformTip = (() => {
    const r = RESOLUTION_PRESETS[resolutionIdx]
    if (r.width === 1080 && r.height === 1920) return t('export.tipTikTok')
    if (r.width === 1080 && (r.height === 1080 || r.height === 1350)) return t('export.tipInstagram')
    return t('export.tipYouTube')
  })()

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="go p-6 w-full max-w-md mx-4" style={{ borderRadius: 'var(--r-glass)' }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold" style={{ color: 'var(--t1)' }}>{t('export.title')}</h3>
          {!isExporting && (
            <button onClick={onClose}
              className="cursor-pointer" style={{ color: 'var(--t4)' }}>
              <X size={20} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Success screen */}
        {exportState === 'done' ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(var(--gl),.15)' }}>
              <Check size={32} strokeWidth={2.5} style={{ color: 'rgb(var(--gl))' }} />
            </div>
            <h4 className="text-lg font-bold mb-1" style={{ color: 'var(--t1)' }}>
              {t('export.success')}
            </h4>
            <p className="text-sm mb-4" style={{ color: 'var(--t3)' }}>
              {t('export.savedToDownloads')}
            </p>

            {/* Video preview */}
            {exportedVideoUrl && (
              <div className="mb-4 rounded-lg overflow-hidden" style={{ border: '1px solid var(--div)' }}>
                <video src={exportedVideoUrl} controls playsInline preload="metadata" className="block w-full bg-black" style={{ maxHeight: '200px' }} />
              </div>
            )}

            {/* Platform tip */}
            <div className="gi p-3 mb-4 text-xs text-left" style={{ borderRadius: '10px', color: 'var(--t3)' }}>
              💡 {platformTip}
            </div>

            <div className="flex gap-2">
              <button onClick={onResetExport}
                className="flex-1 gi px-4 py-2.5 text-sm font-medium cursor-pointer inline-flex items-center justify-center gap-1.5"
                style={{ color: 'var(--t1)' }}>
                <RotateCcw size={14} strokeWidth={2} />
                {t('export.exportAgain')}
              </button>
              {canShare && exportedVideoUrl && (
                <button onClick={handleShare}
                  className="vitro-btn-primary px-4 py-2.5 text-sm font-medium cursor-pointer inline-flex items-center gap-1.5">
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
                  {RESOLUTION_PRESETS.map((_r, i) => (
                    <option key={i} value={i}>{t(RESOLUTION_KEYS[i] as 'resolution.youtube')}</option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="vitro-label block text-sm font-medium mb-1">{t('export.duration')}</label>
                <input type="number" min={5} max={600} value={duration}
                  onChange={e => setDuration(Math.max(5, Math.min(600, parseInt(e.target.value) || 30)))}
                  className="vitro-input w-full px-3 py-2 text-sm" />
              </div>

              {/* Quality */}
              <div>
                <label className="vitro-label block text-sm font-medium mb-1">{t('export.quality')}</label>
                <select value={quality}
                  onChange={e => setQuality(e.target.value)}
                  className="vitro-select w-full px-3 py-2 text-sm">
                  <option value="low">{t('export.qualityLow')}</option>
                  <option value="medium">{t('export.qualityMedium')}</option>
                  <option value="high">{t('export.qualityHigh')}</option>
                  <option value="maximum">{t('export.qualityMaximum')}</option>
                </select>
              </div>

              {/* Advanced toggle */}
              <button
                onClick={() => setShowAdvanced(v => !v)}
                className="text-xs inline-flex items-center gap-1 cursor-pointer"
                style={{ color: 'var(--t4)' }}
              >
                <ChevronDown size={12} strokeWidth={2} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                {t('export.advanced')}
              </button>

              {showAdvanced && (
                <div className="space-y-4 pt-1">
                  {/* Codec */}
                  <div>
                    <label className="vitro-label block text-sm font-medium mb-1">{t('export.codec')}</label>
                    <select value={codec}
                      onChange={e => setCodec(e.target.value as VideoCodec)}
                      className="vitro-select w-full px-3 py-2 text-sm">
                      {(Object.entries(CODEC_LABELS) as [VideoCodec, string][]).map(([k]) => (
                        <option key={k} value={k} disabled={codecSupport[k] === false}>
                          {t(`codec.${k}Desc` as 'codec.h264Desc' | 'codec.h265Desc' | 'codec.av1Desc')}{codecSupport[k] === false ? ` ${t('export.unsupported')}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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
                        className="vitro-input w-full px-3 py-2 text-sm"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs mb-2" style={{ color: 'var(--t4)' }}>
              {t('export.output')} {RESOLUTION_PRESETS[resolutionIdx].width}×{RESOLUTION_PRESETS[resolutionIdx].height} MP4
              {showAdvanced && <> ({CODEC_LABELS[codec]}) {t('export.at')} {bitrate} Mbps</>}
              {' '}· ~{((bitrate * duration) / 8).toFixed(0)} MB
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--t4)' }}>
              {t('export.estimatedTime')}{' '}
              {estimatedSeconds >= 60
                ? t('export.minutes').replace('{n}', String(Math.round(estimatedSeconds / 60)))
                : t('export.seconds').replace('{n}', String(estimatedSeconds))}
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
