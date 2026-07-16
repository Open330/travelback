import { describe, expect, it } from 'vitest'
import { buildElevationGeometry } from './ElevationProfile'

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
})
