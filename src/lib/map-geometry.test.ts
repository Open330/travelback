import { describe, expect, it } from 'vitest'
import type { TrackPoint } from '@/types'
import {
  buildTrackGeometry,
  buildTrailChunkFeatureCollection,
  buildTrailChunks,
  buildTrailFrameGeometry,
  precomputeWrappedSegments,
  TRAIL_CHUNK_COORDINATE_BUDGET,
} from './map-geometry'

const point = (lng: number, lat: number): TrackPoint => ({ lng, lat })

function coordinateCount(geometry: GeoJSON.LineString | GeoJSON.MultiLineString): number {
  if (geometry.type === 'LineString') return geometry.coordinates.length
  return geometry.coordinates.reduce((total, coordinates) => total + coordinates.length, 0)
}

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
    const chunks = buildTrailChunks(precomputeWrappedSegments([point(0, 0), point(10, 0)]))
    const firstFrame = buildTrailFrameGeometry(chunks, 0, point(2, 0))
    const secondFrame = buildTrailFrameGeometry(chunks, 0, point(8, 0))

    expect(firstFrame.completedChunkIndex).toBe(-1)
    expect(firstFrame.activeGeometry).toEqual({ type: 'LineString', coordinates: [[0, 0], [2, 0]] })
    expect(secondFrame.activeGeometry).toEqual({ type: 'LineString', coordinates: [[0, 0], [8, 0]] })
  })

  it('reaches the destination at the final interpolated point', () => {
    const chunks = buildTrailChunks(precomputeWrappedSegments([point(0, 0), point(10, 0)]))
    const frame = buildTrailFrameGeometry(chunks, 0, point(10, 0))

    expect(frame.activeGeometry).toEqual({ type: 'LineString', coordinates: [[0, 0], [10, 0]] })
  })

  it('does not connect separate segments and duplicates a singleton completed segment', () => {
    const segments = precomputeWrappedSegments(
      [point(0, 0), point(1, 0), point(10, 0), point(11, 0)],
      [2],
    )
    const chunks = buildTrailChunks(segments)
    const frame = buildTrailFrameGeometry(chunks, 2, point(10.5, 0))

    expect(frame.completedChunkIndex).toBe(-1)
    expect(frame.activeGeometry).toEqual({
      type: 'MultiLineString',
      coordinates: [
        [[0, 0], [1, 0]],
        [[10, 0], [10.5, 0]],
      ],
    })
  })

  it('does not connect the completed active chunk across a segment boundary', () => {
    const segments = precomputeWrappedSegments(
      [point(0, 0), point(1, 0), point(10, 0), point(11, 0)],
      [2],
    )

    const frame = buildTrailFrameGeometry(buildTrailChunks(segments), 1, point(5, 0))
    expect(frame.activeGeometry).toEqual({
      type: 'LineString',
      coordinates: [[0, 0], [1, 0]],
    })
  })

  it('keeps an active antimeridian crossing continuous', () => {
    const chunks = buildTrailChunks(precomputeWrappedSegments([point(179, 0), point(-179, 0)]))
    const frame = buildTrailFrameGeometry(chunks, 0, point(-180, 0))

    expect(frame.activeGeometry).toEqual({ type: 'LineString', coordinates: [[179, 0], [180, 0]] })
  })

  it('bounds static and active publication for a 250,000-point route', () => {
    const points = Array.from({ length: 250_000 }, (_, index) => point(index / 1000, 0))
    const chunks = buildTrailChunks(precomputeWrappedSegments(points))
    const collection = buildTrailChunkFeatureCollection(chunks)
    const expectedMaximumChunks = Math.ceil((points.length - 1) / (TRAIL_CHUNK_COORDINATE_BUDGET - 1))

    expect(chunks.length).toBe(expectedMaximumChunks)
    expect(collection.features).toHaveLength(chunks.length)
    expect(Math.max(...chunks.map((chunk) => chunk.coordinateCount))).toBeLessThanOrEqual(TRAIL_CHUNK_COORDINATE_BUDGET)
    expect(Math.max(...collection.features.map((feature) => coordinateCount(feature.geometry)))).toBeLessThanOrEqual(TRAIL_CHUNK_COORDINATE_BUDGET)

    let completedChunkChanges = 0
    let previousCompletedChunk = -1
    for (const chunk of chunks) {
      const segmentIndex = Math.max(chunk.parts[0].range.start, chunk.endIndex - 1)
      const frame = buildTrailFrameGeometry(chunks, segmentIndex, points[Math.min(segmentIndex + 1, points.length - 1)])
      expect(coordinateCount(frame.activeGeometry)).toBeLessThanOrEqual(TRAIL_CHUNK_COORDINATE_BUDGET)
      if (frame.completedChunkIndex !== previousCompletedChunk) {
        completedChunkChanges++
        previousCompletedChunk = frame.completedChunkIndex
      }
    }
    expect(completedChunkChanges).toBeLessThanOrEqual(chunks.length)
  })

  it('shares one boundary coordinate when a continuous path crosses chunks', () => {
    const chunks = buildTrailChunks(
      precomputeWrappedSegments(Array.from({ length: 7 }, (_, index) => point(index, 0))),
      4,
    )

    expect(chunks.map((chunk) => chunk.coordinateCount)).toEqual([4, 4])
    expect(chunks[0].parts[0].coordinates.at(-1)).toEqual(chunks[1].parts[0].coordinates[0])
  })

  it('packs separate singleton and short segments without connecting them', () => {
    const segments = precomputeWrappedSegments(
      [point(0, 0), point(10, 0), point(11, 0), point(20, 0)],
      [1, 3],
    )
    const chunks = buildTrailChunks(segments, 6)
    const geometry = buildTrailChunkFeatureCollection(chunks).features[0].geometry

    expect(geometry).toEqual({
      type: 'MultiLineString',
      coordinates: [
        [[0, 0], [0, 0]],
        [[10, 0], [11, 0]],
        [[20, 0], [20, 0]],
      ],
    })
  })

  it('recomputes the completed filter and active payload when seeking backward', () => {
    const points = Array.from({ length: 9 }, (_, index) => point(index, 0))
    const chunks = buildTrailChunks(precomputeWrappedSegments(points), 4)
    const forward = buildTrailFrameGeometry(chunks, 6, point(6.5, 0))
    const backward = buildTrailFrameGeometry(chunks, 1, point(1.5, 0))

    expect(forward.completedChunkIndex).toBe(1)
    expect(backward.completedChunkIndex).toBe(-1)
    expect(backward.activeGeometry).toEqual({
      type: 'LineString',
      coordinates: [[0, 0], [1, 0], [1.5, 0]],
    })
  })
})
