'use client'

import { useCallback, useState, useRef } from 'react'
import { Map, ArrowRight, MapPin, ChevronDown } from 'lucide-react'
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

export default function FileUpload({ onTrackLoaded, hasTrack, onShowGoogleGuide, onLoadSample, onCreateJourney }: FileUploadProps) {
  const { t } = useLocale()
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showWhereToFind, setShowWhereToFind] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB
  const WARN_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

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
      // Show known safe error messages; generic fallback for unexpected errors
      const safeMessages = [
        'Unsupported file format',
        'Track must contain at least 2 points',
        'Failed to read file',
      ]
      const isSafe = safeMessages.some(m => message.includes(m))
        || message === t('fileUpload.fileTooLarge')
      if (!isSafe) console.error('[Travelback] Parse error:', err)
      setError(isSafe ? message : t('fileUpload.parseFailed'))
    } finally {
      setLoading(false)
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
      style={{ background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="gc w-full max-w-lg mx-4 p-12 transition-all duration-200 text-center"
        style={{
          borderRadius: 'var(--r-glass)',
          borderColor: isDragging ? 'rgb(var(--gl))' : undefined,
          transform: isDragging ? 'scale(1.02)' : undefined,
        }}
      >
        <div className="mb-4 flex items-center justify-center">
          {loading ? (
            <div className="inline-block w-10 h-10 border-4 rounded-full animate-spin"
              style={{ borderColor: 'rgb(var(--gl))', borderTopColor: 'transparent' }} />
          ) : (
            <Map size={48} strokeWidth={1.5} style={{ color: 'rgb(var(--gl))' }} />
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
        <div className="mt-4 w-full">
          {onShowGoogleGuide && (
            <button onClick={onShowGoogleGuide} className="underline text-sm inline-flex items-center gap-1"
              style={{ color: 'rgb(var(--gl))' }}>
              {t('fileUpload.importGuideLink')}
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          )}
          <button
            onClick={() => setShowWhereToFind(v => !v)}
            className="mt-1 text-xs inline-flex items-center gap-1 cursor-pointer"
            style={{ color: 'var(--t4)' }}
          >
            <ChevronDown size={12} strokeWidth={2} className={`transition-transform ${showWhereToFind ? 'rotate-180' : ''}`} />
            {t('fileUpload.whereToFind')}
          </button>
          {showWhereToFind && (
            <div className="mt-2 text-xs text-left space-y-1" style={{ color: 'var(--t4)' }}>
              <p>• <strong>{t('fileUpload.fromGoogle')}</strong> — {t('fileUpload.importGuideLink')}</p>
              <p>• <strong>{t('fileUpload.fromOtherApps')}</strong> — GPX export</p>
            </div>
          )}
        </div>
        {error && (
          <p className="mt-4 text-sm" style={{ color: 'var(--err)' }}>{error}</p>
        )}
      </div>
    </div>
  )
}
