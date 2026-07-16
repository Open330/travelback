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

  it('reaches a trailing singleton segment at progress 1', () => {
    const points = [makePoint(0, 0), makePoint(1, 0), makePoint(20, 20)]
    const cumul = computeCumulativeDistances(points, [2])
    const result = interpolateAlongTrack(points, cumul, 1, [2])

    expect(cumul[2]).toBe(cumul[1])
    expect(result.point).toMatchObject(points[2])
    expect(result.segmentIndex).toBe(2)
    expect(result.distanceTraveled).toBe(cumul[2])
    expect(result.bearing).toBe(0)
  })

  it('preserves the final in-segment bearing across duplicate points', () => {
    const points = [makePoint(0, 0), makePoint(1, 0), makePoint(1, 0)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 1)

    expect(result.point).toMatchObject(points[2])
    expect(result.bearing).toBeCloseTo(90, 0)
  })

  it('keeps a leading singleton segment reachable at progress 0', () => {
    const points = [makePoint(-20, -20), makePoint(0, 0), makePoint(1, 0)]
    const cumul = computeCumulativeDistances(points, [1])
    const result = interpolateAlongTrack(points, cumul, 0)

    expect(result.point).toMatchObject(points[0])
    expect(result.segmentIndex).toBe(0)
  })

  it('steps through distinct observations when every edge has zero distance', () => {
    const points = [makePoint(0, 0), makePoint(10, 10), makePoint(20, 20)]
    const cumul = computeCumulativeDistances(points, [1, 2])

    expect(interpolateAlongTrack(points, cumul, 0.1).point).toMatchObject(points[0])
    expect(interpolateAlongTrack(points, cumul, 0.4).point).toMatchObject(points[1])
    expect(interpolateAlongTrack(points, cumul, 0.8).point).toMatchObject(points[2])
    expect(interpolateAlongTrack(points, cumul, 1).point).toMatchObject(points[2])
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

  it('handles NaN as zero', () => {
    expect(formatDuration(NaN)).toBe('0:00')
  })

  it('handles Infinity as zero', () => {
    expect(formatDuration(Infinity)).toBe('0:00')
  })

  it('formats exact minute', () => {
    expect(formatDuration(60)).toBe('1:00')
  })

  it('formats exact hour', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
  })

  it('handles large values', () => {
    expect(formatDuration(86461)).toBe('24:01:01') // 24 hours + 61 seconds
  })
})

describe('normalizeLng — additional edge cases', () => {
  it('handles NaN input', () => {
    expect(normalizeLng(NaN)).toBe(0)
  })

  it('handles Infinity', () => {
    expect(normalizeLng(Infinity)).toBe(0)
  })

  it('handles -Infinity', () => {
    expect(normalizeLng(-Infinity)).toBe(0)
  })

  it('handles very large positive values', () => {
    // 10800 = 30 * 360, which should normalize to 0
    expect(normalizeLng(10800)).toBeCloseTo(0, 10)
  })

  it('handles very large negative values', () => {
    // -10800 = -30 * 360, which should normalize to 0
    expect(normalizeLng(-10800)).toBeCloseTo(0, 10)
  })

  it('handles boundary value 180', () => {
    expect(normalizeLng(180)).toBe(-180)
  })

  it('handles boundary value -180', () => {
    expect(normalizeLng(-180)).toBe(-180)
  })

  it('handles values just over 180', () => {
    expect(normalizeLng(180.1)).toBeCloseTo(-179.9, 10)
  })

  it('handles values just under -180', () => {
    expect(normalizeLng(-180.1)).toBeCloseTo(179.9, 10)
  })
})

describe('shortestLngDelta — additional edge cases', () => {
  it('handles NaN inputs', () => {
    // shortestLngDelta doesn't handle NaN specially, it propagates NaN
    expect(() => shortestLngDelta(NaN, 0)).not.toThrow()
    expect(() => shortestLngDelta(0, NaN)).not.toThrow()
  })

  it('handles antimeridian crossing eastward', () => {
    expect(shortestLngDelta(-170, 170)).toBeCloseTo(-20, 10)
  })

  it('handles antimeridian crossing westward', () => {
    expect(shortestLngDelta(170, -170)).toBeCloseTo(20, 10)
  })

  it('handles same longitude', () => {
    expect(shortestLngDelta(0, 0)).toBe(0)
    expect(shortestLngDelta(180, 180)).toBe(0)
  })

  it('handles nearly full circle', () => {
    expect(shortestLngDelta(0, 179)).toBeCloseTo(179, 10)
    expect(shortestLngDelta(0, -179)).toBeCloseTo(-179, 10)
  })
})

describe('computeBearing — additional edge cases', () => {
  it('handles NaN coordinates', () => {
    const from = makePoint(NaN, NaN)
    const to = makePoint(0, 1)
    const bearing = computeBearing(from, to)
    expect(typeof bearing).toBe('number')
  })

  it('handles identical points', () => {
    const point = makePoint(0, 0)
    const bearing = computeBearing(point, point)
    // Bearing is 0 for identical points
    expect(bearing).toBeCloseTo(0, 5)
  })

  it('handles antimeridian crossing', () => {
    const from = makePoint(179, 0)
    const to = makePoint(-179, 0)
    const bearing = computeBearing(from, to)
    expect(typeof bearing).toBe('number')
    expect(bearing).toBeGreaterThanOrEqual(0)
    expect(bearing).toBeLessThan(360)
  })

  it('handles polar points', () => {
    const from = makePoint(0, 89)
    const to = makePoint(0, -89)
    const bearing = computeBearing(from, to)
    expect(bearing).toBeCloseTo(180, 5) // South from North Pole
  })

  it('handles equatorial movement', () => {
    const from = makePoint(0, 0) // lng, lat
    const to = makePoint(90, 0)
    const bearing = computeBearing(from, to)
    expect(bearing).toBeCloseTo(90, 5) // East along equator
  })
})

describe('computeCumulativeDistances — additional edge cases', () => {
  it('handles NaN coordinates', () => {
    const points = [makePoint(NaN, 0), makePoint(0, 1)]
    const distances = computeCumulativeDistances(points)
    expect(distances.length).toBe(2)
  })

  it('handles Infinity coordinates', () => {
    const points = [makePoint(Infinity, 0), makePoint(0, 1)]
    const distances = computeCumulativeDistances(points)
    expect(distances.length).toBe(2)
  })

  it('handles points with NaN elevation', () => {
    const points = [makePoint(0, 0, NaN), makePoint(0, 1)]
    const distances = computeCumulativeDistances(points)
    expect(distances.length).toBe(2)
  })

  it('handles identical consecutive points', () => {
    const points = [makePoint(0, 0), makePoint(0, 0), makePoint(0, 0)]
    const distances = computeCumulativeDistances(points)
    expect(distances).toEqual([0, 0, 0])
  })

  it('handles antimeridian crossing', () => {
    const points = [makePoint(179, 0), makePoint(-179, 0)]
    const distances = computeCumulativeDistances(points)
    // Should compute shortest distance across antimeridian
    expect(distances.length).toBe(2)
    expect(distances[1]).toBeGreaterThan(0)
    expect(distances[1]).toBeLessThan(500000) // Less than 500km
  })

  it('handles multiple segment breaks', () => {
    const points = [makePoint(0, 0), makePoint(0, 1), makePoint(0, 2), makePoint(0, 3)]
    const distances = computeCumulativeDistances(points, [1, 2, 3])
    expect(distances).toEqual([0, distances[1], distances[1], distances[1]])
  })
})

describe('totalDistance — additional edge cases', () => {
  it('handles single point', () => {
    expect(totalDistance([makePoint(0, 0)])).toBe(0)
  })

  it('handles identical points', () => {
    expect(totalDistance([makePoint(0, 0), makePoint(0, 0)])).toBe(0)
  })

  it('respects segment breaks', () => {
    const points = [makePoint(0, 0), makePoint(0, 1), makePoint(0, 2)]
    const dist = totalDistance(points, [2])
    // Only distance from index 0 to 1 counted (segment break at 2)
    const expected = totalDistance([makePoint(0, 0), makePoint(0, 1)])
    expect(dist).toBeCloseTo(expected, 10)
  })
})

describe('findDistanceIndexAtOrAfter — additional edge cases', () => {
  it('handles all zero distances', () => {
    const dists = [0, 0, 0, 0]
    expect(findDistanceIndexAtOrAfter(dists, 0)).toBe(0)
    expect(findDistanceIndexAtOrAfter(dists, 1)).toBe(3)
  })

  it('handles negative target distance', () => {
    const dists = [0, 10, 20]
    expect(findDistanceIndexAtOrAfter(dists, -5)).toBe(0)
  })

  it('handles empty cumulative distances', () => {
    expect(findDistanceIndexAtOrAfter([], 0)).toBe(0)
  })

  it('handles single element', () => {
    const dists = [0]
    expect(findDistanceIndexAtOrAfter(dists, 0)).toBe(0)
    expect(findDistanceIndexAtOrAfter(dists, 100)).toBe(0)
  })
})

describe('interpolateAlongTrack — additional edge cases', () => {
  it('handles NaN elevation in points', () => {
    const points = [makePoint(0, 0, NaN), makePoint(0, 2, 100)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 0.5)
    // NaN elevation propagates through interpolation
    expect(result.point.ele).toBe(NaN)
  })

  it('handles points without time', () => {
    const points = [makePoint(0, 0), makePoint(0, 2)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 0.5)
    expect(result.point.time).toBeUndefined()
  })

  it('handles one point with time, one without', () => {
    const t1 = new Date('2024-01-15T10:00:00Z')
    const points = [makePoint(0, 0, undefined, t1), makePoint(0, 2)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 0.5)
    // When one point has time and the other doesn't, it uses the available time
    expect(result.point.time).toBeInstanceOf(Date)
  })

  it('handles time interpolation', () => {
    const t1 = new Date('2024-01-15T10:00:00Z')
    const t2 = new Date('2024-01-15T10:10:00Z')
    const points = [makePoint(0, 0, undefined, t1), makePoint(0, 2, undefined, t2)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 0.5)
    expect(result.point.time).toBeInstanceOf(Date)
    // Time should be midpoint
    const expectedTime = new Date(t1.getTime() + (t2.getTime() - t1.getTime()) * 0.5)
    expect(result.point.time!.getTime()).toBeCloseTo(expectedTime.getTime(), 0)
  })

  it('handles elevation interpolation', () => {
    const points = [makePoint(0, 0, 100), makePoint(0, 2, 200)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 0.5)
    expect(result.point.ele).toBeCloseTo(150, 5)
  })

  it('handles zero total distance', () => {
    const points = [makePoint(0, 0), makePoint(0, 0)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 0.5)
    expect(result.totalDist).toBe(0)
  })

  it('handles very small progress values', () => {
    const points = [makePoint(0, 0), makePoint(0, 2)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 0.001)
    expect(result.point.lat).toBeGreaterThan(0)
    expect(result.point.lat).toBeLessThan(0.01) // Very close to start
  })

  it('handles very large progress values', () => {
    const points = [makePoint(0, 0), makePoint(0, 2)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 0.999)
    expect(result.point.lat).toBeGreaterThan(1.98) // Very close to end
    expect(result.point.lat).toBeLessThan(2)
  })

  it('handles multiple identical consecutive points', () => {
    const points = [makePoint(0, 0), makePoint(0, 0), makePoint(0, 0), makePoint(0, 2)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 0.5)
    // Should still interpolate correctly
    expect(result.point.lat).toBeCloseTo(1, 5)
  })

  it('returns correct bearing for identical consecutive points', () => {
    const points = [makePoint(0, 0), makePoint(0, 0), makePoint(0, 2)]
    const cumul = computeCumulativeDistances(points)
    const result = interpolateAlongTrack(points, cumul, 0.5)
    // Bearing should be based on last distinct point to current
    expect(result.bearing).toBeCloseTo(0, 5) // North
  })
})

describe('formatDistance — additional edge cases', () => {
  it('handles zero distance', () => {
    expect(formatDistance(0, 'metric')).toBe('0 m')
    expect(formatDistance(0, 'imperial')).toBe('0 ft')
  })

  it('handles negative distance', () => {
    expect(formatDistance(-100, 'metric')).toBe('-100 m')
  })

  it('handles boundary 1000m in metric', () => {
    expect(formatDistance(999, 'metric')).toBe('999 m')
    expect(formatDistance(1000, 'metric')).toBe('1.0 km')
  })

  it('handles boundary 1000ft in imperial', () => {
    // 999m * 3.28084 = 3277.6 ft, which is > 1000ft, so it shows miles
    expect(formatDistance(999, 'imperial')).toBe('0.6 mi') // 999m = 0.62mi
    expect(formatDistance(1000, 'imperial')).toBe('0.6 mi')
  })

  it('handles very large distances', () => {
    expect(formatDistance(100000, 'metric')).toBe('100.0 km')
    expect(formatDistance(100000, 'imperial')).toMatch(/mi/)
  })

  it('handles NaN input', () => {
    // NaN in metric: NaN < 1000, so shows 'NaN m'
    const result = formatDistance(NaN, 'metric')
    expect(result).toContain('NaN')
    expect(result).toContain('m')
  })

  it('uses default unit preference when not specified', () => {
    const result = formatDistance(500)
    expect(result).toMatch(/\d+ (m|km|ft|mi)/)
  })
})

describe('formatElevation — additional edge cases', () => {
  it('handles zero elevation', () => {
    expect(formatElevation(0, 'metric')).toBe('0 m')
    expect(formatElevation(0, 'imperial')).toBe('0 ft')
  })

  it('handles negative elevation', () => {
    expect(formatElevation(-100, 'metric')).toBe('-100 m')
    expect(formatElevation(-100, 'imperial')).toBe('-328 ft')
  })

  it('handles very large elevation', () => {
    expect(formatElevation(8848, 'metric')).toBe('8848 m') // Everest
    // 8848 * 3.28084 = 29028.87, rounded to 29029 ft
    expect(formatElevation(8848, 'imperial')).toBe('29029 ft')
  })

  it('handles NaN input', () => {
    expect(formatElevation(NaN, 'metric')).toBe('NaN m')
  })

  it('handles fractional elevation', () => {
    expect(formatElevation(100.5, 'metric')).toBe('101 m') // Rounded
    expect(formatElevation(100.5, 'imperial')).toBe('330 ft') // 100.5 * 3.28084 rounded
  })
})
