import type { VideoCodec as AppVideoCodec, ExportConfig, Track } from '@/types'
import { EXPORT_LIMITS } from '@/types'
import type { CameraState } from './camera'
import { computeCameraForProgress, normalizeScenes } from './camera'
import { computeCumulativeDistances } from './interpolate'

export const MAX_IN_MEMORY_EXPORT_BYTES = 256 * 1024 * 1024

/**
 * Export error with a machine-readable code for i18n mapping.
 * Mirrors the ParseError pattern in parser.ts so export errors can be
 * classified and translated without depending on English message text.
 */
export class ExportError extends Error {
  readonly code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = 'ExportError'
    this.code = code
  }
}

/** Map our codec names to mediabunny's codec names */
function toMediabunnyCodec(codec: AppVideoCodec): 'avc' | 'hevc' | 'av1' {
  switch (codec) {
    case 'h264': return 'avc'
    case 'h265': return 'hevc'
    case 'av1': return 'av1'
  }
}

export interface RenderFrameCallback {
  (progress: number, cameraState: CameraState): Promise<void> | void
}

export interface ExportProgressCallback {
  (progress: number): void
}

export interface VideoExportResult {
  buffer: ArrayBuffer
  filename: string
  mimeType: string
}

export function estimateEncodedBytes(durationSeconds: number, bitrateMbps: number): number {
  return (bitrateMbps * 1_000_000 * durationSeconds) / 8
}

export function estimateExportMemoryBytes(config: {
  resolution: { width: number; height: number }
  duration: number
  fps: number
  bitrate: number
}): number {
  const safeDuration = Math.max(EXPORT_LIMITS.duration.min, Math.min(config.duration, EXPORT_LIMITS.duration.max))
  const safeFps = Math.max(EXPORT_LIMITS.fps.min, Math.min(config.fps, EXPORT_LIMITS.fps.max))
  const safeBitrate = Math.max(EXPORT_LIMITS.bitrate.min, Math.min(config.bitrate, EXPORT_LIMITS.bitrate.max))
  const rawFrameBytes = config.resolution.width * config.resolution.height * 4
  const encodedBytes = estimateEncodedBytes(safeDuration, safeBitrate)
  const frameBookkeepingBytes = Math.ceil(safeDuration * safeFps) * 64
  // 8x multiplier: accounts for double-buffering, codec intermediate buffers,
  // canvas readback, and GPU staging. Higher resolutions need more headroom.
  const resolutionMultiplier = (config.resolution.width * config.resolution.height) > (1920 * 1080) ? 1.5 : 1
  return encodedBytes + rawFrameBytes * 8 * resolutionMultiplier + frameBookkeepingBytes
}

/**
 * Render and encode a video frame-by-frame using mediabunny.
 * 
 * Flow:
 * 1. For each frame, compute camera state from scenes + progress
 * 2. Call renderFrame callback (which updates the map)
 * 3. Wait for map to render (idle event)
 * 4. Capture the canvas frame via CanvasSource.add()
 * 5. After all frames, finalize and return the buffer
 */
export async function exportVideo(
  canvas: HTMLCanvasElement,
  track: Track,
  config: ExportConfig,
  renderFrame: RenderFrameCallback,
  waitForIdle: () => Promise<void>,
  onProgress?: ExportProgressCallback,
  signal?: AbortSignal,
  cumulDistParam?: number[],
): Promise<VideoExportResult> {
  // Dynamic import mediabunny (it uses WebCodecs, browser-only)
  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource } = await import('mediabunny')

  const { codec, fps, duration, bitrate, scenes } = config

  // Clamp config values to safe bounds
  const safeDuration = Math.max(EXPORT_LIMITS.duration.min, Math.min(duration, EXPORT_LIMITS.duration.max))
  const safeFps = Math.max(EXPORT_LIMITS.fps.min, Math.min(fps, EXPORT_LIMITS.fps.max))
  const safeBitrate = Math.max(EXPORT_LIMITS.bitrate.min, Math.min(bitrate, EXPORT_LIMITS.bitrate.max))

  if (safeDuration !== duration || safeFps !== fps || safeBitrate !== bitrate) {
    console.warn(`[Travelback] Export config clamped: duration=${duration}->${safeDuration}, fps=${fps}->${safeFps}, bitrate=${bitrate}->${safeBitrate}`)
  }

  if (estimateExportMemoryBytes({ resolution: config.resolution, duration: safeDuration, fps: safeFps, bitrate: safeBitrate }) > MAX_IN_MEMORY_EXPORT_BYTES) {
    throw new ExportError('This export is too large for in-browser video encoding. Lower the duration or quality.', 'EXPORT_TOO_LARGE')
  }

  const totalFrames = Math.max(2, Math.ceil(safeDuration * safeFps))
  const frameDuration = 1 / safeFps
  const cumulDist = cumulDistParam ?? computeCumulativeDistances(track.points, track.segmentStartIndices)

  // Pre-normalize scenes once before the frame loop (US-002)
  const normalizedScenes = normalizeScenes(scenes)

  const mbCodec = toMediabunnyCodec(codec)

  // Create mediabunny output pipeline
  const target = new BufferTarget()
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  })

  const videoSource = new CanvasSource(canvas, {
    codec: mbCodec,
    bitrate: safeBitrate * 1_000_000, // Mbps to bps
  })

  output.addVideoTrack(videoSource, { frameRate: safeFps })
  await output.start()

  // Track completion state to skip finalize on abort (US-004)
  let completed = false

  // Render each frame (wrapped in try/finally to ensure cleanup)
  try {
    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal?.aborted) {
        throw new DOMException('Export cancelled', 'AbortError')
      }

      const progress = frame / (totalFrames - 1)
      const elapsedSec = frame * frameDuration

      // Compute camera state for this frame using pre-normalized scenes
      const cameraState = computeCameraForProgress(
        track, cumulDist, normalizedScenes, progress, elapsedSec, config.transitionDuration ?? 0.03, true,
      )

      // Apply camera state to the map (caller implements this)
      await renderFrame(progress, cameraState)

      // Check abort again after the synchronous renderFrame call — the
      // top-of-loop check may have passed but the user can cancel during
      // the map camera update, so re-check before the expensive idle wait.
      if (signal?.aborted) {
        throw new DOMException('Export cancelled', 'AbortError')
      }

      // Wait for the map to finish rendering tiles
      await waitForIdle()

      // Capture frame
      const timestamp = frame * frameDuration
      await videoSource.add(timestamp, frameDuration)

      onProgress?.(Math.max(0, Math.min(1, progress)))
    }
    completed = true
  } finally {
    // Only finalize when export completed normally — skip on abort to avoid corrupt MP4 (US-004)
    if (completed) {
      await output.finalize()
    }
  }

  const buffer = target.buffer
  if (!buffer) {
    throw new ExportError('Video encoding failed: no output buffer', 'EXPORT_NO_BUFFER')
  }

  const sanitizedName = track.name
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 64) || 'Journey'
  return {
    buffer,
    filename: `Travelback - ${sanitizedName}.mp4`,
    mimeType: 'video/mp4',
  }
}

export interface DownloadResult {
  /** Whether the save was confirmed by the browser */
  saved: boolean
  /** Which download method was used — 'picker' means the file was written
   *  via showSaveFilePicker (confirmed save); 'fallback' means an <a> tag
   *  was clicked (download started but not confirmed). */
  method: 'picker' | 'fallback'
}

/** Track the previous fallback anchor to prevent DOM accumulation on rapid clicks */
let prevFallbackAnchor: HTMLAnchorElement | null = null

/** Trigger a download from an existing object URL */
export async function downloadVideo(url: string, filename: string, blob: Blob): Promise<DownloadResult> {
  // Try File System Access API for a user-initiated save dialog.
  // Do NOT check navigator.userActivation.isActive here — after a long async
  // export (seconds to minutes), the transient activation is guaranteed to have
  // expired, which would silently disable the save dialog. Instead, always
  // attempt showSaveFilePicker; the browser's own activation enforcement will
  // throw if required and we fall through to the <a> download fallback.
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<unknown> }).showSaveFilePicker({
        suggestedName: filename,
        types: [{ accept: { 'video/mp4': ['.mp4'] } }],
      }) as FileSystemWritableFileStream
      const writeBlob = blob
      const writable = await (handle as unknown as { createWritable: () => Promise<FileSystemWritableFileStream> }).createWritable()
      await writable.write(writeBlob)
      await writable.close()
      return { saved: true, method: 'picker' }
    } catch (err) {
      // User cancelled the picker, or API failed — fall through to <a> download
      if (err instanceof DOMException && err.name === 'AbortError') return { saved: false, method: 'picker' }
    }
  }

  // Fallback: programmatic <a> download
  // Remove any previous fallback anchor to prevent DOM accumulation on rapid clicks
  if (prevFallbackAnchor) { prevFallbackAnchor.remove() }
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  prevFallbackAnchor = a
  let clicked = false
  try {
    a.click()
    clicked = true
  } finally {
    // Delay removal so the browser has time to process the download intent.
    // Synchronous removal can silently fail on some browsers (Safari < 15.4,
    // certain mobile WebViews) because the download may not initiate within the
    // same microtask. If click throws, remove immediately to avoid leaking DOM.
    if (clicked) {
      setTimeout(() => { a.remove(); if (prevFallbackAnchor === a) prevFallbackAnchor = null }, 100)
    } else {
      a.remove()
      if (prevFallbackAnchor === a) prevFallbackAnchor = null
    }
  }
  return { saved: false, method: 'fallback' }
}

/** Check if a codec is supported in the current browser */
export async function isCodecSupported(codec: AppVideoCodec): Promise<boolean> {
  try {
    const { canEncode } = await import('mediabunny')
    return canEncode(toMediabunnyCodec(codec))
  } catch (err) {
    // Surface dynamic-import / canEncode failures to devtools so a CSP or network
    // block on the mediabunny module can be distinguished from an unsupported codec.
    console.debug('[Travelback] codec probe failed:', err instanceof Error ? err.message : String(err))
    return false
  }
}
