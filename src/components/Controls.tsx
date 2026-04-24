'use client'

import { useCallback } from 'react'
import { Play, Pause } from 'lucide-react'
import { formatDistance, formatDuration, type UnitSystem } from '@/lib/interpolate'
import { useLocale } from '@/lib/i18n'

interface ControlsProps {
  cumulativeDistances: number[]
  isPlaying: boolean
  progress: number
  speed: number
  duration: number
  units: UnitSystem
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
  cumulativeDistances,
  isPlaying,
  progress,
  speed,
  duration,
  units,
  followCamera,
  onTogglePlay,
  onSeek,
  onSpeedChange,
  onDurationChange,
  onFollowCameraToggle,
}: ControlsProps) {
  const { t } = useLocale()
  const total = cumulativeDistances[cumulativeDistances.length - 1] ?? 0
  const traveled = progress >= 1 ? total : total * progress
  const elapsed = duration * progress

  const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (Number.isFinite(value)) onSeek(value)
  }, [onSeek])

  return (
    <div>
      <div className="gc nh mx-4 mb-2 p-2.5 sm:mb-4 sm:p-4" style={{ borderRadius: 'var(--r-glass)' }}>
        {/* Progress bar — thicker for touch */}
        <div className="mb-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={handleProgressChange}
            aria-label={t('controls.progressAria')}
            aria-valuetext={t('controls.progressValueText').replace('{traveled}', formatDistance(traveled, units)).replace('{total}', formatDistance(total, units)).replace('{percent}', String(Math.round(progress * 100)))}
            className="w-full h-3 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(var(--gl)) ${progress * 100}%, rgba(var(--gl),.15) ${progress * 100}%)`,
              accentColor: 'rgb(var(--gl))',
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div data-testid="controls-primary-row" className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3" style={{ rowGap: '0.375rem' }}>
            {/* Play/Pause */}
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? t('controls.pause') : t('controls.play')}
              title={isPlaying ? t('controls.pauseKey') : t('controls.playKey')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
              style={{ background: 'rgba(var(--gl),.85)', color: 'var(--gl-fg)' }}
            >
              {isPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            {/* Speed */}
            <div className="flex shrink-0 items-center gap-1">
              <span className="text-[10px] font-medium hidden sm:inline" style={{ color: 'var(--t4)' }}>{t('controls.speedLabel')}</span>
              <select
                value={speed}
                onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    if (Number.isFinite(value)) onSpeedChange(value)
                  }}
                aria-label={t('controls.playbackSpeed')}
                title={t('controls.playbackSpeed')}
                className="vitro-select min-h-11 px-2 py-1.5 text-xs sm:text-sm font-medium"
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>{s}x</option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <select
              value={duration}
              onChange={(e) => {
                    const value = parseInt(e.target.value, 10)
                    if (Number.isFinite(value)) onDurationChange(value)
                  }}
              aria-label={t('controls.animationDuration')}
              title={t('controls.animationDuration')}
              className="vitro-select shrink-0 min-h-11 px-2 py-1.5 text-xs sm:text-sm font-medium"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{formatDuration(d)}</option>
              ))}
            </select>

            {/* Follow camera toggle — show ON/OFF on touch devices */}
            <button
              type="button"
              onClick={onFollowCameraToggle}
              aria-label={followCamera ? t('controls.cameraFollowOn') : t('controls.cameraFollowOff')}
              title={followCamera ? t('controls.cameraFollowOnTitle') : t('controls.cameraFollowOffTitle')}
              className="gi shrink-0 min-h-11 px-3 py-2 text-xs sm:text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
              style={followCamera
                ? { background: 'rgba(var(--gl),.85)', color: 'var(--gl-fg)', border: '1px solid rgba(var(--gl),.5)' }
                : { color: 'var(--t3)' }
              }
            >
              <span className="hidden [@media(pointer:coarse)]:inline">{followCamera ? t('controls.trackOn') : t('controls.trackOff')}</span>
              <span className="[@media(pointer:coarse)]:hidden">{followCamera ? t('controls.following') : t('controls.follow')}</span>
            </button>
          </div>

          <div
            data-testid="playback-stats"
            className="flex w-full items-center justify-between gap-3 text-xs sm:ml-auto sm:w-auto sm:justify-end sm:text-sm whitespace-nowrap"
            style={{ color: 'var(--t3)' }}
          >
            <span>{formatDistance(traveled, units)} / {formatDistance(total, units)}</span>
            <span>{formatDuration(elapsed)} / {formatDuration(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
