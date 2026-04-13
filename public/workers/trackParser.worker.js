function decodeXmlEntities(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function toTrackPoint(lng, lat, inner) {
  const elevationMatch = inner && inner.match(/<ele>([^<]+)<\/ele>/i)
  const timeMatch = inner && inner.match(/<time>([^<]+)<\/time>/i)
  return {
    lng: Number(lng),
    lat: Number(lat),
    ele: elevationMatch ? Number(elevationMatch[1]) : undefined,
    time: timeMatch ? new Date(timeMatch[1]) : undefined,
  }
}

function parseGpx(text) {
  const trkName = text.match(/<trk[^>]*>[\s\S]*?<name>([^<]*)<\/name>/i)
  const metadataName = text.match(/<metadata[^>]*>[\s\S]*?<name>([^<]*)<\/name>/i)
  const name = decodeXmlEntities((trkName && trkName[1]) || (metadataName && metadataName[1]) || 'GPX Track').trim() || 'GPX Track'

  const segmentMatches = [...text.matchAll(/<trkseg\b[^>]*>([\s\S]*?)<\/trkseg>/gi)]
  const segmentBodies = segmentMatches.length > 0 ? segmentMatches.map((match) => match[1]) : [text]
  const points = []
  const segmentStartIndices = []

  for (const body of segmentBodies) {
    const segmentPoints = [...body.matchAll(/<trkpt\b[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi)]
      .map((match) => toTrackPoint(match[2], match[1], match[3]))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))

    if (segmentPoints.length === 0) continue
    if (points.length > 0) segmentStartIndices.push(points.length)
    points.push(...segmentPoints)
  }

  return {
    name,
    points,
    ...(segmentStartIndices.length > 0 ? { segmentStartIndices } : {}),
  }
}

function parseKmlTrackBlock(block) {
  const whenMatches = [...block.matchAll(/<when>([^<]+)<\/when>/gi)]
  const coordMatches = [...block.matchAll(/<gx:coord>([^<]+)<\/gx:coord>/gi)]
  const max = Math.min(whenMatches.length, coordMatches.length)
  const points = []
  for (let index = 0; index < max; index += 1) {
    const parts = coordMatches[index][1].trim().split(/\s+/)
    if (parts.length < 2) continue
    const [lng, lat, ele] = parts
    points.push({
      lng: Number(lng),
      lat: Number(lat),
      ele: ele != null ? Number(ele) : undefined,
      time: whenMatches[index] ? new Date(whenMatches[index][1]) : undefined,
    })
  }
  return points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
}

function parseKmlCoordinatesBlock(block) {
  return block
    .trim()
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [lng, lat, ele] = entry.split(',')
      return {
        lng: Number(lng),
        lat: Number(lat),
        ele: ele != null ? Number(ele) : undefined,
      }
    })
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
}

function parseKml(text) {
  const documentName = text.match(/<Document[^>]*>[\s\S]*?<name>([^<]*)<\/name>/i)
  const placemarkName = text.match(/<Placemark[^>]*>[\s\S]*?<name>([^<]*)<\/name>/i)
  const name = decodeXmlEntities((documentName && documentName[1]) || (placemarkName && placemarkName[1]) || 'KML Track').trim() || 'KML Track'

  const points = []
  const segmentStartIndices = []
  const gxTrackMatches = [...text.matchAll(/<gx:Track\b[^>]*>([\s\S]*?)<\/gx:Track>/gi)]
  const coordinateMatches = gxTrackMatches.length === 0
    ? [...text.matchAll(/<LineString\b[^>]*>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/LineString>/gi)]
    : []

  const segments = gxTrackMatches.length > 0
    ? gxTrackMatches.map((match) => parseKmlTrackBlock(match[1]))
    : coordinateMatches.map((match) => parseKmlCoordinatesBlock(match[1]))

  for (const segment of segments) {
    if (segment.length === 0) continue
    if (points.length > 0) segmentStartIndices.push(points.length)
    points.push(...segment)
  }

  return {
    name,
    points,
    ...(segmentStartIndices.length > 0 ? { segmentStartIndices } : {}),
  }
}

function e7(v) { return v / 1e7 }
function gTime(ts, tsMs) {
  if (ts) return new Date(ts)
  if (tsMs) return new Date(Number(tsMs))
  return undefined
}
function looksLikeGoogleLocationRecord(value) {
  if (typeof value !== 'object' || value === null) return false
  return 'latitude' in value || 'longitude' in value || 'latitudeE7' in value || 'longitudeE7' in value
}
function pushE7(out, latE7, lngE7, ts, tsMs, alt) {
  if (latE7 == null || lngE7 == null) return
  out.push({ lat: e7(latE7), lng: e7(lngE7), ele: alt, time: gTime(ts, tsMs) })
}
function parseRecords(locations, out) {
  for (const loc of locations) {
    const lat = loc.latitude ?? (loc.latitudeE7 != null ? e7(loc.latitudeE7) : undefined)
    const lng = loc.longitude ?? (loc.longitudeE7 != null ? e7(loc.longitudeE7) : undefined)
    if (lat == null || lng == null) continue
    out.push({ lat, lng, ele: loc.altitude, time: gTime(loc.timestamp, loc.timestampMs) })
  }
}
function parseTimelineObjects(objects, out) {
  for (const obj of objects) {
    const seg = obj.activitySegment
    const visit = obj.placeVisit
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
      else if (visit.centerLatE7 != null && visit.centerLngE7 != null) pushE7(out, visit.centerLatE7, visit.centerLngE7, dur && dur.startTimestamp)
    }
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
        out.push({ lat: parseFloat(m[1]), lng: parseFloat(m[2]), time: gTime(pt.timestamp) })
      }
    }
    const visit = seg.visit
    if (visit && visit.topCandidate && visit.topCandidate.placeLocation && visit.topCandidate.placeLocation.latLng) {
      const m = String(visit.topCandidate.placeLocation.latLng).match(/([-\d.]+)[°]?,\s*([-\d.]+)/)
      if (m) out.push({ lat: parseFloat(m[1]), lng: parseFloat(m[2]), time: gTime(seg.startTime) })
    }
  }
}
function parseGoogleLocationHistory(text) {
  const data = JSON.parse(text)
  const points = []
  let recognizedFormat = false
  if (Array.isArray(data) && data.some(looksLikeGoogleLocationRecord)) {
    recognizedFormat = true
    parseRecords(data, points)
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.locations)) {
      recognizedFormat = true
      parseRecords(data.locations, points)
    }
    if (Array.isArray(data.timelineObjects)) {
      recognizedFormat = true
      parseTimelineObjects(data.timelineObjects, points)
    }
    if (Array.isArray(data.timelineEdits)) {
      recognizedFormat = true
      parseTimelineEdits(data.timelineEdits, points)
    }
    if (Array.isArray(data.semanticSegments)) {
      recognizedFormat = true
      parseSemanticSegments(data.semanticSegments, points)
    }
  }
  if (!recognizedFormat) throw new Error('Unsupported Google Location History format')
  const seen = new Set()
  const unique = []
  for (const [order, point] of points.entries()) {
    const key = `${point.lat},${point.lng},${point.time ? point.time.getTime() : ''}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push({ point, order })
  }
  unique.sort((a, b) => {
    const aTime = a.point.time && a.point.time.getTime()
    const bTime = b.point.time && b.point.time.getTime()
    if (aTime != null && bTime != null) return aTime - bTime
    return a.order - b.order
  })
  return { name: 'Google Location History', points: unique.map(({ point }) => point) }
}

function parseTrack(ext, text) {
  if (ext === 'gpx') return parseGpx(text)
  if (ext === 'kml') return parseKml(text)
  if (ext === 'json') return parseGoogleLocationHistory(text)
  throw new Error(`Unsupported file format: .${ext}`)
}

self.onmessage = (event) => {
  try {
    self.postMessage({ track: parseTrack(event.data.ext, event.data.text) })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Failed to parse track file' })
  }
}
