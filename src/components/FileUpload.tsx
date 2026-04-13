'use client'

import { useCallback, useState, useRef, useMemo } from 'react'
import { ArrowRight, MapPin } from 'lucide-react'
import Image from 'next/image'
import type { Track } from '@/types'
import { parseTrackFile } from '@/lib/parser'
import { useLocale } from '@/lib/i18n'

interface FileUploadProps {
  onTrackLoaded: (track: Track) => void
  hasTrack: boolean
  onShowGoogleGuide?: () => void
  onLoadSample?: () => void
  onCreateJourney?: () => void
}

const MAX_FILE_SIZE = 200 * 1024 * 1024
const WARN_FILE_SIZE = 100 * 1024 * 1024

export default function FileUpload({ onTrackLoaded, hasTrack, onShowGoogleGuide, onLoadSample, onCreateJourney }: FileUploadProps) {
  const { t } = useLocale()
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')

  const isIOS = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setLoading(true)
    try {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(t('fileUpload.fileTooLarge'))
      }
      if (file.size > WARN_FILE_SIZE) {
        console.warn(`[Travelback] Large file (${(file.size / 1024 / 1024).toFixed(0)} MB) — parsing may take a moment`)
      }
      const track = await parseTrackFile(file)
      onTrackLoaded(track)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      // Map known English parser errors to i18n keys for display
      const parserErrorMap: Record<string, string> = {
        'Unsupported file format': 'fileUpload.unsupportedFormat',
        'Track must contain at least 2 points': 'fileUpload.tooFewPoints',
        'Track contains too many points': 'fileUpload.tooManyPoints',
        'Failed to read file': 'fileUpload.readFailed',
      }
      const matchedKey = Object.keys(parserErrorMap).find(m => message.includes(m))
      const isSafe = !!matchedKey || message === t('fileUpload.fileTooLarge')
      if (!isSafe) console.error('[Travelback] Parse error:', err)
      if (matchedKey) {
        setError(t(parserErrorMap[matchedKey] as Parameters<typeof t>[0]))
      } else if (message === t('fileUpload.fileTooLarge')) {
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
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
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
        className="absolute top-4 left-4 z-10 gi px-4 py-2 text-sm font-medium cursor-pointer"
        style={{ color: 'var(--t1)' }}
      >
        {t('fileUpload.loadNewFile')}
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
        className="gc w-full max-w-lg mx-4 p-12 transition-all duration-200 text-center"
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
              style={{ borderColor: 'rgb(var(--gl))', borderTopColor: 'transparent' }} />
          ) : (
            onLoadSample ? (
              <button
                type="button"
                onClick={onLoadSample}
                className="group relative mb-1 block w-full max-w-[20rem] overflow-hidden rounded-2xl border border-white/10 shadow-lg"
              >
                <Image
                  src={`${basePath}/landing-preview.svg`}
                  alt={t('fileUpload.previewAlt')}
                  width={960}
                  height={540}
                  className="block h-auto w-full transition-transform duration-300 group-hover:scale-[1.02]"
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
          className="vitro-btn-primary px-6 py-3 font-medium disabled:opacity-50 cursor-pointer"
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
        {isIOS && (
          <p className="mt-2 text-[10px]" style={{ color: 'var(--t4)' }}>
            {t('fileUpload.iosTip')}
          </p>
        )}
        <div className="mt-3 flex flex-col items-center gap-2">
          {onLoadSample && (
            <button onClick={onLoadSample} className="text-sm cursor-pointer transition-colors"
              style={{ color: 'var(--t3)' }}>
              {t('fileUpload.trySample')}
            </button>
          )}
          {onCreateJourney && (
            <button onClick={onCreateJourney} className="inline-flex items-center gap-1 text-sm cursor-pointer"
              style={{ color: 'var(--t3)' }}>
              <MapPin size={14} strokeWidth={2} />
              {t('fileUpload.drawRoute')}
            </button>
          )}
        </div>
        {onShowGoogleGuide && (
          <div className="mt-4">
            <button onClick={onShowGoogleGuide} className="underline text-sm inline-flex items-center gap-1 cursor-pointer"
              style={{ color: 'rgb(var(--gl))' }}>
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
