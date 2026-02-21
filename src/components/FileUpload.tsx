'use client'

import { useCallback, useState, useRef } from 'react'
import type { Track } from '@/types'
import { parseTrackFile } from '@/lib/parser'

interface FileUploadProps {
  onTrackLoaded: (track: Track) => void
  hasTrack: boolean
}

export default function FileUpload({ onTrackLoaded, hasTrack }: FileUploadProps) {
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
        className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm
          px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-zinc-700 dark:text-zinc-200
          hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
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
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          w-full max-w-lg mx-4 p-12 rounded-2xl border-2 border-dashed
          transition-all duration-200 text-center
          ${isDragging
            ? 'border-cyan-400 bg-cyan-400/10 scale-[1.02]'
            : 'border-zinc-400/50 bg-white/95 dark:bg-zinc-800/95'}
        `}
      >
        <div className="text-5xl mb-4">
          {loading ? '...' : '🗺️'}
        </div>
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-2">
          Travelback
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">
          Animate your journeys into video
        </p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-4">
          Drop your GPX, KML, or Google Location History JSON file here
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg
            font-medium transition-colors disabled:opacity-50 cursor-pointer"
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
        {error && (
          <p className="mt-4 text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  )
}
