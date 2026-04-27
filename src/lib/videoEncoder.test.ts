import { describe, it, expect } from 'vitest'
import { ExportError, estimateEncodedBytes, estimateExportMemoryBytes } from './videoEncoder'

describe('ExportError', () => {
  it('has correct name and code', () => {
    const err = new ExportError('test message', 'TEST_CODE')
    expect(err.name).toBe('ExportError')
    expect(err.code).toBe('TEST_CODE')
    expect(err.message).toBe('test message')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ExportError)
  })
})

describe('estimateEncodedBytes', () => {
  it('computes expected size for 30s at 8 Mbps', () => {
    const bytes = estimateEncodedBytes(30, 8)
    // 8 * 1_000_000 * 30 / 8 = 30_000_000
    expect(bytes).toBe(30_000_000)
  })

  it('returns 0 for zero duration', () => {
    expect(estimateEncodedBytes(0, 8)).toBe(0)
  })
})

describe('estimateExportMemoryBytes', () => {
  it('returns a value exceeding raw encoded bytes', () => {
    const result = estimateExportMemoryBytes({
      resolution: { width: 1920, height: 1080 },
      duration: 30,
      fps: 30,
      bitrate: 8,
    })
    const encoded = estimateEncodedBytes(30, 8)
    expect(result).toBeGreaterThan(encoded)
  })

  it('scales up for 4K resolution', () => {
    const hd = estimateExportMemoryBytes({
      resolution: { width: 1920, height: 1080 },
      duration: 30,
      fps: 30,
      bitrate: 8,
    })
    const fourK = estimateExportMemoryBytes({
      resolution: { width: 3840, height: 2160 },
      duration: 30,
      fps: 30,
      bitrate: 8,
    })
    // 4K should be significantly larger due to resolution multiplier
    expect(fourK).toBeGreaterThan(hd)
  })
})
