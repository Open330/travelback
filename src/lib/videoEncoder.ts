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
  const totalFrames = Math.max(2, Math.ceil(duration * fps))
  const frameDuration = 1 / fps
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
    bitrate: bitrate * 1_000_000, // Mbps to bps
  })

  output.addVideoTrack(videoSource, { frameRate: fps })
  await output.start()

  // Render each frame
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

  // Finalize
  await output.finalize()

  const buffer = target.buffer
  if (!buffer) {
    throw new Error('Video encoding failed: no output buffer')
  }

  const sanitizedName = track.name.replace(/[^a-zA-Z0-9]/g, '_')
  const codecLabel = codec === 'h265' ? 'hevc' : codec
  return {
    buffer,
    filename: `${sanitizedName}_travelback_${resolution.width}x${resolution.height}_${codecLabel}.mp4`,
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
  URL.revokeObjectURL(url)
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

