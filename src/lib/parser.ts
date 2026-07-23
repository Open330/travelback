import { gpx, kml } from '@tmcw/togeojson'
import type { Track, TrackFallbackNameSource, TrackPoint } from '@/types'
import { basePath } from '@/lib/env'
import {
  parseOptionalNumber,
  parseOptionalDate,
  assertPointBudget,
  createPointBudget,
  consumePointBudget,
  ParseError,
  MAX_TRACK_POINTS,
  MAX_FILE_SIZE,
  XML_MAX_FILE_SIZE,
  JSON_MAX_FILE_SIZE,
  IMPORT_SIZE_POLICY,
  getImportSizePolicy,
  normalizeImportedTrackName,
} from '@/lib/parse-utils'
import {
  parseGoogleLocationHistory as parseGoogleLocationHistoryCore,
  checkJsonDepth,
} from '@/lib/googleJsonParser'

// Re-export for backwards compatibility — other files import these from '@/lib/parser'
export {
  ParseError,
  checkJsonDepth,
  MAX_FILE_SIZE,
  XML_MAX_FILE_SIZE,
  JSON_MAX_FILE_SIZE,
  IMPORT_SIZE_POLICY,
  getImportSizePolicy,
}

const XML_MAX_TAGS = 150_000
const XML_MAX_NESTING_DEPTH = 128
const TRACK_FALLBACK_NAME_SOURCES = new Set<TrackFallbackNameSource>(['gpx', 'kml', 'google'])

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

function isXmlWhitespace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r'
}

function isPlausibleXmlNameStart(char: string | undefined): boolean {
  if (!char) return false
  const code = char.charCodeAt(0)
  return char === ':' ||
    char === '_' ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code >= 0x80
}

function findXmlTagEnd(text: string, startIndex: number): { nextIndex: number; selfClosing: boolean } | null {
  let quote = ''
  let lastSignificantChar = ''

  for (let index = startIndex; index < text.length; index++) {
    const char = text[index]
    if (quote) {
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '>') {
      return {
        nextIndex: index + 1,
        selfClosing: lastSignificantChar === '/',
      }
    }
    if (!isXmlWhitespace(char)) lastSignificantChar = char
  }

  return null
}

function findXmlDeclarationEnd(text: string, startIndex: number): number {
  let quote = ''
  let subsetDepth = 0

  for (let index = startIndex; index < text.length; index++) {
    const char = text[index]
    if (quote) {
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '[') {
      subsetDepth++
      continue
    }
    if (char === ']' && subsetDepth > 0) {
      subsetDepth--
      continue
    }
    if (char === '>' && subsetDepth === 0) return index + 1
  }

  return text.length
}

function matchesAsciiCaseInsensitive(text: string, startIndex: number, expected: string): boolean {
  if (startIndex + expected.length > text.length) return false
  for (let offset = 0; offset < expected.length; offset++) {
    if ((text.charCodeAt(startIndex + offset) | 32) !== (expected.charCodeAt(offset) | 32)) {
      return false
    }
  }
  return true
}

function preflightXml(text: string, formatName: string): void {
  let tagCount = 0
  let depth = 0
  let index = 0
  while (index < text.length) {
    const tagStart = text.indexOf('<', index)
    if (tagStart === -1) break

    if (text.startsWith('<!--', tagStart)) {
      const commentEnd = text.indexOf('-->', tagStart + 4)
      index = commentEnd === -1 ? text.length : commentEnd + 3
      continue
    }
    if (text.startsWith('<![CDATA[', tagStart)) {
      const cdataEnd = text.indexOf(']]>', tagStart + 9)
      index = cdataEnd === -1 ? text.length : cdataEnd + 3
      continue
    }
    if (text.startsWith('<?', tagStart)) {
      const processingInstructionEnd = text.indexOf('?>', tagStart + 2)
      index = processingInstructionEnd === -1 ? text.length : processingInstructionEnd + 2
      continue
    }
    if (text.startsWith('<!', tagStart)) {
      const declarationNameStart = tagStart + 2
      if (
        matchesAsciiCaseInsensitive(text, declarationNameStart, 'DOCTYPE') ||
        matchesAsciiCaseInsensitive(text, declarationNameStart, 'ENTITY')
      ) {
        throw new ParseError(`Invalid ${formatName}: XML entity declarations are not supported`, 'XML_PARSE_ERROR')
      }
      index = findXmlDeclarationEnd(text, tagStart + 2)
      continue
    }

    let nameStart = tagStart + 1
    let closing = false
    if (text[nameStart] === '/') {
      closing = true
      nameStart++
    }
    while (isXmlWhitespace(text[nameStart])) nameStart++
    if (!isPlausibleXmlNameStart(text[nameStart])) {
      index = tagStart + 1
      continue
    }

    const tagEnd = findXmlTagEnd(text, nameStart + 1)
    if (!tagEnd) break
    index = tagEnd.nextIndex
    tagCount++
    if (tagCount > XML_MAX_TAGS) {
      throw new ParseError(`Invalid ${formatName}: XML document is too complex`, 'XML_PARSE_ERROR')
    }
    if (closing) {
      depth = Math.max(0, depth - 1)
      continue
    }
    if (tagEnd.selfClosing) continue
    depth++
    if (depth > XML_MAX_NESTING_DEPTH) {
      throw new ParseError(`Invalid ${formatName}: XML nesting is too deep`, 'XML_PARSE_ERROR')
    }
  }
}

function parseXml(text: string, formatName: string): Document {
  // Reject dangerous active declarations before handing the unchanged source
  // to DOMParser. The lexical pass deliberately skips inert comments, CDATA,
  // and processing instructions before classifying declaration openers.
  preflightXml(text, formatName)
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new ParseError(`Invalid ${formatName}: XML parse error`, 'XML_PARSE_ERROR')
  return doc
}

function isOwnedGpxElement(
  element: Element,
  localName: string,
  namespaceUri: string | null,
): boolean {
  return element.localName === localName && element.namespaceURI === namespaceUri
}

function hasOwnedGpxAncestor(
  element: Element,
  localName: string,
  namespaceUri: string | null,
): boolean {
  let ancestor = element.parentElement
  while (ancestor) {
    if (isOwnedGpxElement(ancestor, localName, namespaceUri)) return true
    ancestor = ancestor.parentElement
  }
  return false
}

function extractPointsFromGpxSegments(
  doc: Document,
  maxPoints?: number,
): { points: TrackPoint[]; segmentStartIndices: number[] } | null {
  const namespaceUri = doc.documentElement.namespaceURI
  const segments = Array.from(doc.getElementsByTagNameNS('*', 'trkseg'))
    .filter((element) => element.namespaceURI === namespaceUri)
  if (segments.length === 0) return null

  // Validate the segment tree before reading any point attributes. Descendant
  // extraction from nested segments would otherwise multiply the same
  // physical points once per ancestor.
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
    if (hasOwnedGpxAncestor(segments[segmentIndex], 'trkseg', namespaceUri)) {
      throw new ParseError('Invalid GPX: nested track segments are not supported', 'XML_PARSE_ERROR')
    }
  }

  const budget = createPointBudget(maxPoints)
  const points: TrackPoint[] = []
  const segmentStartIndices: number[] = []

  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
    const segment = segments[segmentIndex]
    const segmentPointStart = points.length
    for (let childIndex = 0; childIndex < segment.children.length; childIndex++) {
      const point = segment.children[childIndex]
      if (!isOwnedGpxElement(point, 'trkpt', namespaceUri)) continue

      const lat = parseOptionalNumber(point.getAttribute('lat'))
      const lng = parseOptionalNumber(point.getAttribute('lon'))
      if (
        lat == null ||
        lng == null ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180
      ) {
        continue
      }

      // Reserve capacity after coordinate validation but before optional
      // field traversal or TrackPoint allocation.
      consumePointBudget(budget)
      let elevationText: string | null | undefined = undefined
      let timeText: string | null | undefined = undefined
      for (let pointChildIndex = 0; pointChildIndex < point.children.length; pointChildIndex++) {
        const pointChild = point.children[pointChildIndex]
        if (isOwnedGpxElement(pointChild, 'ele', namespaceUri) && elevationText === undefined) {
          elevationText = pointChild.textContent
        } else if (isOwnedGpxElement(pointChild, 'time', namespaceUri) && timeText === undefined) {
          timeText = pointChild.textContent
        }
      }
      points.push({
        lat,
        lng,
        ele: parseOptionalNumber(elevationText),
        time: parseOptionalDate(timeText),
      })
    }
    if (segmentPointStart > 0 && points.length > segmentPointStart) {
      segmentStartIndices.push(segmentPointStart)
    }
  }

  return { points, segmentStartIndices }
}

export function parseGPX(text: string, maxPoints?: number): Track {
  const doc = parseXml(text, 'GPX')
  const semanticTrack = extractPointsFromGpxSegments(doc, maxPoints)
  const { points, segmentStartIndices } = semanticTrack
    ? semanticTrack
    : extractPointsFromGeoJSON(gpx(doc) as GeoJSON.FeatureCollection)
  const explicitName = normalizeImportedTrackName(doc.querySelector('trk > name')?.textContent)
    ?? normalizeImportedTrackName(doc.querySelector('metadata > name')?.textContent)
  return {
    name: explicitName ?? 'GPX Track',
    points,
    ...(!explicitName ? { fallbackNameSource: 'gpx' as const } : {}),
    ...(segmentStartIndices.length > 0 ? { segmentStartIndices } : {}),
  }
}

export function parseKML(text: string): Track {
  const doc = parseXml(text, 'KML')
  const geojson = kml(doc)
  const { points, segmentStartIndices } = extractPointsFromGeoJSON(geojson as GeoJSON.FeatureCollection)
  const explicitName = normalizeImportedTrackName(doc.querySelector('Document > name')?.textContent)
    ?? normalizeImportedTrackName(doc.querySelector('Placemark > name')?.textContent)
  return {
    name: explicitName ?? 'KML Track',
    points,
    ...(!explicitName ? { fallbackNameSource: 'kml' as const } : {}),
    ...(segmentStartIndices.length > 0 ? { segmentStartIndices } : {}),
  }
}


// Re-export parseGoogleLocationHistory from shared module
export { parseGoogleLocationHistoryCore as parseGoogleLocationHistory }

const MAIN_THREAD_JSON_FALLBACK_SIZE = 16 * 1024 * 1024
export const DEFAULT_WORKER_PARSE_TIMEOUT_MS = 30_000
const SUPPORTED_EXTENSIONS = new Set(['json', 'gpx', 'kml'])

export interface ParseTrackFileOptions {
  signal?: AbortSignal
  workerTimeoutMs?: number
}

function decodeJsonBuffer(buffer: ArrayBuffer): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
}

function parseSmallGoogleJsonFallback(buffer: ArrayBuffer): Track {
  if (buffer.byteLength > MAIN_THREAD_JSON_FALLBACK_SIZE) {
    throw new ParseError('Large Google JSON imports require Web Worker support in this browser.', 'INVALID_GOOGLE_JSON')
  }
  return parseGoogleLocationHistoryCore(decodeJsonBuffer(buffer))
}

function parseAbortedError(): ParseError {
  return new ParseError('File parsing was cancelled', 'PARSE_ABORTED')
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw parseAbortedError()
}

function isValidWorkerTrack(value: unknown): value is Track {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Track>
  if (typeof candidate.name !== 'string' || !Array.isArray(candidate.points)) return false

  const validPoints = candidate.points.every((point) => {
    if (!point || typeof point !== 'object') return false
    if (!Number.isFinite(point.lat) || Math.abs(point.lat) > 90) return false
    if (!Number.isFinite(point.lng) || Math.abs(point.lng) > 180) return false
    if (point.ele != null && !Number.isFinite(point.ele)) return false
    if (point.time == null) return true
    const parsedTime = point.time instanceof Date ? point.time : new Date(point.time as unknown as string | number)
    return Number.isFinite(parsedTime.getTime())
  })
  if (!validPoints) return false

  if (candidate.fallbackNameSource != null) {
    if (typeof candidate.fallbackNameSource !== 'string') return false
    if (!TRACK_FALLBACK_NAME_SOURCES.has(candidate.fallbackNameSource as TrackFallbackNameSource)) return false
  }

  if (candidate.segmentStartIndices == null) return true
  if (!Array.isArray(candidate.segmentStartIndices)) return false
  let previousIndex = 0
  return candidate.segmentStartIndices.every((index) => {
    const valid = Number.isInteger(index)
      && index > previousIndex
      && index < candidate.points!.length
    previousIndex = index
    return valid
  })
}

function readFile(file: File, mode: 'text', signal?: AbortSignal): Promise<string>
function readFile(file: File, mode: 'arrayBuffer', signal?: AbortSignal): Promise<ArrayBuffer>
function readFile(file: File, mode: 'text' | 'arrayBuffer', signal?: AbortSignal): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    let settled = false

    const cleanup = () => {
      reader.onload = null
      reader.onerror = null
      reader.onabort = null
      signal?.removeEventListener('abort', handleAbort)
    }
    const settle = (callback: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      callback()
    }
    const handleAbort = () => {
      if (reader.readyState === FileReader.LOADING) reader.abort()
      settle(() => reject(parseAbortedError()))
    }

    reader.onload = () => settle(() => {
      const result = reader.result
      if (mode === 'text' && typeof result === 'string') {
        resolve(result)
      } else if (mode === 'arrayBuffer' && result instanceof ArrayBuffer) {
        resolve(result)
      } else {
        reject(new ParseError('Failed to read file', 'READ_FAILED'))
      }
    })
    reader.onerror = () => settle(() => reject(new ParseError('Failed to read file', 'READ_FAILED')))
    reader.onabort = () => settle(() => reject(parseAbortedError()))

    if (signal?.aborted) {
      settle(() => reject(parseAbortedError()))
      return
    }
    signal?.addEventListener('abort', handleAbort, { once: true })

    try {
      if (mode === 'text') reader.readAsText(file)
      else reader.readAsArrayBuffer(file)
    } catch {
      settle(() => reject(new ParseError('Failed to read file', 'READ_FAILED')))
    }
  })
}

export async function parseGoogleLocationHistoryInWorkerBuffer(
  buffer: ArrayBuffer,
  options: ParseTrackFileOptions = {},
): Promise<Track> {
  const { signal, workerTimeoutMs = DEFAULT_WORKER_PARSE_TIMEOUT_MS } = options
  throwIfAborted(signal)
  if (typeof Worker === 'undefined') {
    return parseSmallGoogleJsonFallback(buffer)
  }

  if (!Number.isFinite(workerTimeoutMs) || workerTimeoutMs <= 0) {
    throw new ParseError('Worker timeout must be a positive number', 'WORKER_FAILED')
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

    let settled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const cleanup = () => {
      worker.onmessage = null
      worker.onerror = null
      signal?.removeEventListener('abort', handleAbort)
      if (timeoutId != null) clearTimeout(timeoutId)
      worker.terminate()
    }
    const settle = (callback: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      callback()
    }
    const handleAbort = () => settle(() => reject(parseAbortedError()))

    worker.onmessage = (event: MessageEvent<unknown>) => {
      // Validate message shape before accessing properties
      if (!event.data || typeof event.data !== 'object') {
        settle(() => reject(new ParseError('Worker returned invalid response', 'INVALID_GOOGLE_JSON')))
        return
      }
      const response = event.data as { track?: unknown; error?: unknown; code?: unknown }
      if (response.error) {
        // Worker reported a parse error — the worker already tried and
        // failed, so reject with its error rather than falling back to
        // the main-thread parser (which would likely fail the same way).
        const errorMsg = typeof response.error === 'string' ? response.error : String(response.error)
        const errorCode = typeof response.code === 'string' ? response.code : 'INVALID_GOOGLE_JSON'
        settle(() => reject(new ParseError(errorMsg, errorCode)))
        return
      }
      if (response.track == null) {
        // Worker returned no track and no error. Small files retain a bounded
        // fallback buffer; large files avoid main-thread decoding.
        if (!fallbackBuffer) {
          settle(() => reject(new ParseError('Worker parser did not return a track', 'INVALID_GOOGLE_JSON')))
          return
        }
        try {
          const fallbackTrack = parseSmallGoogleJsonFallback(fallbackBuffer)
          settle(() => resolve(fallbackTrack))
        } catch {
          settle(() => reject(new ParseError('Invalid JSON file. Please check that the file is a valid Google Location History export.', 'INVALID_GOOGLE_JSON')))
        }
        return
      }

      if (!isValidWorkerTrack(response.track)) {
        settle(() => reject(new ParseError('Worker returned invalid track data', 'INVALID_GOOGLE_JSON')))
        return
      }

      const track = response.track
      for (const p of track.points) {
        if (p.time != null && !(p.time instanceof Date)) {
          p.time = new Date(p.time as unknown as string | number)
        }
      }
      settle(() => resolve(track))
    }

    worker.onerror = (event) => {
      // Worker crashed (e.g., memory pressure). Fall back only for small files
      // where the bounded pre-transfer copy is safe to decode on the main thread.
      if (!fallbackBuffer) {
        settle(() => reject(new ParseError(
          event.message || 'Worker parser failed. This file may be too large for your browser. Try importing a smaller date range or using a different browser.',
          'WORKER_FAILED',
        )))
        return
      }
      try {
        const fallbackTrack = parseSmallGoogleJsonFallback(fallbackBuffer)
        settle(() => resolve(fallbackTrack))
      } catch {
        settle(() => reject(new ParseError(event.message || 'Worker parser failed', 'WORKER_FAILED')))
      }
    }

    signal?.addEventListener('abort', handleAbort, { once: true })
    timeoutId = setTimeout(() => {
      settle(() => reject(new ParseError('Google JSON parsing timed out', 'WORKER_TIMEOUT')))
    }, workerTimeoutMs)

    try {
      worker.postMessage({ ext: 'json', buffer }, [buffer])
    } catch {
      settle(() => reject(new ParseError('Worker parser failed to start', 'WORKER_FAILED')))
    }
  })
}

export async function parseTrackFile(file: File, options: ParseTrackFileOptions = {}): Promise<Track> {
  const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : undefined
  if (!ext || !SUPPORTED_EXTENSIONS.has(ext)) {
    throw new ParseError(ext ? `Unsupported file format: .${ext}` : 'Unsupported file format', 'UNSUPPORTED_FORMAT')
  }

  const sizePolicy = getImportSizePolicy(ext)
  const maxForType = sizePolicy?.maxBytes ?? MAX_FILE_SIZE
  if (file.size > maxForType) {
    throw new ParseError(
      `File is too large (${(file.size / 1024 / 1024).toFixed(0)}MB). Maximum size is ${(maxForType / 1024 / 1024).toFixed(0)}MB.`,
      'FILE_TOO_LARGE',
    )
  }

  throwIfAborted(options.signal)
  let track: Track
  if (ext === 'json') {
    const buffer = await readFile(file, 'arrayBuffer', options.signal)
    track = await parseGoogleLocationHistoryInWorkerBuffer(buffer, options)
  } else {
    const text = await readFile(file, 'text', options.signal)
    track = ext === 'gpx' ? parseGPX(text) : parseKML(text)
  }
  throwIfAborted(options.signal)

  if (track.points.length < 2) {
    throw new ParseError('Track must contain at least 2 points', 'TOO_FEW_POINTS')
  }
  if (track.points.length > MAX_TRACK_POINTS) {
    throw new ParseError('Track contains too many points', 'TOO_MANY_POINTS')
  }
  return track
}
