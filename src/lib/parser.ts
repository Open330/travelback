import { gpx, kml } from '@tmcw/togeojson'
import type { Track, TrackPoint } from '@/types'

const MAX_TRACK_POINTS = 250_000

function extractPointsFromGeoJSON(geojson: GeoJSON.FeatureCollection): { points: TrackPoint[]; segmentStartIndices: number[] } {
  const points: TrackPoint[] = []
  const segmentStartIndices: number[] = []

  const pushSegment = (coordinates: number[][], times?: string[]) => {
    if (coordinates.length === 0) return
    if (points.length > 0) {
      segmentStartIndices.push(points.length)
    }
    for (let i = 0; i < coordinates.length; i++) {
      const [lng, lat, ele] = coordinates[i]
      points.push({
        lng, lat,
        ele: ele ?? undefined,
        time: times?.[i] ? new Date(times[i]) : undefined,
      })
    }
  }

  for (const feature of geojson.features) {
    const geometry = feature.geometry
    const props = feature.properties ?? {}

    if (geometry.type === 'LineString') {
      pushSegment(geometry.coordinates, props.coordinateProperties?.times as string[] | undefined)
    } else if (geometry.type === 'MultiLineString') {
      const times: string[][] | undefined = props.coordinateProperties?.times
      for (let s = 0; s < geometry.coordinates.length; s++) {
        pushSegment(geometry.coordinates[s], times?.[s])
      }
    } else if (geometry.type === 'Point') {
      const [lng, lat, ele] = geometry.coordinates
      pushSegment([[lng, lat, ele]], props.time ? [props.time] : undefined)
    }
  }

  return {
    points,
    segmentStartIndices,
  }
}

function parseGPX(text: string): Track {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const segments = Array.from(doc.getElementsByTagName('trkseg'))
    .map((segment) => Array.from(segment.getElementsByTagName('trkpt'))
      .map<TrackPoint | null>((point) => {
        const lat = Number(point.getAttribute('lat'))
        const lng = Number(point.getAttribute('lon'))
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        const elevationText = point.getElementsByTagName('ele')[0]?.textContent
        const timeText = point.getElementsByTagName('time')[0]?.textContent
        return {
          lat,
          lng,
          ele: elevationText != null ? Number(elevationText) : undefined,
          time: timeText ? new Date(timeText) : undefined,
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
  const doc = new DOMParser().parseFromString(text, 'application/xml')
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
  if (ts) return new Date(ts)
  if (tsMs) return new Date(Number(tsMs))
  return undefined
}

// Helper: push a point only when lat/lng are valid
function pushE7(
  out: TrackPoint[], latE7?: number, lngE7?: number,
  ts?: string, tsMs?: string, alt?: number,
) {
  if (latE7 == null || lngE7 == null) return
  out.push({ lat: e7(latE7), lng: e7(lngE7), ele: alt, time: gTime(ts, tsMs) })
}

/* ---------- Format 1: Records.json / Location History.json --------- */
// { locations: [{ latitudeE7, longitudeE7, timestamp, ... }] }
function parseRecords(locations: Record<string, unknown>[], out: TrackPoint[]) {
  for (const loc of locations) {
    const lat = (loc.latitude as number | undefined) ?? (loc.latitudeE7 != null ? e7(loc.latitudeE7 as number) : undefined)
    const lng = (loc.longitude as number | undefined) ?? (loc.longitudeE7 != null ? e7(loc.longitudeE7 as number) : undefined)
    if (lat == null || lng == null) continue
    out.push({
      lat, lng,
      ele: loc.altitude as number | undefined,
      time: gTime(loc.timestamp as string | undefined, loc.timestampMs as string | undefined),
    })
  }
}

/* ---------- Format 2: Semantic Location History (monthly) ---------- */
// { timelineObjects: [{ activitySegment | placeVisit }] }
function parseTimelineObjects(objects: Record<string, unknown>[], out: TrackPoint[]) {
  for (const obj of objects) {
    const seg = obj.activitySegment as Record<string, unknown> | undefined
    const visit = obj.placeVisit as Record<string, unknown> | undefined

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
        out.push({
          lat: parseFloat(m[1]), lng: parseFloat(m[2]),
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
          out.push({ lat: parseFloat(m[1]), lng: parseFloat(m[2]), time: gTime(dur) })
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
export function parseGoogleLocationHistory(text: string): Track {
  const data = JSON.parse(text) as GoogleLocationData | Record<string, unknown>[]
  const points: TrackPoint[] = []

  // Flat array: [{ latitudeE7, ... }]
  if (Array.isArray(data)) {
    parseRecords(data, points)
  }
  // Records.json / Location History.json: { locations: [...] }
  else if (Array.isArray(data.locations)) {
    parseRecords(data.locations, points)
  }
  // Semantic Location History (monthly): { timelineObjects: [...] }
  if (!Array.isArray(data) && Array.isArray(data.timelineObjects)) {
    parseTimelineObjects(data.timelineObjects, points)
  }
  // Timeline Edits.json: { timelineEdits: [...] }
  if (!Array.isArray(data) && Array.isArray(data.timelineEdits)) {
    parseTimelineEdits(data.timelineEdits, points)
  }
  // Phone export / new format: { semanticSegments: [...] }
  if (!Array.isArray(data) && Array.isArray(data.semanticSegments)) {
    parseSemanticSegments(data.semanticSegments, points)
  }

  // De-duplicate identical lat/lng/time combos that may come from multiple branches
  const seen = new Set<string>()
  const unique: Array<{ point: TrackPoint; order: number }> = []
  for (const [order, p] of points.entries()) {
    const key = `${p.lat},${p.lng},${p.time?.getTime() ?? ''}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push({ point: p, order })
    }
  }

  unique.sort((a, b) => {
    const aTime = a.point.time?.getTime()
    const bTime = b.point.time?.getTime()
    if (aTime != null && bTime != null) return aTime - bTime
    return a.order - b.order
  })
  return { name: 'Google Location History', points: unique.map(({ point }) => point) }
}

export function isGoogleLocationJSON(text: string): boolean {
  try {
    const data: unknown = JSON.parse(text)
    if (Array.isArray(data)) {
      const first = data[0] as Record<string, unknown> | undefined
      return !!first && ('latitudeE7' in first || 'latitude' in first)
    }
    if (typeof data === 'object' && data !== null) {
      return (
        'locations' in data ||
        'semanticSegments' in data ||
        'timelineObjects' in data ||
        'timelineEdits' in data
      )
    }
    return false
  } catch {
    return false
  }
}

async function parseGoogleLocationHistoryInWorker(text: string): Promise<Track> {
  if (typeof Worker === 'undefined') {
    return parseGoogleLocationHistory(text)
  }

  return new Promise((resolve, reject) => {
    const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
    const worker = new Worker(`${basePath}/workers/googleLocation.worker.js`)

    const cleanup = () => {
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
    }

    worker.onmessage = (event: MessageEvent<{ track?: Track; error?: string }>) => {
      cleanup()
      if (event.data.error) {
        reject(new Error(event.data.error))
        return
      }
      if (!event.data.track) {
        reject(new Error('Failed to parse Google Location History'))
        return
      }
      resolve(event.data.track)
    }

    worker.onerror = (event) => {
      cleanup()
      reject(event.error instanceof Error ? event.error : new Error('Failed to parse Google Location History'))
    }

    worker.postMessage({ text })
  })
}

export function parseTrackFile(file: File): Promise<Track> {
  return new Promise((resolve, reject) => {
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
        } else if (ext === 'json' && isGoogleLocationJSON(text)) {
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
