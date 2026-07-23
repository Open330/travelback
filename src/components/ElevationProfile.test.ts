import { describe, expect, it } from 'vitest'
import {
  buildElevationGeometry,
  ELEVATION_GEOMETRY_POINT_BUDGET,
} from './ElevationProfile'

function chartCoordinate(index: number, pointCount: number, elevation: number, min: number, max: number): string {
  const x = (index / (pointCount - 1)) * 100
  const y = 100 - ((elevation - min) / (max - min || 1)) * 100
  return `${x.toFixed(2)},${y.toFixed(2)}`
}

function commandCount(path: string): number {
  return path.match(/[ML]/g)?.length ?? 0
}

describe('buildElevationGeometry', () => {
  it('preserves the all-valid distance-scaled profile', () => {
    expect(buildElevationGeometry([10, 20, 30], [0, 5, 10])).toEqual({
      minEle: 10,
      maxEle: 30,
      pathD: 'M0.00,100.00 L50.00,50.00 L100.00,0.00',
      areaD: 'M0.00,100 L0.00,100.00 L50.00,50.00 L100.00,0.00 L100.00,100 Z',
    })
  })

  it('omits leading and trailing gaps instead of drawing false minima', () => {
    const geometry = buildElevationGeometry([null, 10, 20, undefined], [0, 10, 20, 30])

    expect(geometry?.pathD).toBe('M33.33,100.00 L66.67,0.00')
    expect(geometry?.areaD).toBe('M33.33,100 L33.33,100.00 L66.67,0.00 L66.67,100 Z')
  })

  it('creates independent line and area runs around an interior gap', () => {
    const geometry = buildElevationGeometry([10, 20, null, 30, 40], [0, 10, 20, 30, 40])

    expect(geometry?.pathD).toBe('M0.00,100.00 L25.00,66.67 M75.00,33.33 L100.00,0.00')
    expect(geometry?.areaD).toBe(
      'M0.00,100 L0.00,100.00 L25.00,66.67 L25.00,100 Z M75.00,100 L75.00,33.33 L100.00,0.00 L100.00,100 Z',
    )
  })

  it('creates independent runs at track segment boundaries', () => {
    const geometry = buildElevationGeometry([10, 20, 80, 90], [0, 10, 10, 20], [2])

    expect(geometry?.pathD).toBe('M0.00,100.00 L50.00,87.50 M50.00,12.50 L100.00,0.00')
    expect(geometry?.areaD).toBe(
      'M0.00,100 L0.00,100.00 L50.00,87.50 L50.00,100 Z M50.00,100 L50.00,12.50 L100.00,0.00 L100.00,100 Z',
    )
  })

  it('keeps isolated valid samples finite without inventing edges or area', () => {
    const geometry = buildElevationGeometry([null, 10, null, 20, null], [0, 10, 20, 30, 40])

    expect(geometry?.pathD).toBe('M25.00,100.00 M75.00,0.00')
    expect(geometry?.areaD).toBe('')
    expect(`${geometry?.pathD}${geometry?.areaD}`).not.toMatch(/NaN|Infinity/)
  })

  it('falls back to index positions for zero-distance and one-point tracks', () => {
    expect(buildElevationGeometry([10, 20, 30], [0, 0, 0])?.pathD)
      .toBe('M0.00,100.00 L50.00,50.00 L100.00,0.00')
    expect(buildElevationGeometry([42], [0])).toMatchObject({
      minEle: 42,
      maxEle: 42,
      pathD: 'M50.00,100.00',
      areaD: '',
    })
  })

  it('keeps flat profiles finite and returns null when every sample is missing', () => {
    const flat = buildElevationGeometry([12, 12], [0, 10])

    expect(flat?.pathD).toBe('M0.00,100.00 L100.00,100.00')
    expect(`${flat?.pathD}${flat?.areaD}`).not.toMatch(/NaN|Infinity/)
    expect(buildElevationGeometry([null, undefined], [0, 10])).toBeNull()
  })

  it('retains distance-bucket extrema while respecting the fixed point budget', () => {
    const pointCount = ELEVATION_GEOMETRY_POINT_BUDGET * 2
    const elevations = new Array<number>(pointCount).fill(50)
    const cumulativeDistances = Array.from({ length: pointCount }, (_, index) => index ** 2)
    elevations[1_000] = 20
    elevations[1_001] = 80
    elevations[3_000] = -100
    elevations[3_001] = 200

    const geometry = buildElevationGeometry(elevations, cumulativeDistances)

    expect(geometry).toMatchObject({ minEle: -100, maxEle: 200 })
    expect(commandCount(geometry!.pathD)).toBeLessThanOrEqual(ELEVATION_GEOMETRY_POINT_BUDGET)
    for (const index of [0, 1_000, 1_001, 3_000, 3_001, pointCount - 1]) {
      const distanceX = (cumulativeDistances[index] / cumulativeDistances[pointCount - 1]) * 100
      const elevation = elevations[index]
      const y = 100 - ((elevation + 100) / 300) * 100
      expect(geometry!.pathD).toContain(`${distanceX.toFixed(2)},${y.toFixed(2)}`)
    }
  })

  it('bounds a 250,000-point profile while retaining endpoints, extrema, and gaps', () => {
    const pointCount = 250_000
    const elevations = new Array<number | null>(pointCount).fill(500)
    const cumulativeDistances = Array.from({ length: pointCount }, (_, index) => index)
    elevations[0] = 100
    elevations[123_456] = -900
    elevations[123_457] = 2_400
    elevations[160_000] = null
    elevations[pointCount - 1] = 200

    const geometry = buildElevationGeometry(
      elevations,
      cumulativeDistances,
      [220_000],
    )

    expect(geometry).toMatchObject({ minEle: -900, maxEle: 2_400 })
    expect(commandCount(geometry!.pathD)).toBeLessThanOrEqual(ELEVATION_GEOMETRY_POINT_BUDGET)
    expect(commandCount(geometry!.areaD)).toBeLessThanOrEqual(ELEVATION_GEOMETRY_POINT_BUDGET + 6)
    expect(geometry!.pathD.match(/M/g)).toHaveLength(3)

    for (const index of [0, 123_456, 123_457, 159_999, 160_001, 219_999, 220_000, pointCount - 1]) {
      expect(geometry!.pathD).toContain(
        chartCoordinate(index, pointCount, elevations[index]!, -900, 2_400),
      )
    }
  })

  it('keeps highly fragmented input bounded without connecting across omitted gaps', () => {
    const pointCount = ELEVATION_GEOMETRY_POINT_BUDGET * 4
    const elevations: Array<number | null> = Array.from(
      { length: pointCount },
      (_, index) => index % 2 === 0 ? index : null,
    )
    const cumulativeDistances = Array.from({ length: pointCount }, (_, index) => index)

    const geometry = buildElevationGeometry(elevations, cumulativeDistances)

    expect(commandCount(geometry!.pathD)).toBeLessThanOrEqual(ELEVATION_GEOMETRY_POINT_BUDGET)
    expect(geometry!.pathD).not.toContain('L')
    expect(geometry!.pathD).toContain(chartCoordinate(0, pointCount, 0, 0, pointCount - 2))
    expect(geometry!.pathD).toContain(
      chartCoordinate(pointCount - 2, pointCount, pointCount - 2, 0, pointCount - 2),
    )
    expect(geometry!.areaD).toBe('')
  })
})
