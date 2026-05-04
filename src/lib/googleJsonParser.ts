import type { Track, TrackPoint } from '@/types'
import { parseOptionalNumber, parseOptionalDate, assertPointBudget, ParseError } from '@/lib/parse-utils'

// Re-export ParseError for backwards compatibility (parser.ts re-exports it too)
export { ParseError }

/* ------------------------------------------------------------------ */
/*  Google Location History — all known JSON formats                   */
/* ------------------------------------------------------------------ */
/* Note: This code is also duplicated (in plain JS) in                  */
/* public/workers/trackParser.worker.js for the Web Worker path.          */
/* When updating functions here, ensure they stay in sync with the worker.  */
/* ------------------------------------------------------------------ */

// Helper: E7 coordinate → decimal degrees
function e7(v: number): number { return v / 1e7 }

// Helper: parse timestamp from various Google formats
function gTime(ts?: string, tsMs?: string): Date | undefined {
  if (ts) return parseOptionalDate(ts)
  if (tsMs) return parseOptionalDate(Number(tsMs))
  return undefined
}

function looksLikeGoogleLocationRecord(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    'latitude' in candidate
    || 'longitude' in candidate
    || 'latitudeE7' in candidate
    || 'longitudeE7' in candidate
  )
}

// Helper: push a point only when lat/lng are valid
function pushE7(
  out: TrackPoint[], latE7?: number, lngE7?: number,
  ts?: string, tsMs?: string, alt?: number,
) {
  const parsedLatE7 = parseOptionalNumber(latE7)
  const parsedLngE7 = parseOptionalNumber(lngE7)
  if (parsedLatE7 == null || parsedLngE7 == null) return
  const lat = e7(parsedLatE7)
  const lng = e7(parsedLngE7)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return
  assertPointBudget(out)
  out.push({ lat, lng, ele: parseOptionalNumber(alt), time: gTime(ts, tsMs) })
}

/* ---------- Format 1: Records.json / Location History.json --------- */
type TrackSegment = TrackPoint[]

function parseRecords(locations: Record<string, unknown>[]): TrackSegment {
  const out: TrackPoint[] = []
  for (const loc of locations) {
    const latE7 = parseOptionalNumber(loc.latitudeE7)
    const lngE7 = parseOptionalNumber(loc.longitudeE7)
    const lat = parseOptionalNumber(loc.latitude) ?? (latE7 != null ? e7(latE7) : undefined)
    const lng = parseOptionalNumber(loc.longitude) ?? (lngE7 != null ? e7(lngE7) : undefined)
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
    assertPointBudget(out)
    out.push({
      lat, lng,
      ele: parseOptionalNumber(loc.altitude),
      time: gTime(loc.timestamp as string | undefined, loc.timestampMs as string | undefined),
    })
  }
  return out
}

/* ---------- Format 2: Semantic Location History (monthly) ---------- */
// { timelineObjects: [{ activitySegment | placeVisit }] }
function parseTimelineObjects(objects: Record<string, unknown>[]): TrackSegment[] {
  const segments: TrackSegment[] = []
  for (const obj of objects) {
    const seg = obj.activitySegment as Record<string, unknown> | undefined
    const visit = obj.placeVisit as Record<string, unknown> | undefined
    const currentSegment: TrackPoint[] = []

    if (seg) {
      // Best data: simplifiedRawPath.points[]
      const rawPath = seg.simplifiedRawPath as Record<string, unknown> | undefined
      if (rawPath && Array.isArray(rawPath.points)) {
        for (const pt of rawPath.points as Record<string, unknown>[]) {
          pushE7(currentSegment, pt.latE7 as number, pt.lngE7 as number, pt.timestamp as string)
        }
      } else {
        // Fallback: waypointPath.waypoints[]
        const wpPath = seg.waypointPath as Record<string, unknown> | undefined
        if (wpPath && Array.isArray(wpPath.waypoints)) {
          for (const wp of wpPath.waypoints as Record<string, unknown>[]) {
            pushE7(currentSegment, wp.latE7 as number, wp.lngE7 as number)
          }
        } else {
          // Last resort: startLocation + endLocation
          const dur = seg.duration as Record<string, unknown> | undefined
          const start = seg.startLocation as Record<string, unknown> | undefined
          const end = seg.endLocation as Record<string, unknown> | undefined
          if (start) pushE7(currentSegment, start.latitudeE7 as number, start.longitudeE7 as number, dur?.startTimestamp as string)
          if (end) pushE7(currentSegment, end.latitudeE7 as number, end.longitudeE7 as number, dur?.endTimestamp as string)
        }
      }
    }

    if (visit) {
      const dur = visit.duration as Record<string, unknown> | undefined
      const loc = visit.location as Record<string, unknown> | undefined
      if (loc) {
        pushE7(currentSegment, loc.latitudeE7 as number, loc.longitudeE7 as number, dur?.startTimestamp as string)
      } else if (visit.centerLatE7 != null && visit.centerLngE7 != null) {
        pushE7(currentSegment, visit.centerLatE7 as number, visit.centerLngE7 as number, dur?.startTimestamp as string)
      }
    }
    if (currentSegment.length > 0) segments.push(currentSegment)
  }
  return segments
}

/* ---------- Format 3: Timeline Edits.json -------------------------- */
// { timelineEdits: [{ rawSignal: { signal: { position: { point, timestamp } } } }] }
function parseTimelineEdits(edits: Record<string, unknown>[]): TrackSegment {
  const out: TrackPoint[] = []
  for (const edit of edits) {
    const raw = edit.rawSignal as Record<string, unknown> | undefined
    if (!raw) continue
    const signal = raw.signal as Record<string, unknown> | undefined
    if (!signal) continue
    const pos = signal.position as Record<string, unknown> | undefined
    if (!pos) continue
    const pt = pos.point as Record<string, unknown> | undefined
    if (!pt) continue
    pushE7(out, pt.latE7 as number, pt.lngE7 as number, pos.timestamp as string, undefined, pos.altitudeMeters as number)
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
function parseSemanticSegments(segments: Record<string, unknown>[]): TrackSegment[] {
  const outSegments: TrackSegment[] = []
  for (const seg of segments) {
    const pathSegment: TrackPoint[] = []

    // timelinePath: [{ point: "geo:lat,lng", timestamp }]
    if (Array.isArray(seg.timelinePath)) {
      for (const pt of seg.timelinePath as Record<string, unknown>[]) {
        const point = parseSemanticPoint(pt.point)
        if (!point) continue
        assertPointBudget(pathSegment)
        pathSegment.push({
          ...point,
          time: gTime(pt.timestamp as string),
        })
      }
    }
    // Segment break between timelinePath and visit within the same segment
    // (a single semanticSegment can contain both a walk path and a stationary
    // visit — they should not be connected by a straight line).
    if (pathSegment.length > 0) outSegments.push(pathSegment)

    // visit: { topCandidate: { placeLocation: { latLng: "lat°, lng°" } } }
    const visitSegment: TrackPoint[] = []
    const visit = seg.visit as Record<string, unknown> | undefined
    if (visit) {
      const top = visit.topCandidate as Record<string, unknown> | undefined
      const placeLoc = top?.placeLocation as Record<string, unknown> | undefined
      if (placeLoc?.latLng) {
        const m = (placeLoc.latLng as string).match(/([-\d.]+)[°]?,\s*([-\d.]+)/)
        if (m) {
          const dur = seg.startTime as string | undefined
          const lat = parseOptionalNumber(m[1])
          const lng = parseOptionalNumber(m[2])
          if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
          assertPointBudget(visitSegment)
          visitSegment.push({ lat, lng, time: gTime(dur) })
        }
      }
    }
    if (visitSegment.length > 0) outSegments.push(visitSegment)
  }
  return outSegments
}

/* ---------- Google JSON shape -------------------------------------- */
interface GoogleLocationData {
  locations?: Record<string, unknown>[]
  timelineObjects?: Record<string, unknown>[]
  timelineEdits?: Record<string, unknown>[]
  semanticSegments?: Record<string, unknown>[]
  [key: string]: unknown
}

/* ---------- Main dispatcher ---------------------------------------- */
const MAX_JSON_DEPTH = 64

function sortPointsWithinSegment(segment: TrackSegment): TrackSegment {
  return segment
    .map((point, order) => ({ point, order }))
    .sort((a, b) => {
      const aTime = a.point.time?.getTime()
      const bTime = b.point.time?.getTime()
      if (aTime != null && bTime != null) return aTime - bTime
      if (aTime != null) return -1
      if (bTime != null) return 1
      return a.order - b.order
    })
    .map(({ point }) => point)
}

function pointKey(point: TrackPoint): string {
  return `${point.lat.toFixed(7)},${point.lng.toFixed(7)},${point.time?.getTime() ?? ''}`
}

function segmentSortTime(segment: TrackSegment): number | undefined {
  return segment.find((point) => point.time)?.time?.getTime()
}

function flattenGoogleSegments(rawSegments: TrackSegment[]): { points: TrackPoint[]; segmentStartIndices: number[] } {
  const segments = rawSegments
    .map((segment, order) => {
      const seen = new Set<string>()
      const points: TrackPoint[] = []
      for (const point of sortPointsWithinSegment(segment)) {
        const key = pointKey(point)
        if (seen.has(key)) continue
        seen.add(key)
        points.push(point)
      }
      return { points, order }
    })
    .filter((segment): segment is { points: TrackPoint[]; order: number } => segment.points.length > 0)
    .sort((a, b) => {
      const aTime = segmentSortTime(a.points)
      const bTime = segmentSortTime(b.points)
      if (aTime != null && bTime != null) return aTime - bTime
      if (aTime != null) return -1
      if (bTime != null) return 1
      return a.order - b.order
    })

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
// Scanning is capped at MAX_DEPTH_SCAN_CHARS (10 MB) because valid Google
// Location History files have consistent nesting depth throughout — if the
// first 10 MB are safe, the rest will be too.  Without the cap, a 100 MB
// file would require iterating ~100 M characters before the worker can start
// parsing (C19-F05).
const MAX_DEPTH_SCAN_CHARS = 10 * 1024 * 1024

export function checkJsonDepth(text: string, maxDepth = MAX_JSON_DEPTH): void {
  let depth = 0
  let inString = false
  let escape = false
  const limit = Math.min(text.length, MAX_DEPTH_SCAN_CHARS)
  for (let i = 0; i < limit; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{' || ch === '[') {
      depth++
      if (depth > maxDepth) throw new ParseError('JSON nesting depth exceeds limit', 'JSON_DEPTH_EXCEEDED')
    } else if (ch === '}' || ch === ']') {
      depth--
      if (depth < 0) throw new ParseError('Invalid JSON structure', 'INVALID_GOOGLE_JSON')
    }
  }
}

export function parseGoogleLocationHistory(text: string): Track {
  // Skip checkJsonDepth on the main thread — JSON.parse throws RangeError on
  // excessive nesting depth, which we convert to a ParseError below.  The
  // separate char-by-char scan is still kept for the worker path (where a
  // RangeError would crash the worker process entirely).
  let data: GoogleLocationData | Record<string, unknown>[]
  try {
    data = JSON.parse(text) as GoogleLocationData | Record<string, unknown>[]
  } catch (err) {
    if (err instanceof RangeError) {
      throw new ParseError('JSON nesting depth exceeds limit', 'JSON_DEPTH_EXCEEDED')
    }
    throw new ParseError('Invalid JSON file. Please check that the file is a valid Google Location History export.', 'INVALID_GOOGLE_JSON')
  }
  const segments: TrackSegment[] = []
  let recognizedFormat = false

  // Note: Multiple format branches can match the same file (e.g., a file with both
  // timelineObjects and semanticSegments). This is intentional to extract maximum data.
  // The dedup step below removes any resulting duplicate points.
  // Flat array: [{ latitudeE7, ... }]
  if (Array.isArray(data) && data.some(looksLikeGoogleLocationRecord)) {
    recognizedFormat = true
    const records = parseRecords(data)
    if (records.length > 0) segments.push(records)
  }
  // Records.json / Location History.json: { locations: [...] }
  if (!Array.isArray(data) && Array.isArray(data.locations)) {
    recognizedFormat = true
    const records = parseRecords(data.locations)
    if (records.length > 0) segments.push(records)
  }
  // Semantic Location History (monthly): { timelineObjects: [...] }
  if (!Array.isArray(data) && Array.isArray(data.timelineObjects)) {
    recognizedFormat = true
    segments.push(...parseTimelineObjects(data.timelineObjects))
  }
  // Timeline Edits.json: { timelineEdits: [...] }
  if (!Array.isArray(data) && Array.isArray(data.timelineEdits)) {
    recognizedFormat = true
    const edits = parseTimelineEdits(data.timelineEdits)
    if (edits.length > 0) segments.push(edits)
  }
  // Phone export / new format: { semanticSegments: [...] }
  if (!Array.isArray(data) && Array.isArray(data.semanticSegments)) {
    recognizedFormat = true
    segments.push(...parseSemanticSegments(data.semanticSegments))
  }

  if (!recognizedFormat) {
    throw new ParseError('Unsupported Google Location History format', 'UNSUPPORTED_GOOGLE_FORMAT')
  }

  const { points, segmentStartIndices } = flattenGoogleSegments(segments)

  return {
    name: 'Google Location History',
    points,
    ...(segmentStartIndices.length > 0 ? { segmentStartIndices } : {}),
  }
}
