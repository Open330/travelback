import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExportConfig, Track } from '@/types'
import { EXPORT_LIMITS, RESOLUTION_PRESETS } from '@/types'
import {
  ExportError,
  MAX_IN_MEMORY_EXPORT_BYTES,
  estimateEncodedBytes,
  estimateExportMemoryBytes,
  exportVideo,
} from './videoEncoder'

const mediabunny = vi.hoisted(() => ({
  addVideoTrack: vi.fn(),
  start: vi.fn<() => Promise<void>>(),
  finalize: vi.fn<() => Promise<void>>(),
  cancel: vi.fn<() => Promise<void>>(),
  addFrame: vi.fn<() => Promise<void>>(),
  targetBuffer: new ArrayBuffer(8),
}))

vi.mock('mediabunny', () => ({
  BufferTarget: class BufferTarget {
    buffer = mediabunny.targetBuffer
  },
  Mp4OutputFormat: class Mp4OutputFormat {},
  Output: class Output {
    addVideoTrack = mediabunny.addVideoTrack
    start = mediabunny.start
    finalize = mediabunny.finalize
    cancel = mediabunny.cancel
  },
  CanvasSource: class CanvasSource {
    add = mediabunny.addFrame
  },
}))

const track: Track = {
  name: 'Lifecycle test',
  points: [
    { lat: 37.5, lng: 126.9 },
    { lat: 37.6, lng: 127 },
  ],
}

const minimumConfig = (): ExportConfig => ({
  resolution: RESOLUTION_PRESETS[0],
  codec: 'h264',
  fps: EXPORT_LIMITS.fps.min,
  duration: EXPORT_LIMITS.duration.min,
  bitrate: EXPORT_LIMITS.bitrate.min,
  scenes: [],
})

const canvas = {} as HTMLCanvasElement

beforeEach(() => {
  mediabunny.addVideoTrack.mockReset()
  mediabunny.start.mockReset().mockResolvedValue()
  mediabunny.finalize.mockReset().mockResolvedValue()
  mediabunny.cancel.mockReset().mockResolvedValue()
  mediabunny.addFrame.mockReset().mockResolvedValue()
  mediabunny.targetBuffer = new ArrayBuffer(8)
})

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

  it.each(RESOLUTION_PRESETS)('$label is feasible at the minimum default-codec settings', resolution => {
    const config = { ...minimumConfig(), resolution }
    const estimatedBytes = estimateExportMemoryBytes({
      resolution: config.resolution,
      duration: config.duration,
      fps: config.fps,
      bitrate: config.bitrate,
    })

    expect(config.codec).toBe('h264')
    expect(estimateEncodedBytes(config.duration, config.bitrate)).toBeLessThanOrEqual(MAX_IN_MEMORY_EXPORT_BYTES)
    expect(estimatedBytes).toBeLessThanOrEqual(MAX_IN_MEMORY_EXPORT_BYTES)
  })
})

describe('exportVideo lifecycle', () => {
  it('finalizes exactly once and never cancels a successful export', async () => {
    const renderFrame = vi.fn(async () => {})
    const waitForIdle = vi.fn(async () => {})

    const result = await exportVideo(canvas, track, minimumConfig(), renderFrame, waitForIdle)

    expect(result.buffer).toBe(mediabunny.targetBuffer)
    expect(mediabunny.start).toHaveBeenCalledOnce()
    expect(mediabunny.finalize).toHaveBeenCalledOnce()
    expect(mediabunny.cancel).not.toHaveBeenCalled()
    expect(renderFrame).toHaveBeenCalledTimes(EXPORT_LIMITS.duration.min * EXPORT_LIMITS.fps.min)
    expect(waitForIdle).toHaveBeenCalledTimes(EXPORT_LIMITS.duration.min * EXPORT_LIMITS.fps.min)
    expect(mediabunny.addFrame).toHaveBeenCalledTimes(EXPORT_LIMITS.duration.min * EXPORT_LIMITS.fps.min)
  })

  it('cancels exactly once when the signal is already aborted', async () => {
    const controller = new AbortController()
    const cleanupError = new Error('cancel failed')
    controller.abort()
    mediabunny.cancel.mockRejectedValue(cleanupError)

    const promise = exportVideo(canvas, track, minimumConfig(), vi.fn(), vi.fn(), undefined, controller.signal)
    const primaryError = await promise.catch((error: unknown) => error)

    expect(primaryError).toBeInstanceOf(DOMException)
    expect((primaryError as DOMException).name).toBe('AbortError')
    expect((primaryError as Error).cause).toBe(cleanupError)
    expect(mediabunny.cancel).toHaveBeenCalledOnce()
    expect(mediabunny.finalize).not.toHaveBeenCalled()
  })

  it.each([
    {
      stage: 'start',
      arrange: (primaryError: Error) => {
        mediabunny.start.mockRejectedValue(primaryError)
        return {
          renderFrame: vi.fn(),
          waitForIdle: vi.fn(),
        }
      },
    },
    {
      stage: 'render',
      arrange: (primaryError: Error) => ({
        renderFrame: vi.fn().mockRejectedValue(primaryError),
        waitForIdle: vi.fn(),
      }),
    },
    {
      stage: 'wait',
      arrange: (primaryError: Error) => ({
        renderFrame: vi.fn().mockResolvedValue(undefined),
        waitForIdle: vi.fn().mockRejectedValue(primaryError),
      }),
    },
    {
      stage: 'add',
      arrange: (primaryError: Error) => {
        mediabunny.addFrame.mockRejectedValue(primaryError)
        return {
          renderFrame: vi.fn().mockResolvedValue(undefined),
          waitForIdle: vi.fn().mockResolvedValue(undefined),
        }
      },
    },
    {
      stage: 'finalize',
      arrange: (primaryError: Error) => {
        mediabunny.finalize.mockRejectedValue(primaryError)
        return {
          renderFrame: vi.fn().mockResolvedValue(undefined),
          waitForIdle: vi.fn().mockResolvedValue(undefined),
        }
      },
    },
  ])('cancels exactly once and preserves the $stage error when cleanup fails', async ({ stage, arrange }) => {
    const primaryError = new Error(`${stage} failed`)
    const cleanupError = new Error('cancel failed')
    const { renderFrame, waitForIdle } = arrange(primaryError)
    mediabunny.cancel.mockRejectedValue(cleanupError)

    await expect(exportVideo(canvas, track, minimumConfig(), renderFrame, waitForIdle)).rejects.toBe(primaryError)

    expect(primaryError.cause).toBe(cleanupError)
    expect(mediabunny.cancel).toHaveBeenCalledOnce()
    expect(mediabunny.finalize).toHaveBeenCalledTimes(stage === 'finalize' ? 1 : 0)
  })

  it('preserves a frozen primary error when cleanup also fails', async () => {
    const primaryError = Object.freeze(new Error('render failed'))
    mediabunny.cancel.mockRejectedValue(new Error('cancel failed'))

    await expect(exportVideo(
      canvas,
      track,
      minimumConfig(),
      vi.fn().mockRejectedValue(primaryError),
      vi.fn(),
    )).rejects.toBe(primaryError)

    expect(mediabunny.cancel).toHaveBeenCalledOnce()
  })
})
