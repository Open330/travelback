'use client'

import { useMemo, useId } from 'react'
import type { Track } from '@/types'
import { formatElevation, type UnitSystem } from '@/lib/interpolate'
import { useLocale } from '@/lib/i18n'

interface ElevationProfileProps {
  track: Track
  cumulativeDistances: number[]
  progress: number
  onSeek: (progress: number) => void
  units: UnitSystem
}

interface ElevationGeometry {
  minEle: number
  maxEle: number
  pathD: string
  areaD: string
}

export function buildElevationGeometry(
  elevations: Array<number | null | undefined>,
  cumulativeDistances: number[],
): ElevationGeometry | null {
  let minEle = Infinity
  let maxEle = -Infinity
  for (const elevation of elevations) {
    if (typeof elevation !== 'number' || !Number.isFinite(elevation)) continue
    if (elevation < minEle) minEle = elevation
    if (elevation > maxEle) maxEle = elevation
  }
  if (!Number.isFinite(minEle) || !Number.isFinite(maxEle)) return null

  const range = maxEle - minEle || 1
  const width = 100
  const height = 100
  const pointCount = elevations.length
  const totalDistance = cumulativeDistances[pointCount - 1]
  const useDistanceScale = pointCount > 1
    && cumulativeDistances.length >= pointCount
    && typeof totalDistance === 'number'
    && Number.isFinite(totalDistance)
    && totalDistance > 0
    && cumulativeDistances.slice(0, pointCount).every((distance) => Number.isFinite(distance))

  const runs: Array<Array<{ x: number; y: number }>> = []
  let currentRun: Array<{ x: number; y: number }> = []
  for (let index = 0; index < pointCount; index++) {
    const elevation = elevations[index]
    if (typeof elevation !== 'number' || !Number.isFinite(elevation)) {
      if (currentRun.length > 0) runs.push(currentRun)
      currentRun = []
      continue
    }

    const x = useDistanceScale
      ? (cumulativeDistances[index] / totalDistance) * width
      : pointCount === 1
        ? width / 2
        : (index / (pointCount - 1)) * width
    const y = height - ((elevation - minEle) / range) * height
    currentRun.push({ x, y })
  }
  if (currentRun.length > 0) runs.push(currentRun)

  const pointText = (run: Array<{ x: number; y: number }>) => (
    run.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`)
  )
  const pathD = runs
    .map((run) => `M${pointText(run).join(' L')}`)
    .join(' ')
  const areaD = runs
    .filter((run) => run.length >= 2)
    .map((run) => {
      const points = pointText(run)
      return `M${run[0].x.toFixed(2)},${height} L${points.join(' L')} L${run[run.length - 1].x.toFixed(2)},${height} Z`
    })
    .join(' ')

  return { minEle, maxEle, pathD, areaD }
}

export default function ElevationProfile({ track, cumulativeDistances, progress, onSeek, units }: ElevationProfileProps) {
  const { t } = useLocale()
  const gradientId = useId()
  const clipId = useId()
  const elevations = useMemo(() => {
    return track.points.map((point) => Number.isFinite(point.ele) ? point.ele ?? null : null)
  }, [track.points])

  const cumulDist = cumulativeDistances

  const geometry = useMemo(
    () => buildElevationGeometry(elevations, cumulDist),
    [elevations, cumulDist],
  )

  if (!geometry) return null
  const { minEle, maxEle, pathD, areaD } = geometry

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
      e.stopPropagation()
      onSeek(Math.min(1, progress + step))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      onSeek(Math.max(0, progress - step))
    }
  }

  const progressX = progress * 100
  const elevRange = maxEle - minEle
  const progressPercent = Math.round(progressX)

  return (
    <div className="w-full">
      <div className="hidden items-center justify-between px-1 text-[9px] sm:flex" style={{ color: 'var(--t4)' }}>
        <span>{t('elevation.label')}</span>
        <span>{formatElevation(minEle, units)} — {formatElevation(maxEle, units)} ({formatElevation(elevRange, units)} Δ)</span>
      </div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-10 w-full rounded cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
        role="slider"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={t('elevation.profileAria')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        aria-valuetext={`${progressPercent}%`}
      >
        <defs aria-hidden="true">
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'rgb(var(--gl))', stopOpacity: 0.4 }} />
            <stop offset="100%" style={{ stopColor: 'rgb(var(--gl))', stopOpacity: 0.05 }} />
          </linearGradient>
        </defs>

        <path d={areaD} fill={`url(#${gradientId})`} aria-hidden="true" />

        <path d={pathD} fill="none" stroke="rgb(var(--gl))" strokeWidth={1.5} vectorEffect="non-scaling-stroke" aria-hidden="true" />

        <clipPath id={clipId}>
          <rect x="0" y="0" width={progressX} height="100" />
        </clipPath>
        <path d={areaD} fill="rgb(var(--gl))" opacity={0.25} clipPath={`url(#${clipId})`} aria-hidden="true" />

        <line
          x1={progressX} y1="0" x2={progressX} y2="100"
          stroke="var(--trail, #f97316)" strokeWidth={1.5} vectorEffect="non-scaling-stroke"
          opacity={0.8}
          aria-hidden="true"
        />
      </svg>
    </div>
  )
}
