import { gpx, kml } from '@tmcw/togeojson'
import type { Track, TrackPoint } from '@/types'
import { basePath } from '@/lib/env'
import { parseOptionalNumber, parseOptionalDate, assertPointBudget, ParseError, MAX_TRACK_POINTS } from '@/lib/parse-utils'
import {
  parseGoogleLocationHistory as parseGoogleLocationHistoryCore,
  checkJsonDepth,
} from '@/lib/googleJsonParser'

// Re-export for backwards compatibility — other files import these from '@/lib/parser'
export { ParseError, checkJsonDepth }

const XML_MAX_TAGS = 150_000
const XML_MAX_NESTING_DEPTH = 128

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
    assertPointBudget(points, nextPoints.length)
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

function preflightXml(text: string, formatName: string): void {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) {
    throw new ParseError(`Invalid ${formatName}: XML entity declarations are not supported`, 'XML_PARSE_ERROR')
  }

  let tagCount = 0
  let depth = 0
  for (const match of text.matchAll(/<\s*(\/?)([A-Za-z_][\w:.-]*)([^>]*)>/g)) {
    const [, closing, tagName, rest] = match
    if (tagName.startsWith('!') || tagName.startsWith('?')) continue
    tagCount++
    if (tagCount > XML_MAX_TAGS) {
      throw new ParseError(`Invalid ${formatName}: XML document is too complex`, 'XML_PARSE_ERROR')
    }
    if (closing) {
      depth = Math.max(0, depth - 1)
      continue
    }
    if (rest.trim().endsWith('/')) continue
    depth++
    if (depth > XML_MAX_NESTING_DEPTH) {
      throw new ParseError(`Invalid ${formatName}: XML nesting is too deep`, 'XML_PARSE_ERROR')
    }
  }
}

function parseXml(text: string, formatName: string): Document {
  // Reject dangerous constructs first, then sanitize as defense-in-depth.
  // preflightXml is the primary rejection guard on the raw input;
  // stripXmlEntities removes any entities that slipped past for DOMParser safety.
  preflightXml(text, formatName)
  const safeText = stripXmlEntities(text)
  const doc = new DOMParser().parseFromString(safeText, 'application/xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new ParseError(`Invalid ${formatName}: XML parse error`, 'XML_PARSE_ERROR')
  return doc
}

export function parseGPX(text: string): Track {
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
        assertPointBudget(acc.points, segment.length)
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

export function parseKML(text: string): Track {
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


// Re-export parseGoogleLocationHistory from shared module
export { parseGoogleLocationHistoryCore as parseGoogleLocationHistory }

export const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB
export const XML_MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB keeps XML DOM parsing off the browser-hostile path
export const JSON_MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB keeps JSON imports inside a safer in-browser memory envelope
const MAIN_THREAD_JSON_FALLBACK_SIZE = 16 * 1024 * 1024

function decodeJsonBuffer(buffer: ArrayBuffer): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
}

function parseSmallGoogleJsonFallback(buffer: ArrayBuffer): Track {
  if (buffer.byteLength > MAIN_THREAD_JSON_FALLBACK_SIZE) {
    throw new ParseError('Large Google JSON imports require Web Worker support in this browser.', 'INVALID_GOOGLE_JSON')
  }
  return parseGoogleLocationHistoryCore(decodeJsonBuffer(buffer))
}

async function parseGoogleLocationHistoryInWorkerBuffer(buffer: ArrayBuffer): Promise<Track> {
  if (typeof Worker === 'undefined') {
    return parseSmallGoogleJsonFallback(buffer)
  }

  return new Promise((resolve, reject) => {
    // Keep only a bounded binary fallback copy before transferring the
    // ArrayBuffer. Large JSON files should stay worker-only; decoding a full
    // text copy on the main thread defeats the worker memory/isolation goal.
    // Note: for files at or below 16 MB, this creates a brief ~2x memory
    // spike (original + fallback). This is intentional — small files can be
    // safely decoded on the main thread if the worker fails. For files above
    // 16 MB, fallbackBuffer is null and no extra copy is made (C16-F08).
    const fallbackBuffer = buffer.byteLength <= MAIN_THREAD_JSON_FALLBACK_SIZE ? buffer.slice(0) : null

    let worker: Worker
    try {
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
      // Validate message shape before accessing properties
      if (!event.data || typeof event.data !== 'object') {
        reject(new ParseError('Worker returned invalid response', 'INVALID_GOOGLE_JSON'))
        return
      }
      if (event.data.error) {
        // Worker reported a parse error — the worker already tried and
        // failed, so reject with its error rather than falling back to
        // the main-thread parser (which would likely fail the same way).
        const errorMsg = typeof event.data.error === 'string' ? event.data.error : String(event.data.error)
        reject(new ParseError(errorMsg, event.data.code ?? 'INVALID_GOOGLE_JSON'))
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
        reject(new ParseError(
          event.message || 'Worker parser failed. This file may be too large for your browser. Try importing a smaller date range or using a different browser.',
          'WORKER_FAILED',
        ))
        return
      }
      try {
        resolve(parseSmallGoogleJsonFallback(fallbackBuffer))
      } catch {
        reject(new ParseError(event.message || 'Worker parser failed', 'WORKER_FAILED'))
      }
    }

    worker.postMessage({ ext: 'json', buffer }, [buffer])
  })
}

export function parseTrackFile(file: File): Promise<Track> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const maxForType = ext === 'json'
      ? JSON_MAX_FILE_SIZE
      : ext === 'gpx' || ext === 'kml'
        ? XML_MAX_FILE_SIZE
        : MAX_FILE_SIZE
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
        .catch(() => {
          throw new ParseError('Failed to read file', 'READ_FAILED')
        })
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
