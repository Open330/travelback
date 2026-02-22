export interface TrackPoint {
  lng: number
  lat: number
  ele?: number
  time?: Date
}

export interface Track {
  name: string
  points: TrackPoint[]
}

export type MapStyleKey = 'voyager' | 'positron' | 'dark' | 'liberty' | 'bright'

export const MAP_STYLES: Record<MapStyleKey, { label: string; url: string }> = {
  voyager: {
    label: 'Voyager',
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  positron: {
    label: 'Light',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  dark: {
    label: 'Dark',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  liberty: {
    label: 'Liberty',
    url: 'https://tiles.openfreemap.org/styles/liberty',
  },
  bright: {
    label: 'Bright',
    url: 'https://tiles.openfreemap.org/styles/bright',
  },
}

// --- Camera Modes ---
export type CameraMode = 'overview' | 'flyover' | 'orbit' | 'ground' | 'closeup' | 'birdeye'

export interface CameraParams {
  zoom: number
  pitch: number
  bearingOffset: number // offset from track bearing
  rotationSpeed: number // degrees per second for orbit mode
}

export const DEFAULT_CAMERA_PARAMS: Record<CameraMode, CameraParams> = {
  overview: { zoom: 10, pitch: 45, bearingOffset: 0, rotationSpeed: 10 },
  flyover: { zoom: 13, pitch: 55, bearingOffset: 0, rotationSpeed: 0 },
  orbit: { zoom: 14, pitch: 60, bearingOffset: 0, rotationSpeed: 36 },
  ground: { zoom: 15.5, pitch: 70, bearingOffset: 0, rotationSpeed: 0 },
  closeup: { zoom: 17, pitch: 30, bearingOffset: 0, rotationSpeed: 0 },
  birdeye: { zoom: 11, pitch: 65, bearingOffset: 0, rotationSpeed: 5 },
}

// --- Scene System ---
export interface Scene {
  id: string
  name: string
  cameraMode: CameraMode
  startPercent: number // 0-1
  endPercent: number   // 0-1
  params: CameraParams
}

// --- Export Settings ---
export type VideoCodec = 'h264' | 'h265' | 'av1'

export const CODEC_LABELS: Record<VideoCodec, string> = {
  h264: 'H.264 (MP4)',
  h265: 'H.265/HEVC (MP4)',
  av1: 'AV1 (MP4)',
}

export interface ResolutionPreset {
  label: string
  width: number
  height: number
  aspect: string
}

export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { label: 'YouTube / Landscape (1920×1080)', width: 1920, height: 1080, aspect: '16:9' },
  { label: 'TikTok / Shorts / Reels (1080×1920)', width: 1080, height: 1920, aspect: '9:16' },
  { label: 'Instagram Square (1080×1080)', width: 1080, height: 1080, aspect: '1:1' },
  { label: 'Instagram Post (1080×1350)', width: 1080, height: 1350, aspect: '4:5' },
  { label: 'HD Landscape (1280×720)', width: 1280, height: 720, aspect: '16:9' },
  { label: '4K Landscape (3840×2160)', width: 3840, height: 2160, aspect: '16:9' },
  { label: '4K Portrait (2160×3840)', width: 2160, height: 3840, aspect: '9:16' },
]

export interface ExportConfig {
  resolution: ResolutionPreset
  codec: VideoCodec
  fps: number
  duration: number
  bitrate: number // in Mbps
  scenes: Scene[]
}
