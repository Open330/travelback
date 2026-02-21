'use client'

import { useState, useCallback } from 'react'

interface ExportPanelProps {
  isOpen: boolean
  onClose: () => void
  onExport: (settings: ExportSettings) => void
  isExporting: boolean
  exportProgress: number
}

export interface ExportSettings {
  duration: number
  fps: number
}

export default function ExportPanel({
  isOpen,
  onClose,
  onExport,
  isExporting,
  exportProgress,
}: ExportPanelProps) {
  const [duration, setDuration] = useState(30)
  const [fps, setFps] = useState(30)

  const handleExport = useCallback(() => {
    onExport({ duration, fps })
  }, [onExport, duration, fps])

  if (!isOpen) return null

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
            Export Video
          </h3>
          {!isExporting && (
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {isExporting ? (
          <div>
            <div className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
              Recording... {Math.round(exportProgress * 100)}%
            </div>
            <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-200"
                style={{ width: `${exportProgress * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min={5}
                  max={600}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg
                    text-zinc-800 dark:text-zinc-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Frame Rate (FPS)
                </label>
                <select
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg
                    text-zinc-800 dark:text-zinc-200 cursor-pointer"
                >
                  <option value={24}>24 FPS</option>
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </div>
            </div>

            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
              Video will be exported as WebM at your current viewport size.
            </p>

            <button
              onClick={handleExport}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white
                rounded-lg font-medium transition-colors cursor-pointer"
            >
              Start Export
            </button>
          </>
        )}
      </div>
    </div>
  )
}
