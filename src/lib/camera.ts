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

  /** Normalize bearing to [0, 360) */
  const normBearing = (b: number) => ((b % 360) + 360) % 360

  switch (scene.cameraMode) {
    case 'overview': {
      const center = trackCenter(track.points)
      const zoom = estimateOverviewZoom(track.points)
      return {
        center,
        zoom: Math.min(zoom, params.zoom),
        pitch: params.pitch,
        bearing: normBearing(elapsedSec * params.rotationSpeed + params.bearingOffset),
      }
    }
    case 'flyover':
      return {
        center: [point.lng, point.lat],
        zoom: params.zoom,
        pitch: params.pitch,
        bearing: normBearing(bearing + params.bearingOffset),
      }
    case 'orbit':
      return {
        center: [point.lng, point.lat],
        zoom: params.zoom,
        pitch: params.pitch,
        bearing: normBearing(elapsedSec * params.rotationSpeed + params.bearingOffset),
      }
    case 'ground':
      return {
        center: [point.lng, point.lat],
        zoom: params.zoom,
        pitch: params.pitch,
        bearing: normBearing(bearing + params.bearingOffset),
      }
    case 'closeup':
      return {
        center: [point.lng, point.lat],
        zoom: params.zoom,
        pitch: params.pitch,
        bearing: normBearing(bearing + params.bearingOffset),
      }
    case 'birdeye': {
      // Look-ahead: interpolate a point ~5% further along the track for bearing
      const lookAheadProgress = Math.min(1, trackProgress + 0.05)
      const ahead = interpolateAlongTrack(track.points, cumulDist, lookAheadProgress)
      const lookBearing = computeBearing(point, ahead.point)
      // Use the look-ahead bearing combined with slow rotation for cinematic drift
      const drift = elapsedSec * params.rotationSpeed
      return {
        center: [point.lng, point.lat],
        zoom: params.zoom,
        pitch: params.pitch,
        bearing: normBearing(lookBearing + drift + params.bearingOffset),
      }
    }
    default:
      return {
        center: [point.lng, point.lat],
        zoom: 14,
        pitch: 45,
        bearing: normBearing(bearing),
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
      name: "Bird's Eye",
      cameraMode: 'birdeye',
      startPercent: 0.08,
      endPercent: 0.3,
      params: { ...DEFAULT_CAMERA_PARAMS.birdeye },
    },
    {
      id: 'scene-3',
      name: 'Flyover',
      cameraMode: 'flyover',
      startPercent: 0.3,
      endPercent: 0.5,
      params: { ...DEFAULT_CAMERA_PARAMS.flyover },
    },
    {
      id: 'scene-4',
      name: 'Orbit Midpoint',
      cameraMode: 'orbit',
      startPercent: 0.5,
      endPercent: 0.6,
      params: { ...DEFAULT_CAMERA_PARAMS.orbit },
    },
    {
      id: 'scene-5',
      name: 'Ground Follow',
      cameraMode: 'ground',
      startPercent: 0.6,
      endPercent: 0.85,
      params: { ...DEFAULT_CAMERA_PARAMS.ground },
    },
    {
      id: 'scene-6',
      name: 'Closing Overview',
      cameraMode: 'overview',
      startPercent: 0.85,
      endPercent: 1.0,
      params: { ...DEFAULT_CAMERA_PARAMS.overview },
    },
  ]
}

/** Scene preset: simple flyover — one continuous flyover scene. */
export function generateSimpleFlyover(): Scene[] {
  return [
    {
      id: 'preset-1',
      name: 'Flyover',
      cameraMode: 'flyover',
      startPercent: 0,
      endPercent: 1,
      params: { zoom: 13, pitch: 55, bearingOffset: 0, rotationSpeed: 0 },
    },
  ]
}

/** Scene preset: bird's eye — full track from a high 3D perspective. */
export function generateBirdeyeFlyover(): Scene[] {
  return [
    {
      id: 'be-1',
      name: "Bird's Eye",
      cameraMode: 'birdeye',
      startPercent: 0,
      endPercent: 1,
      params: { zoom: 11, pitch: 65, bearingOffset: 0, rotationSpeed: 5 },
    },
  ]
}

/** Scene preset: dynamic — quick cuts between different modes. */
export function generateDynamicScenes(): Scene[] {
  return [
    {
      id: 'dyn-1', name: 'Wide Open', cameraMode: 'overview',
      startPercent: 0, endPercent: 0.08,
      params: { zoom: 9, pitch: 40, bearingOffset: 0, rotationSpeed: 12 },
    },
    {
      id: 'dyn-2', name: 'Cruise', cameraMode: 'flyover',
      startPercent: 0.08, endPercent: 0.25,
      params: { zoom: 13.5, pitch: 50, bearingOffset: 10, rotationSpeed: 0 },
    },
    {
      id: 'dyn-3', name: "Bird's Eye", cameraMode: 'birdeye',
      startPercent: 0.25, endPercent: 0.4,
      params: { zoom: 10.5, pitch: 60, bearingOffset: 0, rotationSpeed: 8 },
    },
    {
      id: 'dyn-4', name: 'Orbit', cameraMode: 'orbit',
      startPercent: 0.4, endPercent: 0.5,
      params: { zoom: 14, pitch: 60, bearingOffset: 0, rotationSpeed: 45 },
    },
    {
      id: 'dyn-5', name: 'Street Level', cameraMode: 'ground',
      startPercent: 0.5, endPercent: 0.65,
      params: { zoom: 16, pitch: 72, bearingOffset: 0, rotationSpeed: 0 },
    },
    {
      id: 'dyn-6', name: 'Close Up', cameraMode: 'closeup',
      startPercent: 0.65, endPercent: 0.75,
      params: { zoom: 17, pitch: 30, bearingOffset: -20, rotationSpeed: 0 },
    },
    {
      id: 'dyn-7', name: 'Pull Back', cameraMode: 'flyover',
      startPercent: 0.75, endPercent: 0.9,
      params: { zoom: 12, pitch: 50, bearingOffset: 0, rotationSpeed: 0 },
    },
    {
      id: 'dyn-8', name: 'Final Orbit', cameraMode: 'orbit',
      startPercent: 0.9, endPercent: 1,
      params: { zoom: 11, pitch: 50, bearingOffset: 0, rotationSpeed: 30 },
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

  // Find which scene contains globalProgress
  let sceneIdx = -1
  for (let i = 0; i < scenes.length; i++) {
    if (globalProgress >= scenes[i].startPercent && globalProgress <= scenes[i].endPercent) {
      sceneIdx = i
      break
    }
  }

  // If in a gap between scenes, interpolate between the surrounding scenes
  if (sceneIdx === -1) {
    // Find the closest previous and next scenes
    let prevIdx = -1
    let nextIdx = -1
    for (let i = 0; i < scenes.length; i++) {
      if (scenes[i].endPercent <= globalProgress) prevIdx = i
      if (scenes[i].startPercent > globalProgress && nextIdx === -1) nextIdx = i
    }

    if (prevIdx >= 0 && nextIdx >= 0) {
      const prevScene = scenes[prevIdx]
      const nextScene = scenes[nextIdx]
      const gapStart = prevScene.endPercent
      const gapEnd = nextScene.startPercent
      const gapT = gapEnd > gapStart ? (globalProgress - gapStart) / (gapEnd - gapStart) : 0.5
      const prevCamera = computeCameraForScene(track, cumulDist, prevScene, 1.0, elapsedSec)
      const nextCamera = computeCameraForScene(track, cumulDist, nextScene, 0.0, elapsedSec)
      return lerpCamera(prevCamera, nextCamera, Math.max(0, Math.min(1, gapT)))
    } else if (prevIdx >= 0) {
      sceneIdx = prevIdx
    } else if (nextIdx >= 0) {
      sceneIdx = nextIdx
    } else {
      sceneIdx = 0
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
