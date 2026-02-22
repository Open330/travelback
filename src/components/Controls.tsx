'use client'

import { useCallback } from 'react'
import { Play, Pause } from 'lucide-react'
import type { Track } from '@/types'
import { formatDistance, formatDuration, totalDistance } from '@/lib/interpolate'
import { useLocale } from '@/lib/i18n'

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
  const { t } = useLocale()
  const total = totalDistance(track.points)
  const traveled = total * progress
  const elapsed = duration * progress

  const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value))
  }, [onSeek])

  return (
    <div>
      <div className="gc nh mx-4 mb-4 p-4" style={{ borderRadius: 'var(--r-glass)' }}>
        {/* Progress bar — thicker for touch */}
        <div className="mb-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={handleProgressChange}
            aria-label="Playback progress"
            className="w-full h-3 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:cursor-pointer"
            style={{
              background: 'rgba(var(--gl),.15)',
              accentColor: 'rgb(var(--gl))',
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? t('controls.pause') : t('controls.play')}
            title={isPlaying ? t('controls.pauseKey') : t('controls.playKey')}
            className="w-10 h-10 flex items-center justify-center rounded-full cursor-pointer transition-colors"
            style={{ background: 'rgba(var(--gl),.85)', color: '#fff' }}
          >
            {isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          {/* Speed */}
          <select
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            aria-label={t('controls.playbackSpeed')}
            title={t('controls.playbackSpeed')}
            className="vitro-select px-2 py-1.5 text-sm font-medium"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>{s}x</option>
            ))}
          </select>

          {/* Duration */}
          <select
            value={duration}
            onChange={(e) => onDurationChange(parseInt(e.target.value))}
            aria-label={t('controls.animationDuration')}
            title={t('controls.animationDuration')}
            className="vitro-select px-2 py-1.5 text-sm font-medium"
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>{formatDuration(d)}</option>
            ))}
          </select>

          {/* Follow camera toggle */}
          <button
            onClick={onFollowCameraToggle}
            aria-label={followCamera ? t('controls.cameraFollowOn') : t('controls.cameraFollowOff')}
            title={followCamera ? t('controls.cameraFollowOnTitle') : t('controls.cameraFollowOffTitle')}
            className="gi px-3 py-1.5 text-sm font-medium cursor-pointer"
            style={followCamera
              ? { background: 'rgba(var(--gl),.85)', color: '#fff', border: '1px solid rgba(var(--gl),.5)' }
              : { color: 'var(--t3)' }
            }
          >
            {t('controls.follow')}
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Stats — always visible, compact on mobile */}
          <div className="text-xs sm:text-sm space-x-2 sm:space-x-3 flex" style={{ color: 'var(--t3)' }}>
            <span>{formatDistance(traveled)} / {formatDistance(total)}</span>
            <span className="hidden sm:inline">{formatDuration(elapsed)} / {formatDuration(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
