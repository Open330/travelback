import type { TrackPoint } from '@/types'
import { wrapLngNear } from '@/lib/interpolate'

export interface PrecomputedSegment {
  coordinates: [number, number][]
  range: { start: number; end: number }
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

/**
 * Build only the completed part of the trail. Callers can cache this geometry
 * until the interpolator advances to a new vertex.
 */
export function buildCompletedTrailGeometry(
  precomputedSegments: PrecomputedSegment[],
  segmentIndex: number,
): GeoJSON.LineString | GeoJSON.MultiLineString {
  if (segmentIndex < 0) return lineGeometry([])

  const completedSegments: [number, number][][] = []
  for (const segment of precomputedSegments) {
    if (segment.range.start > segmentIndex) break

    const lastOffset = Math.min(segment.range.end, segmentIndex) - segment.range.start
    const coordinates = validLineCoordinates(segment.coordinates.slice(0, lastOffset + 1))
    if (coordinates.length >= 2) completedSegments.push(coordinates)
  }

  return lineGeometry(completedSegments)
}

/** Build the small line from the active vertex to the interpolated position. */
export function buildActiveTrailHeadGeometry(
  precomputedSegments: PrecomputedSegment[],
  segmentIndex: number,
  point: TrackPoint,
): GeoJSON.LineString {
  const activeSegment = precomputedSegments.find(({ range }) => (
    range.start <= segmentIndex && segmentIndex < range.end
  ))
  if (!activeSegment) return { type: 'LineString', coordinates: [] }

  const offset = segmentIndex - activeSegment.range.start
  const start = activeSegment.coordinates[offset]
  if (!start) return { type: 'LineString', coordinates: [] }

  return {
    type: 'LineString',
    coordinates: [
      start,
      [wrapLngNear(start[0], point.lng), point.lat],
    ],
  }
}
