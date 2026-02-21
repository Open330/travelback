import type { Track, TrackPoint, CameraMode, CameraParams, Scene } from '@/types'
import { DEFAULT_CAMERA_PARAMS } from '@/types'
import { interpolateAlongTrack, computeCumulativeDistances, computeBearing } from './interpolate'

export interface CameraState {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
}

/**
 * Compute the bounding box center of the full track
 */
function trackCenter(points: TrackPoint[]): [number, number] {
  let minLng = Infinity, maxLng = -Infinity
  let minLat = Infinity, maxLat = -Infinity
  for (const p of points) {
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
  }
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
}

/**
 * Estimate a zoom level that fits the track's bounding box.
 */
function estimateOverviewZoom(points: TrackPoint[]): number {
  let minLng = Infinity, maxLng = -Infinity
  let minLat = Infinity, maxLat = -Infinity
  for (const p of points) {
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
  }
  const dLng = maxLng - minLng
  const dLat = maxLat - minLat
  const maxSpan = Math.max(dLng, dLat)
  if (maxSpan === 0) return 14
  const z = Math.log2(360 / maxSpan) - 0.5
  return Math.max(1, Math.min(18, z))
}

/**
 * Smoothly interpolate between two camera states with easing
 */
export function lerpCamera(a: CameraState, b: CameraState, t: number): CameraState {
  const s = t * t * (3 - 2 * t) // smoothstep
  const lerpAngle = (from: number, to: number, f: number) => {
    const diff = ((to - from + 540) % 360) - 180
    return from + diff * f
  }
  return {
    center: [
      a.center[0] + (b.center[0] - a.center[0]) * s,
      a.center[1] + (b.center[1] - a.center[1]) * s,
    ],
    zoom: a.zoom + (b.zoom - a.zoom) * s,
    pitch: a.pitch + (b.pitch - a.pitch) * s,
    bearing: lerpAngle(a.bearing, b.bearing, s),
  }
}

/**
 * Compute the camera state for a given scene at a given local progress (0-1).
 * elapsedSec is the total elapsed time for rotation-based modes.
 */
export function computeCameraForScene(
  track: Track,
  cumulDist: number[],
  scene: Scene,
  localProgress: number,
  elapsedSec: number,
): CameraState {
  const params = scene.params
  const trackProgress = scene.startPercent + localProgress * (scene.endPercent - scene.startPercent)
  const result = interpolateAlongTrack(track.points, cumulDist, trackProgress)
  const { point, bearing } = result

  switch (scene.cameraMode) {
    case 'overview': {
      const center = trackCenter(track.points)
      const zoom = estimateOverviewZoom(track.points)
      return {
        center,
        zoom: Math.min(zoom, params.zoom),
        pitch: params.pitch,
        bearing: elapsedSec * params.rotationSpeed + params.bearingOffset,
      }
    }
    case 'flyover':
      return {
        center: [point.lng, point.lat],
        zoom: params.zoom,
        pitch: params.pitch,
        bearing: bearing + params.bearingOffset,
      }
    case 'orbit':
      return {
        center: [point.lng, point.lat],
        zoom: params.zoom,
        pitch: params.pitch,
        bearing: elapsedSec * params.rotationSpeed + params.bearingOffset,
      }
    case 'ground':
      return {
        center: [point.lng, point.lat],
        zoom: params.zoom,
        pitch: params.pitch,
        bearing: bearing + params.bearingOffset,
      }
    case 'closeup':
      return {
        center: [point.lng, point.lat],
        zoom: params.zoom,
        pitch: params.pitch,
        bearing: bearing + params.bearingOffset,
      }
    default:
      return {
        center: [point.lng, point.lat],
        zoom: 14,
        pitch: 45,
        bearing: bearing,
      }
  }
}

/**
 * Generate default scenes for a cinematic sequence.
 */
export function generateDefaultScenes(): Scene[] {
  return [
    {
      id: 'scene-1',
      name: 'Opening Overview',
      cameraMode: 'overview',
      startPercent: 0,
      endPercent: 0.08,
      params: { ...DEFAULT_CAMERA_PARAMS.overview },
    },
    {
      id: 'scene-2',
      name: 'Flyover',
      cameraMode: 'flyover',
      startPercent: 0.08,
      endPercent: 0.45,
      params: { ...DEFAULT_CAMERA_PARAMS.flyover },
    },
    {
      id: 'scene-3',
      name: 'Orbit Midpoint',
      cameraMode: 'orbit',
      startPercent: 0.45,
      endPercent: 0.55,
      params: { ...DEFAULT_CAMERA_PARAMS.orbit },
    },
    {
      id: 'scene-4',
      name: 'Ground Follow',
      cameraMode: 'ground',
      startPercent: 0.55,
      endPercent: 0.85,
      params: { ...DEFAULT_CAMERA_PARAMS.ground },
    },
    {
      id: 'scene-5',
      name: 'Closing Overview',
      cameraMode: 'overview',
      startPercent: 0.85,
      endPercent: 1.0,
      params: { ...DEFAULT_CAMERA_PARAMS.overview },
    },
  ]
}

/**
 * Compute camera state for a given global progress (0-1) across all scenes.
 * Handles transitions between scenes with smooth blending.
 */
export function computeCameraForProgress(
  track: Track,
  cumulDist: number[],
  scenes: Scene[],
  globalProgress: number,
  elapsedSec: number,
  transitionDuration: number = 0.03,
): CameraState {
  if (scenes.length === 0) {
    const result = interpolateAlongTrack(track.points, cumulDist, globalProgress)
    return {
      center: [result.point.lng, result.point.lat],
      zoom: 14,
      pitch: 45,
      bearing: result.bearing,
    }
  }

  // Find which scene we're in
  let sceneIdx = 0
  for (let i = 0; i < scenes.length; i++) {
    if (globalProgress >= scenes[i].startPercent && globalProgress <= scenes[i].endPercent) {
      sceneIdx = i
      break
    }
    if (globalProgress > scenes[i].endPercent) {
      sceneIdx = i
    }
  }

  const scene = scenes[sceneIdx]
  const sceneDuration = scene.endPercent - scene.startPercent
  const localProgress = sceneDuration > 0
    ? Math.max(0, Math.min(1, (globalProgress - scene.startPercent) / sceneDuration))
    : 0

  const mainCamera = computeCameraForScene(track, cumulDist, scene, localProgress, elapsedSec)

  // Transition blending at scene boundaries
  const halfTrans = transitionDuration / 2

  if (sceneIdx > 0 && sceneDuration > 0 && localProgress < halfTrans / sceneDuration) {
    const prevScene = scenes[sceneIdx - 1]
    const prevCamera = computeCameraForScene(track, cumulDist, prevScene, 1.0, elapsedSec)
    const blendT = (localProgress * sceneDuration) / halfTrans
    return lerpCamera(prevCamera, mainCamera, Math.max(0, Math.min(1, blendT)))
  }

  if (sceneIdx < scenes.length - 1 && sceneDuration > 0 && localProgress > 1 - halfTrans / sceneDuration) {
    const nextScene = scenes[sceneIdx + 1]
    const nextCamera = computeCameraForScene(track, cumulDist, nextScene, 0.0, elapsedSec)
    const blendT = ((1 - localProgress) * sceneDuration) / halfTrans
    return lerpCamera(nextCamera, mainCamera, Math.max(0, Math.min(1, blendT)))
  }

  return mainCamera
}
