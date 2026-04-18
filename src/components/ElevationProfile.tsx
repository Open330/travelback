'use client'

import { useMemo } from 'react'
import type { Track } from '@/types'
import { formatElevation, type UnitSystem } from '@/lib/interpolate'
import { useLocale } from '@/lib/i18n'

interface ElevationProfileProps {
  track: Track
  progress: number
  onSeek: (progress: number) => void
  units: UnitSystem
}

export default function ElevationProfile({ track, progress, onSeek, units }: ElevationProfileProps) {
  const { t } = useLocale()
  const elevations = useMemo(() => {
    return track.points.map((point) => Number.isFinite(point.ele) ? point.ele ?? null : null)
  }, [track])

  const hasElevation = useMemo(() => {
    return elevations.some(e => e !== null)
  }, [elevations])

  const { minEle, maxEle, pathD, areaD } = useMemo(() => {
    if (!hasElevation) return { minEle: 0, maxEle: 0, pathD: '', areaD: '' }

    let min = Infinity
    let max = -Infinity
    for (const e of elevations) {
      if (e !== null) {
        if (e < min) min = e
        if (e > max) max = e
      }
    }
    const range = max - min || 1

    const w = 100
    const h = 100

    const points: string[] = []
    const n = elevations.length
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w
      const ele = elevations[i] ?? min
      const y = h - ((ele - min) / range) * h
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
    }

    const pathD = `M${points.join(' L')}`
    const areaD = `M0,${h} L${points.join(' L')} L${w},${h} Z`

    return { minEle: min, maxEle: max, pathD, areaD }
  }, [elevations, hasElevation])

  if (!hasElevation) return null

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    onSeek(Math.max(0, Math.min(1, x)))
  }

  const progressX = progress * 100
  const elevRange = maxEle - minEle

  return (
    <div className="w-full">
      <div className="hidden items-center justify-between px-1 text-[9px] sm:flex" style={{ color: 'var(--t4)' }}>
        <span>{t('elevation.label')}</span>
        <span>{formatElevation(minEle, units)} — {formatElevation(maxEle, units)} ({formatElevation(elevRange, units)} Δ)</span>
      </div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-6 w-full rounded pointer-events-none sm:pointer-events-auto sm:cursor-pointer sm:h-10"
        onClick={handleClick}
        aria-label={t('elevation.profileAria')}
      >
        {/* Gradient fill */}
        <defs>
          <linearGradient id="elev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaD} fill="url(#elev-grad)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />

        {/* Completed area */}
        <clipPath id="elev-clip">
          <rect x="0" y="0" width={progressX} height="100" />
        </clipPath>
        <path d={areaD} fill="#06b6d4" opacity="0.25" clipPath="url(#elev-clip)" />

        {/* Progress line */}
        <line
          x1={progressX} y1="0" x2={progressX} y2="100"
          stroke="#f97316" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
          opacity="0.8"
        />
      </svg>
    </div>
  )
}
