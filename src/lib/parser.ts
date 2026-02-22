import { gpx, kml } from '@tmcw/togeojson'
import type { Track, TrackPoint } from '@/types'

function extractPointsFromGeoJSON(geojson: GeoJSON.FeatureCollection): TrackPoint[] {
  const points: TrackPoint[] = []

  for (const feature of geojson.features) {
    const geometry = feature.geometry
    const props = feature.properties ?? {}

    if (geometry.type === 'LineString') {
      const times: string[] | undefined = props.coordinateProperties?.times
      for (let i = 0; i < geometry.coordinates.length; i++) {
        const [lng, lat, ele] = geometry.coordinates[i]
        points.push({
          lng, lat,
          ele: ele ?? undefined,
          time: times?.[i] ? new Date(times[i]) : undefined,
        })
      }
    } else if (geometry.type === 'MultiLineString') {
      const times: string[][] | undefined = props.coordinateProperties?.times
      for (let s = 0; s < geometry.coordinates.length; s++) {
        for (let i = 0; i < geometry.coordinates[s].length; i++) {
          const [lng, lat, ele] = geometry.coordinates[s][i]
          points.push({
            lng, lat,
            ele: ele ?? undefined,
            time: times?.[s]?.[i] ? new Date(times[s][i]) : undefined,
          })
        }
      }
    } else if (geometry.type === 'Point') {
      const [lng, lat, ele] = geometry.coordinates
      points.push({
        lng, lat,
        ele: ele ?? undefined,
        time: props.time ? new Date(props.time) : undefined,
      })
    }
  }

  return points
}

function parseGPX(text: string): Track {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const geojson = gpx(doc)
  const points = extractPointsFromGeoJSON(geojson as GeoJSON.FeatureCollection)
  const name = doc.querySelector('trk > name')?.textContent
    ?? doc.querySelector('metadata > name')?.textContent
    ?? 'GPX Track'
  return { name, points }
}

function parseKML(text: string): Track {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const geojson = kml(doc)
  const points = extractPointsFromGeoJSON(geojson as GeoJSON.FeatureCollection)
  const name = doc.querySelector('Document > name')?.textContent
    ?? doc.querySelector('Placemark > name')?.textContent
    ?? 'KML Track'
  return { name, points }
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
function parseGoogleLocationHistory(text: string): Track {
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
  const unique: TrackPoint[] = []
  for (const p of points) {
    const key = `${p.lat},${p.lng},${p.time?.getTime() ?? ''}`
    if (!seen.has(key)) { seen.add(key); unique.push(p) }
  }

  unique.sort((a, b) => (a.time?.getTime() ?? 0) - (b.time?.getTime() ?? 0))
  return { name: 'Google Location History', points: unique }
}

function isGoogleLocationJSON(text: string): boolean {
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

export function parseTrackFile(file: File): Promise<Track> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = reader.result as string
        const ext = file.name.split('.').pop()?.toLowerCase()

        let track: Track

        if (ext === 'gpx') {
          track = parseGPX(text)
        } else if (ext === 'kml') {
          track = parseKML(text)
        } else if (ext === 'json' && isGoogleLocationJSON(text)) {
          track = parseGoogleLocationHistory(text)
        } else {
          throw new Error(`Unsupported file format: .${ext}`)
        }

        if (track.points.length < 2) {
          throw new Error('Track must contain at least 2 points')
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
