'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { ArrowRight, FolderOpen, MapPin } from 'lucide-react'
import Image from 'next/image'
import { basePath } from '@/lib/env'
import type { Track } from '@/types'
import { parseTrackFile, ParseError } from '@/lib/parser'
import { useLocale } from '@/lib/i18n'

interface FileUploadProps {
  onTrackLoaded: (track: Track) => void
  hasTrack: boolean
  onShowGoogleGuide?: () => void
  onLoadSample?: () => void
  onCreateJourney?: () => void
}

const WARN_FILE_SIZE = 100 * 1024 * 1024
const VALID_EXTENSIONS = new Set(['gpx', 'kml', 'json'])

export default function FileUpload({ onTrackLoaded, hasTrack, onShowGoogleGuide, onLoadSample, onCreateJourney }: FileUploadProps) {
  const { t } = useLocale()
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [isTouchDevice, setIsTouchDevice] = useState(false)
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // Track the drag-leave timer so we can clear it on unmount or re-schedule without leaking.
  const dragEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (dragEndTimerRef.current != null) {
        clearTimeout(dragEndTimerRef.current)
        dragEndTimerRef.current = null
      }
    }
  }, [])
  const scheduleDragEnd = useCallback(() => {
    if (dragEndTimerRef.current != null) clearTimeout(dragEndTimerRef.current)
    dragEndTimerRef.current = setTimeout(() => {
      dragEndTimerRef.current = null
      setIsDragging(false)
    }, 200)
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setLoading(true)
    try {
      if (file.size > WARN_FILE_SIZE) {
        console.warn(`[Travelback] Large file (${(file.size / 1024 / 1024).toFixed(0)} MB) — parsing may take a moment`)
      }
      const track = await parseTrackFile(file)
      onTrackLoaded(track)
    } catch (err) {
      // Map parser error codes to i18n keys (avoids relying on English message text)
      const errorCodeMap: Record<string, string> = {
        UNSUPPORTED_FORMAT: 'fileUpload.unsupportedFormat',
        TOO_FEW_POINTS: 'fileUpload.tooFewPoints',
        TOO_MANY_POINTS: 'fileUpload.tooManyPoints',
        XML_PARSE_ERROR: 'fileUpload.parseFailed',
        INVALID_GOOGLE_JSON: 'fileUpload.parseFailed',
        JSON_DEPTH_EXCEEDED: 'fileUpload.parseFailed',
        UNSUPPORTED_GOOGLE_FORMAT: 'fileUpload.parseFailed',
        READ_FAILED: 'fileUpload.parseFailed',
      }
      const code = err instanceof ParseError ? err.code : ''
      const message = err instanceof Error ? err.message : ''
      const knownCode = !!(code && code in errorCodeMap)
      // FILE_TOO_LARGE uses the parser's dynamic message (includes correct limit per file type)
      const isFileTooLarge = code === 'FILE_TOO_LARGE'
      const isSafe = knownCode || isFileTooLarge
      if (!isSafe) console.error('[Travelback] Parse error:', err instanceof Error ? err.message : 'Unknown error')
      if (knownCode) {
        setError(t(errorCodeMap[code as keyof typeof errorCodeMap] as Parameters<typeof t>[0]))
      } else if (isFileTooLarge) {
        setError(message)
      } else {
        setError(t('fileUpload.parseFailed'))
      }
    } finally {
      setLoading(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }, [onTrackLoaded, t])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (loading) return
    const file = e.dataTransfer.files[0]
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!ext || !VALID_EXTENSIONS.has(ext)) {
        setError(t('fileUpload.unsupportedFormat'))
        scheduleDragEnd()
        return
      }
      handleFile(file)
    }
    scheduleDragEnd()
  }, [handleFile, t, loading, scheduleDragEnd])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    // Debounce via scheduleDragEnd so a leave-then-immediate-enter bounce
    // (common when the pointer crosses a child element inside the zone)
    // does not flicker the border/scale transition off and on again.
    scheduleDragEnd()
  }, [scheduleDragEnd])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (loading) return
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile, loading])

  if (hasTrack) {
    return (
      <div className="absolute top-4 left-4 z-10 flex max-w-[min(20rem,calc(100vw-2rem))] flex-col items-start gap-2">
        <button
          type="button"
          data-testid="load-new-file-button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          aria-label={t('fileUpload.loadNewFileAria')}
          title={t('fileUpload.loadNewFileAria')}
          className="gi flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-sm font-medium cursor-pointer disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))] sm:flex-row sm:gap-2 sm:px-4 sm:py-2"
          style={{ color: 'var(--t1)' }}
        >
          <FolderOpen size={16} strokeWidth={2} />
          <span className="text-[9px] leading-none sm:hidden">{loading ? t('fileUpload.parsing') : t('fileUpload.loadNewFileShort')}</span>
          <span className="hidden sm:inline">{loading ? t('fileUpload.parsing') : t('fileUpload.loadNewFile')}</span>
          <input
            ref={inputRef}
            type="file"
            accept=".gpx,.kml,.json"
            onChange={handleInputChange}
            className="hidden"
          />
        </button>
        {error && (
          <div role="alert" className="gc max-w-full px-3 py-2 text-xs shadow-lg" style={{ color: 'var(--err)', borderRadius: '10px' }}>
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center"
      style={{ background: 'var(--upload-overlay, rgba(0,0,0,.32))', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
      <div
        role="group"
        aria-labelledby="fileupload-title"
        aria-describedby="fileupload-drop-hint"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="gc w-full max-w-lg mx-4 p-6 sm:p-12 max-h-[90vh] overflow-y-auto transition-all duration-200 text-center"
        style={{
          borderRadius: 'var(--r-glass)',
          borderColor: isDragging ? 'rgb(var(--gl))' : undefined,
          transform: isDragging ? 'scale(1.02)' : undefined,
          background: 'var(--gc-solid-bg, var(--gc-bg))',
          boxShadow: 'var(--gc-sh)',
        }}
      >
        <div className="mb-4 flex items-center justify-center">
          {loading ? (
            <div className="inline-block w-10 h-10 border-4 rounded-full animate-spin"
              style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'rgb(var(--gl))' }} />
          ) : (
            onLoadSample ? (
              <button
                type="button"
                onClick={onLoadSample}
                aria-label={t('fileUpload.trySample')}
                title={t('fileUpload.trySample')}
                className="group relative mb-1 block w-full max-w-[20rem] overflow-hidden rounded-2xl border border-white/10 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
              >
                <Image
                  src={`${basePath}/landing-preview.svg`}
                  alt={t('fileUpload.previewAlt')}
                  width={960}
                  height={540}
                  priority
                  className="landing-preview-image block h-auto w-full transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 py-3 text-left">
                  <div>
                    <p className="text-sm font-semibold text-white">{t('fileUpload.previewTitle')}</p>
                    <p className="text-xs text-white/80">{t('fileUpload.trySample')}</p>
                  </div>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
                    {t('fileUpload.previewAction')}
                  </span>
                </div>
              </button>
            ) : (
              <div className="mb-1 w-full max-w-[20rem] overflow-hidden rounded-2xl border border-white/10 shadow-lg">
                <Image
                  src={`${basePath}/landing-preview.svg`}
                  alt={t('fileUpload.previewAlt')}
                  width={960}
                  height={540}
                  priority
                  className="block h-auto w-full"
                />
              </div>
            )
          )}
        </div>
        <h2 id="fileupload-title" className="text-2xl font-bold mb-2" style={{ color: 'var(--t1)' }}>
          {t('fileUpload.title')}
        </h2>
        <p className="mb-6" style={{ color: 'var(--t3)' }}>
          {t('fileUpload.subtitle')}
        </p>
        <p id="fileupload-drop-hint" className="text-sm mb-1" style={{ color: 'var(--t4)' }}>
          {t('fileUpload.dropHint')}
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--t3)' }}>
          {t('fileUpload.formatHint')}
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          aria-label={t('fileUpload.browseAria')}
          className="vitro-btn-primary min-h-11 px-6 py-3 font-medium disabled:opacity-50 cursor-pointer"
        >
          {loading ? t('fileUpload.parsing') : t('fileUpload.browse')}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".gpx,.kml,.json"
          onChange={handleInputChange}
          className="hidden"
        />
        {isTouchDevice && (
          <p className="mt-2 text-[10px]" style={{ color: 'var(--t4)' }}>
            {t('fileUpload.iosTip')}
          </p>
        )}
        {onCreateJourney && (
          <div className="mt-4 flex w-full justify-center">
            <button
              type="button"
              onClick={onCreateJourney}
              className="gi inline-flex min-h-11 w-full max-w-sm items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
              style={{ color: 'var(--t2)' }}
            >
              <MapPin size={14} strokeWidth={2} />
              {t('fileUpload.drawRoute')}
            </button>
          </div>
        )}
        {onShowGoogleGuide && (
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={onShowGoogleGuide}
              className="gi inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
              style={{ color: 'var(--t2)' }}
            >
              {t('fileUpload.importGuideLink')}
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>
        )}
        {error && (
          <div className="mt-4 space-y-2 text-sm" style={{ color: 'var(--err)' }}>
            <p role="alert">{error}</p>
            {onShowGoogleGuide && (
              <button
                type="button"
                onClick={onShowGoogleGuide}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
                style={{ color: 'var(--t2)', border: '1px solid rgba(var(--gl), .35)' }}
              >
                {t('fileUpload.errorHelp')}
                <ArrowRight size={14} strokeWidth={2} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
