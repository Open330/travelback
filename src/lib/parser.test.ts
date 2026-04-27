import { describe, it, expect } from 'vitest'
import {
  parseGoogleLocationHistory,
  checkJsonDepth,
  ParseError,
  MAX_FILE_SIZE,
  XML_MAX_FILE_SIZE,
  JSON_MAX_FILE_SIZE,
} from './parser'

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
