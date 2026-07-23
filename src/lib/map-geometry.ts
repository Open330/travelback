import type { TrackPoint } from '@/types'
import { wrapLngNear } from '@/lib/interpolate'

export interface PrecomputedSegment {
  coordinates: [number, number][]
  range: { start: number; end: number }
}

export interface TrackDisplayBounds {
  west: number
  south: number
  east: number
  north: number
}

export const REFERENCE_GRID_MAX_FEATURES_PER_AXIS = 128
export const REFERENCE_GRID_MAX_FEATURES = REFERENCE_GRID_MAX_FEATURES_PER_AXIS * 2

function chooseReferenceGridStep(span: number): number {
  if (span <= 0.02) return 0.0025
  if (span <= 0.05) return 0.005
  if (span <= 0.1) return 0.01
  if (span <= 0.5) return 0.05
  if (span <= 1.5) return 0.1
  if (span <= 5) return 0.5
  if (span <= 20) return 2
  return 10
}

function niceStepAtLeast(minimumStep: number): number {
  const exponent = Math.floor(Math.log10(minimumStep))
  const magnitude = 10 ** exponent
  const normalized = minimumStep / magnitude
  const factor = normalized <= 1
    ? 1
    : normalized <= 2
      ? 2
      : normalized <= 2.5
        ? 2.5
        : normalized <= 5
          ? 5
          : 10
  return factor * magnitude
}

function gridLineCount(minimum: number, maximum: number, step: number): number {
  const first = Math.floor(minimum / step) * step
  return Math.max(1, Math.ceil((maximum + step / 2 - first) / step))
}

function chooseBoundedGridStep(
  minimum: number,
  maximum: number,
  preferredStep: number,
): number {
  if (gridLineCount(minimum, maximum, preferredStep) <= REFERENCE_GRID_MAX_FEATURES_PER_AXIS) {
    return preferredStep
  }

  const range = maximum - minimum
  return niceStepAtLeast(range / (REFERENCE_GRID_MAX_FEATURES_PER_AXIS - 3))
}

function buildGridValues(
  minimum: number,
  maximum: number,
  preferredStep: number,
): number[] {
  const step = chooseBoundedGridStep(minimum, maximum, preferredStep)
  const first = Math.floor(minimum / step) * step
  const count = Math.min(
    gridLineCount(minimum, maximum, step),
    REFERENCE_GRID_MAX_FEATURES_PER_AXIS,
  )
  return Array.from(
    { length: count },
    (_, index) => Number((first + index * step).toFixed(6)),
  )
}

function worldReferenceGridData(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []

  for (let longitude = -150; longitude <= 150; longitude += 30) {
    features.push({
      type: 'Feature',
      properties: { major: longitude === 0 ? 1 : 0 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [longitude, -80],
          [longitude, 80],
        ],
      },
    })
  }

  for (let latitude = -60; latitude <= 60; latitude += 30) {
    features.push({
      type: 'Feature',
      properties: { major: latitude === 0 ? 1 : 0 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-180, latitude],
          [180, latitude],
        ],
      },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

export function buildReferenceGridData(
  bounds: TrackDisplayBounds | null,
): GeoJSON.FeatureCollection {
  if (!bounds) return worldReferenceGridData()

  const boundsValues = [bounds.west, bounds.south, bounds.east, bounds.north]
  if (!boundsValues.every(Number.isFinite)) return worldReferenceGridData()

  const west = Math.min(bounds.west, bounds.east)
  const east = Math.max(bounds.west, bounds.east)
  const south = Math.min(bounds.south, bounds.north)
  const north = Math.max(bounds.south, bounds.north)
  const span = Math.max(east - west, north - south, 0.01)
  if (!Number.isFinite(span) || span > Number.MAX_VALUE / 4) {
    return worldReferenceGridData()
  }

  const preferredStep = chooseReferenceGridStep(span)
  const longitudeMargin = Math.max(span * 1.5, preferredStep * 4)
  const latitudeMargin = Math.max(span * 1.5, preferredStep * 4)
  const expandedMinLng = west - longitudeMargin
  const expandedMaxLng = east + longitudeMargin
  const gridSouth = Math.max(-85, Math.min(85, south))
  const gridNorth = Math.max(-85, Math.min(85, north))
  const expandedMinLat = Math.max(-85, gridSouth - latitudeMargin)
  const expandedMaxLat = Math.min(85, gridNorth + latitudeMargin)
  const longitudes = buildGridValues(expandedMinLng, expandedMaxLng, preferredStep)
  const latitudes = buildGridValues(expandedMinLat, expandedMaxLat, preferredStep)
  const majorEvery = 5
  const features: GeoJSON.Feature[] = [
    ...longitudes.map((longitude, index): GeoJSON.Feature => ({
      type: 'Feature',
      properties: { major: index % majorEvery === 0 ? 1 : 0 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [longitude, expandedMinLat],
          [longitude, expandedMaxLat],
        ],
      },
    })),
    ...latitudes.map((latitude, index): GeoJSON.Feature => ({
      type: 'Feature',
      properties: { major: index % majorEvery === 0 ? 1 : 0 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [expandedMinLng, latitude],
          [expandedMaxLng, latitude],
        ],
      },
    })),
  ]

  return {
    type: 'FeatureCollection',
    features,
  }
}

export const TRAIL_CHUNK_COORDINATE_BUDGET = 512
const WORLD_LONGITUDE_SPAN = 360
const HALF_WORLD_LONGITUDE_SPAN = WORLD_LONGITUDE_SPAN / 2

/**
 * Renderer edges are centered on the world copy nearest the route's first
 * display longitude. Since wrapped source edges span at most 180 degrees,
 * their published endpoints remain within 270 degrees of that anchor.
 */
export const RENDERER_LONGITUDE_MAX_ANCHOR_DISTANCE = 270

export interface TrailChunkPart {
  coordinates: [number, number][]
  range: { start: number; end: number }
}

export interface TrailChunk {
  parts: TrailChunkPart[]
  endIndex: number
  coordinateCount: number
}

type TrackGeometry = GeoJSON.LineString | GeoJSON.MultiLineString

export interface PreparedTrackGeometry {
  wrappedSegments: PrecomputedSegment[]
  displayBounds: TrackDisplayBounds | null
  routeGeometry: TrackGeometry
  trailChunks: TrailChunk[]
  trailChunkCollection: GeoJSON.FeatureCollection<
    GeoJSON.LineString | GeoJSON.MultiLineString,
    { chunkIndex: number }
  >
}

export type FitBoundsCoordinates = [west: number, south: number, east: number, north: number]

export function buildFitBoundsCoordinates(
  bounds: TrackDisplayBounds | null,
): FitBoundsCoordinates | null {
  if (!bounds) return null

  const isDegenerate = Math.abs(bounds.east - bounds.west) < 1e-10
    && Math.abs(bounds.north - bounds.south) < 1e-10
  if (!isDegenerate) return [bounds.west, bounds.south, bounds.east, bounds.north]

  // Keep degenerate padding in the prepared longitude space used above, and
  // clamp latitude at the geographic boundary so MapLibre never receives an
  // invalid LngLat. At a pole the remaining padding expands inward.
  const padding = 0.1
  return [
    bounds.west - padding,
    Math.max(-90, bounds.south - padding),
    bounds.east + padding,
    Math.min(90, bounds.north + padding),
  ]
}

function normalizeSegmentStarts(pointCount: number, segmentStartIndices: number[] = []): number[] {
  return [...new Set(
    segmentStartIndices
      .filter((index) => Number.isInteger(index) && index > 0 && index < pointCount)
      .sort((a, b) => a - b)
  )]
}

function buildSegmentRanges(
  pointCount: number,
  segmentStartIndices: number[] = [],
): Array<{ start: number; end: number }> {
  if (pointCount === 0) return []

  const starts = [0, ...normalizeSegmentStarts(pointCount, segmentStartIndices)]
  return starts.map((start, index) => ({
    start,
    end: (starts[index + 1] ?? pointCount) - 1,
  }))
}

function validLineCoordinates(coordinates: [number, number][]): [number, number][] {
  if (coordinates.length !== 1) return coordinates
  return [coordinates[0], [...coordinates[0]] as [number, number]]
}

function lineGeometry(
  segments: [number, number][][],
): TrackGeometry {
  if (segments.length === 0) {
    return { type: 'LineString', coordinates: [] }
  }
  if (segments.length === 1) {
    return { type: 'LineString', coordinates: segments[0] }
  }
  return { type: 'MultiLineString', coordinates: segments }
}

export function precomputeWrappedSegments(
  points: TrackPoint[],
  segmentStartIndices: number[] = [],
): PrecomputedSegment[] {
  // A segment break still starts a separate geometry part. Carrying only the
  // display longitude selects the nearest equivalent world copy without
  // inventing an edge between the two segments.
  let previousDisplayLongitude: number | undefined
  return buildSegmentRanges(points.length, segmentStartIndices).map((range) => {
    const coordinates: [number, number][] = []
    for (let index = range.start; index <= range.end; index++) {
      const point = points[index]
      const previous = coordinates[coordinates.length - 1]
      const referenceLongitude = previous?.[0] ?? previousDisplayLongitude
      const lng = referenceLongitude == null
        ? point.lng
        : wrapLngNear(referenceLongitude, point.lng)
      coordinates.push([lng, point.lat])
    }
    previousDisplayLongitude = coordinates.at(-1)?.[0] ?? previousDisplayLongitude
    return { coordinates, range }
  })
}

function rendererWorldShift(
  anchorLongitude: number,
  startLongitude: number,
  endLongitude: number,
): number {
  const midpoint = startLongitude + (endLongitude - startLongitude) / 2
  return Math.floor(
    (midpoint - anchorLongitude + HALF_WORLD_LONGITUDE_SPAN) / WORLD_LONGITUDE_SPAN,
  ) * WORLD_LONGITUDE_SPAN
}

function buildRendererSegments(
  wrappedSegments: PrecomputedSegment[],
): PrecomputedSegment[] {
  const anchorLongitude = wrappedSegments
    .find((segment) => segment.coordinates.length > 0)
    ?.coordinates[0][0]
  if (anchorLongitude == null) return []

  const rendererSegments: PrecomputedSegment[] = []

  for (const segment of wrappedSegments) {
    if (segment.coordinates.length === 0) continue

    if (segment.coordinates.length === 1) {
      const [longitude, latitude] = segment.coordinates[0]
      const shift = rendererWorldShift(anchorLongitude, longitude, longitude)
      rendererSegments.push({
        coordinates: [[longitude - shift, latitude]],
        range: { ...segment.range },
      })
      continue
    }

    let currentShift: number | undefined
    let currentSegment: PrecomputedSegment | undefined
    for (let offset = 0; offset < segment.coordinates.length - 1; offset++) {
      const start = segment.coordinates[offset]
      const end = segment.coordinates[offset + 1]
      const shift = rendererWorldShift(anchorLongitude, start[0], end[0])

      if (currentSegment && shift === currentShift) {
        currentSegment.coordinates.push([end[0] - shift, end[1]])
        currentSegment.range.end = segment.range.start + offset + 1
        continue
      }

      currentShift = shift
      currentSegment = {
        coordinates: [
          [start[0] - shift, start[1]],
          [end[0] - shift, end[1]],
        ],
        range: {
          start: segment.range.start + offset,
          end: segment.range.start + offset + 1,
        },
      }
      rendererSegments.push(currentSegment)
    }
  }

  return rendererSegments
}

function computeDisplayBoundsFromWrappedSegments(
  wrappedSegments: PrecomputedSegment[],
): TrackDisplayBounds | null {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity

  for (const segment of wrappedSegments) {
    for (const [longitude, latitude] of segment.coordinates) {
      west = Math.min(west, longitude)
      south = Math.min(south, latitude)
      east = Math.max(east, longitude)
      north = Math.max(north, latitude)
    }
  }

  return west === Infinity ? null : { west, south, east, north }
}

export function computeTrackDisplayBounds(
  points: TrackPoint[],
  segmentStartIndices: number[] = [],
): TrackDisplayBounds | null {
  return computeDisplayBoundsFromWrappedSegments(
    buildRendererSegments(precomputeWrappedSegments(points, segmentStartIndices)),
  )
}

export function buildTrackGeometry(
  points: TrackPoint[],
  segmentStartIndices: number[] = [],
): TrackGeometry {
  return buildTrackGeometryFromWrappedSegments(
    buildRendererSegments(precomputeWrappedSegments(points, segmentStartIndices)),
  )
}

function buildTrackGeometryFromWrappedSegments(
  wrappedSegments: PrecomputedSegment[],
): TrackGeometry {
  const segments = wrappedSegments
    .map((segment) => validLineCoordinates(segment.coordinates))
    .filter((coordinates) => coordinates.length >= 2)

  return lineGeometry(segments)
}

export function buildTrailChunks(
  precomputedSegments: PrecomputedSegment[],
  coordinateBudget = TRAIL_CHUNK_COORDINATE_BUDGET,
): TrailChunk[] {
  if (!Number.isInteger(coordinateBudget) || coordinateBudget < 2) {
    throw new RangeError('Trail chunk coordinate budget must be an integer of at least 2')
  }

  const chunks: TrailChunk[] = []
  let currentChunk: TrailChunk | null = null

  const ensureChunk = (requiredCoordinates: number): TrailChunk => {
    if (!currentChunk || currentChunk.coordinateCount + requiredCoordinates > coordinateBudget) {
      currentChunk = { parts: [], endIndex: -1, coordinateCount: 0 }
      chunks.push(currentChunk)
    }
    return currentChunk
  }

  for (const segment of precomputedSegments) {
    if (segment.coordinates.length === 0) continue

    if (segment.coordinates.length === 1) {
      const chunk = ensureChunk(2)
      const coordinate = segment.coordinates[0]
      chunk.parts.push({
        coordinates: [coordinate, [...coordinate] as [number, number]],
        range: { ...segment.range },
      })
      chunk.coordinateCount += 2
      chunk.endIndex = segment.range.end
      continue
    }

    let offset = 0
    while (offset < segment.coordinates.length - 1) {
      let chunk = ensureChunk(2)
      let availableCoordinates = coordinateBudget - chunk.coordinateCount
      if (availableCoordinates < 2) {
        currentChunk = null
        chunk = ensureChunk(2)
        availableCoordinates = coordinateBudget
      }

      const coordinateCount = Math.min(segment.coordinates.length - offset, availableCoordinates)
      const endOffset = offset + coordinateCount - 1
      chunk.parts.push({
        coordinates: segment.coordinates.slice(offset, endOffset + 1),
        range: {
          start: segment.range.start + offset,
          end: segment.range.start + endOffset,
        },
      })
      chunk.coordinateCount += coordinateCount
      chunk.endIndex = segment.range.start + endOffset

      if (endOffset === segment.coordinates.length - 1) break
      offset = endOffset
      currentChunk = null
    }
  }

  return chunks
}

export function buildTrailChunkFeatureCollection(
  chunks: TrailChunk[],
): GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.MultiLineString, { chunkIndex: number }> {
  return {
    type: 'FeatureCollection',
    features: chunks.map((chunk, chunkIndex) => ({
      type: 'Feature',
      properties: { chunkIndex },
      geometry: lineGeometry(chunk.parts.map((part) => part.coordinates)),
    })),
  }
}

export function prepareTrackGeometry(
  points: TrackPoint[],
  segmentStartIndices: number[] = [],
  coordinateBudget = TRAIL_CHUNK_COORDINATE_BUDGET,
): PreparedTrackGeometry {
  const wrappedSegments = precomputeWrappedSegments(points, segmentStartIndices)
  const rendererSegments = buildRendererSegments(wrappedSegments)
  const displayBounds = computeDisplayBoundsFromWrappedSegments(rendererSegments)
  const routeGeometry = buildTrackGeometryFromWrappedSegments(rendererSegments)
  const trailChunks = buildTrailChunks(rendererSegments, coordinateBudget)

  return {
    wrappedSegments,
    displayBounds,
    routeGeometry,
    trailChunks,
    trailChunkCollection: buildTrailChunkFeatureCollection(trailChunks),
  }
}

function lastCompletedTrailChunkIndex(chunks: TrailChunk[], segmentIndex: number): number {
  let low = 0
  let high = chunks.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (chunks[middle].endIndex <= segmentIndex) low = middle + 1
    else high = middle
  }
  return low - 1
}

export function buildTrailFrameGeometry(
  chunks: TrailChunk[],
  segmentIndex: number,
  point: TrackPoint,
): {
  completedChunkIndex: number
  activeGeometry: GeoJSON.LineString | GeoJSON.MultiLineString
} {
  const completedChunkIndex = lastCompletedTrailChunkIndex(chunks, segmentIndex)
  const activeChunk = chunks[completedChunkIndex + 1]
  if (!activeChunk) {
    return { completedChunkIndex, activeGeometry: lineGeometry([]) }
  }

  const activeParts: [number, number][][] = []
  for (const part of activeChunk.parts) {
    if (part.range.end <= segmentIndex) {
      activeParts.push(part.coordinates)
      continue
    }
    if (part.range.start > segmentIndex) break

    const offset = segmentIndex - part.range.start
    const completedCoordinates = part.coordinates.slice(0, offset + 1)
    const activeStart = completedCoordinates.at(-1)
    if (activeStart) {
      completedCoordinates.push([wrapLngNear(activeStart[0], point.lng), point.lat])
      activeParts.push(completedCoordinates)
    }
    break
  }

  return {
    completedChunkIndex,
    activeGeometry: lineGeometry(activeParts),
  }
}
