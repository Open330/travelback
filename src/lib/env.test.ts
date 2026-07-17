import { describe, it, expect } from 'vitest'
import { normalizeBasePath } from './base-path.mjs'

describe('normalizeBasePath', () => {
  it('returns empty for undefined', () => {
    expect(normalizeBasePath(undefined)).toBe('')
  })

  it('returns empty for empty string', () => {
    expect(normalizeBasePath('')).toBe('')
  })

  it('returns empty for root path', () => {
    expect(normalizeBasePath('/')).toBe('')
  })

  it('normalizes a simple path', () => {
    expect(normalizeBasePath('/travelback')).toBe('/travelback')
  })

  it('trims leading and trailing slashes', () => {
    expect(normalizeBasePath('///travelback///')).toBe('/travelback')
  })

  it('trims whitespace', () => {
    expect(normalizeBasePath('  /travelback  ')).toBe('/travelback')
  })

  it('accepts valid nested paths', () => {
    expect(normalizeBasePath('/a/b/c')).toBe('/a/b/c')
  })

  it('accepts literal dots inside a path segment', () => {
    expect(normalizeBasePath('/release..candidate')).toBe('/release..candidate')
  })

  it.each(['/foo/..', '/foo/../bar', '..', '../foo', '/foo/%2e%2e/bar'])(
    'rejects traversal segment %s',
    (value) => {
      expect(() => normalizeBasePath(value)).toThrow(/segments are not allowed/)
    },
  )

  it('rejects malformed percent-encoding explicitly', () => {
    expect(() => normalizeBasePath('/release%2')).toThrow(/malformed percent-encoding/)
  })
})
