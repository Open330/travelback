import type { Track } from '@/types'
import { parseGoogleLocationHistory } from '@/lib/googleJsonParser'
import { JSON_MAX_FILE_SIZE, MAX_TRACK_POINTS, ParseError } from '@/lib/parse-utils'

export interface TrackParserRequest {
  ext: string
  buffer: ArrayBuffer
}

export type TrackParserResponse =
  | { track: Track }
  | { error: string; code: string }

function parseRequest(data: unknown): Track {
  if (!data || typeof data !== 'object') {
    throw new ParseError('Invalid worker message: expected object', 'INVALID_GOOGLE_JSON')
  }

  const request = data as Partial<TrackParserRequest>
  if (request.ext !== 'json') {
    throw new ParseError(`Unsupported worker format: ${String(request.ext)}`, 'INVALID_GOOGLE_JSON')
  }
  if (!(request.buffer instanceof ArrayBuffer)) {
    throw new ParseError('Invalid worker message: missing or invalid buffer field', 'INVALID_GOOGLE_JSON')
  }
  if (request.buffer.byteLength > JSON_MAX_FILE_SIZE) {
    throw new ParseError('Input too large: exceeds 100MB limit', 'FILE_TOO_LARGE')
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(request.buffer)
  const track = parseGoogleLocationHistory(text)
  if (track.points.length > MAX_TRACK_POINTS) {
    throw new ParseError('Track contains too many points', 'TOO_MANY_POINTS')
  }
  return track
}

export function parseTrackParserRequest(data: unknown): TrackParserResponse {
  try {
    return { track: parseRequest(data) }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to parse track file',
      code: error instanceof ParseError ? error.code : 'INVALID_GOOGLE_JSON',
    }
  }
}

type WorkerScope = typeof globalThis & {
  document?: unknown
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  postMessage: (message: TrackParserResponse) => void
}

const scope = globalThis as WorkerScope
if (typeof scope.document === 'undefined' && typeof scope.postMessage === 'function') {
  scope.onmessage = (event) => {
    scope.postMessage(parseTrackParserRequest(event.data))
  }
}
