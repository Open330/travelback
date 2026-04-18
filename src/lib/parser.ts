import { gpx, kml } from '@tmcw/togeojson'
import type { Track, TrackPoint } from '@/types'

const MAX_TRACK_POINTS = 250_000

function parseOptionalNumber(value: unknown): number | undefined {
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
  const points: TrackPoint[] = []
  const segmentStartIndices: number[] = []
  let pendingPointCoordinates: number[][] = []
  let pendingPointTimes: Array<string | undefined> = []

  const pushSegment = (coordinates: number[][], times?: Array<string | undefined>) => {
    if (coordinates.length === 0) return
    if (points.length > 0) {
      segmentStartIndices.push(points.length)
    }
    for (let i = 0; i < coordinates.length; i++) {
      const [lng, lat, ele] = coordinates[i]
      points.push({
        lng, lat,
        ele: parseOptionalNumber(ele),
        time: parseOptionalDate(times?.[i]),
      })
    }
  }

  const flushPendingPointSegment = () => {
    if (pendingPointCoordinates.length === 0) return
    pushSegment(pendingPointCoordinates, pendingPointTimes.length > 0 ? pendingPointTimes : undefined)
    pendingPointCoordinates = []
    pendingPointTimes = []
  }

  for (const feature of geojson.features) {
    const geometry = feature.geometry
    if (!geometry) continue
    const props = feature.properties ?? {}

    if (geometry.type === 'LineString') {
      flushPendingPointSegment()
      pushSegment(geometry.coordinates, props.coordinateProperties?.times as string[] | undefined)
    } else if (geometry.type === 'MultiLineString') {
      flushPendingPointSegment()
      const times: string[][] | undefined = props.coordinateProperties?.times
      for (let s = 0; s < geometry.coordinates.length; s++) {
        pushSegment(geometry.coordinates[s], times?.[s])
      }
    } else if (geometry.type === 'Point') {
      const [lng, lat, ele] = geometry.coordinates
      pendingPointCoordinates.push([lng, lat, ele])
      pendingPointTimes.push(props.time as string | undefined)
    }
  }

  flushPendingPointSegment()

  return {
    points,
    segmentStartIndices,
  }
}

function stripXmlEntities(text: string): string {
  return text.replace(/<!DOCTYPE[\s\S]*?>/gi, '').replace(/<!ENTITY[\s\S]*?>/gi, '')
}

function parseXml(text: string, formatName: string): Document {
  const safeText = stripXmlEntities(text)
  const doc = new DOMParser().parseFromString(safeText, 'application/xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error(`Invalid ${formatName}: XML parse error`)
  return doc
}

function parseGPX(text: string): Track {
  const doc = parseXml(text, 'GPX')
  const segments = Array.from(doc.getElementsByTagName('trkseg'))
    .map((segment) => Array.from(segment.getElementsByTagName('trkpt'))
      .map<TrackPoint | null>((point) => {
        const lat = Number(point.getAttribute('lat'))
        const lng = Number(point.getAttribute('lon'))
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
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
  if (latE7 == null || lngE7 == null) return
  const lat = e7(latE7)
  const lng = e7(lngE7)
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return
  out.push({ lat, lng, ele: parseOptionalNumber(alt), time: gTime(ts, tsMs) })
}

/* ---------- Format 1: Records.json / Location History.json --------- */
// { locations: [{ latitudeE7, longitudeE7, timestamp, ... }] }
function parseRecords(locations: Record<string, unknown>[], out: TrackPoint[]) {
  for (const loc of locations) {
    const lat = parseOptionalNumber(loc.latitude) ?? (loc.latitudeE7 != null ? e7(loc.latitudeE7 as number) : undefined)
    const lng = parseOptionalNumber(loc.longitude) ?? (loc.longitudeE7 != null ? e7(loc.longitudeE7 as number) : undefined)
    if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
    out.push({
      lat, lng,
      ele: parseOptionalNumber(loc.altitude),
      time: gTime(loc.timestamp as string | undefined, loc.timestampMs as string | undefined),
    })
  }
}

/* ---------- Format 2: Semantic Location History (monthly) ---------- */
// { timelineObjects: [{ activitySegment | placeVisit }] }
function parseTimelineObjects(objects: Record<string, unknown>[], out: TrackPoint[], segStarts: number[]) {
  for (const obj of objects) {
    const seg = obj.activitySegment as Record<string, unknown> | undefined
    const visit = obj.placeVisit as Record<string, unknown> | undefined
    const preLen = out.length

    if (seg) {
      // Best data: simplifiedRawPath.points[]
      const rawPath = seg.simplifiedRawPath as Record<string, unknown> | undefined
      if (rawPath && Array.isArray(rawPath.points)) {
        for (const pt of rawPath.points as Record<string, unknown>[]) {
          pushE7(out, pt.latE7 as number, pt.lngE7 as number, pt.timestamp as string)
        }
      } else {
        // Fallback: waypointPath.waypoints[]
        const wpPath = seg.waypointPath as Record<string, unknown> | undefined
        if (wpPath && Array.isArray(wpPath.waypoints)) {
          for (const wp of wpPath.waypoints as Record<string, unknown>[]) {
            pushE7(out, wp.latE7 as number, wp.lngE7 as number)
          }
        } else {
          // Last resort: startLocation + endLocation
          const dur = seg.duration as Record<string, unknown> | undefined
          const start = seg.startLocation as Record<string, unknown> | undefined
          const end = seg.endLocation as Record<string, unknown> | undefined
          if (start) pushE7(out, start.latitudeE7 as number, start.longitudeE7 as number, dur?.startTimestamp as string)
          if (end) pushE7(out, end.latitudeE7 as number, end.longitudeE7 as number, dur?.endTimestamp as string)
        }
      }
    }

    if (visit) {
      const dur = visit.duration as Record<string, unknown> | undefined
      const loc = visit.location as Record<string, unknown> | undefined
      if (loc) {
        pushE7(out, loc.latitudeE7 as number, loc.longitudeE7 as number, dur?.startTimestamp as string)
      } else if (visit.centerLatE7 != null && visit.centerLngE7 != null) {
        pushE7(out, visit.centerLatE7 as number, visit.centerLngE7 as number, dur?.startTimestamp as string)
      }
    }
    if (out.length > preLen && preLen > 0) segStarts.push(preLen)
  }
}

/* ---------- Format 3: Timeline Edits.json -------------------------- */
// { timelineEdits: [{ rawSignal: { signal: { position: { point, timestamp } } } }] }
function parseTimelineEdits(edits: Record<string, unknown>[], out: TrackPoint[]) {
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
}

/* ---------- Format 4: semanticSegments (phone export) -------------- */
// { semanticSegments: [{ timelinePath | visit }] }
function parseSemanticSegments(segments: Record<string, unknown>[], out: TrackPoint[]) {
  for (const seg of segments) {
    // timelinePath: [{ point: "geo:lat,lng", timestamp }]
    if (Array.isArray(seg.timelinePath)) {
      for (const pt of seg.timelinePath as Record<string, unknown>[]) {
        if (!pt.point) continue
        const m = (pt.point as string).match(/geo:([-\d.]+),([-\d.]+)/)
        if (!m) continue
        const lat = parseOptionalNumber(m[1])
        const lng = parseOptionalNumber(m[2])
        if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
        out.push({
          lat, lng,
          time: gTime(pt.timestamp as string),
        })
      }
    }
    // visit: { topCandidate: { placeLocation: { latLng: "lat°, lng°" } } }
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
          if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
          out.push({ lat, lng, time: gTime(dur) })
        }
      }
    }
  }
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

function checkJsonDepth(text: string, maxDepth = MAX_JSON_DEPTH): void {
  let depth = 0
  let inString = false
  let escape = false
  const limit = Math.min(text.length, 1024 * 1024)
  for (let i = 0; i < limit; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{' || ch === '[') {
      depth++
      if (depth > maxDepth) throw new Error('JSON nesting depth exceeds limit')
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
    throw new Error('Invalid JSON file. Please check that the file is a valid Google Location History export.')
  }
  const points: TrackPoint[] = []
  const segStarts: number[] = []
  let recognizedFormat = false

  // Flat array: [{ latitudeE7, ... }]
  if (Array.isArray(data) && data.length > 0 && data.slice(0, 100).some(looksLikeGoogleLocationRecord)) {
    recognizedFormat = true
    parseRecords(data, points)
  }
  // Records.json / Location History.json: { locations: [...] }
  else if (!Array.isArray(data) && Array.isArray(data.locations)) {
    recognizedFormat = true
    parseRecords(data.locations, points)
  }
  // Semantic Location History (monthly): { timelineObjects: [...] }
  if (!Array.isArray(data) && Array.isArray(data.timelineObjects)) {
    recognizedFormat = true
    parseTimelineObjects(data.timelineObjects, points, segStarts)
  }
  // Timeline Edits.json: { timelineEdits: [...] }
  if (!Array.isArray(data) && Array.isArray(data.timelineEdits)) {
    recognizedFormat = true
    parseTimelineEdits(data.timelineEdits, points)
  }
  // Phone export / new format: { semanticSegments: [...] }
  if (!Array.isArray(data) && Array.isArray(data.semanticSegments)) {
    recognizedFormat = true
    parseSemanticSegments(data.semanticSegments, points)
  }

  if (!recognizedFormat) {
    throw new Error('Unsupported Google Location History format')
  }

  // De-duplicate identical lat/lng/time combos that may come from multiple branches
  const seen = new Set<string>()
  const unique: Array<{ point: TrackPoint; order: number }> = []
  for (const [order, p] of points.entries()) {
    const key = `${p.lat.toFixed(7)},${p.lng.toFixed(7)},${p.time?.getTime() ?? ''}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push({ point: p, order })
    }
  }

  // Sort: timed points chronologically first, untimed points after, preserving insertion order
  unique.sort((a, b) => {
    const aTime = a.point.time?.getTime()
    const bTime = b.point.time?.getTime()
    if (aTime != null && bTime != null) return aTime - bTime
    if (aTime != null) return -1
    if (bTime != null) return 1
    return a.order - b.order
  })

  // Remap segment start indices to account for dedup removals and sort reordering
  const orderToNewIndex = new Map<number, number>()
  unique.forEach((entry, newIndex) => orderToNewIndex.set(entry.order, newIndex))
  const adjustedSegStarts = segStarts
    .map(originalIdx => {
      for (let i = originalIdx; i < points.length; i++) {
        const newIdx = orderToNewIndex.get(i)
        if (newIdx !== undefined) return newIdx
      }
      return -1
    })
    .filter(idx => idx > 0)

  return {
    name: 'Google Location History',
    points: unique.map(({ point }) => point),
    ...(adjustedSegStarts.length > 0 ? { segmentStartIndices: adjustedSegStarts } : {}),
  }
}

async function parseGoogleLocationHistoryInWorker(text: string): Promise<Track> {
  if (typeof Worker === 'undefined') {
    return parseGoogleLocationHistory(text)
  }

  return new Promise((resolve, reject) => {
    const parseOnMainThread = () => {
      try {
        resolve(parseGoogleLocationHistory(text))
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse Google Location History'))
      }
    }

    let worker: Worker
    try {
      const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
      worker = new Worker(`${basePath}/workers/trackParser.worker.js`)
    } catch {
      parseOnMainThread()
      return
    }

    const cleanup = () => {
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
    }

    worker.onmessage = (event: MessageEvent<{ track?: Track; error?: string }>) => {
      cleanup()
      if (event.data.error) {
        console.warn('[Travelback] Google worker parse failed, falling back to main thread:', event.data.error)
        parseOnMainThread()
        return
      }
      if (!event.data.track) {
        parseOnMainThread()
        return
      }
      // Validate Date fields survived structured clone
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
      if (event.error instanceof Error) {
        console.warn('[Travelback] Google worker parse failed, falling back to main thread:', event.error.message)
      }
      // Don't retry on main thread for large files — worker isolation exists for a reason
      if (text.length > 50 * 1024 * 1024) {
        reject(new Error('File too large to parse without Web Worker. Please try a smaller file.'))
        return
      }
      parseOnMainThread()
    }

    worker.postMessage({ ext: 'json', text })
  })
}

const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB

export function parseTrackFile(file: File): Promise<Track> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'json' && file.size > MAX_FILE_SIZE) {
      reject(new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(0)}MB). Maximum size is 200MB.`))
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const text = reader.result as string
        const ext = file.name.split('.').pop()?.toLowerCase()

        let track: Track

        if (ext === 'gpx') {
          track = parseGPX(text)
        } else if (ext === 'kml') {
          track = parseKML(text)
        } else if (ext === 'json') {
          track = await parseGoogleLocationHistoryInWorker(text)
        } else {
          throw new Error(`Unsupported file format: .${ext}`)
        }

        if (track.points.length < 2) {
          throw new Error('Track must contain at least 2 points')
        }
        if (track.points.length > MAX_TRACK_POINTS) {
          throw new Error('Track contains too many points')
        }

        resolve(track)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
