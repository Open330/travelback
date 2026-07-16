import { describe, expect, it } from 'vitest'
import { clampTimelineRatios, indexToRatio, ratioToIndex } from './TimelineSelector'

describe('ratioToIndex', () => {
  const cumulativeDistances = [0, 10, 20, 30, 40]

  it('round-trips an exact accepted end index', () => {
    expect(ratioToIndex(20 / 40, 'end', cumulativeDistances, 4)).toBe(2)
  })

  it('uses floor for a start edge and ceiling for an end edge', () => {
    expect(ratioToIndex(0.375, 'start', cumulativeDistances, 4)).toBe(1)
    expect(ratioToIndex(0.375, 'end', cumulativeDistances, 4)).toBe(2)
  })

  it('falls back to index space for a zero-distance track', () => {
    const stationaryDistances = [0, 0, 0, 0, 0]
    expect(ratioToIndex(0.375, 'start', stationaryDistances, 4)).toBe(1)
    expect(ratioToIndex(0.375, 'end', stationaryDistances, 4)).toBe(2)
  })

  it('round-trips a start edge at the end of a segment-boundary plateau', () => {
    const segmentedDistances = [0, 10, 10, 20]
    const ratio = indexToRatio(2, 'start', segmentedDistances, 3)

    expect(ratio).toBeGreaterThan(0.5)
    expect(ratioToIndex(ratio, 'start', segmentedDistances, 3)).toBe(2)
  })

  it('keeps an end edge at the first index of a distance plateau', () => {
    const segmentedDistances = [0, 10, 10, 20]
    const ratio = indexToRatio(1, 'end', segmentedDistances, 3)

    expect(ratioToIndex(ratio, 'end', segmentedDistances, 3)).toBe(1)
  })
})

describe('clampTimelineRatios', () => {
  it('allows a three-point track to select its two-point inclusive minimum', () => {
    expect(clampTimelineRatios(0, 0.42, 3)).toEqual([0, 0.5])
  })

  it('keeps a two-point track on its only valid interval', () => {
    expect(clampTimelineRatios(0.25, 0.75, 2)).toEqual([0, 1])
  })
})
