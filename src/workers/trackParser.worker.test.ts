import { describe, expect, it } from 'vitest'
import { parseGoogleLocationHistory } from '@/lib/googleJsonParser'
import { parseTrackParserRequest } from './trackParser.worker'

function requestFor(value: unknown) {
  return {
    ext: 'json',
    buffer: new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)).buffer,
  }
}

const malformedMembers: unknown[] = [null, true, 42, 'invalid', [], {}]

const guardedGoogleCases: [string, unknown, number][] = [
  [
    'flat records',
    [...malformedMembers, { latitudeE7: 374000000, longitudeE7: -1221000000 }],
    1,
  ],
  [
    'locations',
    { locations: [...malformedMembers, { latitudeE7: 374000000, longitudeE7: -1221000000 }] },
    1,
  ],
  [
    'timelineObjects',
    {
      timelineObjects: [
        ...malformedMembers,
        {
          activitySegment: {
            simplifiedRawPath: {
              points: [...malformedMembers, { latE7: 374000000, lngE7: -1221000000 }],
            },
          },
        },
      ],
    },
    1,
  ],
  [
    'timelineObjects waypoint fallback',
    {
      timelineObjects: [{
        activitySegment: {
          waypointPath: {
            waypoints: [...malformedMembers, { latE7: 374000000, lngE7: -1221000000 }],
          },
        },
      }],
    },
    1,
  ],
  [
    'timelineEdits',
    {
      timelineEdits: [
        ...malformedMembers,
        { rawSignal: null },
        { rawSignal: { signal: [] } },
        { rawSignal: { signal: { position: { point: null } } } },
        {
          rawSignal: {
            signal: {
              position: { point: { latE7: 374000000, lngE7: -1221000000 } },
            },
          },
        },
      ],
    },
    1,
  ],
  [
    'semanticSegments',
    {
      semanticSegments: [
        ...malformedMembers,
        { timelinePath: [...malformedMembers, { point: 'geo:37.4,-122.1' }] },
        { visit: { topCandidate: { placeLocation: { latLng: [] } } } },
      ],
    },
    1,
  ],
  [
    'coercible scalar containers',
    {
      locations: [
        { latitudeE7: true, longitudeE7: [] },
        { latitude: false, longitude: [127] },
        { latitudeE7: '374000000', longitudeE7: '-1221000000', timestampMs: '1705312800000' },
        { latitudeE7: 375000000, longitudeE7: -1220000000, altitude: {}, timestamp: [] },
      ],
    },
    2,
  ],
]

const timelineActivityFallbackCases: [string, unknown, number[][]][] = [
  [
    'empty simplified path',
    {
      simplifiedRawPath: { points: [] },
      waypointPath: { waypoints: [{ latE7: 375000000, lngE7: -1220000000 }] },
      startLocation: { latitudeE7: 377000000, longitudeE7: -1218000000 },
    },
    [[37.5, -122]],
  ],
  [
    'all-invalid simplified path',
    {
      simplifiedRawPath: {
        points: [
          { latE7: 910000000, lngE7: -1221000000 },
          { latE7: 374000000, lngE7: 1810000000 },
        ],
      },
      waypointPath: { waypoints: [{ latE7: 375000000, lngE7: -1220000000 }] },
      startLocation: { latitudeE7: 377000000, longitudeE7: -1218000000 },
    },
    [[37.5, -122]],
  ],
  [
    'empty waypoint path',
    {
      simplifiedRawPath: { points: [] },
      waypointPath: { waypoints: [] },
      startLocation: { latitudeE7: 377000000, longitudeE7: -1218000000 },
      endLocation: { latitudeE7: 378000000, longitudeE7: -1217000000 },
    },
    [[37.7, -121.8], [37.8, -121.7]],
  ],
  [
    'all-invalid waypoint path',
    {
      simplifiedRawPath: { points: [] },
      waypointPath: {
        waypoints: [
          { latE7: 910000000, lngE7: -1221000000 },
          { latE7: 374000000, lngE7: 1810000000 },
        ],
      },
      startLocation: { latitudeE7: 377000000, longitudeE7: -1218000000 },
      endLocation: { latitudeE7: 378000000, longitudeE7: -1217000000 },
    },
    [[37.7, -121.8], [37.8, -121.7]],
  ],
  [
    'partly valid preferred path',
    {
      simplifiedRawPath: {
        points: [
          { latE7: 910000000, lngE7: -1221000000 },
          { latE7: 374000000, lngE7: -1221000000 },
        ],
      },
      waypointPath: { waypoints: [{ latE7: 375000000, lngE7: -1220000000 }] },
      startLocation: { latitudeE7: 377000000, longitudeE7: -1218000000 },
    },
    [[37.4, -122.1]],
  ],
]

describe('track parser worker entry', () => {
  it('returns the same track as the shared main-thread parser', () => {
    const json = JSON.stringify({
      locations: [
        { latitudeE7: 374000000, longitudeE7: -1221000000, timestamp: '2024-01-15T10:00:00Z' },
        { latitudeE7: 374100000, longitudeE7: -1220900000, timestamp: '2024-01-15T10:05:00Z' },
      ],
    })

    const result = parseTrackParserRequest(requestFor(json))

    expect(result).toEqual({
      track: parseGoogleLocationHistory(json),
    })
    if ('track' in result) {
      expect(result.track.fallbackNameSource).toBe('google')
    }
  })

  it('preserves a same-segment untimed return through the worker', () => {
    const json = JSON.stringify({
      timelineObjects: [
        {
          activitySegment: {
            waypointPath: {
              waypoints: [
                { latE7: 375665000, lngE7: 1269780000 },
                { latE7: 351796000, lngE7: 1290756000 },
                { latE7: 375665000, lngE7: 1269780000 },
              ],
            },
          },
        },
      ],
    })

    const result = parseTrackParserRequest(requestFor(json))

    expect(result).toEqual({ track: parseGoogleLocationHistory(json) })
    if ('track' in result) {
      expect(result.track.points.map(({ lat, lng }) => [lat, lng])).toEqual([
        [37.5665, 126.978],
        [35.1796, 129.0756],
        [37.5665, 126.978],
      ])
    }
  })

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['invalid', 'not a date'],
  ])('preserves mixed producer order through the worker when a timestamp is %s', (_name, timestamp) => {
    const json = JSON.stringify({
      locations: [
        { latitudeE7: 100000000, longitudeE7: 100000000, timestamp },
        { latitudeE7: 200000000, longitudeE7: 200000000, timestamp: '2024-01-15T10:00:00Z' },
        { latitudeE7: 300000000, longitudeE7: 300000000 },
      ],
    })

    const result = parseTrackParserRequest(requestFor(json))

    expect(result).toEqual({ track: parseGoogleLocationHistory(json) })
    if ('track' in result) {
      expect(result.track.points.map((point) => point.lat)).toEqual([10, 20, 30])
    }
  })

  it('preserves partially timestamped segment order through the worker', () => {
    const json = JSON.stringify({
      semanticSegments: [
        { timelinePath: [{ point: 'geo:10,10' }, { point: 'geo:11,11' }] },
        {
          timelinePath: [
            { point: 'geo:20,20', timestamp: '2024-01-15T10:00:00Z' },
            { point: 'geo:21,21', timestamp: '2024-01-15T10:05:00Z' },
          ],
        },
      ],
    })

    const result = parseTrackParserRequest(requestFor(json))

    expect(result).toEqual({ track: parseGoogleLocationHistory(json) })
    if ('track' in result) {
      expect(result.track.points.map((point) => point.lat)).toEqual([10, 11, 20, 21])
      expect(result.track.segmentStartIndices).toEqual([2])
    }
  })

  it('sorts fully timestamped segments chronologically through the worker', () => {
    const json = JSON.stringify({
      semanticSegments: [
        {
          timelinePath: [
            { point: 'geo:20,20', timestamp: '2024-01-15T11:00:00Z' },
            { point: 'geo:21,21', timestamp: '2024-01-15T11:05:00Z' },
          ],
        },
        {
          timelinePath: [
            { point: 'geo:10,10', timestamp: '2024-01-15T10:00:00Z' },
            { point: 'geo:11,11', timestamp: '2024-01-15T10:05:00Z' },
          ],
        },
      ],
    })

    const result = parseTrackParserRequest(requestFor(json))

    expect(result).toEqual({ track: parseGoogleLocationHistory(json) })
    if ('track' in result) {
      expect(result.track.points.map((point) => point.lat)).toEqual([10, 11, 20, 21])
      expect(result.track.segmentStartIndices).toEqual([2])
    }
  })

  it.each(guardedGoogleCases)(
    'keeps source/worker parity while guarding malformed %s data',
    (_name, value, expectedPoints) => {
      const json = JSON.stringify(value)
      const directTrack = parseGoogleLocationHistory(json)

      expect(directTrack.points).toHaveLength(expectedPoints)
      expect(parseTrackParserRequest(requestFor(json))).toEqual({ track: directTrack })
    },
  )

  it.each(timelineActivityFallbackCases)(
    'keeps source/worker result-based fallback parity for an %s',
    (_name, activitySegment, expectedPoints) => {
      const json = JSON.stringify({ timelineObjects: [{ activitySegment }] })
      const directTrack = parseGoogleLocationHistory(json)

      expect(directTrack.points.map(({ lat, lng }) => [lat, lng])).toEqual(expectedPoints)
      expect(parseTrackParserRequest(requestFor(json))).toEqual({ track: directTrack })
    },
  )

  it('preserves shared parser error codes', () => {
    expect(parseTrackParserRequest(requestFor({ unknown: true }))).toMatchObject({
      code: 'UNSUPPORTED_GOOGLE_FORMAT',
    })
  })

  it.each([null, true, 42, '"text"'])('returns an intentional error for non-object JSON root %s', (value) => {
    expect(parseTrackParserRequest(requestFor(value))).toMatchObject({
      code: 'UNSUPPORTED_GOOGLE_FORMAT',
    })
  })

  it('checks nesting after the former 10 MiB scan boundary', () => {
    const padding = 'x'.repeat(10 * 1024 * 1024)
    const deepSuffix = `${'['.repeat(65)}0${']'.repeat(65)}`
    const json = `{"locations":[],"padding":"${padding}","suffix":${deepSuffix}}`

    expect(parseTrackParserRequest(requestFor(json))).toMatchObject({
      code: 'JSON_DEPTH_EXCEEDED',
    })
  })

  it('rejects malformed worker messages deterministically', () => {
    expect(parseTrackParserRequest({ ext: 'gpx', buffer: new ArrayBuffer(0) })).toMatchObject({
      code: 'INVALID_GOOGLE_JSON',
    })
  })
})
