'use client'

import { useCallback, useState, useRef } from 'react'
import type { Track } from '@/types'
import { parseTrackFile } from '@/lib/parser'

interface FileUploadProps {
  onTrackLoaded: (track: Track) => void
  hasTrack: boolean
  onShowGoogleGuide?: () => void
}

export default function FileUpload({ onTrackLoaded, hasTrack, onShowGoogleGuide }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setLoading(true)
    try {
      const track = await parseTrackFile(file)
      onTrackLoaded(track)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setLoading(false)
    }
  }, [onTrackLoaded])

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
        aria-label="Load a new track file"
        className="absolute top-4 left-4 z-10 gi px-4 py-2 text-sm font-medium cursor-pointer"
        style={{ color: 'var(--t1)' }}
      >
        Load New File
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
        className="gc w-full max-w-lg mx-4 p-12 border-2 border-dashed transition-all duration-200 text-center"
        style={{
          borderRadius: 'var(--r-glass)',
          borderColor: isDragging ? 'rgb(var(--gl))' : 'var(--div)',
          transform: isDragging ? 'scale(1.02)' : undefined,
        }}
      >
        <div className="text-5xl mb-4">
          {loading ? (
            <div className="inline-block w-10 h-10 border-4 rounded-full animate-spin"
              style={{ borderColor: 'rgb(var(--gl))', borderTopColor: 'transparent' }} />
          ) : '🗺️'}
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--t1)' }}>
          Travelback
        </h2>
        <p className="mb-6" style={{ color: 'var(--t3)' }}>
          Animate your journeys into video
        </p>
        <p className="text-sm mb-4" style={{ color: 'var(--t4)' }}>
          Drop your GPX, KML, or Google Location History JSON file here
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          aria-label="Browse files to upload"
          className="vitro-btn-primary px-6 py-3 font-medium disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Parsing...' : 'Browse Files'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".gpx,.kml,.json"
          onChange={handleInputChange}
          className="hidden"
        />
        {onShowGoogleGuide && (
          <div className="mt-3">
            <button onClick={onShowGoogleGuide} className="underline text-sm"
              style={{ color: 'rgb(var(--gl))' }}>
              How to export Google Location History →
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
