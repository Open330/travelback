/**
 * Shared parsing utilities used by both parser.ts and googleJsonParser.ts.
 * Single source of truth for common parsing helpers to prevent divergent implementations.
 */

/** Maximum number of track points allowed in a single track */
export const MAX_TRACK_POINTS = 250_000

/** Browser-side file limits shared by the main parser and generated worker. */
export const MAX_FILE_SIZE = 200 * 1024 * 1024
export const XML_MAX_FILE_SIZE = 4 * 1024 * 1024
export const JSON_MAX_FILE_SIZE = 100 * 1024 * 1024

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
