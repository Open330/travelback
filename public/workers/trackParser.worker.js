function parseOptionalNumber(value) {
  if (value == null) return undefined
  if (typeof value === 'string' && value.trim() === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseOptionalDate(value) {
  if (value == null || value === '') return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function e7(value) {
  return value / 1e7
}

function gTime(ts, tsMs) {
  if (ts) return parseOptionalDate(ts)
  if (tsMs) return parseOptionalDate(Number(tsMs))
  return undefined
}

function looksLikeGoogleLocationRecord(value) {
  if (typeof value !== 'object' || value === null) return false
  return 'latitude' in value || 'longitude' in value || 'latitudeE7' in value || 'longitudeE7' in value
}

function pushE7(out, latE7, lngE7, ts, tsMs, alt) {
  const parsedLatE7 = parseOptionalNumber(latE7)
  const parsedLngE7 = parseOptionalNumber(lngE7)
  if (parsedLatE7 == null || parsedLngE7 == null) return
  const lat = e7(parsedLatE7)
  const lng = e7(parsedLngE7)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return
  out.push({
    lat,
    lng,
    ele: parseOptionalNumber(alt),
    time: gTime(ts, tsMs),
  })
}

function parseRecords(locations) {
  const out = []
  for (const loc of locations) {
    const latE7 = parseOptionalNumber(loc.latitudeE7)
    const lngE7 = parseOptionalNumber(loc.longitudeE7)
    const lat = parseOptionalNumber(loc.latitude) ?? (latE7 != null ? e7(latE7) : undefined)
    const lng = parseOptionalNumber(loc.longitude) ?? (lngE7 != null ? e7(lngE7) : undefined)
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
    out.push({
      lat,
      lng,
      ele: parseOptionalNumber(loc.altitude),
      time: gTime(loc.timestamp, loc.timestampMs),
    })
  }
  return out
}

function parseTimelineObjects(objects) {
  const segments = []
  for (const obj of objects) {
    const seg = obj.activitySegment
    const visit = obj.placeVisit
    const currentSegment = []

    if (seg) {
      const rawPath = seg.simplifiedRawPath
      if (rawPath && Array.isArray(rawPath.points)) {
        for (const pt of rawPath.points) pushE7(currentSegment, pt.latE7, pt.lngE7, pt.timestamp)
      } else {
        const wpPath = seg.waypointPath
        if (wpPath && Array.isArray(wpPath.waypoints)) {
          for (const wp of wpPath.waypoints) pushE7(currentSegment, wp.latE7, wp.lngE7)
        } else {
          const dur = seg.duration
          const start = seg.startLocation
          const end = seg.endLocation
          if (start) pushE7(currentSegment, start.latitudeE7, start.longitudeE7, dur && dur.startTimestamp)
          if (end) pushE7(currentSegment, end.latitudeE7, end.longitudeE7, dur && dur.endTimestamp)
        }
      }
    }

    if (visit) {
      const dur = visit.duration
      const loc = visit.location
      if (loc) pushE7(currentSegment, loc.latitudeE7, loc.longitudeE7, dur && dur.startTimestamp)
      else if (visit.centerLatE7 != null && visit.centerLngE7 != null) {
        pushE7(currentSegment, visit.centerLatE7, visit.centerLngE7, dur && dur.startTimestamp)
      }
    }
    if (currentSegment.length > 0) segments.push(currentSegment)
  }
  return segments
}

function parseTimelineEdits(edits) {
  const out = []
  for (const edit of edits) {
    const pos = edit.rawSignal && edit.rawSignal.signal && edit.rawSignal.signal.position
    const pt = pos && pos.point
    if (!pt) continue
    pushE7(out, pt.latE7, pt.lngE7, pos.timestamp, undefined, pos.altitudeMeters)
  }
  return out
}

function parseSemanticSegments(segments) {
  const outSegments = []
  for (const seg of segments) {
    const pathSegment = []

    if (Array.isArray(seg.timelinePath)) {
      for (const pt of seg.timelinePath) {
        if (!pt.point) continue
        const m = String(pt.point).match(/geo:([-\d.]+),([-\d.]+)/)
        if (!m) continue
        const lat = parseOptionalNumber(m[1])
        const lng = parseOptionalNumber(m[2])
        if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
        pathSegment.push({ lat, lng, time: gTime(pt.timestamp) })
      }
    }

    // Segment break between timelinePath and visit within the same segment
    if (pathSegment.length > 0) outSegments.push(pathSegment)

    // Visit: { topCandidate: { placeLocation: { latLng: "lat°, lng°" } } }
    // Coordinate guard uses the same pattern as pushE7/parseRecords:
    // reject if null, NaN, or out of bounds (Math.abs > 90/180).
    const visitSegment = []
    const visit = seg.visit
    if (visit && visit.topCandidate && visit.topCandidate.placeLocation && visit.topCandidate.placeLocation.latLng) {
      const m = String(visit.topCandidate.placeLocation.latLng).match(/([-\d.]+)[°]?,\s*([-\d.]+)/)
      if (m) {
        const lat = parseOptionalNumber(m[1])
        const lng = parseOptionalNumber(m[2])
        if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
        visitSegment.push({ lat, lng, time: gTime(seg.startTime) })
      }
    }

    if (visitSegment.length > 0) outSegments.push(visitSegment)
  }
  return outSegments
}

function sortPointsWithinSegment(segment) {
  return segment
    .map((point, order) => ({ point, order }))
    .sort((a, b) => {
      const aTime = a.point.time && a.point.time.getTime()
      const bTime = b.point.time && b.point.time.getTime()
      if (aTime != null && bTime != null) return aTime - bTime
      if (aTime != null) return -1
      if (bTime != null) return 1
      return a.order - b.order
    })
    .map(({ point }) => point)
}

function pointKey(point) {
  return `${point.lat.toFixed(7)},${point.lng.toFixed(7)},${point.time ? point.time.getTime() : ''}`
}

function segmentSortTime(segment) {
  const firstTimed = segment.find((point) => point.time)
  return firstTimed && firstTimed.time && firstTimed.time.getTime()
}

function flattenGoogleSegments(rawSegments) {
  const seen = new Set()
  const segments = rawSegments
    .map((segment, order) => {
      const points = []
      for (const point of sortPointsWithinSegment(segment)) {
        const key = pointKey(point)
        if (seen.has(key)) continue
        seen.add(key)
        points.push(point)
      }
      return { points, order }
    })
    .filter((segment) => segment.points.length > 0)
    .sort((a, b) => {
      const aTime = segmentSortTime(a.points)
      const bTime = segmentSortTime(b.points)
      if (aTime != null && bTime != null) return aTime - bTime
      if (aTime != null) return -1
      if (bTime != null) return 1
      return a.order - b.order
    })

  const points = []
  const segmentStartIndices = []
  for (const segment of segments) {
    if (points.length > 0) segmentStartIndices.push(points.length)
    points.push(...segment.points)
  }
  return { points, segmentStartIndices }
}

function parseGoogleLocationHistory(text) {
  const data = JSON.parse(text)
  const segments = []
  let recognizedFormat = false

  // Flat array: [{ latitudeE7, ... }]
  if (Array.isArray(data) && data.some(looksLikeGoogleLocationRecord)) {
    recognizedFormat = true
    const records = parseRecords(data)
    if (records.length > 0) segments.push(records)
  }
  // Note: Multiple format branches can match the same file (e.g., a file with both
  // timelineObjects and semanticSegments). This is intentional to extract maximum data.
  // The dedup step below removes any resulting duplicate points.
  if (!Array.isArray(data) && Array.isArray(data.locations)) {
    recognizedFormat = true
    const records = parseRecords(data.locations)
    if (records.length > 0) segments.push(records)
  }
  if (!Array.isArray(data) && Array.isArray(data.timelineObjects)) {
    recognizedFormat = true
    segments.push(...parseTimelineObjects(data.timelineObjects))
  }
  if (!Array.isArray(data) && Array.isArray(data.timelineEdits)) {
    recognizedFormat = true
    const edits = parseTimelineEdits(data.timelineEdits)
    if (edits.length > 0) segments.push(edits)
  }
  if (!Array.isArray(data) && Array.isArray(data.semanticSegments)) {
    recognizedFormat = true
    segments.push(...parseSemanticSegments(data.semanticSegments))
  }

  if (!recognizedFormat) throw new WorkerParseError('Unsupported Google Location History format', ERROR_CODE.UNSUPPORTED_GOOGLE_FORMAT)

  const { points, segmentStartIndices } = flattenGoogleSegments(segments)

  return {
    name: 'Google Location History',
    points,
    ...(segmentStartIndices.length > 0 ? { segmentStartIndices } : {}),
  }
}

// Must match JSON_MAX_FILE_SIZE in src/lib/parser.ts
const MAX_MESSAGE_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_JSON_DEPTH = 64

// Error codes — must match ParseError codes in src/lib/parser.ts
const ERROR_CODE = {
  UNSUPPORTED_GOOGLE_FORMAT: 'UNSUPPORTED_GOOGLE_FORMAT',
  JSON_DEPTH_EXCEEDED: 'JSON_DEPTH_EXCEEDED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_GOOGLE_JSON: 'INVALID_GOOGLE_JSON',
  TOO_MANY_POINTS: 'TOO_MANY_POINTS',
}

class WorkerParseError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

function checkJsonDepth(text) {
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
      if (depth > MAX_JSON_DEPTH) throw new WorkerParseError('JSON nesting depth exceeds limit', ERROR_CODE.JSON_DEPTH_EXCEEDED)
    } else if (ch === '}' || ch === ']') {
      depth--
    }
  }
}

self.onmessage = (event) => {
  try {
    const data = event.data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid worker message: expected object')
    }
    if (typeof data.ext !== 'string') {
      throw new Error('Invalid worker message: missing or invalid ext field')
    }
    if (data.ext !== 'json') {
      throw new Error(`Unsupported worker format: ${data.ext}`)
    }
    if (!(data.buffer instanceof ArrayBuffer)) {
      throw new Error('Invalid worker message: missing or invalid buffer field')
    }
    if (data.buffer.byteLength > MAX_MESSAGE_SIZE) {
      throw new WorkerParseError('Input too large: exceeds 100MB limit', ERROR_CODE.FILE_TOO_LARGE)
    }
    const text = new TextDecoder('utf-8', { fatal: false }).decode(data.buffer)
    checkJsonDepth(text)

    const track = parseGoogleLocationHistory(text)
    if (track.points.length > 250000) {
      throw new WorkerParseError('Track contains too many points (max 250,000)', ERROR_CODE.TOO_MANY_POINTS)
    }
    self.postMessage({ track })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse track file'
    const code = (error instanceof WorkerParseError && error.code)
      ? error.code
      : 'INVALID_GOOGLE_JSON'
    self.postMessage({ error: message, code })
  }
}
