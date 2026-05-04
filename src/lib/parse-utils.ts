/**
 * Shared parsing utilities used by both parser.ts and googleJsonParser.ts.
 * Single source of truth for common parsing helpers to prevent divergent implementations.
 */

/** Maximum number of track points allowed in a single track */
export const MAX_TRACK_POINTS = 250_000

/** Parse a value into a finite number, or return undefined for null/empty/non-finite values */
export function parseOptionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined
  if (typeof value === 'string' && value.trim() === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Parse a value into a Date, or return undefined for null/empty/invalid values */
export function parseOptionalDate(value: unknown): Date | undefined {
  if (value == null || value === '') return undefined
  const parsed = new Date(value as string | number | Date)
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