import type { TrackPoint } from '@/types'
import { wrapLngNear } from '@/lib/interpolate'

export interface PrecomputedSegment {
  coordinates: [number, number][]
  range: { start: number; end: number }
}

export const TRAIL_CHUNK_COORDINATE_BUDGET = 512

export interface TrailChunkPart {
  coordinates: [number, number][]
  range: { start: number; end: number }
}

export interface TrailChunk {
  parts: TrailChunkPart[]
  endIndex: number
  coordinateCount: number
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
): GeoJSON.LineString | GeoJSON.MultiLineString {
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
  return buildSegmentRanges(points.length, segmentStartIndices).map((range) => {
    const coordinates: [number, number][] = []
    for (let index = range.start; index <= range.end; index++) {
      const point = points[index]
      const previous = coordinates[coordinates.length - 1]
      const lng = previous ? wrapLngNear(previous[0], point.lng) : point.lng
      coordinates.push([lng, point.lat])
    }
    return { coordinates, range }
  })
}

export function buildTrackGeometry(
  points: TrackPoint[],
  segmentStartIndices: number[] = [],
): GeoJSON.LineString | GeoJSON.MultiLineString {
  const segments = precomputeWrappedSegments(points, segmentStartIndices)
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
