import type { VideoCodec as AppVideoCodec, ExportConfig, Scene, Track } from '@/types'
import type { CameraState } from './camera'
import { computeCameraForProgress } from './camera'
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

  const { resolution, codec, fps, duration, bitrate, scenes } = config

  // Clamp config values to safe bounds
  const safeDuration = Math.max(1, Math.min(duration, 600))
  const safeFps = Math.max(1, Math.min(fps, 120))
  const safeBitrate = Math.max(1, Math.min(bitrate, 100))

  const totalFrames = Math.max(2, Math.ceil(safeDuration * safeFps))
  const frameDuration = 1 / safeFps
  const cumulDist = computeCumulativeDistances(track.points)

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

  // Render each frame (wrapped in try/finally to ensure cleanup)
  try {
    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal?.aborted) {
        throw new DOMException('Export cancelled', 'AbortError')
      }

      const progress = frame / (totalFrames - 1)
      const elapsedSec = frame * frameDuration

      // Compute camera state for this frame
      const cameraState = computeCameraForProgress(
        track, cumulDist, scenes, progress, elapsedSec,
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
  } finally {
    // Always finalize to release encoder resources
    await output.finalize()
  }

  const buffer = target.buffer
  if (!buffer) {
    throw new Error('Video encoding failed: no output buffer')
  }

  const sanitizedName = track.name.replace(/[^a-zA-Z0-9\s\-]/g, '').trim().slice(0, 64) || 'Journey'
  return {
    buffer,
    filename: `Travelback - ${sanitizedName}.mp4`,
    mimeType: 'video/mp4',
  }
}

/** Trigger a download from an ArrayBuffer */
export function downloadVideo(result: VideoExportResult): void {
  const blob = new Blob([result.buffer], { type: result.mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = result.filename
  a.click()
  // Defer revoke to give the browser time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
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

