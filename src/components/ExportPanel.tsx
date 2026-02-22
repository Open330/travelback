'use client'

import { useState, useCallback, useEffect } from 'react'
import type { VideoCodec, ExportConfig, ResolutionPreset } from '@/types'
import { CODEC_LABELS, RESOLUTION_PRESETS } from '@/types'
import { isCodecSupported } from '@/lib/videoEncoder'

interface ExportPanelProps {
  isOpen: boolean
  onClose: () => void
  onExport: (config: ExportConfig) => void
  isExporting: boolean
  exportProgress: number
}

export default function ExportPanel({
  isOpen,
  onClose,
  onExport,
  isExporting,
  exportProgress,
}: ExportPanelProps) {
  const [resolutionIdx, setResolutionIdx] = useState(0)
  const [codec, setCodec] = useState<VideoCodec>('h264')
  const [fps, setFps] = useState(30)
  const [duration, setDuration] = useState(30)
  const [bitrate, setBitrate] = useState(8)
  const [codecSupport, setCodecSupport] = useState<Record<VideoCodec, boolean | null>>({
    h264: null, h265: null, av1: null,
  })

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
    onExport({ resolution, codec, fps, duration, bitrate, scenes: [] })
  }, [onExport, resolutionIdx, codec, fps, duration, bitrate])

  if (!isOpen) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Export Video</h3>
          {!isExporting && (
            <button onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {isExporting ? (
          <div>
            <div className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
              Rendering... {Math.round(exportProgress * 100)}%
            </div>
            <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full transition-all duration-200"
                style={{ width: `${exportProgress * 100}%` }} />
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              Frame {Math.round(exportProgress * Math.ceil(duration * fps))} / {Math.ceil(duration * fps)}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {/* Resolution */}
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-1">Resolution</label>
                <select value={resolutionIdx}
                  onChange={e => setResolutionIdx(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg
                    text-zinc-800 dark:text-zinc-200 cursor-pointer text-sm">
                  {RESOLUTION_PRESETS.map((r, i) => (
                    <option key={i} value={i}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Codec */}
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-1">Codec</label>
                <select value={codec}
                  onChange={e => setCodec(e.target.value as VideoCodec)}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg
                    text-zinc-800 dark:text-zinc-200 cursor-pointer text-sm">
                  {(Object.entries(CODEC_LABELS) as [VideoCodec, string][]).map(([k, v]) => (
                    <option key={k} value={k} disabled={codecSupport[k] === false}>
                      {v}{codecSupport[k] === false ? ' (unsupported)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-1">Duration</label>
                  <input type="number" min={5} max={600} value={duration}
                    onChange={e => setDuration(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg
                      text-zinc-800 dark:text-zinc-200 text-sm" />
                </div>
                {/* FPS */}
                <div>
                  <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-1">FPS</label>
                  <select value={fps} onChange={e => setFps(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg
                      text-zinc-800 dark:text-zinc-200 cursor-pointer text-sm">
                    <option value={24}>24</option>
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                  </select>
                </div>
                {/* Bitrate */}
                <div>
                  <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-1">Mbps</label>
                  <input type="number" min={1} max={50} value={bitrate}
                    onChange={e => setBitrate(parseInt(e.target.value) || 8)}
                    className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg
                      text-zinc-800 dark:text-zinc-200 text-sm" />
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
              Output: {RESOLUTION_PRESETS[resolutionIdx].width}×{RESOLUTION_PRESETS[resolutionIdx].height} MP4
              ({CODEC_LABELS[codec]}) at {bitrate} Mbps · ~{((bitrate * duration) / 8).toFixed(0)} MB
            </p>

            <button onClick={handleExport}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white
                rounded-lg font-medium transition-colors cursor-pointer">
              Start Export
            </button>
          </>
        )}
      </div>
    </div>
  )
}
