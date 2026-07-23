'use client'

import { useMemo, useId } from 'react'
import type { Track, TrackPoint } from '@/types'
import { formatElevation, type UnitSystem } from '@/lib/interpolate'
import { useLocale } from '@/lib/i18n'

export const ELEVATION_GEOMETRY_POINT_BUDGET = 2_048

const MIN_POINTS_PER_SELECTED_RUN = 4
const CHART_WIDTH = 100
const CHART_HEIGHT = 100

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

interface ElevationRun {
  startIndex: number
  endIndex: number
}

type ElevationAccessor<T> = (sample: T) => number | null | undefined

function finiteElevation<T>(
  samples: readonly T[],
  index: number,
  getElevation: ElevationAccessor<T>,
): number | null {
  const elevation = getElevation(samples[index])
  return typeof elevation === 'number' && Number.isFinite(elevation) ? elevation : null
}

function normalizeSegmentStarts(pointCount: number, segmentStartIndices: readonly number[]): Set<number> {
  const starts = new Set<number>()
  for (const index of segmentStartIndices) {
    if (Number.isInteger(index) && index > 0 && index < pointCount) starts.add(index)
  }
  return starts
}

function hasUsableDistanceScale(cumulativeDistances: readonly number[], pointCount: number): boolean {
  if (pointCount <= 1 || cumulativeDistances.length < pointCount) return false
  const totalDistance = cumulativeDistances[pointCount - 1]
  if (!Number.isFinite(totalDistance) || totalDistance <= 0) return false
  for (let index = 0; index < pointCount; index++) {
    if (!Number.isFinite(cumulativeDistances[index])) return false
  }
  return true
}

function selectRunOrdinals(
  runCount: number,
  minRunOrdinal: number,
  maxRunOrdinal: number,
): Set<number> {
  const maxSelectedRuns = Math.max(
    1,
    Math.floor(ELEVATION_GEOMETRY_POINT_BUDGET / MIN_POINTS_PER_SELECTED_RUN),
  )
  const selected = new Set<number>()

  if (runCount <= maxSelectedRuns) {
    for (let ordinal = 0; ordinal < runCount; ordinal++) selected.add(ordinal)
    return selected
  }

  // It is impossible to encode more disconnected runs than there are SVG
  // coordinates in a fixed budget. Keep the visible profile endpoints and the
  // runs containing its global extrema, then sample the remaining runs evenly.
  selected.add(0)
  selected.add(runCount - 1)
  selected.add(minRunOrdinal)
  selected.add(maxRunOrdinal)

  const representativeSlots = maxSelectedRuns - selected.size
  for (let slot = 1; slot <= representativeSlots; slot++) {
    selected.add(Math.round((slot * (runCount - 1)) / (representativeSlots + 1)))
  }
  return selected
}

function collectSelectedRuns<T>(
  samples: readonly T[],
  getElevation: ElevationAccessor<T>,
  segmentStarts: ReadonlySet<number>,
  selectedOrdinals: ReadonlySet<number>,
): ElevationRun[] {
  const runs: ElevationRun[] = []
  let activeStart = -1
  let previousWasValid = false
  let runOrdinal = -1

  for (let index = 0; index < samples.length; index++) {
    const elevation = finiteElevation(samples, index, getElevation)
    if (elevation === null) {
      if (activeStart >= 0) runs.push({ startIndex: activeStart, endIndex: index - 1 })
      activeStart = -1
      previousWasValid = false
      continue
    }

    const startsRun = !previousWasValid || segmentStarts.has(index)
    if (startsRun) {
      if (activeStart >= 0) runs.push({ startIndex: activeStart, endIndex: index - 1 })
      runOrdinal++
      activeStart = selectedOrdinals.has(runOrdinal) ? index : -1
    }
    previousWasValid = true
  }

  if (activeStart >= 0) runs.push({ startIndex: activeStart, endIndex: samples.length - 1 })
  return runs
}

function runSamplingWeight(
  run: ElevationRun,
  cumulativeDistances: readonly number[],
  useDistanceScale: boolean,
): number {
  if (useDistanceScale) {
    const distanceSpan = cumulativeDistances[run.endIndex] - cumulativeDistances[run.startIndex]
    if (Number.isFinite(distanceSpan) && distanceSpan > 0) return distanceSpan
  }
  return Math.max(1, run.endIndex - run.startIndex)
}

function allocateRunPointBudgets(
  runs: readonly ElevationRun[],
  cumulativeDistances: readonly number[],
  useDistanceScale: boolean,
): number[] {
  const budgets = runs.map((run) => (
    Math.min(MIN_POINTS_PER_SELECTED_RUN, run.endIndex - run.startIndex + 1)
  ))
  let remaining = ELEVATION_GEOMETRY_POINT_BUDGET
    - budgets.reduce((total, budget) => total + budget, 0)

  while (remaining > 0) {
    const expandable = runs
      .map((run, index) => ({
        index,
        capacity: run.endIndex - run.startIndex + 1 - budgets[index],
        weight: runSamplingWeight(run, cumulativeDistances, useDistanceScale),
      }))
      .filter(({ capacity }) => capacity > 0)

    if (expandable.length === 0) break

    const availableThisRound = remaining
    const totalWeight = expandable.reduce((total, item) => total + item.weight, 0)
    let granted = 0
    for (const { index, capacity, weight } of expandable) {
      const proportionalShare = Math.floor((availableThisRound * weight) / totalWeight)
      const grant = Math.min(proportionalShare, capacity)
      budgets[index] += grant
      granted += grant
    }

    if (granted === 0) {
      const next = expandable.reduce((best, item) => item.weight > best.weight ? item : best)
      budgets[next.index]++
      granted = 1
    }
    remaining -= granted
  }

  return budgets
}

function selectRunPointIndices<T>(
  samples: readonly T[],
  run: ElevationRun,
  pointBudget: number,
  cumulativeDistances: readonly number[],
  useDistanceScale: boolean,
  getElevation: ElevationAccessor<T>,
): number[] {
  const runLength = run.endIndex - run.startIndex + 1
  if (runLength <= pointBudget) {
    return Array.from({ length: runLength }, (_, offset) => run.startIndex + offset)
  }

  const bucketCount = Math.max(1, Math.floor((pointBudget - 2) / 2))
  const minIndices = new Array<number>(bucketCount).fill(-1)
  const maxIndices = new Array<number>(bucketCount).fill(-1)
  const minElevations = new Array<number>(bucketCount).fill(Infinity)
  const maxElevations = new Array<number>(bucketCount).fill(-Infinity)
  const startPosition = useDistanceScale
    ? cumulativeDistances[run.startIndex]
    : run.startIndex
  const endPosition = useDistanceScale
    ? cumulativeDistances[run.endIndex]
    : run.endIndex
  const positionSpan = endPosition - startPosition
  const sampleByDistance = useDistanceScale && positionSpan > 0
  const samplingStart = sampleByDistance ? startPosition : run.startIndex
  const samplingSpan = sampleByDistance ? positionSpan : run.endIndex - run.startIndex

  for (let index = run.startIndex + 1; index < run.endIndex; index++) {
    const elevation = finiteElevation(samples, index, getElevation)
    if (elevation === null) continue
    const position = sampleByDistance ? cumulativeDistances[index] : index
    const fraction = Math.max(0, Math.min(1, (position - samplingStart) / samplingSpan))
    const bucketIndex = Math.min(bucketCount - 1, Math.floor(fraction * bucketCount))

    if (elevation < minElevations[bucketIndex]) {
      minElevations[bucketIndex] = elevation
      minIndices[bucketIndex] = index
    }
    if (elevation > maxElevations[bucketIndex]) {
      maxElevations[bucketIndex] = elevation
      maxIndices[bucketIndex] = index
    }
  }

  const interiorIndices: number[] = []
  for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
    if (minIndices[bucketIndex] >= 0) interiorIndices.push(minIndices[bucketIndex])
    if (maxIndices[bucketIndex] >= 0 && maxIndices[bucketIndex] !== minIndices[bucketIndex]) {
      interiorIndices.push(maxIndices[bucketIndex])
    }
  }
  interiorIndices.sort((left, right) => left - right)

  return [run.startIndex, ...interiorIndices, run.endIndex]
}

function buildElevationGeometryFromSamples<T>(
  samples: readonly T[],
  cumulativeDistances: readonly number[],
  segmentStartIndices: readonly number[],
  getElevation: ElevationAccessor<T>,
): ElevationGeometry | null {
  const pointCount = samples.length
  const segmentStarts = normalizeSegmentStarts(pointCount, segmentStartIndices)
  let minEle = Infinity
  let maxEle = -Infinity
  let minRunOrdinal = -1
  let maxRunOrdinal = -1
  let currentRunOrdinal = -1
  let previousWasValid = false
  let runCount = 0

  for (let index = 0; index < pointCount; index++) {
    const elevation = finiteElevation(samples, index, getElevation)
    if (elevation === null) {
      previousWasValid = false
      continue
    }

    if (!previousWasValid || segmentStarts.has(index)) {
      currentRunOrdinal = runCount
      runCount++
    }
    if (elevation < minEle) {
      minEle = elevation
      minRunOrdinal = currentRunOrdinal
    }
    if (elevation > maxEle) {
      maxEle = elevation
      maxRunOrdinal = currentRunOrdinal
    }
    previousWasValid = true
  }
  if (!Number.isFinite(minEle) || !Number.isFinite(maxEle)) return null

  const range = maxEle - minEle || 1
  const totalDistance = cumulativeDistances[pointCount - 1]
  const useDistanceScale = hasUsableDistanceScale(cumulativeDistances, pointCount)
  const selectedOrdinals = selectRunOrdinals(runCount, minRunOrdinal, maxRunOrdinal)
  const runs = collectSelectedRuns(
    samples,
    getElevation,
    segmentStarts,
    selectedOrdinals,
  )
  const runPointBudgets = allocateRunPointBudgets(runs, cumulativeDistances, useDistanceScale)
  const pathParts: string[] = []
  const areaParts: string[] = []

  for (let runIndex = 0; runIndex < runs.length; runIndex++) {
    const indices = selectRunPointIndices(
      samples,
      runs[runIndex],
      runPointBudgets[runIndex],
      cumulativeDistances,
      useDistanceScale,
      getElevation,
    )
    const coordinates: string[] = []
    let firstX = ''
    let lastX = ''

    for (const index of indices) {
      const elevation = finiteElevation(samples, index, getElevation)
      if (elevation === null) continue
      const x = useDistanceScale
        ? (cumulativeDistances[index] / totalDistance) * CHART_WIDTH
        : pointCount === 1
          ? CHART_WIDTH / 2
          : (index / (pointCount - 1)) * CHART_WIDTH
      const xText = x.toFixed(2)
      const yText = (CHART_HEIGHT - ((elevation - minEle) / range) * CHART_HEIGHT).toFixed(2)
      if (firstX === '') firstX = xText
      lastX = xText
      coordinates.push(`${xText},${yText}`)
    }

    if (coordinates.length === 0) continue
    const coordinateText = coordinates.join(' L')
    pathParts.push(`M${coordinateText}`)
    if (coordinates.length >= 2) {
      areaParts.push(
        `M${firstX},${CHART_HEIGHT} L${coordinateText} L${lastX},${CHART_HEIGHT} Z`,
      )
    }
  }

  return {
    minEle,
    maxEle,
    pathD: pathParts.join(' '),
    areaD: areaParts.join(' '),
  }
}

export function buildElevationGeometry(
  elevations: ReadonlyArray<number | null | undefined>,
  cumulativeDistances: readonly number[],
  segmentStartIndices: readonly number[] = [],
): ElevationGeometry | null {
  return buildElevationGeometryFromSamples(
    elevations,
    cumulativeDistances,
    segmentStartIndices,
    (elevation) => elevation,
  )
}

function buildTrackElevationGeometry(
  points: readonly TrackPoint[],
  cumulativeDistances: readonly number[],
  segmentStartIndices: readonly number[] = [],
): ElevationGeometry | null {
  return buildElevationGeometryFromSamples(
    points,
    cumulativeDistances,
    segmentStartIndices,
    (point) => point.ele,
  )
}

export default function ElevationProfile({ track, cumulativeDistances, progress, onSeek, units }: ElevationProfileProps) {
  const { t } = useLocale()
  const gradientId = useId()
  const clipId = useId()
  const areaShapeId = useId()

  const cumulDist = cumulativeDistances

  const geometry = useMemo(
    () => buildTrackElevationGeometry(track.points, cumulDist, track.segmentStartIndices),
    [track.points, cumulDist, track.segmentStartIndices],
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
          <path id={areaShapeId} d={areaD} />
        </defs>

        <use href={`#${areaShapeId}`} fill={`url(#${gradientId})`} aria-hidden="true" />

        <path d={pathD} fill="none" stroke="rgb(var(--gl))" strokeWidth={1.5} vectorEffect="non-scaling-stroke" aria-hidden="true" />

        <clipPath id={clipId}>
          <rect x="0" y="0" width={progressX} height="100" />
        </clipPath>
        <use href={`#${areaShapeId}`} fill="rgb(var(--gl))" opacity={0.25} clipPath={`url(#${clipId})`} aria-hidden="true" />

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
