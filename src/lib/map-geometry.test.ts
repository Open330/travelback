import { describe, expect, it } from 'vitest'
import type { TrackPoint } from '@/types'
import {
  buildActiveTrailHeadGeometry,
  buildCompletedTrailGeometry,
  buildTrackGeometry,
  precomputeWrappedSegments,
} from './map-geometry'

const point = (lng: number, lat: number): TrackPoint => ({ lng, lat })

describe('map geometry', () => {
  it('keeps every segment member valid when visits and paths are mixed', () => {
    const points = [point(0, 0), point(10, 0), point(11, 0), point(20, 0)]
    const geometry = buildTrackGeometry(points, [1, 3])

    expect(geometry).toEqual({
      type: 'MultiLineString',
      coordinates: [
        [[0, 0], [0, 0]],
        [[10, 0], [11, 0]],
        [[20, 0], [20, 0]],
      ],
    })
    expect(geometry.coordinates.every((coordinates) => coordinates.length >= 2)).toBe(true)
  })

  it('normalizes invalid and duplicate segment boundaries', () => {
    const segments = precomputeWrappedSegments(
      [point(0, 0), point(1, 0), point(2, 0), point(3, 0)],
      [2, 2, -1, 4, 1.5],
    )

    expect(segments.map((segment) => segment.range)).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 3 },
    ])
  })

  it('moves the active head smoothly without changing completed geometry', () => {
    const segments = precomputeWrappedSegments([point(0, 0), point(10, 0)])
    const completed = buildCompletedTrailGeometry(segments, 0)
    const firstHead = buildActiveTrailHeadGeometry(segments, 0, point(2, 0))
    const secondHead = buildActiveTrailHeadGeometry(segments, 0, point(8, 0))

    expect(completed).toEqual({ type: 'LineString', coordinates: [[0, 0], [0, 0]] })
    expect(firstHead.coordinates.at(-1)).toEqual([2, 0])
    expect(secondHead.coordinates.at(-1)).toEqual([8, 0])
  })

  it('reaches the destination at the final interpolated point', () => {
    const segments = precomputeWrappedSegments([point(0, 0), point(10, 0)])
    const head = buildActiveTrailHeadGeometry(segments, 0, point(10, 0))

    expect(head.coordinates).toEqual([[0, 0], [10, 0]])
  })

  it('does not connect separate segments and duplicates a singleton completed segment', () => {
    const segments = precomputeWrappedSegments(
      [point(0, 0), point(1, 0), point(10, 0), point(11, 0)],
      [2],
    )
    const completed = buildCompletedTrailGeometry(segments, 2)
    const head = buildActiveTrailHeadGeometry(segments, 2, point(10.5, 0))

    expect(completed).toEqual({
      type: 'MultiLineString',
      coordinates: [
        [[0, 0], [1, 0]],
        [[10, 0], [10, 0]],
      ],
    })
    expect(head.coordinates).toEqual([[10, 0], [10.5, 0]])
  })

  it('does not draw an active head across a segment boundary', () => {
    const segments = precomputeWrappedSegments(
      [point(0, 0), point(1, 0), point(10, 0), point(11, 0)],
      [2],
    )

    expect(buildActiveTrailHeadGeometry(segments, 1, point(5, 0))).toEqual({
      type: 'LineString',
      coordinates: [],
    })
  })

  it('keeps an active antimeridian crossing continuous', () => {
    const segments = precomputeWrappedSegments([point(179, 0), point(-179, 0)])
    const head = buildActiveTrailHeadGeometry(segments, 0, point(-180, 0))

    expect(head.coordinates).toEqual([[179, 0], [180, 0]])
  })
})
