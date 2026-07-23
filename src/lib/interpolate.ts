import type { TrackPoint } from '@/types'

const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI
export const normalizeLng = (lng: number) => {
  if (!Number.isFinite(lng)) return 0
  return ((lng + 180) % 360 + 360) % 360 - 180
}
export const shortestLngDelta = (from: number, to: number) => ((to - from + 540) % 360) - 180

/** Adjust a longitude to be within ±180° of a reference longitude.
 *  Used for antimeridian wrapping when building continuous coordinate arrays. */
export function wrapLngNear(referenceLng: number, nextLng: number): number {
  if (!Number.isFinite(referenceLng) || !Number.isFinite(nextLng)) return nextLng
  const delta = nextLng - referenceLng
  if (delta > 180) {
    if (!Number.isFinite(delta)) {
      const wrappedDelta = normalizeLng(nextLng) - normalizeLng(referenceLng)
      const nearbyDelta = wrappedDelta > 180 ? wrappedDelta - 360 : wrappedDelta
      return referenceLng + (nearbyDelta === -180 ? 180 : nearbyDelta)
    }
    return nextLng - Math.ceil((delta - 180) / 360) * 360
  }
  if (delta < -180) {
    if (!Number.isFinite(delta)) {
      const wrappedDelta = normalizeLng(nextLng) - normalizeLng(referenceLng)
      const nearbyDelta = wrappedDelta < -180 ? wrappedDelta + 360 : wrappedDelta
      return referenceLng + (nearbyDelta === 180 ? -180 : nearbyDelta)
    }
    return nextLng + Math.ceil((-180 - delta) / 360) * 360
  }
  return nextLng
}

function haversineDistance(a: TrackPoint, b: TrackPoint): number {
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(shortestLngDelta(a.lng, b.lng))
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = Math.min(1, sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng)
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function computeCumulativeDistances(points: TrackPoint[], segmentStartIndices: number[] = []): number[] {
  if (points.length === 0) return []
  const segmentStarts = new Set(segmentStartIndices)
  const distances = [0]
  for (let i = 1; i < points.length; i++) {
    const segmentDistance = segmentStarts.has(i)
      ? 0
      : haversineDistance(points[i - 1], points[i])
    distances.push(distances[i - 1] + segmentDistance)
  }
  return distances
}

export function totalDistance(points: TrackPoint[], segmentStartIndices: number[] = []): number {
  const segmentStarts = new Set(segmentStartIndices)
  let d = 0
  for (let i = 1; i < points.length; i++) {
    if (segmentStarts.has(i)) continue
    d += haversineDistance(points[i - 1], points[i])
  }
  return d
}

export function findDistanceIndexAtOrAfter(
  cumulativeDistances: number[],
  targetDistance: number,
  startIndex = 0,
): number {
  if (cumulativeDistances.length === 0) return 0
  let lo = Math.max(0, Math.min(startIndex, cumulativeDistances.length - 1))
  let hi = cumulativeDistances.length - 1
  if (targetDistance <= cumulativeDistances[lo]) return lo
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (cumulativeDistances[mid] < targetDistance) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  return lo
}

export function computeBearing(from: TrackPoint, to: TrackPoint): number {
  const dLng = toRad(shortestLngDelta(from.lng, to.lng))
  const y = Math.sin(dLng) * Math.cos(toRad(to.lat))
  const x = Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat))
    - Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export interface InterpolationResult {
  point: TrackPoint
  bearing: number
  segmentIndex: number
  distanceTraveled: number
  totalDist: number
}

interface SegmentBounds {
  start: number
  end: number
}

function findSegmentBounds(
  pointCount: number,
  segmentStartIndices: number[] | undefined,
  pointIndex: number,
): SegmentBounds {
  const lastIndex = Math.max(0, pointCount - 1)
  const index = Math.max(0, Math.min(lastIndex, Math.trunc(pointIndex)))
  const starts = segmentStartIndices ?? []
  let low = 0
  let high = starts.length

  while (low < high) {
    const middle = (low + high) >> 1
    if (starts[middle] <= index) low = middle + 1
    else high = middle
  }

  return {
    start: low > 0 ? starts[low - 1] : 0,
    end: low < starts.length ? starts[low] - 1 : lastIndex,
  }
}

function findFirstDistanceGreaterThan(
  cumulativeDistances: number[],
  targetDistance: number,
  startIndex: number,
  endIndex: number,
): number | undefined {
  let low = Math.max(0, startIndex)
  let high = Math.min(cumulativeDistances.length - 1, endIndex) + 1
  const boundedEnd = high - 1

  while (low < high) {
    const middle = (low + high) >> 1
    if ((cumulativeDistances[middle] ?? targetDistance) > targetDistance) high = middle
    else low = middle + 1
  }

  return low <= boundedEnd ? low : undefined
}

function findLastDistanceLessThan(
  cumulativeDistances: number[],
  targetDistance: number,
  startIndex: number,
  endIndex: number,
): number | undefined {
  const boundedStart = Math.max(0, startIndex)
  let low = boundedStart
  let high = Math.min(cumulativeDistances.length - 1, endIndex) + 1

  while (low < high) {
    const middle = (low + high) >> 1
    if ((cumulativeDistances[middle] ?? targetDistance) < targetDistance) low = middle + 1
    else high = middle
  }

  const result = low - 1
  return result >= boundedStart ? result : undefined
}

export function interpolateAlongTrack(
  points: TrackPoint[],
  cumulativeDistances: number[],
  progress: number,
  segmentStartIndices?: number[],
): InterpolationResult {
  // Guard: empty or single-point tracks
  if (points.length === 0) {
    return {
      point: { lng: 0, lat: 0 },
      bearing: 0,
      segmentIndex: 0,
      distanceTraveled: 0,
      totalDist: 0,
    }
  }
  if (points.length === 1) {
    return {
      point: { ...points[0] },
      bearing: 0,
      segmentIndex: 0,
      distanceTraveled: 0,
      totalDist: 0,
    }
  }

  const clampedProgress = Number.isFinite(progress)
    ? Math.max(0, Math.min(1, progress))
    : 0
  const total = cumulativeDistances[cumulativeDistances.length - 1] ?? 0

  // A track with no measurable edge has no direction to discover. Resolve
  // observations directly in index space so identical points and
  // disconnected singleton segments stay constant-time and never acquire a
  // synthetic connector.
  if (!(total > 0)) {
    const pointIndex = clampedProgress >= 1
      ? points.length - 1
      : Math.min(points.length - 1, Math.floor(clampedProgress * points.length))
    return {
      point: { ...points[pointIndex] },
      bearing: 0,
      segmentIndex: pointIndex,
      distanceTraveled: 0,
      totalDist: 0,
    }
  }

  const indexedBearing = (
    pointIndex: number,
    bounds: SegmentBounds,
    preferForward: boolean,
  ): number => {
    const point = points[pointIndex]
    const pointDistance = cumulativeDistances[pointIndex] ?? 0
    const forwardBearing = () => {
      const candidateIndex = findFirstDistanceGreaterThan(
        cumulativeDistances,
        pointDistance,
        pointIndex + 1,
        bounds.end,
      )
      if (candidateIndex == null) return undefined
      const candidate = points[candidateIndex]
      if (candidate.lat === point.lat && candidate.lng === point.lng) return undefined
      return computeBearing(point, candidate)
    }
    const backwardBearing = () => {
      const candidateIndex = findLastDistanceLessThan(
        cumulativeDistances,
        pointDistance,
        bounds.start,
        pointIndex - 1,
      )
      if (candidateIndex == null) return undefined
      const candidate = points[candidateIndex]
      if (candidate.lat === point.lat && candidate.lng === point.lng) return undefined
      return computeBearing(candidate, point)
    }
    return (preferForward
      ? forwardBearing() ?? backwardBearing()
      : backwardBearing() ?? forwardBearing()) ?? 0
  }

  const endpointResult = (pointIndex: number): InterpolationResult => {
    const point = { ...points[pointIndex] }
    const bounds = findSegmentBounds(points.length, segmentStartIndices, pointIndex)
    const pointDistance = cumulativeDistances[pointIndex] ?? 0

    return {
      point,
      bearing: indexedBearing(pointIndex, bounds, true),
      segmentIndex: pointIndex,
      distanceTraveled: pointDistance,
      totalDist: total,
    }
  }

  // Distance plateaus at the beginning/end are segment boundaries, not
  // interpolatable edges. Keep both endpoints explicitly reachable.
  if (clampedProgress <= 0) return endpointResult(0)
  if (clampedProgress >= 1) return endpointResult(points.length - 1)

  const targetDist = clampedProgress * total

  let lo = 0
  let hi = cumulativeDistances.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (cumulativeDistances[mid] <= targetDist) lo = mid
    else hi = mid
  }
  const segIdx = lo

  const segStart = cumulativeDistances[segIdx]
  const segEnd = cumulativeDistances[segIdx + 1] ?? segStart
  const segLen = segEnd - segStart
  const t = segLen > 0 ? (targetDist - segStart) / segLen : 0

  const a = points[segIdx]
  const b = points[segIdx + 1] ?? a

  const point: TrackPoint = {
    lng: normalizeLng(a.lng + shortestLngDelta(a.lng, b.lng) * t),
    lat: a.lat + (b.lat - a.lat) * t,
    ele: a.ele != null && b.ele != null ? a.ele + (b.ele - a.ele) * t : a.ele,
    time: a.time && b.time
      ? new Date(a.time.getTime() + (b.time.getTime() - a.time.getTime()) * t)
      : a.time,
  }

  // Duplicate plateaus are indexed by cumulative distance, so bearing
  // recovery remains logarithmic and stays inside the owning segment.
  let bearing = computeBearing(a, b)
  if (a.lat === b.lat && a.lng === b.lng) {
    const bounds = findSegmentBounds(points.length, segmentStartIndices, segIdx)
    bearing = indexedBearing(segIdx, bounds, false)
  }

  return {
    point,
    bearing,
    segmentIndex: segIdx,
    distanceTraveled: targetDist,
    totalDist: total,
  }
}

export type UnitSystem = 'metric' | 'imperial'

const UNITS_STORAGE_KEY = 'travelback-units'

export function getUnitPreference(): UnitSystem {
  if (typeof window === 'undefined') return 'metric'
  try {
    const stored = localStorage.getItem(UNITS_STORAGE_KEY)
    if (stored === 'metric' || stored === 'imperial') return stored
  } catch { /* ignore */ }
  return 'metric'
}

export function setUnitPreference(units: UnitSystem): void {
  try { localStorage.setItem(UNITS_STORAGE_KEY, units) } catch { /* ignore */ }
}

export function formatDistance(meters: number, units?: UnitSystem): string {
  const u = units ?? getUnitPreference()
  if (u === 'imperial') {
    const feet = meters * 3.28084
    if (feet < 1000) return `${Math.round(feet)} ft`
    return `${(feet / 5280).toFixed(1)} mi`
  }
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatElevation(meters: number, units?: UnitSystem): string {
  const u = units ?? getUnitPreference()
  if (u === 'imperial') return `${Math.round(meters * 3.28084)} ft`
  return `${Math.round(meters)} m`
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
