import { describe, it, expect } from 'vitest'
import {
  computeCumulativeDistances,
  totalDistance,
  findDistanceIndexAtOrAfter,
  computeBearing,
  interpolateAlongTrack,
  normalizeLng,
  shortestLngDelta,
  formatDistance,
  formatElevation,
  formatDuration,
} from './interpolate'
import type { TrackPoint } from '@/types'

const makePoint = (lng: number, lat: number, ele?: number, time?: Date): TrackPoint => ({
  lng, lat, ...(ele != null ? { ele } : {}), ...(time ? { time } : {}),
})

describe('normalizeLng', () => {
  it('normalizes longitude to [-180, 180)', () => {
    expect(normalizeLng(0)).toBe(0)
    expect(normalizeLng(180)).toBe(-180)
    expect(normalizeLng(-180)).toBe(-180)
    expect(normalizeLng(360)).toBe(0)
    expect(normalizeLng(-360)).toBe(0)
    expect(normalizeLng(540)).toBeCloseTo(-180, 10)
  })

  it('handles values far outside range', () => {
    expect(normalizeLng(720)).toBeCloseTo(0, 10)
    expect(normalizeLng(-540)).toBeCloseTo(-180, 10)
  })
})

describe('shortestLngDelta', () => {
  it('returns shortest angular difference', () => {
    expect(shortestLngDelta(0, 10)).toBeCloseTo(10, 10)
    expect(shortestLngDelta(10, 0)).toBeCloseTo(-10, 10)
    expect(shortestLngDelta(170, -170)).toBeCloseTo(20, 10)
    expect(shortestLngDelta(-170, 170)).toBeCloseTo(-20, 10)
  })
})

describe('computeCumulativeDistances', () => {
  it('returns empty array for no points', () => {
    expect(computeCumulativeDistances([])).toEqual([])
  })

  it('returns [0] for a single point', () => {
    expect(computeCumulativeDistances([makePoint(0, 0)])).toEqual([0])
  })

  it('computes distances between consecutive points', () => {
    const points = [makePoint(0, 0), makePoint(0, 1), makePoint(0, 2)]
    const distances = computeCumulativeDistances(points)
    expect(distances.length).toBe(3)
    expect(distances[0]).toBe(0)
    // ~111km per degree of latitude
    expect(distances[1]).toBeGreaterThan(110000)
    expect(distances[1]).toBeLessThan(112000)
    expect(distances[2]).toBeGreaterThan(distances[1])
  })

  it('resets distance at segment start indices', () => {
    const points = [makePoint(0, 0), makePoint(0, 1), makePoint(0, 2)]
    const distances = computeCumulativeDistances(points, [2])
    expect(distances.length).toBe(3)
    expect(distances[0]).toBe(0)
    // Segment break at index 2: no distance contribution from index 1 to 2
    expect(distances[2]).toBeCloseTo(distances[1], 1)
  })
})

describe('totalDistance', () => {
  it('returns 0 for empty points', () => {
    expect(totalDistance([])).toBe(0)
  })

  it('computes total distance', () => {
    const points = [makePoint(0, 0), makePoint(0, 1)]
    const d = totalDistance(points)
    expect(d).toBeGreaterThan(110000)
    expect(d).toBeLessThan(112000)
  })
})

describe('findDistanceIndexAtOrAfter', () => {
  it('returns 0 for empty array', () => {
    expect(findDistanceIndexAtOrAfter([], 0)).toBe(0)
  })

  it('finds the correct index', () => {
    const dists = [0, 10, 20, 30, 40, 50]
    expect(findDistanceIndexAtOrAfter(dists, 0)).toBe(0)
    expect(findDistanceIndexAtOrAfter(dists, 10)).toBe(1)
    expect(findDistanceIndexAtOrAfter(dists, 25)).toBe(3)
    expect(findDistanceIndexAtOrAfter(dists, 50)).toBe(5)
    expect(findDistanceIndexAtOrAfter(dists, 100)).toBe(5)
  })

  it('uses startIndex hint', () => {
    const dists = [0, 10, 20, 30, 40, 50]
    expect(findDistanceIndexAtOrAfter(dists, 30, 3)).toBe(3)
    expect(findDistanceIndexAtOrAfter(dists, 30, 4)).toBe(4)
  })
})

describe('computeBearing', () => {
  it('computes north bearing', () => {
    const from = makePoint(0, 0)
    const to = makePoint(0, 1)
    const bearing = computeBearing(from, to)
    expect(bearing).toBeCloseTo(0, 0)
  })

  it('computes east bearing', () => {
    const from = makePoint(0, 0)
    const to = makePoint(1, 0)
    const bearing = computeBearing(from, to)
    expect(bearing).toBeCloseTo(90, 0)
  })

  it('computes south bearing', () => {
    const from = makePoint(0, 1)
    const to = makePoint(0, 0)
    const bearing = computeBearing(from, to)
    expect(bearing).toBeCloseTo(180, 0)
  })

  it('computes west bearing', () => {
    const from = makePoint(1, 0)
    const to = makePoint(0, 0)
    const bearing = computeBearing(from, to)
    expect(bearing).toBeCloseTo(270, 0)
  })
})

describe('interpolateAlongTrack', () => {
  it('returns origin for empty track', () => {
    const result = interpolateAlongTrack([], [], 0)
    expect(result.point.lng).toBe(0)
    expect(result.point.lat).toBe(0)
    expect(result.bearing).toBe(0)
  })

  it('returns the single point for single-point track', () => {
    const result = interpolateAlongTrack([makePoint(5, 10)], [0], 0)
    expect(result.point.lng).toBe(5)
    expect(result.point.lat).toBe(10)
  })

  it('returns first point at progress 0', () => {
    const points = [makePoint(0, 0), makePoint(1, 1)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 0)
    expect(result.point.lng).toBeCloseTo(0, 5)
    expect(result.point.lat).toBeCloseTo(0, 5)
  })

  it('returns last point at progress 1', () => {
    const points = [makePoint(0, 0), makePoint(1, 1)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 1)
    expect(result.point.lng).toBeCloseTo(1, 3)
    expect(result.point.lat).toBeCloseTo(1, 3)
  })

  it('interpolates at mid-progress', () => {
    const points = [makePoint(0, 0), makePoint(0, 2)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 0.5)
    expect(result.point.lat).toBeCloseTo(1, 2)
    expect(result.point.lng).toBeCloseTo(0, 5)
  })

  it('clamps progress to [0, 1]', () => {
    const points = [makePoint(0, 0), makePoint(1, 1)]
    const cumul = computeCumulativeDistances(points)
    const resultNeg = interpolateAlongTrack(points, cumul, -1)
    expect(resultNeg.point.lng).toBeCloseTo(0, 3)
    const resultOver = interpolateAlongTrack(points, cumul, 2)
    expect(resultOver.point.lng).toBeCloseTo(1, 3)
  })

  it('handles antimeridian crossing', () => {
    const points = [makePoint(179, 0), makePoint(-179, 0)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 0.5)
    // normalizeLng(180) === -180, so the midpoint is at -180/180
    expect(Math.abs(result.point.lng)).toBeCloseTo(180, 1)
  })

  it('returns segmentIndex', () => {
    const points = [makePoint(0, 0), makePoint(1, 0), makePoint(2, 0)]
    const cumul = computeCumulativeDistances(points)
    const result0 = interpolateAlongTrack(points, cumul, 0)
    expect(result0.segmentIndex).toBe(0)
    const result1 = interpolateAlongTrack(points, cumul, 0.99)
    expect(result1.segmentIndex).toBe(1)
  })
})

describe('formatDistance', () => {
  it('formats metric distances', () => {
    expect(formatDistance(500, 'metric')).toBe('500 m')
    expect(formatDistance(1500, 'metric')).toBe('1.5 km')
  })

  it('formats imperial distances', () => {
    expect(formatDistance(100, 'imperial')).toBe('328 ft')
    expect(formatDistance(3000, 'imperial')).toMatch(/mi/)
  })
})

describe('formatElevation', () => {
  it('formats metric elevation', () => {
    expect(formatElevation(500, 'metric')).toBe('500 m')
  })

  it('formats imperial elevation', () => {
    expect(formatElevation(100, 'imperial')).toBe('328 ft')
  })
})

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('0:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05')
  })

  it('formats hours, minutes and seconds', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
  })

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('handles negative as zero', () => {
    expect(formatDuration(-5)).toBe('0:00')
  })
})
