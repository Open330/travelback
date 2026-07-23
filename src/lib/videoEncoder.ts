import type { VideoCodec as AppVideoCodec, ExportConfig, Track } from '@/types'
import { EXPORT_LIMITS } from '@/types'
import type { CameraState } from './camera'
import { computeCameraForProgress, normalizeScenes } from './camera'
import { computeCumulativeDistances } from './interpolate'

export const MAX_IN_MEMORY_EXPORT_BYTES = 256 * 1024 * 1024
export const EXPORT_FINALIZE_TIMEOUT_MS = 60_000

/**
 * Export error with a machine-readable code for i18n mapping.
 * Mirrors the ParseError pattern in parser.ts so export errors can be
 * classified and translated without depending on English message text.
 */
export class ExportError extends Error {
  readonly code: string
  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, options)
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

type CancellableOutput = {
  state: 'pending' | 'started' | 'canceled' | 'finalizing' | 'finalized'
  cancel: () => Promise<void>
  finalize: () => Promise<void>
}

function exportAbortError(): DOMException {
  return new DOMException('Export cancelled', 'AbortError')
}

function throwIfExportAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw exportAbortError()
}

async function finalizeWithDeadline(
  output: CancellableOutput,
  signal: AbortSignal | undefined,
  timeoutMs: number,
) {
  throwIfExportAborted(signal)

  const finalizationPromise = output.finalize()
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let abortHandler: (() => void) | null = null
  const interruptionPromise = new Promise<never>((_, reject) => {
    abortHandler = () => reject(exportAbortError())
    signal?.addEventListener('abort', abortHandler, { once: true })
    timeoutId = setTimeout(() => {
      reject(new ExportError('Video finalization timed out', 'EXPORT_FINALIZE_TIMEOUT'))
    }, timeoutMs)
  })

  try {
    await Promise.race([finalizationPromise, interruptionPromise])
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId)
    if (abortHandler) signal?.removeEventListener('abort', abortHandler)
  }
}

function attachCleanupCause(error: unknown, cleanupError: unknown) {
  if (!(error instanceof Error) || 'cause' in error) return

  try {
    Object.defineProperty(error, 'cause', {
      configurable: true,
      value: cleanupError,
    })
  } catch {
    // Frozen/non-extensible errors cannot carry cleanup metadata. The
    // original export failure still takes precedence.
  }
}

async function cancelCancellableOutput(output: CancellableOutput, error: unknown) {
  // Mediabunny intentionally makes cancel() a no-op once finalization has
  // begun. Avoid presenting that no-op as successful resource cleanup.
  if (output.state === 'finalizing' || output.state === 'finalized') return

  try {
    await output.cancel()
  } catch (cleanupError) {
    attachCleanupCause(error, cleanupError)
  }
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
 * 2. Call renderFrame callback (which updates the map and waits for paint)
 * 3. Wait for the map to settle
 * 4. Copy a captured VideoFrame into a reusable CPU-backed staging canvas
 * 5. Add a VideoSample from that canvas to VideoSampleSource
 * 6. Finalize with cancellation/deadline handling and return the buffer
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
  finalizeTimeoutMs = EXPORT_FINALIZE_TIMEOUT_MS,
): Promise<VideoExportResult> {
  // Dynamic import mediabunny (it uses WebCodecs, browser-only)
  const { Output, Mp4OutputFormat, BufferTarget, VideoSample, VideoSampleSource } = await import('mediabunny')

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

  // Re-materialize each MapLibre frame before it reaches the native encoder.
  // Chromium can strand the final GPU-backed WebGL frames in VideoEncoder's
  // queue, leaving flush() pending forever. Drawing a captured VideoFrame into
  // a reusable CPU-backed staging canvas breaks that resource chain. The
  // preset-sized canvas also keeps HiDPI displays from silently doubling output
  // dimensions.
  let frameCanvas: OffscreenCanvas | HTMLCanvasElement
  let frameContext: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null
  try {
    if (typeof OffscreenCanvas === 'function') {
      frameCanvas = new OffscreenCanvas(config.resolution.width, config.resolution.height)
      frameContext = frameCanvas.getContext('2d', { alpha: false, willReadFrequently: true })
    } else {
      frameCanvas = canvas.ownerDocument.createElement('canvas')
      frameCanvas.width = config.resolution.width
      frameCanvas.height = config.resolution.height
      frameContext = frameCanvas.getContext('2d', { alpha: false, willReadFrequently: true })
    }
  } catch (error) {
    throw new ExportError(
      'Video encoding failed: could not create a frame staging canvas',
      'EXPORT_CAPTURE_CANVAS',
      { cause: error },
    )
  }
  if (!frameContext) {
    throw new ExportError('Video encoding failed: could not create a frame staging canvas', 'EXPORT_CAPTURE_CANVAS')
  }

  // Create mediabunny output pipeline
  const target = new BufferTarget()
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  })

  const videoSource = new VideoSampleSource({
    codec: mbCodec,
    bitrate: safeBitrate * 1_000_000, // Mbps to bps
  })

  output.addVideoTrack(videoSource, { frameRate: safeFps })

  // Mediabunny enters its started lifecycle before its asynchronous startup
  // work settles, so startup failures need the same cleanup as later failures.
  try {
    await output.start()
    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal?.aborted) {
        throw exportAbortError()
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
        throw exportAbortError()
      }

      // Wait for the map to finish rendering tiles
      await waitForIdle()

      // Capture frame
      const timestamp = frame * frameDuration
      const capturedFrame = new VideoFrame(canvas, {
        timestamp: Math.round(timestamp * 1_000_000),
        duration: Math.round(frameDuration * 1_000_000),
      })
      try {
        frameContext.drawImage(capturedFrame, 0, 0, frameCanvas.width, frameCanvas.height)
      } finally {
        capturedFrame.close()
      }

      const sample = new VideoSample(frameCanvas, { timestamp, duration: frameDuration })
      try {
        await videoSource.add(sample)
      } finally {
        sample.close()
      }

      onProgress?.(Math.max(0, Math.min(1, progress)))
    }
    await finalizeWithDeadline(output, signal, finalizeTimeoutMs)
    throwIfExportAborted(signal)
  } catch (error) {
    await cancelCancellableOutput(output, error)
    throw error
  }

  const buffer = target.buffer
  if (!buffer) {
    throw new ExportError('Video encoding failed: no output buffer', 'EXPORT_NO_BUFFER')
  }

  const sanitizedName = Array.from(
    track.name
      .normalize('NFKC')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .trim(),
  ).slice(0, 64).join('') || 'Journey'
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
  /** A completed export that could not be written through an acquired picker
   *  handle. The caller must retain the in-memory video for a manual retry. */
  saveError?: ExportError
}

/** Track the previous fallback anchor to prevent DOM accumulation on rapid clicks.
 *  Module-level state is safe here: the cleanup logic in downloadVideo uses an
 *  identity check (`prevFallbackAnchor === a`) so a stale reference from a
 *  previous HMR cycle is silently ignored rather than causing a double-remove. */
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
    let handle: { createWritable: () => Promise<FileSystemWritableFileStream> } | null = null
    try {
      handle = await (window as unknown as {
        showSaveFilePicker: (opts: unknown) => Promise<{ createWritable: () => Promise<FileSystemWritableFileStream> }>
      }).showSaveFilePicker({
        suggestedName: filename,
        types: [{ accept: { 'video/mp4': ['.mp4'] } }],
      })
    } catch (error) {
      // Cancelling the picker is an intentional decision to use the retained
      // in-memory result. Other acquisition failures (for example expired user
      // activation) may safely use the ordinary anchor fallback because no
      // destination file has been created yet.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { saved: false, method: 'picker' }
      }
    }

    if (handle) {
      let writable: FileSystemWritableFileStream | null = null
      try {
        writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        return { saved: true, method: 'picker' }
      } catch (error) {
        if (writable) {
          try {
            await writable.abort(error)
          } catch {
            // The primary write/close failure is the useful recovery signal.
          }
        }
        const saveError = new ExportError(
          'The video was created but could not be written to the selected file',
          'EXPORT_SAVE_FAILED',
          { cause: error },
        )
        return { saved: false, method: 'picker', saveError }
      }
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

export interface CodecProbeConfig {
  width: number
  height: number
  bitrateMbps: number
}

/** Check whether the browser can encode the selected export configuration. */
export async function isCodecSupported(
  codec: AppVideoCodec,
  config: CodecProbeConfig,
): Promise<boolean> {
  try {
    const { canEncodeVideo } = await import('mediabunny')
    return canEncodeVideo(toMediabunnyCodec(codec), {
      width: config.width,
      height: config.height,
      bitrate: config.bitrateMbps * 1_000_000,
    })
  } catch (err) {
    // Surface dynamic-import / canEncodeVideo failures to devtools so a CSP or network
    // block on the mediabunny module can be distinguished from an unsupported codec.
    console.debug('[Travelback] codec probe failed:', err instanceof Error ? err.message : String(err))
    return false
  }
}
