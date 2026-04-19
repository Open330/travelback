'use client'

import { useMemo, useId } from 'react'
import type { Track } from '@/types'
import { formatElevation, computeCumulativeDistances, type UnitSystem } from '@/lib/interpolate'
import { useLocale } from '@/lib/i18n'

interface ElevationProfileProps {
  track: Track
  progress: number
  onSeek: (progress: number) => void
  units: UnitSystem
}

export default function ElevationProfile({ track, progress, onSeek, units }: ElevationProfileProps) {
  const { t } = useLocale()
  const gradientId = useId()
  const clipId = useId()
  const elevations = useMemo(() => {
    return track.points.map((point) => Number.isFinite(point.ele) ? point.ele ?? null : null)
  }, [track])

  const cumulDist = useMemo(
    () => computeCumulativeDistances(track.points, track.segmentStartIndices),
    [track]
  )

  const hasElevation = useMemo(() => {
    return elevations.some(e => e !== null)
  }, [elevations])

  const { minEle, maxEle, pathD, areaD } = useMemo(() => {
    if (!hasElevation || elevations.length < 2) return { minEle: 0, maxEle: 0, pathD: '', areaD: '' }

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
    const totalDist = cumulDist[cumulDist.length - 1] ?? 0
    for (let i = 0; i < n; i++) {
      const x = totalDist > 0 ? (cumulDist[i] / totalDist) * w : (i / (n - 1)) * w
      const ele = elevations[i] ?? min
      const y = h - ((ele - min) / range) * h
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
    }

    const pathD = `M${points.join(' L')}`
    const areaD = `M0,${h} L${points.join(' L')} L${w},${h} Z`

    return { minEle: min, maxEle: max, pathD, areaD }
  }, [elevations, hasElevation, cumulDist])

  if (!hasElevation) return null

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickFraction = (e.clientX - rect.left) / rect.width
    // The SVG x-axis is proportional to cumulative distance (see pathD computation),
    // so clickFraction already represents the correct distance-based progress value.
    // No binary search conversion is needed — using point-index progress would
    // produce incorrect seek targets when points are unevenly distributed by distance.
    onSeek(Math.max(0, Math.min(1, clickFraction)))
  }

  const handleKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const step = 0.02
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      onSeek(Math.min(1, progress + step))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      onSeek(Math.max(0, progress - step))
    }
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
        className="h-10 w-full rounded cursor-pointer"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={t('elevation.profileAria')}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'rgb(var(--gl))', stopOpacity: 0.4 }} />
            <stop offset="100%" style={{ stopColor: 'rgb(var(--gl))', stopOpacity: 0.05 }} />
          </linearGradient>
        </defs>

        <path d={areaD} fill={`url(#${gradientId})`} />

        <path d={pathD} fill="none" style={{ stroke: 'rgb(var(--gl))', strokeWidth: 1.5 }} vectorEffect="non-scaling-stroke" />

        <clipPath id={clipId}>
          <rect x="0" y="0" width={progressX} height="100" />
        </clipPath>
        <path d={areaD} style={{ fill: 'rgb(var(--gl))', opacity: 0.25 }} clipPath={`url(#${clipId})`} />

        <line
          x1={progressX} y1="0" x2={progressX} y2="100"
          style={{ stroke: 'var(--trail, #f97316)', strokeWidth: 1.5 }} vectorEffect="non-scaling-stroke"
          opacity="0.8"
        />
      </svg>
    </div>
  )
}
