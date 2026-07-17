import type { Track, TrackPoint } from '@/types'
import {
  parseOptionalNumber,
  parseOptionalDate,
  assertPointBudget,
  createPointBudget,
  consumePointBudget,
  ParseError,
  type PointBudget,
} from '@/lib/parse-utils'

// Re-export ParseError for backwards compatibility (parser.ts re-exports it too)
export { ParseError }

/* ------------------------------------------------------------------ */
/*  Google Location History — all known JSON formats                   */
/* ------------------------------------------------------------------ */
/* The browser worker imports this module and is bundled deterministically. */
/* ------------------------------------------------------------------ */

// Helper: E7 coordinate → decimal degrees
function e7(v: number): number { return v / 1e7 }

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

// Helper: parse timestamp from various Google formats
function gTime(ts?: unknown, tsMs?: unknown): Date | undefined {
  const timestamp = parseOptionalDate(ts)
  if (timestamp) return timestamp
  const timestampMs = parseOptionalNumber(tsMs)
  return timestampMs == null ? undefined : parseOptionalDate(timestampMs)
}

function looksLikeGoogleLocationRecord(value: unknown): boolean {
  const candidate = asRecord(value)
  if (!candidate) return false
  return (
    'latitude' in candidate
    || 'longitude' in candidate
    || 'latitudeE7' in candidate
    || 'longitudeE7' in candidate
  )
}

// Helper: push a point only when lat/lng are valid
function pushE7(
  out: TrackPoint[], budget: PointBudget, latE7?: unknown, lngE7?: unknown,
  ts?: unknown, tsMs?: unknown, alt?: unknown,
) {
  const parsedLatE7 = parseOptionalNumber(latE7)
  const parsedLngE7 = parseOptionalNumber(lngE7)
  if (parsedLatE7 == null || parsedLngE7 == null) return
  const lat = e7(parsedLatE7)
  const lng = e7(parsedLngE7)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return
  consumePointBudget(budget)
  out.push({ lat, lng, ele: parseOptionalNumber(alt), time: gTime(ts, tsMs) })
}

/* ---------- Format 1: Records.json / Location History.json --------- */
type TrackSegment = TrackPoint[]

function parseRecords(locations: unknown[], budget: PointBudget): TrackSegment {
  const out: TrackPoint[] = []
  for (const value of locations) {
    const loc = asRecord(value)
    if (!loc) continue
    const latE7 = parseOptionalNumber(loc.latitudeE7)
    const lngE7 = parseOptionalNumber(loc.longitudeE7)
    const lat = parseOptionalNumber(loc.latitude) ?? (latE7 != null ? e7(latE7) : undefined)
    const lng = parseOptionalNumber(loc.longitude) ?? (lngE7 != null ? e7(lngE7) : undefined)
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
    consumePointBudget(budget)
    out.push({
      lat, lng,
      ele: parseOptionalNumber(loc.altitude),
      time: gTime(loc.timestamp, loc.timestampMs),
    })
  }
  return out
}

/* ---------- Format 2: Semantic Location History (monthly) ---------- */
// { timelineObjects: [{ activitySegment | placeVisit }] }
function parseTimelineObjects(objects: unknown[], budget: PointBudget): TrackSegment[] {
  const segments: TrackSegment[] = []
  for (const value of objects) {
    const obj = asRecord(value)
    if (!obj) continue
    const seg = asRecord(obj.activitySegment)
    const visit = asRecord(obj.placeVisit)
    const currentSegment: TrackPoint[] = []

    if (seg) {
      // Best data: simplifiedRawPath.points[]
      const rawPath = asRecord(seg.simplifiedRawPath)
      if (rawPath && Array.isArray(rawPath.points)) {
        for (const value of rawPath.points) {
          const point = asRecord(value)
          if (!point) continue
          pushE7(currentSegment, budget, point.latE7, point.lngE7, point.timestamp)
        }
      }

      if (currentSegment.length === 0) {
        // Fallback: waypointPath.waypoints[]
        const wpPath = asRecord(seg.waypointPath)
        if (wpPath && Array.isArray(wpPath.waypoints)) {
          for (const value of wpPath.waypoints) {
            const waypoint = asRecord(value)
            if (!waypoint) continue
            pushE7(currentSegment, budget, waypoint.latE7, waypoint.lngE7)
          }
        }
      }

      if (currentSegment.length === 0) {
        // Last resort: startLocation + endLocation
        const duration = asRecord(seg.duration)
        const start = asRecord(seg.startLocation)
        const end = asRecord(seg.endLocation)
        if (start) pushE7(currentSegment, budget, start.latitudeE7, start.longitudeE7, duration?.startTimestamp)
        if (end) pushE7(currentSegment, budget, end.latitudeE7, end.longitudeE7, duration?.endTimestamp)
      }
    }

    if (visit) {
      const duration = asRecord(visit.duration)
      const loc = asRecord(visit.location)
      if (loc) {
        pushE7(currentSegment, budget, loc.latitudeE7, loc.longitudeE7, duration?.startTimestamp)
      } else if (visit.centerLatE7 != null && visit.centerLngE7 != null) {
        pushE7(currentSegment, budget, visit.centerLatE7, visit.centerLngE7, duration?.startTimestamp)
      }
    }
    if (currentSegment.length > 0) segments.push(currentSegment)
  }
  return segments
}

/* ---------- Format 3: Timeline Edits.json -------------------------- */
// { timelineEdits: [{ rawSignal: { signal: { position: { point, timestamp } } } }] }
function parseTimelineEdits(edits: unknown[], budget: PointBudget): TrackSegment {
  const out: TrackPoint[] = []
  for (const value of edits) {
    const edit = asRecord(value)
    if (!edit) continue
    const raw = asRecord(edit.rawSignal)
    if (!raw) continue
    const signal = asRecord(raw.signal)
    if (!signal) continue
    const pos = asRecord(signal.position)
    if (!pos) continue
    const pt = asRecord(pos.point)
    if (!pt) continue
    pushE7(out, budget, pt.latE7, pt.lngE7, pos.timestamp, undefined, pos.altitudeMeters)
  }
  return out
}

function parseSemanticPoint(value: unknown): TrackPoint | null {
  if (typeof value !== 'string') return null
  const match = value.match(/^\s*geo:\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))(?:[;?].*)?\s*$/i)
  if (!match) return null
  const lat = parseOptionalNumber(match[1])
  const lng = parseOptionalNumber(match[2])
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

/* ---------- Format 4: semanticSegments (phone export) -------------- */
// { semanticSegments: [{ timelinePath | visit }] }
function parseSemanticSegments(segments: unknown[], budget: PointBudget): TrackSegment[] {
  const outSegments: TrackSegment[] = []
  for (const value of segments) {
    const seg = asRecord(value)
    if (!seg) continue
    const pathSegment: TrackPoint[] = []

    // timelinePath: [{ point: "geo:lat,lng", timestamp }]
    if (Array.isArray(seg.timelinePath)) {
      for (const value of seg.timelinePath) {
        const pathPoint = asRecord(value)
        if (!pathPoint) continue
        const point = parseSemanticPoint(pathPoint.point)
        if (!point) continue
        consumePointBudget(budget)
        pathSegment.push({
          ...point,
          time: gTime(pathPoint.timestamp),
        })
      }
    }
    // Segment break between timelinePath and visit within the same segment
    // (a single semanticSegment can contain both a walk path and a stationary
    // visit — they should not be connected by a straight line).
    if (pathSegment.length > 0) outSegments.push(pathSegment)

    // visit: { topCandidate: { placeLocation: { latLng: "lat°, lng°" } } }
    const visitSegment: TrackPoint[] = []
    const visit = asRecord(seg.visit)
    if (visit) {
      const top = asRecord(visit.topCandidate)
      const placeLoc = asRecord(top?.placeLocation)
      const latLng = placeLoc?.latLng
      if (typeof latLng === 'string') {
        const m = latLng.match(/([-\d.]+)[°]?,\s*([-\d.]+)/)
        if (m) {
          const lat = parseOptionalNumber(m[1])
          const lng = parseOptionalNumber(m[2])
          if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
          consumePointBudget(budget)
          visitSegment.push({ lat, lng, time: gTime(seg.startTime) })
        }
      }
    }
    if (visitSegment.length > 0) outSegments.push(visitSegment)
  }
  return outSegments
}

/* ---------- Main dispatcher ---------------------------------------- */
const MAX_JSON_DEPTH = 64

function sortPointsWithinSegment(segment: TrackSegment): TrackSegment {
  if (segment.some((point) => !point.time)) return segment

  return segment
    .map((point, order) => ({ point, order }))
    .sort((a, b) => {
      const difference = a.point.time!.getTime() - b.point.time!.getTime()
      return difference || a.order - b.order
    })
    .map(({ point }) => point)
}

function pointKey(point: TrackPoint): string {
  return `${point.lat.toFixed(7)},${point.lng.toFixed(7)},${point.time?.getTime() ?? ''}`
}

function flattenGoogleSegments(rawSegments: TrackSegment[]): { points: TrackPoint[]; segmentStartIndices: number[] } {
  const segments = rawSegments
    .map((segment, order) => {
      return { points: sortPointsWithinSegment(segment), order }
    })
    .filter((segment): segment is { points: TrackPoint[]; order: number } => segment.points.length > 0)

  if (segments.every((segment) => segment.points.every((point) => point.time))) {
    segments.sort((a, b) => {
      const difference = a.points[0].time!.getTime() - b.points[0].time!.getTime()
      return difference || a.order - b.order
    })
  }

  const points: TrackPoint[] = []
  const segmentStartIndices: number[] = []
  const seenTimedObservations = new Set<string>()
  for (const segment of segments) {
    const nextPoints = segment.points.filter((point) => {
      if (!point.time) return true
      const key = pointKey(point)
      if (seenTimedObservations.has(key)) return false
      seenTimedObservations.add(key)
      return true
    })
    if (nextPoints.length === 0) continue
    assertPointBudget(points, nextPoints.length)
    if (points.length > 0) {
      segmentStartIndices.push(points.length)
    }
    points.push(...nextPoints)
  }
  return { points, segmentStartIndices }
}

// Exported for use by the Web Worker path — on the main thread, JSON.parse
// throws RangeError on excessive nesting depth, which is caught and converted
// to a ParseError. The worker cannot recover from a RangeError (it crashes the
// process), so it uses this pre-flight check instead.
//
export function checkJsonDepth(text: string, maxDepth = MAX_JSON_DEPTH): void {
  let depth = 0
  let inString = false
  let escape = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escape) {
        escape = false
      } else if (ch === '\\') {
        escape = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{' || ch === '[') {
      depth++
      if (depth > maxDepth) throw new ParseError('JSON nesting depth exceeds limit', 'JSON_DEPTH_EXCEEDED')
    } else if (ch === '}' || ch === ']') {
      depth--
      if (depth < 0) throw new ParseError('Invalid JSON structure', 'INVALID_GOOGLE_JSON')
    }
  }
  if (inString || depth !== 0) {
    throw new ParseError('Invalid JSON structure', 'INVALID_GOOGLE_JSON')
  }
}

export function parseGoogleLocationHistory(text: string, maxPoints?: number): Track {
  // Keep depth and structural preflight in the shared parser so worker and
  // bounded main-thread fallback behavior cannot drift.
  checkJsonDepth(text)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    if (err instanceof RangeError) {
      throw new ParseError('JSON nesting depth exceeds limit', 'JSON_DEPTH_EXCEEDED')
    }
    throw new ParseError('Invalid JSON file. Please check that the file is a valid Google Location History export.', 'INVALID_GOOGLE_JSON')
  }
  if (parsed === null || typeof parsed !== 'object') {
    throw new ParseError('Unsupported Google Location History format', 'UNSUPPORTED_GOOGLE_FORMAT')
  }
  const data = parsed
  const root = asRecord(data)
  const segments: TrackSegment[] = []
  const budget = createPointBudget(maxPoints)
  let recognizedFormat = false

  // Note: Multiple format branches can match the same file (e.g., a file with both
  // timelineObjects and semanticSegments). This is intentional to extract maximum data.
  // The dedup step below removes any resulting duplicate points.
  // Flat array: [{ latitudeE7, ... }]
  if (Array.isArray(data) && data.some(looksLikeGoogleLocationRecord)) {
    recognizedFormat = true
    const records = parseRecords(data, budget)
    if (records.length > 0) segments.push(records)
  }
  // Records.json / Location History.json: { locations: [...] }
  if (root && Array.isArray(root.locations)) {
    recognizedFormat = true
    const records = parseRecords(root.locations, budget)
    if (records.length > 0) segments.push(records)
  }
  // Semantic Location History (monthly): { timelineObjects: [...] }
  if (root && Array.isArray(root.timelineObjects)) {
    recognizedFormat = true
    segments.push(...parseTimelineObjects(root.timelineObjects, budget))
  }
  // Timeline Edits.json: { timelineEdits: [...] }
  if (root && Array.isArray(root.timelineEdits)) {
    recognizedFormat = true
    const edits = parseTimelineEdits(root.timelineEdits, budget)
    if (edits.length > 0) segments.push(edits)
  }
  // Phone export / new format: { semanticSegments: [...] }
  if (root && Array.isArray(root.semanticSegments)) {
    recognizedFormat = true
    segments.push(...parseSemanticSegments(root.semanticSegments, budget))
  }

  if (!recognizedFormat) {
    throw new ParseError('Unsupported Google Location History format', 'UNSUPPORTED_GOOGLE_FORMAT')
  }

  const { points, segmentStartIndices } = flattenGoogleSegments(segments)

  return {
    name: 'Google Location History',
    fallbackNameSource: 'google',
    points,
    ...(segmentStartIndices.length > 0 ? { segmentStartIndices } : {}),
  }
}
