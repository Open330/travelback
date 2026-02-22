'use client'

import { useMemo } from 'react'
import type { Track } from '@/types'
import { formatElevation } from '@/lib/interpolate'
import { useLocale } from '@/lib/i18n'

interface ElevationProfileProps {
  track: Track
  progress: number
  onSeek: (progress: number) => void
}

export default function ElevationProfile({ track, progress, onSeek }: ElevationProfileProps) {
  const { t } = useLocale()
  const elevations = useMemo(() => {
    return track.points.map(p => p.ele ?? null)
  }, [track])

  const hasElevation = useMemo(() => {
    return elevations.some(e => e !== null)
  }, [elevations])

  const { minEle, maxEle, pathD, areaD } = useMemo(() => {
    if (!hasElevation) return { minEle: 0, maxEle: 0, pathD: '', areaD: '' }

    const valid = elevations.filter((e): e is number => e !== null)
    const min = Math.min(...valid)
    const max = Math.max(...valid)
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
      <div className="flex items-center justify-between text-[9px] mb-0.5 px-1" style={{ color: 'var(--t4)' }}>
        <span>{t('elevation.label')}</span>
        <span>{formatElevation(minEle)} — {formatElevation(maxEle)} ({formatElevation(elevRange)} Δ)</span>
      </div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-10 cursor-pointer rounded"
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

