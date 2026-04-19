import type { VideoCodec as AppVideoCodec, ExportConfig, Track } from '@/types'
import { EXPORT_LIMITS } from '@/types'
import type { CameraState } from './camera'
import { computeCameraForProgress, normalizeScenes } from './camera'
import { computeCumulativeDistances } from './interpolate'

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
  onProgress?: ExportProgressCallback,
  waitForIdle?: () => Promise<void>,
  signal?: AbortSignal,
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

  const totalFrames = Math.max(2, Math.ceil(safeDuration * safeFps))
  const frameDuration = 1 / safeFps
  const cumulDist = computeCumulativeDistances(track.points, track.segmentStartIndices)

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

      // Wait for the map to finish rendering tiles
      if (waitForIdle) {
        await waitForIdle()
      } else {
        // Fallback: double-rAF
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve())
          })
        })
      }

      // Capture frame
      const timestamp = frame * frameDuration
      await videoSource.add(timestamp, frameDuration)

      onProgress?.(progress)
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
    throw new Error('Video encoding failed: no output buffer')
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

/** Trigger a download from an existing object URL */
export async function downloadVideo(url: string, filename: string, blob?: Blob): Promise<boolean> {
  // Try File System Access API for a user-initiated save dialog (avoids popup blockers)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<unknown> }).showSaveFilePicker({
        suggestedName: filename,
        types: [{ accept: { 'video/mp4': ['.mp4'] } }],
      }) as FileSystemWritableFileStream
      const writeBlob = blob ?? await (await fetch(url)).blob()
      const writable = await (handle as unknown as { createWritable: () => Promise<FileSystemWritableFileStream> }).createWritable()
      await writable.write(writeBlob)
      await writable.close()
      return true
    } catch (err) {
      // User cancelled the picker, or API failed — fall through to <a> download
      if (err instanceof DOMException && err.name === 'AbortError') return false
    }
  }

  // Fallback: programmatic <a> download
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  return true
}

/** Check if a codec is supported in the current browser */
export async function isCodecSupported(codec: AppVideoCodec): Promise<boolean> {
  try {
    const { canEncode } = await import('mediabunny')
    return canEncode(toMediabunnyCodec(codec))
  } catch {
    return false
  }
}
