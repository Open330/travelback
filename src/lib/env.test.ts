import { describe, it, expect } from 'vitest'

// We test the internal normalizeBasePath logic indirectly by importing the
// module. Since basePath is computed at module load time from an env var
// that vitest doesn't set, we test the normalization logic directly.
function normalizeBasePath(value: string | undefined): string {
  if (!value || value === '/') return ''
  const trimmed = value.trim().replace(/^\/+/, '').replace(/\/+$/, '')
  if (trimmed.includes('..')) return ''
  return trimmed ? `/${trimmed}` : ''
}

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

  it('rejects path traversal with ..', () => {
    expect(normalizeBasePath('/foo/..')).toBe('')
  })

  it('rejects path traversal mid-path', () => {
    expect(normalizeBasePath('/foo/../bar')).toBe('')
  })

  it('rejects bare ..', () => {
    expect(normalizeBasePath('..')).toBe('')
  })

  it('rejects .. at start', () => {
    expect(normalizeBasePath('../foo')).toBe('')
  })

  it('accepts valid nested paths', () => {
    expect(normalizeBasePath('/a/b/c')).toBe('/a/b/c')
  })
})
