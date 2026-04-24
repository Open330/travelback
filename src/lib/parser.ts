import { gpx, kml } from '@tmcw/togeojson'
import type { Track, TrackPoint } from '@/types'

const MAX_TRACK_POINTS = 250_000

/**
 * Parser error with a machine-readable code for i18n mapping.
 * Avoids depending on English error message text for error classification.
 */
export class ParseError extends Error {
  readonly code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = 'ParseError'
    this.code = code
  }
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined
  if (typeof value === 'string' && value.trim() === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseOptionalDate(value: unknown): Date | undefined {
  if (value == null || value === '') return undefined
  const parsed = new Date(value as string | number | Date)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
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

function extractPointsFromGeoJSON(geojson: GeoJSON.FeatureCollection): { points: TrackPoint[]; segmentStartIndices: number[] } {
  type CoordinateProperties = { times?: string[] | string[][] }
  type GeoJsonProps = Record<string, unknown> & { coordinateProperties?: CoordinateProperties; time?: string }
  const points: TrackPoint[] = []
  const segmentStartIndices: number[] = []
  let pendingPointCoordinates: number[][] = []
  let pendingPointTimes: Array<string | undefined> = []

  const pushSegment = (coordinates: number[][], times?: Array<string | undefined>) => {
    if (coordinates.length === 0) return
    const nextPoints: TrackPoint[] = []
    for (let i = 0; i < coordinates.length; i++) {
      const [rawLng, rawLat, ele] = coordinates[i]
      const lng = parseOptionalNumber(rawLng)
      const lat = parseOptionalNumber(rawLat)
      if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
      nextPoints.push({
        lng, lat,
        ele: parseOptionalNumber(ele),
        time: parseOptionalDate(times?.[i]),
      })
    }
    if (nextPoints.length === 0) return
    if (points.length > 0) {
      segmentStartIndices.push(points.length)
    }
    points.push(...nextPoints)
  }

  const flushPendingPointSegment = () => {
    if (pendingPointCoordinates.length === 0) return
    pushSegment(pendingPointCoordinates, pendingPointTimes.length > 0 ? pendingPointTimes : undefined)
    pendingPointCoordinates = []
    pendingPointTimes = []
  }

  const pushPointCoordinate = (coordinate: number[], time?: string) => {
    const [rawLng, rawLat, ele] = coordinate
    const lng = parseOptionalNumber(rawLng)
    const lat = parseOptionalNumber(rawLat)
    if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return
    pendingPointCoordinates.push([lng, lat, ele])
    pendingPointTimes.push(time)
  }

  const processGeometry = (geometry: GeoJSON.Geometry, props: GeoJsonProps) => {
    if (geometry.type === 'LineString') {
      flushPendingPointSegment()
      const coordinateTimes = props.coordinateProperties?.times
      const times = Array.isArray(coordinateTimes) && typeof coordinateTimes[0] === 'string'
        ? coordinateTimes as string[]
        : undefined
      pushSegment(geometry.coordinates, times)
      return
    }

    if (geometry.type === 'MultiLineString') {
      flushPendingPointSegment()
      const coordinateTimes = props.coordinateProperties?.times
      const times = Array.isArray(coordinateTimes) && Array.isArray(coordinateTimes[0])
        ? coordinateTimes as string[][]
        : undefined
      for (let s = 0; s < geometry.coordinates.length; s++) {
        pushSegment(geometry.coordinates[s], times?.[s])
      }
      return
    }

    if (geometry.type === 'Point') {
      pushPointCoordinate(geometry.coordinates, props.time as string | undefined)
      return
    }

    if (geometry.type === 'MultiPoint') {
      for (const coordinate of geometry.coordinates) {
        pushPointCoordinate(coordinate, props.time as string | undefined)
      }
      return
    }

    if (geometry.type === 'GeometryCollection') {
      for (const childGeometry of geometry.geometries) {
        processGeometry(childGeometry, props)
      }
    }
  }

  for (const feature of geojson.features) {
    const geometry = feature.geometry
    if (!geometry) continue
    const props = (feature.properties ?? {}) as GeoJsonProps
    processGeometry(geometry, props)
  }

  flushPendingPointSegment()

  return {
    points,
    segmentStartIndices,
  }
}

function stripXmlEntities(text: string): string {
  return text
    .replace(/<!DOCTYPE[\s\S]*?\]>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<!ENTITY[\s\S]*?>/gi, '')
}

function parseXml(text: string, formatName: string): Document {
  const safeText = stripXmlEntities(text)
  const doc = new DOMParser().parseFromString(safeText, 'application/xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new ParseError(`Invalid ${formatName}: XML parse error`, 'XML_PARSE_ERROR')
  return doc
}

function parseGPX(text: string): Track {
  const doc = parseXml(text, 'GPX')
  const segments = Array.from(doc.getElementsByTagName('trkseg'))
    .map((segment) => Array.from(segment.getElementsByTagName('trkpt'))
      .map<TrackPoint | null>((point) => {
        const lat = parseOptionalNumber(point.getAttribute('lat'))
        const lng = parseOptionalNumber(point.getAttribute('lon'))
        if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
        const children = Array.from(point.children)
        const elevationText = children.find(c => c.localName === 'ele')?.textContent
        const timeText = children.find(c => c.localName === 'time')?.textContent
        return {
          lat,
          lng,
          ele: parseOptionalNumber(elevationText),
          time: parseOptionalDate(timeText),
        }
      })
      .filter((point): point is TrackPoint => point !== null))
    .filter((segment) => segment.length > 0)

  const { points, segmentStartIndices } = segments.length > 0
    ? segments.reduce<{ points: TrackPoint[]; segmentStartIndices: number[] }>((acc, segment) => {
        if (acc.points.length > 0) {
          acc.segmentStartIndices.push(acc.points.length)
        }
        acc.points.push(...segment)
        return acc
      }, { points: [], segmentStartIndices: [] })
    : extractPointsFromGeoJSON(gpx(doc) as GeoJSON.FeatureCollection)
  const name = doc.querySelector('trk > name')?.textContent
    ?? doc.querySelector('metadata > name')?.textContent
    ?? 'GPX Track'
  return {
    name,
    points,
    ...(segmentStartIndices.length > 0 ? { segmentStartIndices } : {}),
  }
}

function parseKML(text: string): Track {
  const doc = parseXml(text, 'KML')
  const geojson = kml(doc)
  const { points, segmentStartIndices } = extractPointsFromGeoJSON(geojson as GeoJSON.FeatureCollection)
  const name = doc.querySelector('Document > name')?.textContent
    ?? doc.querySelector('Placemark > name')?.textContent
    ?? 'KML Track'
  return {
    name,
    points,
    ...(segmentStartIndices.length > 0 ? { segmentStartIndices } : {}),
  }
}

/* ------------------------------------------------------------------ */
/*  Google Location History — all known JSON formats                   */
/* ------------------------------------------------------------------ */

// Helper: E7 coordinate → decimal degrees
function e7(v: number): number { return v / 1e7 }

// Helper: parse timestamp from various Google formats
function gTime(ts?: string, tsMs?: string): Date | undefined {
  if (ts) return parseOptionalDate(ts)
  if (tsMs) return parseOptionalDate(Number(tsMs))
  return undefined
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
  out.push({ lat, lng, ele: parseOptionalNumber(alt), time: gTime(ts, tsMs) })
}

/* ---------- Format 1: Records.json / Location History.json --------- */
// { locations: [{ latitudeE7, longitudeE7, timestamp, ... }] }
type TrackSegment = TrackPoint[]

function parseRecords(locations: Record<string, unknown>[]): TrackSegment {
  const out: TrackPoint[] = []
  for (const loc of locations) {
    const latE7 = parseOptionalNumber(loc.latitudeE7)
    const lngE7 = parseOptionalNumber(loc.longitudeE7)
    const lat = parseOptionalNumber(loc.latitude) ?? (latE7 != null ? e7(latE7) : undefined)
    const lng = parseOptionalNumber(loc.longitude) ?? (lngE7 != null ? e7(lngE7) : undefined)
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
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

/* ---------- Format 4: semanticSegments (phone export) -------------- */
// { semanticSegments: [{ timelinePath | visit }] }
function parseSemanticSegments(segments: Record<string, unknown>[]): TrackSegment[] {
  const outSegments: TrackSegment[] = []
  for (const seg of segments) {
    const pathSegment: TrackPoint[] = []

    // timelinePath: [{ point: "geo:lat,lng", timestamp }]
    if (Array.isArray(seg.timelinePath)) {
      for (const pt of seg.timelinePath as Record<string, unknown>[]) {
        if (!pt.point) continue
        const m = (pt.point as string).match(/geo:([-\d.]+),([-\d.]+)/)
        if (!m) continue
        const lat = parseOptionalNumber(m[1])
        const lng = parseOptionalNumber(m[2])
        if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
        pathSegment.push({
          lat, lng,
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
  const seen = new Set<string>()
  const segments = rawSegments
    .map((segment, order) => {
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
  for (const segment of segments) {
    if (points.length > 0) {
      segmentStartIndices.push(points.length)
    }
    points.push(...segment.points)
  }
  return { points, segmentStartIndices }
}

function checkJsonDepth(text: string, maxDepth = MAX_JSON_DEPTH): void {
  let depth = 0
  let inString = false
  let escape = false
  for (let i = 0; i < text.length; i++) {
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
    }
  }
}

export function parseGoogleLocationHistory(text: string): Track {
  checkJsonDepth(text)
  let data: GoogleLocationData | Record<string, unknown>[]
  try {
    data = JSON.parse(text) as GoogleLocationData | Record<string, unknown>[]
  } catch {
    throw new ParseError('Invalid JSON file. Please check that the file is a valid Google Location History export.', 'INVALID_GOOGLE_JSON')
  }
  const segments: TrackSegment[] = []
  let recognizedFormat = false

  // Note: Multiple format branches can match the same file (e.g., a file with both
  // timelineObjects and semanticSegments). This is intentional to extract maximum data.
  // The dedup step below removes any resulting duplicate points.
  // Flat array: [{ latitudeE7, ... }]
  if (Array.isArray(data) && data.length > 0 && data.slice(0, 100).some(looksLikeGoogleLocationRecord)) {
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

export const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB
export const JSON_MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB keeps JSON imports inside a safer in-browser memory envelope
const MAIN_THREAD_JSON_FALLBACK_SIZE = 16 * 1024 * 1024

function decodeJsonBuffer(buffer: ArrayBuffer): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
}

function parseSmallGoogleJsonFallback(buffer: ArrayBuffer): Track {
  if (buffer.byteLength > MAIN_THREAD_JSON_FALLBACK_SIZE) {
    throw new ParseError('Large Google JSON imports require Web Worker support in this browser.', 'INVALID_GOOGLE_JSON')
  }
  return parseGoogleLocationHistory(decodeJsonBuffer(buffer))
}

async function parseGoogleLocationHistoryInWorkerBuffer(buffer: ArrayBuffer): Promise<Track> {
  if (typeof Worker === 'undefined') {
    return parseSmallGoogleJsonFallback(buffer)
  }

  return new Promise((resolve, reject) => {
    // Keep only a bounded binary fallback copy before transferring the
    // ArrayBuffer. Large JSON files should stay worker-only; decoding a full
    // text copy on the main thread defeats the worker memory/isolation goal.
    const fallbackBuffer = buffer.byteLength <= MAIN_THREAD_JSON_FALLBACK_SIZE ? buffer.slice(0) : null

    let worker: Worker
    try {
      const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
      worker = new Worker(`${basePath}/workers/trackParser.worker.js`)
    } catch (err) {
      console.warn('Worker creation failed, falling back to main thread:', err instanceof Error ? err.message : String(err))
      if (!fallbackBuffer) {
        reject(new ParseError('Large Google JSON imports require Web Worker support in this browser.', 'INVALID_GOOGLE_JSON'))
        return
      }
      try {
        resolve(parseSmallGoogleJsonFallback(fallbackBuffer))
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse Google Location History'))
      }
      return
    }

    const cleanup = () => {
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
    }

    worker.onmessage = (event: MessageEvent<{ track?: Track; error?: string; code?: string }>) => {
      cleanup()
      if (event.data.error) {
        // Worker reported a parse error — the worker already tried and
        // failed, so reject with its error rather than falling back to
        // the main-thread parser (which would likely fail the same way).
        reject(new ParseError(event.data.error, event.data.code ?? 'INVALID_GOOGLE_JSON'))
        return
      }
      if (!event.data.track) {
        // Worker returned no track and no error. Small files retain a bounded
        // fallback buffer; large files avoid main-thread decoding.
        if (!fallbackBuffer) {
          reject(new ParseError('Worker parser did not return a track', 'INVALID_GOOGLE_JSON'))
          return
        }
        try {
          resolve(parseSmallGoogleJsonFallback(fallbackBuffer))
        } catch {
          reject(new ParseError('Invalid JSON file. Please check that the file is a valid Google Location History export.', 'INVALID_GOOGLE_JSON'))
        }
        return
      }

      const track = event.data.track
      for (const p of track.points) {
        if (p.time != null && !(p.time instanceof Date)) {
          p.time = new Date(p.time as unknown as string | number)
        }
      }
      resolve(track)
    }

    worker.onerror = (event) => {
      cleanup()
      // Worker crashed (e.g., memory pressure). Fall back only for small files
      // where the bounded pre-transfer copy is safe to decode on the main thread.
      if (!fallbackBuffer) {
        reject(event.error instanceof Error ? event.error : new Error('Failed to parse Google Location History'))
        return
      }
      try {
        resolve(parseSmallGoogleJsonFallback(fallbackBuffer))
      } catch {
        reject(event.error instanceof Error ? event.error : new Error('Failed to parse Google Location History'))
      }
    }

    worker.postMessage({ ext: 'json', buffer }, [buffer])
  })
}

export function parseTrackFile(file: File): Promise<Track> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const maxForType = ext === 'json' ? JSON_MAX_FILE_SIZE : MAX_FILE_SIZE
    if (file.size > maxForType) {
      reject(new ParseError(
        `File is too large (${(file.size / 1024 / 1024).toFixed(0)}MB). Maximum size is ${(maxForType / 1024 / 1024).toFixed(0)}MB.`,
        'FILE_TOO_LARGE'
      ))
      return
    }

    const finalizeTrack = (track: Track) => {
      if (track.points.length < 2) {
        throw new ParseError('Track must contain at least 2 points', 'TOO_FEW_POINTS')
      }
      if (track.points.length > MAX_TRACK_POINTS) {
        throw new ParseError('Track contains too many points', 'TOO_MANY_POINTS')
      }
      resolve(track)
    }

    if (ext === 'json') {
      file.arrayBuffer()
        .then(parseGoogleLocationHistoryInWorkerBuffer)
        .then(finalizeTrack)
        .catch(reject)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = reader.result as string
        let track: Track

        if (ext === 'gpx') {
          track = parseGPX(text)
        } else if (ext === 'kml') {
          track = parseKML(text)
        } else {
          throw new ParseError(`Unsupported file format: .${ext}`, 'UNSUPPORTED_FORMAT')
        }

        finalizeTrack(track)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new ParseError('Failed to read file', 'READ_FAILED'))
    reader.readAsText(file)
  })
}
