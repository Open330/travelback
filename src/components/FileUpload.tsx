'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { ArrowRight, FolderOpen, MapPin } from 'lucide-react'
import Image from 'next/image'
import { basePath } from '@/lib/env'
import type { Track } from '@/types'
import { parseTrackFile, ParseError, MAX_FILE_SIZE, JSON_MAX_FILE_SIZE } from '@/lib/parser'
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

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setLoading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const maxForType = ext === 'json' ? JSON_MAX_FILE_SIZE : MAX_FILE_SIZE
      if (file.size > maxForType) {
        throw new Error(t('fileUpload.fileTooLarge').replace('{max}', String(Math.round(maxForType / 1024 / 1024))))
      }
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
      }
      const code = err instanceof ParseError ? err.code : ''
      const message = err instanceof Error ? err.message : ''
      const matchedKey = code && code in errorCodeMap ? code : ''
      // FILE_TOO_LARGE uses the parser's dynamic message (includes correct limit per file type)
      const isFileTooLarge = code === 'FILE_TOO_LARGE' || message.includes('File is too large')
      const isSafe = !!matchedKey || isFileTooLarge
      if (!isSafe) console.error('[Travelback] Parse error:', err instanceof Error ? err.message : 'Unknown error')
      if (matchedKey) {
        setError(t(errorCodeMap[matchedKey] as Parameters<typeof t>[0]))
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
    const file = e.dataTransfer.files[0]
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!ext || !VALID_EXTENSIONS.has(ext)) {
        setError(t('fileUpload.unsupportedFormat'))
        setTimeout(() => setIsDragging(false), 200)
        return
      }
      handleFile(file)
    }
    setTimeout(() => setIsDragging(false), 200)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  if (hasTrack) {
    return (
      <button
        data-testid="load-new-file-button"
        onClick={() => inputRef.current?.click()}
        aria-label={t('fileUpload.loadNewFileAria')}
        title={t('fileUpload.loadNewFileAria')}
        className="absolute top-4 left-4 z-10 gi flex min-h-11 min-w-11 items-center justify-center gap-2 px-3 py-2 text-sm font-medium cursor-pointer sm:px-4"
        style={{ color: 'var(--t1)' }}
      >
        <FolderOpen size={16} strokeWidth={2} />
        <span className="hidden sm:inline">{t('fileUpload.loadNewFile')}</span>
        <input
          ref={inputRef}
          type="file"
          accept=".gpx,.kml,.json"
          onChange={handleInputChange}
          className="hidden"
        />
      </button>
    )
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center"
      style={{ background: 'var(--upload-overlay, rgba(0,0,0,.32))', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
      <div
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
                className="group relative mb-1 block w-full max-w-[20rem] overflow-hidden rounded-2xl border border-white/10 shadow-lg"
              >
                <Image
                  src={`${basePath}/landing-preview.svg`}
                  alt={t('fileUpload.previewAlt')}
                  width={960}
                  height={540}
                  className="landing-preview-image block h-auto w-full transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 py-3 text-left">
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
                  className="block h-auto w-full"
                />
              </div>
            )
          )}
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--t1)' }}>
          {t('fileUpload.title')}
        </h2>
        <p className="mb-6" style={{ color: 'var(--t3)' }}>
          {t('fileUpload.subtitle')}
        </p>
        <p className="text-sm mb-1" style={{ color: 'var(--t4)' }}>
          {t('fileUpload.dropHint')}
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--t4)', opacity: 0.7 }}>
          {t('fileUpload.formatHint')}
        </p>
        <button
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
              onClick={onCreateJourney}
              className="gi inline-flex min-h-11 w-full max-w-sm items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium cursor-pointer"
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
              onClick={onShowGoogleGuide}
              className="gi inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-medium cursor-pointer"
              style={{ color: 'rgb(var(--gl))' }}
            >
              {t('fileUpload.importGuideLink')}
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>
        )}
        {error && (
          <p className="mt-4 text-sm" style={{ color: 'var(--err)' }}>{error}</p>
        )}
      </div>
    </div>
  )
}
