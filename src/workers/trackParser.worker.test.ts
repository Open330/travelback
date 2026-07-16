import { describe, expect, it } from 'vitest'
import { parseGoogleLocationHistory } from '@/lib/googleJsonParser'
import { parseTrackParserRequest } from './trackParser.worker'

function requestFor(value: unknown) {
  return {
    ext: 'json',
    buffer: new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)).buffer,
  }
}

describe('track parser worker entry', () => {
  it('returns the same track as the shared main-thread parser', () => {
    const json = JSON.stringify({
      locations: [
        { latitudeE7: 374000000, longitudeE7: -1221000000, timestamp: '2024-01-15T10:00:00Z' },
        { latitudeE7: 374100000, longitudeE7: -1220900000, timestamp: '2024-01-15T10:05:00Z' },
      ],
    })

    expect(parseTrackParserRequest(requestFor(json))).toEqual({
      track: parseGoogleLocationHistory(json),
    })
  })

  it('preserves shared parser error codes', () => {
    expect(parseTrackParserRequest(requestFor({ unknown: true }))).toMatchObject({
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
