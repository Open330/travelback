'use client'

import { useState, useCallback, useEffect, useId, useRef, useMemo } from 'react'
import { X, ChevronDown, Check, Share2, RotateCcw, Download } from 'lucide-react'
import type { VideoCodec, ExportRequest } from '@/types'
import { CODEC_LABELS, RESOLUTION_PRESETS, EXPORT_LIMITS } from '@/types'
import { estimateEncodedBytes, estimateExportMemoryBytes, isCodecSupported, MAX_IN_MEMORY_EXPORT_BYTES } from '@/lib/videoEncoder'
import { useLocale, type TranslationKey } from '@/lib/i18n'
import ModalDialog from '@/components/ModalDialog'
import type { DownloadMethod, ExportState } from '@/lib/useExportController'
import { isLocalExportTestStubEnabled } from '@/lib/test-stub'

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
] as const

const COMPLETION_HEADING_KEYS: Record<DownloadMethod, TranslationKey> = {
  picker: 'export.success',
  fallback: 'export.downloadStarted',
  ready: 'export.ready',
}

const COMPLETION_DESCRIPTION_KEYS: Record<DownloadMethod, TranslationKey> = {
  picker: 'export.videoSaved',
  fallback: 'export.savedToDownloads',
  ready: 'export.readyDescription',
}

function clampExportDuration(value: number): number {
  return Math.max(EXPORT_LIMITS.duration.min, Math.min(value, EXPORT_LIMITS.duration.max))
}

function parseExportDurationDraft(value: string): number | null {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) return null
  const parsed = Number(normalized)
  if (
    !Number.isSafeInteger(parsed)
    || parsed < EXPORT_LIMITS.duration.min
    || parsed > EXPORT_LIMITS.duration.max
  ) {
    return null
  }
  return parsed
}

/** Cache for codec support results — scoped to component state so it
 *  re-probes after browser updates that add/remove codec support. */
const initialCodecSupport: Record<VideoCodec, boolean | null> = { h264: null, h265: null, av1: null }

interface CodecSupportState {
  configKey: string | null
  results: Record<VideoCodec, boolean | null>
}

interface ExportPanelProps {
  isOpen: boolean
  onClose: () => void
  onExport: (config: ExportRequest) => void
  isExporting: boolean
  exportProgress: number
  exportState: ExportState
  exportedVideoUrl?: string | null
  exportedVideoBlob?: Blob | null
  exportedVideoFilename?: string | null
  downloadMethod?: DownloadMethod | null
  onResetExport: () => void
  onCancelExport: () => void
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
  exportedVideoFilename,
  downloadMethod,
  onResetExport,
  onCancelExport,
  playbackDuration,
}: ExportPanelProps) {
  const { t } = useLocale()
  const completionMethod = downloadMethod ?? 'ready'
  const formId = useId()
  const resolutionId = `${formId}-resolution`
  const durationId = `${formId}-duration`
  const durationErrorId = `${formId}-duration-error`
  const qualityId = `${formId}-quality`
  const codecId = `${formId}-codec`
  const fpsId = `${formId}-fps`
  const bitrateId = `${formId}-bitrate`
  const [resolutionIdx, setResolutionIdx] = useState(1)
  const [codec, setCodec] = useState<VideoCodec>('h264')
  const [fps, setFps] = useState(30)
  const [duration, setDuration] = useState(() => clampExportDuration(playbackDuration ?? 30))
  const [durationDraft, setDurationDraft] = useState(() => String(clampExportDuration(playbackDuration ?? 30)))
  const [durationError, setDurationError] = useState(false)
  const durationInputRef = useRef<HTMLInputElement>(null)
  const panelOpenedRef = useRef(false)
  const cancelExportButtonRef = useRef<HTMLButtonElement>(null)
  const idleHeadingRef = useRef<HTMLHeadingElement>(null)
  const successHeadingRef = useRef<HTMLHeadingElement>(null)
  const wasExportingRef = useRef(isExporting)
  const previousExportStateRef = useRef(exportState)
  useEffect(() => {
    if (isOpen) {
      if (!panelOpenedRef.current && playbackDuration != null) {
        const nextDuration = clampExportDuration(playbackDuration)
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentionally sync derived state from prop once on panel open
        setDuration(nextDuration)
        setDurationDraft(String(nextDuration))
        setDurationError(false)
      }
      panelOpenedRef.current = true
    } else {
      panelOpenedRef.current = false
    }
  }, [isOpen, playbackDuration])
  const [quality, setQuality] = useState<string>('high')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [codecSupport, setCodecSupport] = useState<CodecSupportState>({
    configKey: null,
    results: initialCodecSupport,
  })

  const selectedResolution = RESOLUTION_PRESETS[resolutionIdx] ?? RESOLUTION_PRESETS[0]
  const bitrate = QUALITY_MAP[quality] ?? 8
  const safeDuration = clampExportDuration(duration)
  const safeBitrate = Math.max(EXPORT_LIMITS.bitrate.min, Math.min(bitrate, EXPORT_LIMITS.bitrate.max))
  const codecConfigKey = `${selectedResolution.width}x${selectedResolution.height}@${safeBitrate}`
  const currentCodecSupport = codecSupport.configKey === codecConfigKey
    ? codecSupport.results
    : initialCodecSupport
  const estimatedOutputBytes = estimateEncodedBytes(safeDuration, safeBitrate)
  const estimatedOutputMb = estimatedOutputBytes / 1024 / 1024
  const estimatedMemoryBytes = estimateExportMemoryBytes({
    resolution: selectedResolution,
    duration: safeDuration,
    fps,
    bitrate: safeBitrate,
  })
  const estimatedMemoryMb = estimatedMemoryBytes / 1024 / 1024
  const localExportTestStubEnabled = isLocalExportTestStubEnabled()
  const exportTooLarge = estimatedOutputBytes > MAX_IN_MEMORY_EXPORT_BYTES || estimatedMemoryBytes > MAX_IN_MEMORY_EXPORT_BYTES
  const codecStatus = currentCodecSupport[codec]
  const codecPending = codecStatus == null && !localExportTestStubEnabled
  const codecUnavailable = codecStatus === false && !localExportTestStubEnabled
  const canStartExport = !codecPending && !codecUnavailable && !exportTooLarge

  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const clearTouchStart = useCallback(() => {
    touchStartRef.current = null
  }, [])
  const handleClose = useCallback(() => {
    clearTouchStart()
    onClose()
  }, [clearTouchStart, onClose])
  useEffect(() => {
    if (!isOpen) clearTouchStart()
    return clearTouchStart
  }, [clearTouchStart, isOpen])
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (
      isExporting
      || !touch
      || !(e.target as HTMLElement | null)?.closest('[data-export-swipe-handle="true"]')
    ) {
      clearTouchStart()
      return
    }
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }, [clearTouchStart, isExporting])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchStart = touchStartRef.current
    const touch = e.changedTouches[0]
    clearTouchStart()
    if (!touchStart || !touch || isExporting) return
    const dy = touch.clientY - touchStart.y
    const dx = touch.clientX - touchStart.x
    // Require vertical-dominant swipe to dismiss: horizontal component must be
    // less than 30% of vertical component. This prevents accidental dismissal
    // when the user is scrolling the panel content on small viewports.
    if (dy > 80 && Math.abs(dx) < Math.abs(dy) * 0.3) handleClose()
  }, [clearTouchStart, handleClose, isExporting])

  const resScale = (() => {
    const px = selectedResolution.width * selectedResolution.height
    if (px <= 921600) return 0.6
    if (px <= 2073600) return 1.0
    return 3.0
  })()
  const codecScale = codec === 'av1' ? 2.5 : codec === 'h265' ? 1.5 : 1.0
  const estimatedSeconds = Math.max(1, Math.round(safeDuration * 0.5 * resScale * codecScale))

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    const checkAll = async () => {
      const codecs: VideoCodec[] = ['h264', 'h265', 'av1']
      // Probe all codecs in parallel instead of sequentially to reduce first-open latency
      const entries = await Promise.all(
        codecs.map(async (c) => {
          try {
            return [c, await isCodecSupported(c, {
              width: selectedResolution.width,
              height: selectedResolution.height,
              bitrateMbps: safeBitrate,
            })] as const
          } catch {
            return [c, false] as const
          }
        }),
      )
      const results = Object.fromEntries(entries) as Record<VideoCodec, boolean>
      if (!cancelled) {
        setCodecSupport({ configKey: codecConfigKey, results })
      }
    }
    checkAll()
    return () => { cancelled = true }
  }, [codecConfigKey, isOpen, safeBitrate, selectedResolution.height, selectedResolution.width])

  const commitDurationDraft = useCallback((focusOnError = false): number | null => {
    const parsed = parseExportDurationDraft(durationDraft)
    if (parsed == null) {
      setDurationError(true)
      if (focusOnError) {
        requestAnimationFrame(() => durationInputRef.current?.focus({ preventScroll: true }))
      }
      return null
    }

    setDuration(parsed)
    setDurationDraft(String(parsed))
    setDurationError(false)
    return parsed
  }, [durationDraft])

  const handleExport = useCallback(() => {
    if (!canStartExport) return
    const committedDuration = commitDurationDraft(true)
    if (committedDuration == null) return
    const resolution = selectedResolution
    onExport({ resolution, codec, fps, duration: committedDuration, bitrate: safeBitrate })
  }, [canStartExport, codec, commitDurationDraft, fps, onExport, safeBitrate, selectedResolution])

  const [shareError, setShareError] = useState(false)

  const handleResetExport = useCallback(() => {
    setShareError(false)
    onResetExport()
  }, [onResetExport])

  const handleShare = useCallback(async () => {
    if (!exportedVideoBlob) return
    setShareError(false)
    try {
      const file = new File([exportedVideoBlob], exportedVideoFilename ?? 'travelback.mp4', { type: 'video/mp4' })
      if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
        setShareError(true)
        return
      }
      await navigator.share({ files: [file], title: 'Travelback' })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error('Share failed:', err instanceof Error ? err.message : 'Unknown error')
      setShareError(true)
    }
  }, [exportedVideoBlob, exportedVideoFilename])

  // Check both navigator.share and navigator.canShare with a test file.
  // Some browsers support navigator.share for URLs but not for files,
  // which would cause the Share button to appear but silently fail on click.
  const canShare = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    if (typeof navigator.share !== 'function') return false
    try {
      const testFile = new File([new ArrayBuffer(1)], 'test.mp4', { type: 'video/mp4' })
      return navigator.canShare?.({ files: [testFile] }) ?? false
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !isExporting) return

    const frame = requestAnimationFrame(() => {
      cancelExportButtonRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [isExporting, isOpen])

  useEffect(() => {
    const wasExporting = wasExportingRef.current
    wasExportingRef.current = isExporting
    if (!isOpen || !wasExporting || isExporting || exportState !== 'idle') return

    const frame = requestAnimationFrame(() => {
      idleHeadingRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [exportState, isExporting, isOpen])

  useEffect(() => {
    if (!isOpen || exportState !== 'done') return

    const frame = requestAnimationFrame(() => {
      successHeadingRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [isOpen, exportState])

  useEffect(() => {
    const previousExportState = previousExportStateRef.current
    previousExportStateRef.current = exportState
    if (!isOpen || previousExportState !== 'done' || exportState !== 'idle') return

    const frame = requestAnimationFrame(() => {
      idleHeadingRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [exportState, isOpen])

  if (!isOpen) return null

  const platformTip = (() => {
    const r = selectedResolution
    if (r.width === 1080 && r.height === 1920) return t('export.tipTikTok')
    if (r.width === 1080 && (r.height === 1080 || r.height === 1350)) return t('export.tipInstagram')
    return t('export.tipYouTube')
  })()

  return (
    <ModalDialog
      open={isOpen}
      onClose={isExporting ? clearTouchStart : handleClose}
      labelledBy="export-panel-title"
      overlayClassName="z-30 flex items-center justify-center bg-black/35 backdrop-blur-md"
      panelClassName="go mx-4 w-full max-w-md max-h-[min(90vh,42rem)] overflow-y-auto p-6"
      closeOnBackdrop={!isExporting}
    >
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={clearTouchStart} data-disable-playback-hotkeys="true">
        <div className="mb-6 flex items-center justify-between gap-4" data-export-swipe-handle="true">
          <h3 ref={idleHeadingRef} id="export-panel-title" tabIndex={-1} className="text-lg font-bold" style={{ color: 'var(--t1)' }}>
            {t('export.title')}
          </h3>
          {!isExporting && (
            <button
              type="button"
              onClick={handleClose}
              aria-label={t('app.closePanel')}
              className="flex h-11 w-11 items-center justify-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
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
            <h4 ref={successHeadingRef} tabIndex={-1} className="mb-1 text-lg font-bold" style={{ color: 'var(--t1)' }}>
              {t(COMPLETION_HEADING_KEYS[completionMethod])}
            </h4>
            <p className="mb-4 text-sm" style={{ color: 'var(--t3)' }}>
              {t(COMPLETION_DESCRIPTION_KEYS[completionMethod])}
            </p>

            {exportedVideoUrl && (
              <div className="mb-4 overflow-hidden rounded-lg" style={{ border: '1px solid var(--div)' }}>
                <video src={exportedVideoUrl} controls playsInline preload="metadata" className="block w-full bg-black" style={{ maxHeight: '200px' }} />
              </div>
            )}

            {completionMethod !== 'ready' && (
              <div className="gi mb-4 p-3 text-left text-xs" style={{ borderRadius: '10px', color: 'var(--t3)' }}>
                💡 {platformTip}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              {exportedVideoUrl && (
                <a
                  href={exportedVideoUrl}
                  download={exportedVideoFilename ?? 'travelback.mp4'}
                  className="vitro-btn-primary inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium cursor-pointer"
                >
                  <Download size={14} strokeWidth={2} />
                  {t('export.download')}
                </a>
              )}
              <button
                type="button"
                onClick={handleResetExport}
                className="gi inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
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
            {shareError && (
              <p role="alert" className="mt-2 w-full text-xs" style={{ color: 'var(--warn-fg)' }}>
                {t('export.shareFailed')}
              </p>
            )}
          </div>
        ) : isExporting ? (
          <div>
            <div className="mb-2 text-sm" style={{ color: 'var(--t3)' }}>
              {t('export.rendering')} {Math.round(exportProgress * 100)}%
            </div>
            <div role="progressbar" aria-valuenow={Math.min(100, Math.round(exportProgress * 100))} aria-valuemin={0} aria-valuemax={100} aria-label={t('export.rendering')} className="h-3 w-full overflow-hidden rounded-full" style={{ background: 'var(--div)' }}>
              <div className="h-full rounded-full" style={{ width: `${exportProgress * 100}%`, background: 'rgb(var(--gl))', transition: 'width 50ms linear' }} />
            </div>
            {(() => {
              const clampedDuration = safeDuration
              const clampedFps = Math.max(EXPORT_LIMITS.fps.min, Math.min(fps, EXPORT_LIMITS.fps.max))
              const totalFrames = Math.ceil(clampedDuration * clampedFps)
              return (
                <p className="mt-2 text-xs" style={{ color: 'var(--t4)' }}>
                  {t('export.frame')} {Math.round(exportProgress * totalFrames)} / {totalFrames}
                </p>
              )
            })()}
            <button
              ref={cancelExportButtonRef}
              type="button"
              onClick={onCancelExport}
              aria-label={t('app.cancelExportAria')}
              className="gi mt-4 inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
              style={{ background: 'rgba(var(--err-rgb),.7)', color: '#fff', border: 'none' }}
            >
              {t('app.cancelExport')}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-4">
              <div>
                <label htmlFor={resolutionId} className="vitro-label mb-1 block text-sm font-medium">{t('export.resolution')}</label>
                <select id={resolutionId} value={resolutionIdx} onChange={e => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) setResolutionIdx(v) }} className="vitro-select min-h-11 w-full px-3 py-2 text-sm">
                  {RESOLUTION_PRESETS.map((_r, i) => (
                    <option key={i} value={i}>{t(RESOLUTION_KEYS[i] as 'resolution.youtube')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={durationId} className="vitro-label mb-1 block text-sm font-medium">{t('export.duration')}</label>
                <input
                  ref={durationInputRef}
                  id={durationId}
                  type="number"
                  min={EXPORT_LIMITS.duration.min}
                  max={EXPORT_LIMITS.duration.max}
                  step={1}
                  value={durationDraft}
                  aria-invalid={durationError}
                  aria-describedby={durationError ? durationErrorId : undefined}
                  onChange={e => {
                    const nextDraft = e.target.value
                    setDurationDraft(nextDraft)
                    if (durationError && parseExportDurationDraft(nextDraft) != null) {
                      setDurationError(false)
                    }
                  }}
                  onBlur={() => commitDurationDraft()}
                  onKeyDown={event => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    commitDurationDraft(true)
                  }}
                  className="vitro-input min-h-11 w-full px-3 py-2 text-sm"
                />
                {durationError && (
                  <p id={durationErrorId} role="alert" className="mt-1 text-xs" style={{ color: 'var(--warn-fg)' }}>
                    {t('export.durationRange')
                      .replace('{min}', String(EXPORT_LIMITS.duration.min))
                      .replace('{max}', String(EXPORT_LIMITS.duration.max))}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor={qualityId} className="vitro-label mb-1 block text-sm font-medium">{t('export.quality')}</label>
                <select id={qualityId} value={quality} onChange={e => setQuality(e.target.value)} className="vitro-select min-h-11 w-full px-3 py-2 text-sm">
                  <option value="low">{t('export.qualityLow')}</option>
                  <option value="medium">{t('export.qualityMedium')}</option>
                  <option value="high">{t('export.qualityHigh')}</option>
                  <option value="maximum">{t('export.qualityMaximum')}</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="inline-flex min-h-11 items-center gap-2 px-1 text-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
                style={{ color: 'var(--t4)' }}
                aria-expanded={showAdvanced}
              >
                <ChevronDown size={14} strokeWidth={2} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                {t('export.advanced')}
              </button>

              {showAdvanced && (
                <div className="space-y-4 pt-1">
                  <div>
                    <label htmlFor={codecId} className="vitro-label mb-1 block text-sm font-medium">{t('export.codec')}</label>
                    <select id={codecId} value={codec} onChange={e => setCodec(e.target.value as VideoCodec)} className="vitro-select min-h-11 w-full px-3 py-2 text-sm">
                      {(Object.entries(CODEC_LABELS) as [VideoCodec, string][]).map(([k]) => (
                        <option key={k} value={k} disabled={currentCodecSupport[k] === false}>
                          {t(`codec.${k}Desc` as 'codec.h264Desc' | 'codec.h265Desc' | 'codec.av1Desc')}{currentCodecSupport[k] === false ? ` ${t('export.unsupported')}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={fpsId} className="vitro-label mb-1 block text-sm font-medium">{t('export.fps')}</label>
                      <select id={fpsId} value={fps} onChange={e => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) setFps(v) }} className="vitro-select min-h-11 w-full px-3 py-2 text-sm">
                        <option value={24}>24</option>
                        <option value={30}>30</option>
                        <option value={60}>60</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor={bitrateId} className="vitro-label mb-1 block text-sm font-medium">{t('export.mbps')}</label>
                      <input id={bitrateId} type="number" value={bitrate} className="vitro-input min-h-11 w-full px-3 py-2 text-sm opacity-60 cursor-not-allowed" readOnly />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="mb-2 text-xs" style={{ color: 'var(--t4)' }}>
              {t('export.output')} {selectedResolution.width}×{selectedResolution.height} MP4
              {showAdvanced && <> ({CODEC_LABELS[codec]}) {t('export.at')} {bitrate} Mbps</>}
              {' '}· ~{estimatedOutputMb.toFixed(0)} MB · ~{estimatedMemoryMb.toFixed(0)} MB {t('export.browserMemory')}
            </p>
            {exportTooLarge && (
              <p role="alert" className="mb-2 text-xs" style={{ color: 'var(--warn-fg)' }}>
                {t('export.tooLarge')}
              </p>
            )}
            {codecUnavailable && (
              <p role="alert" className="mb-2 text-xs" style={{ color: 'var(--warn-fg)' }}>
                {t('export.codecUnavailable')}
              </p>
            )}
            {codecPending && (
              <p role="status" className="mb-2 text-xs" style={{ color: 'var(--t4)' }}>
                {t('export.codecChecking')}
              </p>
            )}
            <p className="mb-4 text-xs" style={{ color: 'var(--t4)' }}>
              {t('export.estimatedTime')}{' '}
              {estimatedSeconds >= 60
                ? t('export.minutes').replace('{n}', String(Math.round(estimatedSeconds / 60)))
                : t('export.seconds').replace('{n}', String(estimatedSeconds))}
            </p>

            <button type="button" onClick={handleExport} disabled={!canStartExport} className="vitro-btn-primary min-h-11 w-full py-3 font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
              {t('export.startExport')}
            </button>
          </>
        )}
      </div>
    </ModalDialog>
  )
}
