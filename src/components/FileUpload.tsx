'use client'

import { useCallback, useState, useRef, useMemo } from 'react'
import { ArrowRight, MapPin } from 'lucide-react'
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
  const inputRef = useRef<HTMLInputElement>(null)

  const isIOS = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  }, [])

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
            <div className="relative w-48 h-28 mb-1">
              <svg viewBox="0 0 200 120" className="w-full h-full" aria-label={t('fileUpload.previewAlt')}>
                {/* Stylized route path */}
                <path d="M 20 90 C 40 60, 60 30, 100 40 S 160 80, 180 30"
                  fill="none" stroke="rgba(var(--gl),.2)" strokeWidth="3" strokeLinecap="round" />
                <path d="M 20 90 C 40 60, 60 30, 100 40 S 160 80, 180 30"
                  fill="none" stroke="rgb(var(--gl))" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray="250" strokeDashoffset="250"
                  className="animate-[tracePath_3s_ease-in-out_infinite]" />
                {/* Moving dot */}
                <circle r="4" fill="rgb(var(--gl))" className="animate-[moveDot_3s_ease-in-out_infinite]">
                  <animateMotion dur="3s" repeatCount="indefinite"
                    keyTimes="0;1" keySplines="0.42 0 0.58 1"
                    calcMode="spline"
                    path="M 20 90 C 40 60, 60 30, 100 40 S 160 80, 180 30" />
                </circle>
                {/* Start marker */}
                <circle cx="20" cy="90" r="3" fill="none" stroke="rgb(var(--gl))" strokeWidth="1.5" opacity=".5" />
                {/* End marker */}
                <circle cx="180" cy="30" r="3" fill="none" stroke="rgb(var(--gl))" strokeWidth="1.5" opacity=".5" />
              </svg>
              <style>{`
                @keyframes tracePath {
                  0% { stroke-dashoffset: 250; }
                  80%, 100% { stroke-dashoffset: 0; }
                }
              `}</style>
            </div>
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
