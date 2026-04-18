function parseOptionalNumber(value) {
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
  if (latE7 == null || lngE7 == null) return
  const lat = e7(latE7)
  const lng = e7(lngE7)
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return
  out.push({
    lat,
    lng,
    ele: parseOptionalNumber(alt),
    time: gTime(ts, tsMs),
  })
}

function parseRecords(locations, out) {
  for (const loc of locations) {
    const lat = parseOptionalNumber(loc.latitude) ?? (loc.latitudeE7 != null ? e7(loc.latitudeE7) : undefined)
    const lng = parseOptionalNumber(loc.longitude) ?? (loc.longitudeE7 != null ? e7(loc.longitudeE7) : undefined)
    if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
    out.push({
      lat,
      lng,
      ele: parseOptionalNumber(loc.altitude),
      time: gTime(loc.timestamp, loc.timestampMs),
    })
  }
}

function parseTimelineObjects(objects, out, segStarts) {
  for (const obj of objects) {
    const seg = obj.activitySegment
    const visit = obj.placeVisit
    const preLen = out.length

    if (seg) {
      const rawPath = seg.simplifiedRawPath
      if (rawPath && Array.isArray(rawPath.points)) {
        for (const pt of rawPath.points) pushE7(out, pt.latE7, pt.lngE7, pt.timestamp)
      } else {
        const wpPath = seg.waypointPath
        if (wpPath && Array.isArray(wpPath.waypoints)) {
          for (const wp of wpPath.waypoints) pushE7(out, wp.latE7, wp.lngE7)
        } else {
          const dur = seg.duration
          const start = seg.startLocation
          const end = seg.endLocation
          if (start) pushE7(out, start.latitudeE7, start.longitudeE7, dur && dur.startTimestamp)
          if (end) pushE7(out, end.latitudeE7, end.longitudeE7, dur && dur.endTimestamp)
        }
      }
    }

    if (visit) {
      const dur = visit.duration
      const loc = visit.location
      if (loc) pushE7(out, loc.latitudeE7, loc.longitudeE7, dur && dur.startTimestamp)
      else if (visit.centerLatE7 != null && visit.centerLngE7 != null) {
        pushE7(out, visit.centerLatE7, visit.centerLngE7, dur && dur.startTimestamp)
      }
    }
    if (out.length > preLen && preLen > 0) segStarts.push(preLen)
  }
}

function parseTimelineEdits(edits, out) {
  for (const edit of edits) {
    const pos = edit.rawSignal && edit.rawSignal.signal && edit.rawSignal.signal.position
    const pt = pos && pos.point
    if (!pt) continue
    pushE7(out, pt.latE7, pt.lngE7, pos.timestamp, undefined, pos.altitudeMeters)
  }
}

function parseSemanticSegments(segments, out) {
  for (const seg of segments) {
    if (Array.isArray(seg.timelinePath)) {
      for (const pt of seg.timelinePath) {
        if (!pt.point) continue
        const m = String(pt.point).match(/geo:([-\d.]+),([-\d.]+)/)
        if (!m) continue
        const lat = parseOptionalNumber(m[1])
        const lng = parseOptionalNumber(m[2])
        if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
        out.push({ lat, lng, time: gTime(pt.timestamp) })
      }
    }

    const visit = seg.visit
    if (visit && visit.topCandidate && visit.topCandidate.placeLocation && visit.topCandidate.placeLocation.latLng) {
      const m = String(visit.topCandidate.placeLocation.latLng).match(/([-\d.]+)[°]?,\s*([-\d.]+)/)
      if (!m) continue
      const lat = parseOptionalNumber(m[1])
      const lng = parseOptionalNumber(m[2])
      if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
      out.push({ lat, lng, time: gTime(seg.startTime) })
    }
  }
}

function parseGoogleLocationHistory(text) {
  const data = JSON.parse(text)
  const points = []
  const segStarts = []
  let recognizedFormat = false

  // Flat array: [{ latitudeE7, ... }]
  if (Array.isArray(data) && data.slice(0, 100).some(looksLikeGoogleLocationRecord)) {
    recognizedFormat = true
    parseRecords(data, points)
  }
  // Note: Multiple format branches can match the same file (e.g., a file with both
  // timelineObjects and semanticSegments). This is intentional to extract maximum data.
  // The dedup step below removes any resulting duplicate points.
  if (!Array.isArray(data) && Array.isArray(data.locations)) {
    recognizedFormat = true
    parseRecords(data.locations, points)
  }
  if (!Array.isArray(data) && Array.isArray(data.timelineObjects)) {
    recognizedFormat = true
    parseTimelineObjects(data.timelineObjects, points, segStarts)
  }
  if (!Array.isArray(data) && Array.isArray(data.timelineEdits)) {
    recognizedFormat = true
    parseTimelineEdits(data.timelineEdits, points)
  }
  if (!Array.isArray(data) && Array.isArray(data.semanticSegments)) {
    recognizedFormat = true
    parseSemanticSegments(data.semanticSegments, points)
  }

  if (!recognizedFormat) throw new Error('Unsupported Google Location History format')

  const seen = new Set()
  const unique = []
  for (const [order, point] of points.entries()) {
    const key = `${point.lat.toFixed(7)},${point.lng.toFixed(7)},${point.time ? point.time.getTime() : ''}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push({ point, order })
  }

  unique.sort((a, b) => {
    const aTime = a.point.time && a.point.time.getTime()
    const bTime = b.point.time && b.point.time.getTime()
    if (aTime != null && bTime != null) return aTime - bTime
    if (aTime != null) return -1
    if (bTime != null) return 1
    return a.order - b.order
  })

  // Remap segment start indices to account for dedup removals and sort reordering
  const orderToNewIndex = new Map()
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

const MAX_MESSAGE_SIZE = 200 * 1024 * 1024 // 200MB
const MAX_JSON_DEPTH = 64

function checkJsonDepth(text) {
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
      if (depth > MAX_JSON_DEPTH) throw new Error('JSON nesting depth exceeds limit')
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
    if (typeof data.text !== 'string') {
      throw new Error('Invalid worker message: missing or invalid text field')
    }
    if (data.text.length > MAX_MESSAGE_SIZE) {
      throw new Error('Input too large: exceeds 200MB limit')
    }
    checkJsonDepth(data.text)

    const track = parseGoogleLocationHistory(data.text)
    if (track.points.length > 250000) {
      throw new Error('Track contains too many points (max 250,000)')
    }
    self.postMessage({ track })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Failed to parse track file' })
  }
}
