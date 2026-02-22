import type { TrackPoint } from '@/types'

function haversineDistance(a: TrackPoint, b: TrackPoint): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function computeCumulativeDistances(points: TrackPoint[]): number[] {
  if (points.length === 0) return []
  const distances = [0]
  for (let i = 1; i < points.length; i++) {
    distances.push(distances[i - 1] + haversineDistance(points[i - 1], points[i]))
  }
  return distances
}

export function totalDistance(points: TrackPoint[]): number {
  let d = 0
  for (let i = 1; i < points.length; i++) {
    d += haversineDistance(points[i - 1], points[i])
  }
  return d
}

export function computeBearing(from: TrackPoint, to: TrackPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const toDeg = (rad: number) => (rad * 180) / Math.PI
  const dLng = toRad(to.lng - from.lng)
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

  const clampedProgress = Math.max(0, Math.min(1, progress))
  const total = cumulativeDistances[cumulativeDistances.length - 1]
  const targetDist = clampedProgress * total

  let segIdx = 0
  for (let i = 1; i < cumulativeDistances.length; i++) {
    if (cumulativeDistances[i] >= targetDist) {
      segIdx = i - 1
      break
    }
    segIdx = i - 1
  }

  const segStart = cumulativeDistances[segIdx]
  const segEnd = cumulativeDistances[segIdx + 1] ?? segStart
  const segLen = segEnd - segStart
  const t = segLen > 0 ? (targetDist - segStart) / segLen : 0

  const a = points[segIdx]
  const b = points[segIdx + 1] ?? a

  const point: TrackPoint = {
    lng: a.lng + (b.lng - a.lng) * t,
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

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
