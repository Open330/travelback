'use client'

import { useCallback } from 'react'
import type { Track } from '@/types'
import { formatDistance, formatDuration, totalDistance } from '@/lib/interpolate'

interface ControlsProps {
  track: Track
  isPlaying: boolean
  progress: number
  speed: number
  duration: number
  followCamera: boolean
  onTogglePlay: () => void
  onSeek: (progress: number) => void
  onSpeedChange: (speed: number) => void
  onDurationChange: (duration: number) => void
  onFollowCameraToggle: () => void
}

const SPEEDS = [0.5, 1, 2, 4, 8, 16]
const DURATIONS = [10, 15, 30, 60, 120, 300]

export default function Controls({
  track,
  isPlaying,
  progress,
  speed,
  duration,
  followCamera,
  onTogglePlay,
  onSeek,
  onSpeedChange,
  onDurationChange,
  onFollowCameraToggle,
}: ControlsProps) {
  const total = totalDistance(track.points)
  const traveled = total * progress
  const elapsed = duration * progress

  const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value))
  }, [onSeek])

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10">
      <div className="mx-4 mb-4 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl
        shadow-lg p-4">
        {/* Progress bar */}
        <div className="mb-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={handleProgressChange}
            className="w-full h-2 rounded-full appearance-none cursor-pointer
              bg-zinc-200 dark:bg-zinc-600
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-cyan-500
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full
              bg-cyan-500 hover:bg-cyan-600 text-white transition-colors cursor-pointer"
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          {/* Speed */}
          <select
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200
              rounded-lg px-2 py-1.5 text-sm font-medium cursor-pointer"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>{s}x</option>
            ))}
          </select>

          {/* Duration */}
          <select
            value={duration}
            onChange={(e) => onDurationChange(parseInt(e.target.value))}
            className="bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200
              rounded-lg px-2 py-1.5 text-sm font-medium cursor-pointer"
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>{formatDuration(d)}</option>
            ))}
          </select>

          {/* Follow camera toggle */}
          <button
            onClick={onFollowCameraToggle}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
              ${followCamera
                ? 'bg-cyan-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'}`}
          >
            Follow
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Stats */}
          <div className="text-sm text-zinc-500 dark:text-zinc-400 space-x-3 hidden sm:flex">
            <span>{formatDistance(traveled)} / {formatDistance(total)}</span>
            <span>{formatDuration(elapsed)} / {formatDuration(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
