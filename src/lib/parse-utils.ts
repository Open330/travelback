/**
 * Shared parsing utilities used by both parser.ts and googleJsonParser.ts.
 * Single source of truth for common parsing helpers to prevent divergent implementations.
 */

/** Maximum number of track points allowed in a single track */
export const MAX_TRACK_POINTS = 250_000

const MEBIBYTE = 1024 * 1024

export type ImportSizeKind = 'json' | 'xml'

export interface ImportSizeLimit {
  readonly maxBytes: number
  readonly warningBytes: number
}

/** Enforced and advisory browser-side import limits for every supported format family. */
export const IMPORT_SIZE_POLICY = {
  json: { maxBytes: 100 * MEBIBYTE, warningBytes: 75 * MEBIBYTE },
  xml: { maxBytes: 4 * MEBIBYTE, warningBytes: 3 * MEBIBYTE },
} as const satisfies Record<ImportSizeKind, ImportSizeLimit>

/** Legacy exports derived from the canonical import-size policy. */
export const JSON_MAX_FILE_SIZE = IMPORT_SIZE_POLICY.json.maxBytes
export const XML_MAX_FILE_SIZE = IMPORT_SIZE_POLICY.xml.maxBytes
export const MAX_FILE_SIZE = Math.max(JSON_MAX_FILE_SIZE, XML_MAX_FILE_SIZE)

export function getImportSizePolicy(extension: string): ImportSizeLimit | undefined {
  const normalized = extension.trim().toLowerCase().replace(/^\./, '')
  if (normalized === 'json') return IMPORT_SIZE_POLICY.json
  if (normalized === 'gpx' || normalized === 'kml') return IMPORT_SIZE_POLICY.xml
  return undefined
}

/** Replace user-facing import-limit placeholders with values from the enforced policy. */
export function formatImportSizePolicyText(template: string): string {
  const values = {
    jsonMax: String(JSON_MAX_FILE_SIZE / MEBIBYTE),
    xmlMax: String(XML_MAX_FILE_SIZE / MEBIBYTE),
  }
  return template.replace(/\{(jsonMax|xmlMax)\}/g, (_match, key: keyof typeof values) => values[key])
}

export interface PointBudget {
  readonly maxPoints: number
  used: number
}

/** Create one allocation budget shared by every format branch in a parse. */
export function createPointBudget(maxPoints = MAX_TRACK_POINTS): PointBudget {
  return { maxPoints, used: 0 }
}

/** Reserve retained point objects before allocating them. */
export function consumePointBudget(budget: PointBudget, nextCount = 1): void {
  if (nextCount < 0 || budget.used + nextCount > budget.maxPoints) {
    throw new ParseError('Track contains too many points', 'TOO_MANY_POINTS')
  }
  budget.used += nextCount
}

/** Parse a supported numeric scalar, or return undefined for other/non-finite values */
export function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Parse a supported date scalar, or return undefined for other/invalid values */
export function parseOptionalDate(value: unknown): Date | undefined {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined
  } else if (typeof value === 'string') {
    if (value.trim() === '') return undefined
  } else {
    return undefined
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

/** Throw ParseError if adding nextCount points would exceed the track point budget */
export function assertPointBudget(points: { length: number }, nextCount = 1): void {
  if (points.length + nextCount > MAX_TRACK_POINTS) {
    throw new ParseError('Track contains too many points', 'TOO_MANY_POINTS')
  }
}

/** Error class with a machine-readable code for i18n mapping */
export class ParseError extends Error {
  readonly code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = 'ParseError'
    this.code = code
  }
}
