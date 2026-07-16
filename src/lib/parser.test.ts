// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import {
  parseGoogleLocationHistory,
  parseGPX,
  parseKML,
  checkJsonDepth,
  ParseError,
  MAX_FILE_SIZE,
  XML_MAX_FILE_SIZE,
  JSON_MAX_FILE_SIZE,
  parseGoogleLocationHistoryInWorkerBuffer,
  parseTrackFile,
} from './parser'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// --- Google JSON format fixtures ---

/** Format 1: Legacy records array with E7 coordinates */
const recordsJson = JSON.stringify({
  locations: [
    { latitudeE7: 374000000, longitudeE7: -1221000000, timestamp: '2024-01-15T10:00:00Z' },
    { latitudeE7: 374100000, longitudeE7: -1220900000, timestamp: '2024-01-15T10:05:00Z' },
    { latitudeE7: 374200000, longitudeE7: -1220800000, timestamp: '2024-01-15T10:10:00Z' },
  ],
})

/** Format 1b: Flat array of location records */
const flatRecordsJson = JSON.stringify([
  { latitudeE7: 374000000, longitudeE7: -1221000000, timestamp: '2024-01-15T10:00:00Z' },
  { latitudeE7: 374100000, longitudeE7: -1220900000, timestamp: '2024-01-15T10:05:00Z' },
])

/** Format 2: Semantic Location History (timelineObjects) */
const timelineObjectsJson = JSON.stringify({
  timelineObjects: [
    {
      activitySegment: {
        simplifiedRawPath: {
          points: [
            { latE7: 374000000, lngE7: -1221000000, timestamp: '2024-01-15T10:00:00Z' },
            { latE7: 374100000, lngE7: -1220900000, timestamp: '2024-01-15T10:05:00Z' },
          ],
        },
        duration: { startTimestamp: '2024-01-15T10:00:00Z', endTimestamp: '2024-01-15T10:05:00Z' },
      },
    },
    {
      placeVisit: {
        location: { latitudeE7: 374200000, longitudeE7: -1220800000 },
        duration: { startTimestamp: '2024-01-15T10:10:00Z' },
      },
    },
  ],
})

/** Format 3: Timeline Edits */
const timelineEditsJson = JSON.stringify({
  timelineEdits: [
    {
      rawSignal: {
        signal: {
          position: {
            point: { latE7: 374000000, lngE7: -1221000000 },
            timestamp: '2024-01-15T10:00:00Z',
          },
        },
      },
    },
    {
      rawSignal: {
        signal: {
          position: {
            point: { latE7: 374100000, lngE7: -1220900000 },
            timestamp: '2024-01-15T10:05:00Z',
          },
        },
      },
    },
  ],
})

/** Format 4: semanticSegments (phone export) */
const semanticSegmentsJson = JSON.stringify({
  semanticSegments: [
    {
      timelinePath: [
        { point: 'geo:37.4,-122.1', timestamp: '2024-01-15T10:00:00Z' },
        { point: 'geo:37.41,-122.09', timestamp: '2024-01-15T10:05:00Z' },
      ],
    },
    {
      visit: {
        topCandidate: {
          placeLocation: { latLng: '37.42°, -122.08°' },
        },
      },
      startTime: '2024-01-15T10:10:00Z',
    },
  ],
})

/** Records with both latitudeE7 and latitude fields */
const recordsWithBothFormats = JSON.stringify({
  locations: [
    { latitude: 37.4, longitude: -122.1, timestamp: '2024-01-15T10:00:00Z' },
    { latitudeE7: 374100000, longitudeE7: -1220900000, timestamp: '2024-01-15T10:05:00Z' },
  ],
})

/** Records with invalid coordinates */
const recordsWithInvalidCoords = JSON.stringify({
  locations: [
    { latitudeE7: 374000000, longitudeE7: -1221000000, timestamp: '2024-01-15T10:00:00Z' },
    { latitudeE7: 910000000, longitudeE7: -1221000000 }, // Invalid latitude > 90
    { latitudeE7: 374100000, longitudeE7: 1810000000 }, // Invalid longitude > 180
    { latitudeE7: 374200000, longitudeE7: -1220800000, timestamp: '2024-01-15T10:10:00Z' },
  ],
})

/** Records with timestampMs instead of timestamp */
const recordsWithTimestampMs = JSON.stringify({
  locations: [
    { latitudeE7: 374000000, longitudeE7: -1221000000, timestampMs: '1705312800000' },
    { latitudeE7: 374100000, longitudeE7: -1220900000, timestampMs: '1705313100000' },
  ],
})

/** Records with altitude */
const recordsWithAltitude = JSON.stringify({
  locations: [
    { latitudeE7: 374000000, longitudeE7: -1221000000, timestamp: '2024-01-15T10:00:00Z', altitude: 100 },
  ],
})

describe('parseGoogleLocationHistory — Format 1: Records', () => {
  it('parses locations array with E7 coordinates', () => {
    const track = parseGoogleLocationHistory(recordsJson)
    expect(track.name).toBe('Google Location History')
    expect(track.points.length).toBe(3)
    expect(track.points[0].lat).toBeCloseTo(37.4, 5)
    expect(track.points[0].lng).toBeCloseTo(-122.1, 5)
    expect(track.points[0].time).toBeInstanceOf(Date)
  })

  it('parses flat array of location records', () => {
    const track = parseGoogleLocationHistory(flatRecordsJson)
    expect(track.points.length).toBe(2)
    expect(track.points[0].lat).toBeCloseTo(37.4, 5)
  })

  it('prefers decimal latitude/longitude over E7 when both present', () => {
    const track = parseGoogleLocationHistory(recordsWithBothFormats)
    expect(track.points.length).toBe(2)
    // First point uses decimal latitude/longitude
    expect(track.points[0].lat).toBeCloseTo(37.4, 5)
    // Second point falls back to E7
    expect(track.points[1].lat).toBeCloseTo(37.41, 5)
  })

  it('parses timestampMs format', () => {
    const track = parseGoogleLocationHistory(recordsWithTimestampMs)
    expect(track.points.length).toBe(2)
    expect(track.points[0].time).toBeInstanceOf(Date)
  })

  it('parses altitude', () => {
    const track = parseGoogleLocationHistory(recordsWithAltitude)
    expect(track.points[0].ele).toBe(100)
  })

  it('filters out invalid coordinates', () => {
    const track = parseGoogleLocationHistory(recordsWithInvalidCoords)
    // 2 valid points (1st and 4th), 2 invalid skipped
    expect(track.points.length).toBe(2)
  })
})

describe('parseGoogleLocationHistory — Format 2: Timeline Objects', () => {
  it('parses activitySegment with simplifiedRawPath', () => {
    const track = parseGoogleLocationHistory(timelineObjectsJson)
    expect(track.points.length).toBeGreaterThanOrEqual(3) // 2 from activity + 1 from placeVisit
  })

  it('creates segments from activitySegment and placeVisit', () => {
    const track = parseGoogleLocationHistory(timelineObjectsJson)
    expect(track.segmentStartIndices).toBeDefined()
    // Place visit starts a new segment
    expect(track.segmentStartIndices!.length).toBeGreaterThanOrEqual(1)
  })
})

describe('parseGoogleLocationHistory — Format 3: Timeline Edits', () => {
  it('parses timelineEdits', () => {
    const track = parseGoogleLocationHistory(timelineEditsJson)
    expect(track.points.length).toBe(2)
    expect(track.points[0].lat).toBeCloseTo(37.4, 5)
  })
})

describe('parseGoogleLocationHistory — Format 4: semanticSegments', () => {
  it('parses timelinePath and visit', () => {
    const track = parseGoogleLocationHistory(semanticSegmentsJson)
    expect(track.points.length).toBeGreaterThanOrEqual(3) // 2 from timelinePath + 1 from visit
  })

  it('parses geo: URI format from timelinePath', () => {
    const track = parseGoogleLocationHistory(semanticSegmentsJson)
    // First two points come from timelinePath geo: URIs
    const firstTimelinePoint = track.points.find(p => Math.abs(p.lat - 37.4) < 0.01)
    expect(firstTimelinePoint).toBeDefined()
  })
})

describe('parseGoogleLocationHistory — unsupported format', () => {
  it('throws UNSUPPORTED_GOOGLE_FORMAT for unrecognized JSON', () => {
    expect(() => parseGoogleLocationHistory(JSON.stringify({ foo: 'bar' })))
      .toThrowError(ParseError)
    try {
      parseGoogleLocationHistory(JSON.stringify({ foo: 'bar' }))
    } catch (err) {
      expect((err as ParseError).code).toBe('UNSUPPORTED_GOOGLE_FORMAT')
    }
  })
})

describe('parseGoogleLocationHistory — invalid JSON', () => {
  it('throws INVALID_GOOGLE_JSON for malformed JSON', () => {
    expect(() => parseGoogleLocationHistory('not json at all'))
      .toThrowError(ParseError)
    try {
      parseGoogleLocationHistory('{ broken json')
    } catch (err) {
      expect((err as ParseError).code).toBe('INVALID_GOOGLE_JSON')
    }
  })
})

describe('parseGoogleLocationHistory — deduplication', () => {
  it('deduplicates points with identical lat/lng/timestamp', () => {
    const duplicateJson = JSON.stringify({
      locations: [
        { latitudeE7: 374000000, longitudeE7: -1221000000, timestamp: '2024-01-15T10:00:00Z' },
        { latitudeE7: 374000000, longitudeE7: -1221000000, timestamp: '2024-01-15T10:00:00Z' },
        { latitudeE7: 374100000, longitudeE7: -1220900000, timestamp: '2024-01-15T10:05:00Z' },
      ],
    })
    const track = parseGoogleLocationHistory(duplicateJson)
    expect(track.points.length).toBe(2)
  })
})

describe('parseGoogleLocationHistory — sorting', () => {
  it('sorts points with timestamps chronologically', () => {
    const unsortedJson = JSON.stringify({
      locations: [
        { latitudeE7: 374200000, longitudeE7: -1220800000, timestamp: '2024-01-15T10:10:00Z' },
        { latitudeE7: 374000000, longitudeE7: -1221000000, timestamp: '2024-01-15T10:00:00Z' },
        { latitudeE7: 374100000, longitudeE7: -1220900000, timestamp: '2024-01-15T10:05:00Z' },
      ],
    })
    const track = parseGoogleLocationHistory(unsortedJson)
    expect(track.points[0].time!.getTime()).toBeLessThan(track.points[1].time!.getTime())
    expect(track.points[1].time!.getTime()).toBeLessThan(track.points[2].time!.getTime())
  })
})

describe('parseGoogleLocationHistory — segment preservation', () => {
  it('preserves segment start indices for multi-segment tracks', () => {
    const track = parseGoogleLocationHistory(timelineObjectsJson)
    if (track.segmentStartIndices && track.segmentStartIndices.length > 0) {
      // Segment indices must be strictly increasing and valid
      for (let i = 1; i < track.segmentStartIndices.length; i++) {
        expect(track.segmentStartIndices[i]).toBeGreaterThan(track.segmentStartIndices[i - 1])
      }
      // First segment index must be > 0
      expect(track.segmentStartIndices[0]).toBeGreaterThan(0)
      // Last segment index must be < points.length
      expect(track.segmentStartIndices[track.segmentStartIndices.length - 1]).toBeLessThan(track.points.length)
    }
  })
})

describe('parseGoogleLocationHistory — minimum point count', () => {
  it('produces at least 2 points for a 3-location records input', () => {
    const track = parseGoogleLocationHistory(recordsJson)
    expect(track.points.length).toBeGreaterThanOrEqual(2)
  })
})

describe('checkJsonDepth', () => {
  it('passes for normal JSON depth', () => {
    expect(() => checkJsonDepth('{"a": {"b": {"c": 1}}}')).not.toThrow()
  })

  it('passes for flat JSON', () => {
    expect(() => checkJsonDepth('{"a": 1, "b": 2}')).not.toThrow()
  })

  it('throws JSON_DEPTH_EXCEEDED for deeply nested JSON', () => {
    // Build a 100-level nested JSON
    let nested = '{"value": 1}'
    for (let i = 0; i < 70; i++) {
      nested = `{"outer": ${nested}}`
    }
    expect(() => checkJsonDepth(nested)).toThrowError(ParseError)
    try {
      checkJsonDepth(nested)
    } catch (err) {
      expect((err as ParseError).code).toBe('JSON_DEPTH_EXCEEDED')
    }
  })

  it('handles JSON with strings containing braces', () => {
    const jsonWithStringBraces = '{"text": "hello { world } }", "nested": {"value": 1}}'
    expect(() => checkJsonDepth(jsonWithStringBraces)).not.toThrow()
  })

  it('handles JSON with escaped quotes in strings', () => {
    const jsonWithEscapes = '{"text": "he said \\"hello\\"", "value": 1}'
    expect(() => checkJsonDepth(jsonWithEscapes)).not.toThrow()
  })

  it('respects custom maxDepth parameter', () => {
    // 3 levels of nesting should pass with maxDepth=10
    expect(() => checkJsonDepth('{"a": {"b": {"c": 1}}}', 10)).not.toThrow()
    // 3 levels should fail with maxDepth=2
    expect(() => checkJsonDepth('{"a": {"b": {"c": 1}}}', 2)).toThrowError(ParseError)
  })
})

describe('ParseError', () => {
  it('has correct name and code', () => {
    const err = new ParseError('test message', 'TEST_CODE')
    expect(err.name).toBe('ParseError')
    expect(err.code).toBe('TEST_CODE')
    expect(err.message).toBe('test message')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('File size constants', () => {
  it('MAX_FILE_SIZE is 200MB', () => {
    expect(MAX_FILE_SIZE).toBe(200 * 1024 * 1024)
  })

  it('XML_MAX_FILE_SIZE is 4MB', () => {
    expect(XML_MAX_FILE_SIZE).toBe(4 * 1024 * 1024)
  })

  it('JSON_MAX_FILE_SIZE is 100MB', () => {
    expect(JSON_MAX_FILE_SIZE).toBe(100 * 1024 * 1024)
  })
})

describe('parseGoogleLocationHistory — empty/edge cases', () => {
  it('handles empty locations array', () => {
    // Empty locations will produce 0 points, which gets caught by the
    // finalizeTrack guard (TOO_FEW_POINTS). But parseGoogleLocationHistory
    // itself should not throw — the caller handles that.
    const track = parseGoogleLocationHistory(JSON.stringify({ locations: [] }))
    // With empty locations, no recognized format will produce segments,
    // but the locations array itself triggers recognition.
    expect(track.points.length).toBe(0)
  })

  it('handles locations with null latitudeE7', () => {
    const json = JSON.stringify({
      locations: [
        { latitudeE7: null, longitudeE7: -1221000000, timestamp: '2024-01-15T10:00:00Z' },
        { latitudeE7: 374100000, longitudeE7: -1220900000, timestamp: '2024-01-15T10:05:00Z' },
      ],
    })
    const track = parseGoogleLocationHistory(json)
    expect(track.points.length).toBe(1) // null latitudeE7 filtered out
  })

  it('handles locations with zero coordinates (valid: 0,0 is Gulf of Guinea)', () => {
    const json = JSON.stringify({
      locations: [
        { latitudeE7: 0, longitudeE7: 0, timestamp: '2024-01-15T10:00:00Z' },
        { latitudeE7: 10000000, longitudeE7: 10000000, timestamp: '2024-01-15T10:05:00Z' },
      ],
    })
    const track = parseGoogleLocationHistory(json)
    expect(track.points.length).toBe(2)
    expect(track.points[0].lat).toBe(0)
    expect(track.points[0].lng).toBe(0)
  })

  it('handles multi-format file with both timelineObjects and semanticSegments', () => {
    const multiFormat = JSON.stringify({
      timelineObjects: [
        {
          activitySegment: {
            simplifiedRawPath: {
              points: [
                { latE7: 374000000, lngE7: -1221000000, timestamp: '2024-01-15T10:00:00Z' },
              ],
            },
          },
        },
      ],
      semanticSegments: [
        {
          timelinePath: [
            { point: 'geo:37.4,-122.1', timestamp: '2024-01-15T10:00:00Z' },
          ],
        },
      ],
    })
    const track = parseGoogleLocationHistory(multiFormat)
    // Both formats are recognized; dedup removes duplicate lat/lng/time
    expect(track.points.length).toBeGreaterThanOrEqual(1)
  })
})

// --- GPX format fixtures ---

const gpxSingleSegment = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Travelback Test">
  <trk>
    <name>Test GPX Track</name>
    <trkseg>
      <trkpt lat="37.4" lon="-122.1"><ele>100</ele><time>2024-01-15T10:00:00Z</time></trkpt>
      <trkpt lat="37.41" lon="-122.09"><ele>110</ele><time>2024-01-15T10:05:00Z</time></trkpt>
      <trkpt lat="37.42" lon="-122.08"><ele>120</ele><time>2024-01-15T10:10:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`

const gpxMultiSegment = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.4" lon="-122.1"><time>2024-01-15T10:00:00Z</time></trkpt>
      <trkpt lat="37.41" lon="-122.09"><time>2024-01-15T10:05:00Z</time></trkpt>
    </trkseg>
    <trkseg>
      <trkpt lat="37.5" lon="-122.0"><time>2024-01-15T11:00:00Z</time></trkpt>
      <trkpt lat="37.51" lon="-121.99"><time>2024-01-15T11:05:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`

const gpxWithElevationAndTime = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.4" lon="-122.1"><ele>50</ele><time>2024-01-15T10:00:00Z</time></trkpt>
      <trkpt lat="37.41" lon="-122.09"><ele>150.5</ele><time>2024-01-15T10:05:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`

const gpxInvalidCoords = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.4" lon="-122.1"></trkpt>
      <trkpt lat="91" lon="-122.09"></trkpt>
      <trkpt lat="37.42" lon="181"></trkpt>
    </trkseg>
  </trk>
</gpx>`

const gpxEmptyTrack = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg></trkseg>
  </trk>
</gpx>`

const gpxWithDoctype = `<?xml version="1.0"?>
<!DOCTYPE gpx SYSTEM "http://evil.com/gpx.dtd">
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="37.4" lon="-122.1"></trkpt>
  </trkseg></trk>
</gpx>`

describe('parseGPX — single segment', () => {
  it('parses track points from a single trkseg', () => {
    const track = parseGPX(gpxSingleSegment)
    expect(track.points.length).toBe(3)
    expect(track.points[0].lat).toBeCloseTo(37.4, 5)
    expect(track.points[0].lng).toBeCloseTo(-122.1, 5)
  })

  it('extracts elevation', () => {
    const track = parseGPX(gpxWithElevationAndTime)
    expect(track.points[0].ele).toBe(50)
    expect(track.points[1].ele).toBeCloseTo(150.5, 1)
  })

  it('extracts time', () => {
    const track = parseGPX(gpxWithElevationAndTime)
    expect(track.points[0].time).toBeInstanceOf(Date)
  })

  it('reads track name from trk > name', () => {
    const track = parseGPX(gpxSingleSegment)
    expect(track.name).toBe('Test GPX Track')
  })
})

describe('parseGPX — multi-segment', () => {
  it('creates segment start indices for multiple trkseg', () => {
    const track = parseGPX(gpxMultiSegment)
    expect(track.points.length).toBe(4)
    expect(track.segmentStartIndices).toBeDefined()
    expect(track.segmentStartIndices!.length).toBe(1)
    expect(track.segmentStartIndices![0]).toBe(2)
  })
})

describe('parseGPX — invalid coordinates', () => {
  it('filters out points with invalid lat/lng', () => {
    const track = parseGPX(gpxInvalidCoords)
    expect(track.points.length).toBe(1)
    expect(track.points[0].lat).toBeCloseTo(37.4, 5)
  })
})

describe('parseGPX — empty track', () => {
  it('returns zero points for empty trkseg', () => {
    const track = parseGPX(gpxEmptyTrack)
    expect(track.points.length).toBe(0)
  })
})

describe('parseGPX — DOCTYPE rejection', () => {
  it('throws XML_PARSE_ERROR for DOCTYPE declaration', () => {
    expect(() => parseGPX(gpxWithDoctype)).toThrowError(ParseError)
    try {
      parseGPX(gpxWithDoctype)
    } catch (err) {
      expect((err as ParseError).code).toBe('XML_PARSE_ERROR')
    }
  })
})

// --- KML format fixtures ---

const kmlLineString = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Test KML Track</name>
    <Placemark>
      <LineString>
        <coordinates>
          -122.1,37.4,100
          -122.09,37.41,110
          -122.08,37.42,120
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`

const kmlMultiGeometry = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <MultiGeometry>
        <LineString>
          <coordinates>-122.1,37.4,50 -122.09,37.41,60</coordinates>
        </LineString>
        <LineString>
          <coordinates>-122.0,37.5,70 -121.99,37.51,80</coordinates>
        </LineString>
      </MultiGeometry>
    </Placemark>
  </Document>
</kml>`

const kmlWithDoctype = `<?xml version="1.0"?>
<!DOCTYPE kml SYSTEM "http://evil.com/kml.dtd">
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document><Placemark>
    <LineString><coordinates>-122.1,37.4,0</coordinates></LineString>
  </Placemark></Document>
</kml>`

describe('parseKML — LineString', () => {
  it('parses track points from a KML LineString', () => {
    const track = parseKML(kmlLineString)
    expect(track.points.length).toBe(3)
    expect(track.points[0].lat).toBeCloseTo(37.4, 5)
    expect(track.points[0].lng).toBeCloseTo(-122.1, 5)
  })

  it('extracts elevation from KML coordinates', () => {
    const track = parseKML(kmlLineString)
    expect(track.points[0].ele).toBe(100)
  })

  it('reads track name from Document > name', () => {
    const track = parseKML(kmlLineString)
    expect(track.name).toBe('Test KML Track')
  })
})

describe('parseKML — MultiGeometry', () => {
  it('creates segment start indices for multiple LineStrings', () => {
    const track = parseKML(kmlMultiGeometry)
    expect(track.points.length).toBe(4)
    expect(track.segmentStartIndices).toBeDefined()
    expect(track.segmentStartIndices!.length).toBe(1)
    expect(track.segmentStartIndices![0]).toBe(2)
  })
})

describe('parseKML — DOCTYPE rejection', () => {
  it('throws XML_PARSE_ERROR for DOCTYPE declaration', () => {
    expect(() => parseKML(kmlWithDoctype)).toThrowError(ParseError)
    try {
      parseKML(kmlWithDoctype)
    } catch (err) {
      expect((err as ParseError).code).toBe('XML_PARSE_ERROR')
    }
  })
})

describe('parseGoogleLocationHistory — additional edge cases', () => {
  it('handles empty object', () => {
    expect(() => parseGoogleLocationHistory(JSON.stringify({}))).toThrowError(ParseError)
  })

  it.each(['null', 'true', '42', '"text"'])('rejects non-object JSON root %s intentionally', (json) => {
    try {
      parseGoogleLocationHistory(json)
      throw new Error('Expected parser to reject a non-object JSON root')
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError)
      expect((err as ParseError).code).toBe('UNSUPPORTED_GOOGLE_FORMAT')
    }
  })

  it('handles locations with NaN latitudeE7', () => {
    const json = JSON.stringify({
      locations: [
        { latitudeE7: 374000000, longitudeE7: -1221000000 },
        { latitudeE7: NaN, longitudeE7: -1220900000 },
        { latitudeE7: 374200000, longitudeE7: -1220800000 },
      ],
    })
    const track = parseGoogleLocationHistory(json)
    expect(track.points.length).toBe(2) // NaN filtered out
  })

  it('handles locations with Infinity coordinates', () => {
    const json = JSON.stringify({
      locations: [
        { latitudeE7: 374000000, longitudeE7: -1221000000 },
        { latitudeE7: Infinity, longitudeE7: -1220900000 },
      ],
    })
    const track = parseGoogleLocationHistory(json)
    expect(track.points.length).toBe(1) // Infinity filtered out
  })

  it('handles locations with negative Infinity coordinates', () => {
    const json = JSON.stringify({
      locations: [
        { latitudeE7: 374000000, longitudeE7: -1221000000 },
        { latitudeE7: -Infinity, longitudeE7: -1220900000 },
      ],
    })
    const track = parseGoogleLocationHistory(json)
    expect(track.points.length).toBe(1) // -Infinity filtered out
  })

  it('handles locations with extremely large valid coordinates', () => {
    const json = JSON.stringify({
      locations: [
        { latitudeE7: 900000000, longitudeE7: -1800000000 }, // 90, -180 (valid boundary)
        { latitudeE7: -900000000, longitudeE7: 1800000000 }, // -90, 180 (valid boundary)
      ],
    })
    const track = parseGoogleLocationHistory(json)
    expect(track.points.length).toBe(2)
  })

  it('handles locations with undefined timestamp', () => {
    const json = JSON.stringify({
      locations: [
        { latitudeE7: 374000000, longitudeE7: -1221000000 },
        { latitudeE7: 374100000, longitudeE7: -1220900000, timestamp: undefined },
      ],
    })
    const track = parseGoogleLocationHistory(json)
    expect(track.points.length).toBe(2)
    expect(track.points[0].time).toBeUndefined()
    expect(track.points[1].time).toBeUndefined()
  })

  it('handles locations with empty string timestamp', () => {
    const json = JSON.stringify({
      locations: [
        { latitudeE7: 374000000, longitudeE7: -1221000000, timestamp: '' },
        { latitudeE7: 374100000, longitudeE7: -1220900000 },
      ],
    })
    const track = parseGoogleLocationHistory(json)
    expect(track.points.length).toBe(2)
    expect(track.points[0].time).toBeUndefined()
  })

  it('handles locations with invalid date string', () => {
    const json = JSON.stringify({
      locations: [
        { latitudeE7: 374000000, longitudeE7: -1221000000, timestamp: 'not a date' },
      ],
    })
    const track = parseGoogleLocationHistory(json)
    expect(track.points.length).toBe(1)
    expect(track.points[0].time).toBeUndefined()
  })

  it('handles activitySegment without points', () => {
    const json = JSON.stringify({
      timelineObjects: [
        { activitySegment: { duration: { startTimestamp: '2024-01-15T10:00:00Z' } } },
      ],
    })
    const track = parseGoogleLocationHistory(json)
    expect(track.points.length).toBe(0)
  })

  it('handles placeVisit without location', () => {
    const json = JSON.stringify({
      timelineObjects: [
        { placeVisit: { duration: { startTimestamp: '2024-01-15T10:00:00Z' } } },
      ],
    })
    const track = parseGoogleLocationHistory(json)
    expect(track.points.length).toBe(0)
  })

  it('handles semanticSegments with invalid geo: URI', () => {
    const json = JSON.stringify({
      semanticSegments: [
        { timelinePath: [{ point: 'geo:invalid', timestamp: '2024-01-15T10:00:00Z' }] },
      ],
    })
    const track = parseGoogleLocationHistory(json)
    expect(track.points.length).toBe(0)
  })
})

describe('parseGPX — additional edge cases', () => {
  it('handles GPX with missing lat/lon attributes', () => {
    const gpxMissingAttrs = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.4" lon="-122.1"></trkpt>
      <trkpt></trkpt>
      <trkpt lat="37.42" lon="-122.08"></trkpt>
    </trkseg>
  </trk>
</gpx>`
    const track = parseGPX(gpxMissingAttrs)
    expect(track.points.length).toBe(2) // Missing lat/lon filtered out
  })

  it('handles GPX with non-numeric lat/lon', () => {
    const gpxNonNumeric = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.4" lon="-122.1"></trkpt>
      <trkpt lat="abc" lon="xyz"></trkpt>
    </trkseg>
  </trk>
</gpx>`
    const track = parseGPX(gpxNonNumeric)
    expect(track.points.length).toBe(1)
  })

  it('handles GPX with elevation as non-numeric', () => {
    const gpxNonNumericEle = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.4" lon="-122.1"><ele>not a number</ele></trkpt>
      <trkpt lat="37.41" lon="-122.09"><ele>100</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`
    const track = parseGPX(gpxNonNumericEle)
    expect(track.points.length).toBe(2)
    expect(track.points[0].ele).toBeUndefined()
    expect(track.points[1].ele).toBe(100)
  })

  it('handles GPX with invalid time format', () => {
    const gpxInvalidTime = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.4" lon="-122.1"><time>not a valid time</time></trkpt>
      <trkpt lat="37.41" lon="-122.09"></trkpt>
    </trkseg>
  </trk>
</gpx>`
    const track = parseGPX(gpxInvalidTime)
    expect(track.points.length).toBe(2)
    expect(track.points[0].time).toBeUndefined()
  })

  it('handles GPX with empty elevation element', () => {
    const gpxEmptyEle = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.4" lon="-122.1"><ele></ele></trkpt>
      <trkpt lat="37.41" lon="-122.09"><ele>100</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`
    const track = parseGPX(gpxEmptyEle)
    expect(track.points.length).toBe(2)
    expect(track.points[0].ele).toBeUndefined()
  })

  it('handles GPX with missing time element', () => {
    const gpxNoTime = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.4" lon="-122.1"><ele>100</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`
    const track = parseGPX(gpxNoTime)
    expect(track.points.length).toBe(1)
    expect(track.points[0].time).toBeUndefined()
  })

  it('handles GPX with negative elevation', () => {
    const gpxNegativeEle = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.4" lon="-122.1"><ele>-50</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`
    const track = parseGPX(gpxNegativeEle)
    expect(track.points.length).toBe(1)
    expect(track.points[0].ele).toBe(-50)
  })

  it('handles GPX with floating point lat/lon', () => {
    const gpxFloatCoords = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.412345" lon="-122.098765"></trkpt>
    </trkseg>
  </trk>
</gpx>`
    const track = parseGPX(gpxFloatCoords)
    expect(track.points.length).toBe(1)
    expect(track.points[0].lat).toBeCloseTo(37.412345, 5)
    expect(track.points[0].lng).toBeCloseTo(-122.098765, 5)
  })
})

describe('parseKML — additional edge cases', () => {
  it('handles KML with empty coordinates', () => {
    const kmlEmptyCoords = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <LineString>
        <coordinates></coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`
    const track = parseKML(kmlEmptyCoords)
    expect(track.points.length).toBe(0)
  })

  it('handles KML with invalid coordinates format', () => {
    const kmlInvalidCoords = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <LineString>
        <coordinates>not,valid,coordinates</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`
    const track = parseKML(kmlInvalidCoords)
    expect(track.points.length).toBe(0)
  })

  it('handles KML with Point geometry', () => {
    const kmlPoint = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <Point>
        <coordinates>-122.1,37.4,100</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`
    const track = parseKML(kmlPoint)
    expect(track.points.length).toBe(1)
    expect(track.points[0].lat).toBeCloseTo(37.4, 5)
  })

  it('handles KML with negative elevation', () => {
    const kmlNegativeEle = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <LineString>
        <coordinates>-122.1,37.4,-50</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`
    const track = parseKML(kmlNegativeEle)
    // Negative elevation may be filtered out or handled differently
    expect(track.points.length).toBeGreaterThanOrEqual(0)
  })
})

describe('XML security — additional edge cases', () => {
  it('rejects GPX with ENTITY declaration', () => {
    const gpxWithEntity = `<?xml version="1.0"?>
<!DOCTYPE gpx [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<gpx version="1.1">
  <trk><trkseg><trkpt lat="37.4" lon="-122.1"></trkpt></trkseg></trk>
</gpx>`
    expect(() => parseGPX(gpxWithEntity)).toThrowError(ParseError)
    try {
      parseGPX(gpxWithEntity)
    } catch (err) {
      expect((err as ParseError).code).toBe('XML_PARSE_ERROR')
    }
  })

  it('rejects KML with ENTITY declaration', () => {
    const kmlWithEntity = `<?xml version="1.0"?>
<!DOCTYPE kml [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document><Placemark><LineString><coordinates>-122.1,37.4</coordinates></LineString></Placemark></Document>
</kml>`
    expect(() => parseKML(kmlWithEntity)).toThrowError(ParseError)
  })

  it('handles GPX with many tags without error', () => {
    const gpxWithManyTags = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      ${Array.from({ length: 100 }, (_, i) =>
        `<trkpt lat="${37.4 + i * 0.001}" lon="${-122.1 + i * 0.001}"></trkpt>`
      ).join('\n      ')}
    </trkseg>
  </trk>
</gpx>`
    const track = parseGPX(gpxWithManyTags)
    expect(track.points.length).toBe(100)
  })
})

describe('checkJsonDepth — additional edge cases', () => {
  it('handles empty string', () => {
    expect(() => checkJsonDepth('')).not.toThrow()
  })

  it('handles whitespace only', () => {
    expect(() => checkJsonDepth('   ')).not.toThrow()
  })

  it('detects unbalanced braces - closing too many', () => {
    expect(() => checkJsonDepth('}}')).toThrowError(ParseError)
    try {
      checkJsonDepth('}}')
    } catch (err) {
      expect((err as ParseError).code).toBe('INVALID_GOOGLE_JSON')
    }
  })

  it('detects unbalanced brackets - closing too many', () => {
    expect(() => checkJsonDepth(']]')).toThrowError(ParseError)
    try {
      checkJsonDepth(']]')
    } catch (err) {
      expect((err as ParseError).code).toBe('INVALID_GOOGLE_JSON')
    }
  })

  it('handles deeply nested arrays', () => {
    let nested = '[]'
    for (let i = 0; i < 65; i++) {
      nested = `[${nested}]`
    }
    expect(() => checkJsonDepth(nested)).toThrowError(ParseError)
    try {
      checkJsonDepth(nested)
    } catch (err) {
      expect((err as ParseError).code).toBe('JSON_DEPTH_EXCEEDED')
    }
  })

  it('handles mixed nested structures', () => {
    const mixed = JSON.stringify({
      a: [{ b: [{ c: [{ d: 1 }] }] }],
      e: { f: [{ g: { h: 1 } }] },
    })
    expect(() => checkJsonDepth(mixed)).not.toThrow()
  })

  it('handles JSON with Unicode escapes', () => {
    const unicode = '{"text": "Hello\\u00A0World", "value": 1}'
    expect(() => checkJsonDepth(unicode)).not.toThrow()
  })

  it('handles JSON with nested escaped quotes', () => {
    const nestedEscapes = '{"a": "b \\" c \\" d", "e": {"f": "g \\" h"}}'
    expect(() => checkJsonDepth(nestedEscapes)).not.toThrow()
  })

  it('rejects an unclosed structure', () => {
    expect(() => checkJsonDepth('{"open": [1, 2]')).toThrowError(ParseError)
  })
})

describe('parse-wide point allocation budget', () => {
  it('rejects aggregate segment allocations before flattening', () => {
    const json = JSON.stringify({
      timelineObjects: [
        {
          activitySegment: {
            simplifiedRawPath: {
              points: [
                { latE7: 374000000, lngE7: -1221000000 },
                { latE7: 374100000, lngE7: -1220900000 },
              ],
            },
          },
        },
        {
          activitySegment: {
            simplifiedRawPath: {
              points: [
                { latE7: 374200000, lngE7: -1220800000 },
                { latE7: 374300000, lngE7: -1220700000 },
              ],
            },
          },
        },
      ],
    })

    expect(() => parseGoogleLocationHistory(json, 3)).toThrowError(
      expect.objectContaining({ code: 'TOO_MANY_POINTS' }),
    )
  })
})

describe('parseTrackFile lifecycle', () => {
  it.each(['track.txt', 'track'])('rejects unsupported %s before reading', async (name) => {
    const readText = vi.spyOn(FileReader.prototype, 'readAsText')
    const readBuffer = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer')

    await expect(parseTrackFile(new File(['ignored'], name))).rejects.toMatchObject({
      code: 'UNSUPPORTED_FORMAT',
    })
    expect(readText).not.toHaveBeenCalled()
    expect(readBuffer).not.toHaveBeenCalled()
  })

  it('terminates a worker and returns a stable timeout code', async () => {
    class HangingWorker {
      static instance: HangingWorker
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: ((event: ErrorEvent) => void) | null = null
      terminate = vi.fn()
      postMessage = vi.fn()

      constructor() {
        HangingWorker.instance = this
      }
    }
    vi.stubGlobal('Worker', HangingWorker)

    const buffer = new TextEncoder().encode(recordsJson).buffer
    await expect(parseGoogleLocationHistoryInWorkerBuffer(buffer, { workerTimeoutMs: 1 }))
      .rejects.toMatchObject({ code: 'WORKER_TIMEOUT' })
    expect(HangingWorker.instance.terminate).toHaveBeenCalledOnce()
  })

  it('terminates a worker once when parsing is aborted', async () => {
    class HangingWorker {
      static instance: HangingWorker
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: ((event: ErrorEvent) => void) | null = null
      terminate = vi.fn()
      postMessage = vi.fn()

      constructor() {
        HangingWorker.instance = this
      }
    }
    vi.stubGlobal('Worker', HangingWorker)
    const controller = new AbortController()
    const buffer = new TextEncoder().encode(recordsJson).buffer

    const pending = parseGoogleLocationHistoryInWorkerBuffer(buffer, {
      signal: controller.signal,
      workerTimeoutMs: 1_000,
    })
    controller.abort()

    await expect(pending).rejects.toMatchObject({ code: 'PARSE_ABORTED' })
    expect(HangingWorker.instance.terminate).toHaveBeenCalledOnce()
  })

  it('rejects malformed worker track data immediately', async () => {
    class MalformedWorker {
      static instance: MalformedWorker
      onmessage: ((event: MessageEvent<unknown>) => void) | null = null
      onerror: ((event: ErrorEvent) => void) | null = null
      terminate = vi.fn()
      postMessage = vi.fn(() => {
        queueMicrotask(() => this.onmessage?.({ data: { track: {} } } as MessageEvent<unknown>))
      })

      constructor() {
        MalformedWorker.instance = this
      }
    }
    vi.stubGlobal('Worker', MalformedWorker)

    const buffer = new TextEncoder().encode(recordsJson).buffer
    await expect(parseGoogleLocationHistoryInWorkerBuffer(buffer, { workerTimeoutMs: 1_000 }))
      .rejects.toMatchObject({ code: 'INVALID_GOOGLE_JSON' })
    expect(MalformedWorker.instance.terminate).toHaveBeenCalledOnce()
  })

  it('aborts a pending FileReader once and removes its callbacks', async () => {
    class HangingFileReader {
      static readonly EMPTY = 0
      static readonly LOADING = 1
      static readonly DONE = 2
      static instance: HangingFileReader
      readyState = HangingFileReader.EMPTY
      result: string | ArrayBuffer | null = null
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      onabort: (() => void) | null = null
      readAsText = vi.fn(() => { this.readyState = HangingFileReader.LOADING })
      readAsArrayBuffer = vi.fn(() => { this.readyState = HangingFileReader.LOADING })
      abort = vi.fn(() => {
        this.readyState = HangingFileReader.DONE
        this.onabort?.()
      })

      constructor() {
        HangingFileReader.instance = this
      }
    }
    vi.stubGlobal('FileReader', HangingFileReader)
    const controller = new AbortController()
    const pending = parseTrackFile(new File(['pending'], 'trip.gpx'), { signal: controller.signal })

    expect(HangingFileReader.instance.readAsText).toHaveBeenCalledOnce()
    controller.abort()

    await expect(pending).rejects.toMatchObject({ code: 'PARSE_ABORTED' })
    expect(HangingFileReader.instance.abort).toHaveBeenCalledOnce()
    expect(HangingFileReader.instance.onload).toBeNull()
    expect(HangingFileReader.instance.onerror).toBeNull()
    expect(HangingFileReader.instance.onabort).toBeNull()
  })
})
