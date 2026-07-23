import { describe, expect, it } from 'vitest'
import type { TrackPoint } from '@/types'
import {
  buildFitBoundsCoordinates,
  buildTrackGeometry,
  buildTrailChunkFeatureCollection,
  buildTrailChunks,
  buildTrailFrameGeometry,
  computeTrackDisplayBounds,
  prepareTrackGeometry,
  precomputeWrappedSegments,
  TRAIL_CHUNK_COORDINATE_BUDGET,
} from './map-geometry'

const point = (lng: number, lat: number): TrackPoint => ({ lng, lat })

function fitBounds(points: TrackPoint[], segmentStartIndices: number[] = []) {
  return buildFitBoundsCoordinates(computeTrackDisplayBounds(points, segmentStartIndices))
}

function coordinateCount(geometry: GeoJSON.LineString | GeoJSON.MultiLineString): number {
  if (geometry.type === 'LineString') return geometry.coordinates.length
  return geometry.coordinates.reduce((total, coordinates) => total + coordinates.length, 0)
}

describe('map geometry', () => {
  it('builds ordinary and shifted-antimeridian fit bounds', () => {
    expect(fitBounds([point(126, 37), point(128, 38)])).toEqual([126, 37, 128, 38])
    expect(fitBounds([point(179, 10), point(-179, 20)])).toEqual([179, 10, 181, 20])
    expect(fitBounds([])).toBeNull()
  })

  it.each([
    {
      name: 'ordinary local route',
      points: [point(126, 0), point(128, 0)],
      segmentStartIndices: [],
      expected: { west: 126, east: 128 },
    },
    {
      name: 'eastbound antimeridian crossing',
      points: [point(179, 0), point(-179, 0)],
      segmentStartIndices: [],
      expected: { west: 179, east: 181 },
    },
    {
      name: 'westbound antimeridian crossing',
      points: [point(-179, 0), point(179, 0)],
      segmentStartIndices: [],
      expected: { west: -181, east: -179 },
    },
    {
      name: 'wide ordered route that is not an antimeridian shortcut',
      points: [point(-179, 0), point(-1, 0), point(2, 0)],
      segmentStartIndices: [],
      expected: { west: -179, east: 2 },
    },
    {
      name: 'disconnected antimeridian visits',
      points: [point(179, 0), point(-179, 0)],
      segmentStartIndices: [1],
      expected: { west: 179, east: 181 },
    },
    {
      name: 'route that wraps around the world more than once',
      points: [point(0, 0), point(120, 0), point(-120, 0), point(0, 0), point(120, 0)],
      segmentStartIndices: [],
      expected: { west: 0, east: 480 },
    },
  ])('computes route-ordered display bounds for $name', ({
    points,
    segmentStartIndices,
    expected,
  }) => {
    expect(computeTrackDisplayBounds(points, segmentStartIndices)).toEqual({
      ...expected,
      south: 0,
      north: 0,
    })
  })

  it('selects a nearby world copy for disconnected segments without connecting them', () => {
    const prepared = prepareTrackGeometry(
      [point(179, 0), point(-179, 1)],
      [1],
    )

    expect(prepared.displayBounds).toEqual({
      west: 179,
      south: 0,
      east: 181,
      north: 1,
    })
    expect(prepared.routeGeometry).toEqual({
      type: 'MultiLineString',
      coordinates: [
        [[179, 0], [179, 0]],
        [[181, 1], [181, 1]],
      ],
    })
  })

  it.each([
    { latitude: 90, expectedSouth: 89.9, expectedNorth: 90 },
    { latitude: -90, expectedSouth: -90, expectedNorth: -89.9 },
    { latitude: 89.95, expectedSouth: 89.85, expectedNorth: 90 },
    { latitude: -89.95, expectedSouth: -90, expectedNorth: -89.85 },
    { latitude: 37, expectedSouth: 36.9, expectedNorth: 37.1 },
  ])('keeps degenerate fit bounds valid around latitude $latitude', ({ latitude, expectedSouth, expectedNorth }) => {
    const bounds = fitBounds([point(127, latitude), point(127, latitude)])

    expect(bounds).not.toBeNull()
    if (!bounds) return
    const [west, south, east, north] = bounds
    expect(west).toBeCloseTo(126.9)
    expect(east).toBeCloseTo(127.1)
    expect(south).toBeCloseTo(expectedSouth)
    expect(north).toBeCloseTo(expectedNorth)
    expect(north).toBeGreaterThan(south)
    expect([west, south, east, north].every(Number.isFinite)).toBe(true)
    expect(south).toBeGreaterThanOrEqual(-90)
    expect(north).toBeLessThanOrEqual(90)
  })

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

  it.each([
    {
      name: 'an antimeridian crossing',
      points: [point(179, 10), point(-179, 11), point(-178, 12)],
      segmentStartIndices: [],
    },
    {
      name: 'mixed singleton and antimeridian-crossing segments',
      points: [
        point(5, 0),
        point(179, 10),
        point(-179, 11),
        point(20, 20),
        point(21, 21),
      ],
      segmentStartIndices: [1, 3],
    },
  ])('keeps prepared route and trail bytes equivalent for $name', ({
    points,
    segmentStartIndices,
  }) => {
    const coordinateBudget = 4
    const expectedWrappedSegments = precomputeWrappedSegments(points, segmentStartIndices)
    const expectedTrailChunks = buildTrailChunks(expectedWrappedSegments, coordinateBudget)
    const prepared = prepareTrackGeometry(points, segmentStartIndices, coordinateBudget)

    expect(JSON.stringify(prepared.wrappedSegments)).toBe(JSON.stringify(expectedWrappedSegments))
    expect(JSON.stringify(prepared.routeGeometry)).toBe(
      JSON.stringify(buildTrackGeometry(points, segmentStartIndices)),
    )
    expect(JSON.stringify(prepared.trailChunks)).toBe(JSON.stringify(expectedTrailChunks))
    expect(JSON.stringify(prepared.trailChunkCollection)).toBe(
      JSON.stringify(buildTrailChunkFeatureCollection(expectedTrailChunks)),
    )
  })

  it('performs one wrapping pass while preparing route and trail geometry', () => {
    const sourcePoints = [
      point(0, 0),
      point(1, 1),
      point(179, 2),
      point(-179, 3),
      point(20, 4),
    ]
    let sourcePointReads = 0
    const trackedPoints = new Proxy(sourcePoints, {
      get(target, property, receiver) {
        // The wrapping loop indexes each source point exactly once per pass.
        if (typeof property === 'string' && /^\d+$/.test(property)) {
          sourcePointReads += 1
        }
        return Reflect.get(target, property, receiver)
      },
    })

    const prepared = prepareTrackGeometry(trackedPoints, [2, 4], 4)

    expect(sourcePointReads).toBe(sourcePoints.length)
    expect(prepared.wrappedSegments).toHaveLength(3)
    expect(prepared.routeGeometry.type).toBe('MultiLineString')
    expect(prepared.trailChunks.length).toBeGreaterThan(0)
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
