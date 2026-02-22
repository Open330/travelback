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

interface GoogleLocationOld {
  latitudeE7: number
  longitudeE7: number
  altitude?: number
  timestampMs?: string
  timestamp?: string
}

interface GoogleLocationNew {
  latitudeE7?: number
  longitudeE7?: number
  latitude?: number
  longitude?: number
  altitude?: number
  timestamp?: string
  timestampMs?: string
}

type GoogleRecords = { locations: GoogleLocationOld[] }
  | GoogleLocationNew[]
  | { semanticSegments?: { timelinePath?: { point?: string; timestamp?: string }[] }[] }

function parseGoogleLocationHistory(text: string): Track {
  const data = JSON.parse(text) as GoogleRecords

  const points: TrackPoint[] = []

  if (Array.isArray(data)) {
    for (const loc of data as GoogleLocationNew[]) {
      const lat = loc.latitude ?? (loc.latitudeE7 != null ? loc.latitudeE7 / 1e7 : undefined)
      const lng = loc.longitude ?? (loc.longitudeE7 != null ? loc.longitudeE7 / 1e7 : undefined)
      if (lat == null || lng == null) continue
      points.push({
        lat, lng,
        ele: loc.altitude,
        time: loc.timestamp ? new Date(loc.timestamp)
          : loc.timestampMs ? new Date(Number(loc.timestampMs))
          : undefined,
      })
    }
  } else if ('locations' in data && Array.isArray(data.locations)) {
    for (const loc of data.locations) {
      if (loc.latitudeE7 == null || loc.longitudeE7 == null) continue
      points.push({
        lat: loc.latitudeE7 / 1e7,
        lng: loc.longitudeE7 / 1e7,
        ele: loc.altitude,
        time: loc.timestamp ? new Date(loc.timestamp)
          : loc.timestampMs ? new Date(Number(loc.timestampMs))
          : undefined,
      })
    }
  } else if ('semanticSegments' in data && Array.isArray(data.semanticSegments)) {
    for (const segment of data.semanticSegments) {
      if (!segment.timelinePath) continue
      for (const pt of segment.timelinePath) {
        if (!pt.point) continue
        const match = pt.point.match(/geo:([-\d.]+),([-\d.]+)/)
        if (!match) continue
        points.push({
          lat: parseFloat(match[1]),
          lng: parseFloat(match[2]),
          time: pt.timestamp ? new Date(pt.timestamp) : undefined,
        })
      }
    }
  }

  points.sort((a, b) => (a.time?.getTime() ?? 0) - (b.time?.getTime() ?? 0))

  return { name: 'Google Location History', points }
}

function isGoogleLocationJSON(text: string): boolean {
  try {
    const data = JSON.parse(text)
    if (Array.isArray(data)) {
      const first = data[0]
      return first && ('latitudeE7' in first || 'latitude' in first)
    }
    return 'locations' in data || 'semanticSegments' in data
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
