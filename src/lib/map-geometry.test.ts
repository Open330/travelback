import { describe, expect, it } from 'vitest'
import { GeoJSONVT } from '@maplibre/geojson-vt'
import type { TrackPoint } from '@/types'
import { normalizeLng } from './interpolate'
import {
  buildFitBoundsCoordinates,
  buildReferenceGridData,
  buildTrackGeometry,
  buildTrailChunkFeatureCollection,
  buildTrailChunks,
  buildTrailFrameGeometry,
  computeTrackDisplayBounds,
  prepareTrackGeometry,
  precomputeWrappedSegments,
  REFERENCE_GRID_MAX_FEATURES,
  REFERENCE_GRID_MAX_FEATURES_PER_AXIS,
  RENDERER_LONGITUDE_MAX_ANCHOR_DISTANCE,
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

function geometryParts(
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString,
): GeoJSON.Position[][] {
  return geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates
}

function tiledRendererIds(collection: GeoJSON.FeatureCollection): Set<string> {
  const zoom = 4
  const tileIndex = new GeoJSONVT(collection, {
    maxZoom: zoom,
    indexMaxZoom: zoom,
    indexMaxPoints: 0,
    tolerance: 0,
  })
  const ids = new Set<string>()

  for (let x = 0; x < 2 ** zoom; x++) {
    for (let y = 0; y < 2 ** zoom; y++) {
      const tile = tileIndex.getTile(zoom, x, y)
      for (const feature of tile?.features ?? []) {
        const rendererId = feature.tags?.rendererId
        if (typeof rendererId === 'string') ids.add(rendererId)
      }
    }
  }

  return ids
}

function rendererContractCollection(
  prepared: ReturnType<typeof prepareTrackGeometry>,
  activeGeometry?: GeoJSON.LineString | GeoJSON.MultiLineString,
): { collection: GeoJSON.FeatureCollection; expectedIds: Set<string> } {
  const features: GeoJSON.Feature[] = []
  let routeEdgeIndex = 0

  for (const part of geometryParts(prepared.routeGeometry)) {
    for (let index = 0; index < part.length - 1; index++) {
      features.push({
        type: 'Feature',
        properties: { rendererId: `route-${routeEdgeIndex++}` },
        geometry: {
          type: 'LineString',
          coordinates: [part[index], part[index + 1]],
        },
      })
    }
  }

  for (const feature of prepared.trailChunkCollection.features) {
    features.push({
      ...feature,
      properties: { rendererId: `trail-${feature.properties.chunkIndex}` },
    })
  }

  if (activeGeometry) {
    features.push({
      type: 'Feature',
      properties: { rendererId: 'active' },
      geometry: activeGeometry,
    })
  }

  return {
    collection: { type: 'FeatureCollection', features },
    expectedIds: new Set(features.map((feature) => String(feature.properties?.rendererId))),
  }
}

function publishedLongitudes(
  geometries: Array<GeoJSON.LineString | GeoJSON.MultiLineString>,
): number[] {
  return geometries.flatMap((geometry) => (
    geometryParts(geometry).flatMap((coordinates) => (
      coordinates.map(([longitude]) => longitude)
    ))
  ))
}

function referenceGridAxisCounts(collection: GeoJSON.FeatureCollection) {
  let longitude = 0
  let latitude = 0

  for (const feature of collection.features) {
    if (feature.geometry.type !== 'LineString') continue
    const [start, end] = feature.geometry.coordinates
    if (start[0] === end[0]) longitude++
    if (start[1] === end[1]) latitude++
  }

  return { longitude, latitude }
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
      expected: { west: -240, east: 120 },
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

  it('preserves ordinary reference-grid density and antimeridian display space', () => {
    const ordinaryGrid = buildReferenceGridData({
      west: 126,
      south: 37,
      east: 128,
      north: 38,
    })
    const antimeridianGrid = buildReferenceGridData(
      computeTrackDisplayBounds([point(179, 10), point(-179, 20)]),
    )

    expect(referenceGridAxisCounts(ordinaryGrid)).toEqual({ longitude: 17, latitude: 15 })
    expect(ordinaryGrid.features[0].geometry).toEqual({
      type: 'LineString',
      coordinates: [[123, 34], [123, 41]],
    })
    expect(referenceGridAxisCounts(antimeridianGrid)).toEqual({ longitude: 17, latitude: 21 })
    expect(antimeridianGrid.features[0].geometry).toEqual({
      type: 'LineString',
      coordinates: [[164, -5], [164, 35]],
    })
  })

  it.each([
    {
      name: 'a 480-degree route',
      bounds: { west: 0, south: 0, east: 480, north: 0 },
    },
    {
      name: 'a 35-million-degree route',
      bounds: { west: 0, south: -1, east: 35_799_821, north: 1 },
    },
  ])('keeps the adaptive reference grid bounded for $name', ({ bounds }) => {
    const grid = buildReferenceGridData(bounds)
    const axisCounts = referenceGridAxisCounts(grid)
    const longitudeValues = grid.features.flatMap((feature) => {
      if (feature.geometry.type !== 'LineString') return []
      const [start, end] = feature.geometry.coordinates
      return start[0] === end[0] ? [start[0]] : []
    })

    expect(axisCounts.longitude).toBeLessThanOrEqual(REFERENCE_GRID_MAX_FEATURES_PER_AXIS)
    expect(axisCounts.latitude).toBeLessThanOrEqual(REFERENCE_GRID_MAX_FEATURES_PER_AXIS)
    expect(grid.features).toHaveLength(axisCounts.longitude + axisCounts.latitude)
    expect(grid.features.length).toBeLessThanOrEqual(REFERENCE_GRID_MAX_FEATURES)
    expect(Math.min(...longitudeValues)).toBeLessThanOrEqual(bounds.west)
    expect(Math.max(...longitudeValues)).toBeGreaterThanOrEqual(bounds.east)
    expect(grid.features.every((feature) => (
      feature.geometry.type === 'LineString'
      && feature.geometry.coordinates.flat().every(Number.isFinite)
    ))).toBe(true)
  })

  it('unwraps a large canonical multiworld route in one linear pass', () => {
    const pointCount = 200_000
    const points = Array.from(
      { length: pointCount },
      (_, index) => point(normalizeLng(index * 179), 0),
    )
    const wrappedSegments = precomputeWrappedSegments(points)
    const prepared = prepareTrackGeometry(points)

    expect(wrappedSegments[0].coordinates).toHaveLength(pointCount)
    expect(wrappedSegments[0].coordinates.at(-1)).toEqual([
      (pointCount - 1) * 179,
      0,
    ])
    expect(prepared.displayBounds).not.toBeNull()
    expect(prepared.displayBounds?.west).toBeGreaterThanOrEqual(
      -RENDERER_LONGITUDE_MAX_ANCHOR_DISTANCE,
    )
    expect(prepared.displayBounds?.east).toBeLessThanOrEqual(
      RENDERER_LONGITUDE_MAX_ANCHOR_DISTANCE,
    )
  })

  it('keeps late repeated-lap route, trail, and active-head geometry in MapLibre tiles', () => {
    const points = [
      point(0, 0),
      point(120, 0),
      point(-120, 0),
      point(0, 0),
      point(120, 0),
      point(-120, 0),
      point(0, 0),
    ]
    const wrappedSegments = precomputeWrappedSegments(points)
    const prepared = prepareTrackGeometry(points, [], 2)
    const frame = buildTrailFrameGeometry(prepared.trailChunks, 5, point(-60, 0))
    const { collection, expectedIds } = rendererContractCollection(
      prepared,
      frame.activeGeometry,
    )
    const anchorLongitude = wrappedSegments[0].coordinates[0][0]
    const longitudes = publishedLongitudes([
      prepared.routeGeometry,
      ...prepared.trailChunkCollection.features.map((feature) => feature.geometry),
      frame.activeGeometry,
    ])

    expect(wrappedSegments[0].coordinates.at(-1)).toEqual([720, 0])
    expect(prepared.trailChunks.flatMap((chunk) => (
      chunk.parts.map((part) => part.range)
    ))).toEqual([
      { start: 0, end: 1 },
      { start: 1, end: 2 },
      { start: 2, end: 3 },
      { start: 3, end: 4 },
      { start: 4, end: 5 },
      { start: 5, end: 6 },
    ])
    expect(frame.completedChunkIndex).toBe(4)
    expect(frame.activeGeometry).toEqual({
      type: 'LineString',
      coordinates: [[-120, 0], [-60, 0]],
    })
    expect(longitudes.every((longitude) => (
      Math.abs(longitude - anchorLongitude) <= RENDERER_LONGITUDE_MAX_ANCHOR_DISTANCE
    ))).toBe(true)
    expect(tiledRendererIds(collection)).toEqual(expectedIds)
  })

  it.each([
    {
      name: 'eastbound',
      points: [point(179, 0), point(-179, 1)],
      expectedCoordinates: [[179, 0], [181, 1]],
    },
    {
      name: 'westbound',
      points: [point(-179, 0), point(179, 1)],
      expectedCoordinates: [[-179, 0], [-181, 1]],
    },
  ])('keeps a simple $name antimeridian edge compact and tileable', ({
    points,
    expectedCoordinates,
  }) => {
    const prepared = prepareTrackGeometry(points)
    const { collection, expectedIds } = rendererContractCollection(prepared)

    expect(prepared.routeGeometry).toEqual({
      type: 'LineString',
      coordinates: expectedCoordinates,
    })
    expect((prepared.displayBounds?.east ?? 0) - (prepared.displayBounds?.west ?? 0)).toBe(2)
    expect(tiledRendererIds(collection)).toEqual(expectedIds)
  })

  it('rebases disconnected multiworld drift without connecting its segments', () => {
    const canonicalStarts = [0, 120, -120, 0, 120, -120, 0]
    const points = canonicalStarts.flatMap((longitude, segmentIndex) => [
      point(longitude, segmentIndex),
      point(longitude + 20, segmentIndex),
    ])
    const segmentStartIndices = canonicalStarts
      .slice(1)
      .map((_, index) => (index + 1) * 2)
    const wrappedSegments = precomputeWrappedSegments(points, segmentStartIndices)
    const prepared = prepareTrackGeometry(points, segmentStartIndices, 2)
    const routeParts = geometryParts(prepared.routeGeometry)
    const { collection, expectedIds } = rendererContractCollection(prepared)
    const longitudes = publishedLongitudes([
      prepared.routeGeometry,
      ...prepared.trailChunkCollection.features.map((feature) => feature.geometry),
    ])

    expect(wrappedSegments.at(-1)?.coordinates.at(-1)).toEqual([740, 6])
    expect(routeParts).toHaveLength(canonicalStarts.length)
    expect(routeParts.every((coordinates) => (
      coordinates.length === 2
      && coordinates[1][0] - coordinates[0][0] === 20
    ))).toBe(true)
    expect(prepared.trailChunks.flatMap((chunk) => (
      chunk.parts.map((part) => part.range)
    ))).toEqual(canonicalStarts.map((_, index) => ({
      start: index * 2,
      end: index * 2 + 1,
    })))
    expect(longitudes.every((longitude) => (
      Math.abs(longitude) <= RENDERER_LONGITUDE_MAX_ANCHOR_DISTANCE
    ))).toBe(true)
    expect(tiledRendererIds(collection)).toEqual(expectedIds)
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

    expect(prepared).not.toHaveProperty('wrappedSegments')
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
    expect(prepared).not.toHaveProperty('wrappedSegments')
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
