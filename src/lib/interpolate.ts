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
  const total = cumulativeDistances[cumulativeDistances.length - 1]
  const endpointResult = (pointIndex: number): InterpolationResult => {
    const point = { ...points[pointIndex] }
    let segmentStart = 0
    let segmentEnd = points.length - 1
    for (const startIndex of segmentStartIndices ?? []) {
      if (startIndex <= pointIndex) segmentStart = startIndex
      else {
        segmentEnd = startIndex - 1
        break
      }
    }

    let bearing = 0
    let foundBearing = false
    const pointDistance = cumulativeDistances[pointIndex] ?? 0
    for (let index = pointIndex + 1; index <= segmentEnd; index++) {
      const candidate = points[index]
      if (
        (cumulativeDistances[index] ?? pointDistance) > pointDistance
        && (candidate.lat !== point.lat || candidate.lng !== point.lng)
      ) {
        bearing = computeBearing(point, candidate)
        foundBearing = true
        break
      }
    }
    if (!foundBearing) {
      for (let index = pointIndex - 1; index >= segmentStart; index--) {
        const candidate = points[index]
        if (
          pointDistance > (cumulativeDistances[index] ?? pointDistance)
          && (candidate.lat !== point.lat || candidate.lng !== point.lng)
        ) {
          bearing = computeBearing(candidate, point)
          break
        }
      }
    }

    return {
      point,
      bearing,
      segmentIndex: pointIndex,
      distanceTraveled: pointDistance,
      totalDist: total ?? 0,
    }
  }

  // Distance plateaus at the beginning/end are segment boundaries, not
  // interpolatable edges. Keep both endpoints explicitly reachable.
  if (clampedProgress <= 0) return endpointResult(0)
  if (clampedProgress >= 1) return endpointResult(points.length - 1)

  if ((total ?? 0) <= 0) {
    // With no measurable edge, distance-space interpolation cannot advance.
    // Step through observations in index space instead of drawing a synthetic
    // line between intentionally disconnected singleton segments.
    const pointIndex = Math.min(points.length - 1, Math.floor(clampedProgress * points.length))
    return endpointResult(pointIndex)
  }
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

  // Compute bearing; if a and b are identical, look backward for a valid bearing
  let bearing = computeBearing(a, b)
  if (a.lat === b.lat && a.lng === b.lng && segIdx > 0) {
    // Walk backward to find the last distinct point for a meaningful bearing
    for (let k = segIdx - 1; k >= 0; k--) {
      if (points[k].lat !== a.lat || points[k].lng !== a.lng) {
        bearing = computeBearing(points[k], a)
        break
      }
    }
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
