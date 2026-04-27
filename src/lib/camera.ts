import type { Track, TrackPoint, Scene } from '@/types'
import { DEFAULT_CAMERA_PARAMS } from '@/types'
import { interpolateAlongTrack, computeBearing, normalizeLng, shortestLngDelta } from './interpolate'

export interface CameraState {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
}

function clampUnit(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(1, value))
}

const normBearing = (b: number) => ((b % 360) + 360) % 360

export function normalizeScenes(scenes: Scene[]): Scene[] {
  let previousEndPercent = 0

  return scenes
    .map((scene) => ({
      ...scene,
      startPercent: clampUnit(scene.startPercent, 0),
      endPercent: clampUnit(scene.endPercent, 1),
    }))
    .sort((a, b) => {
      if (a.startPercent !== b.startPercent) return a.startPercent - b.startPercent
      if (a.endPercent !== b.endPercent) return a.endPercent - b.endPercent
      return a.id.localeCompare(b.id)
    })
    .map((scene) => {
      const startPercent = Math.max(scene.startPercent, previousEndPercent)
      const endPercent = Math.max(startPercent, scene.endPercent)
      previousEndPercent = endPercent
      return {
        ...scene,
        startPercent,
        endPercent,
      }
    })
    .filter((scene) => scene.endPercent > scene.startPercent)
}

interface BoundingBox {
  minLat: number; maxLat: number
  minLng: number; maxLng: number
  /** Shifted longitude bounds when track crosses antimeridian (span > 180) */
  minLngShifted?: number; maxLngShifted?: number
}

function computeBoundingBox(points: TrackPoint[]): BoundingBox | null {
  if (points.length === 0) return null
  let minLng = Infinity, maxLng = -Infinity
  let minLat = Infinity, maxLat = -Infinity
  for (const p of points) {
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
  }
  const box: BoundingBox = { minLat, maxLat, minLng, maxLng }
  if (maxLng - minLng > 180) {
    let minShifted = Infinity, maxShifted = -Infinity
    for (const p of points) {
      const shifted = p.lng < 0 ? p.lng + 360 : p.lng
      if (shifted < minShifted) minShifted = shifted
      if (shifted > maxShifted) maxShifted = shifted
    }
    box.minLngShifted = minShifted
    box.maxLngShifted = maxShifted
  }
  return box
}

function trackCenterFromBox(box: BoundingBox): [number, number] {
  const latCenter = (box.minLat + box.maxLat) / 2
  if (box.minLngShifted != null && box.maxLngShifted != null) {
    const centerShifted = (box.minLngShifted + box.maxLngShifted) / 2
    return [normalizeLng(centerShifted), latCenter]
  }
  return [(box.minLng + box.maxLng) / 2, latCenter]
}

function overviewZoomFromBox(box: BoundingBox): number {
  const dLng = box.minLngShifted != null && box.maxLngShifted != null
    ? box.maxLngShifted - box.minLngShifted
    : box.maxLng - box.minLng
  const dLat = box.maxLat - box.minLat
  const maxSpan = Math.max(dLng, dLat)
  if (maxSpan === 0) return 14
  const z = Math.log2(360 / maxSpan) - 0.5
  return Math.max(1, Math.min(18, z))
}

const overviewCameraCache = new WeakMap<Track, CameraState>()

function computeOverviewCamera(track: Track): CameraState {
  const cached = overviewCameraCache.get(track)
  if (cached) return cached
  const box = computeBoundingBox(track.points)
  const camera: CameraState = box
    ? { center: trackCenterFromBox(box), zoom: overviewZoomFromBox(box), pitch: 0, bearing: 0 }
    : { center: [0, 20], zoom: 2, pitch: 0, bearing: 0 }
  overviewCameraCache.set(track, camera)
  return camera
}

/**
 * Smoothly interpolate between two camera states with easing.
 * Uses shortest-path longitude interpolation for antimeridian-crossing routes.
 */
export function lerpCamera(a: CameraState, b: CameraState, t: number): CameraState {
  const s = t * t * (3 - 2 * t) // smoothstep
  const lerpAngle = (from: number, to: number, f: number) => {
    const diff = ((to - from + 540) % 360) - 180
    return from + diff * f
  }

  const lngResult = normalizeLng(a.center[0] + shortestLngDelta(a.center[0], b.center[0]) * s)

  return {
    center: [
      lngResult,
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
  if (track.points.length === 0) {
    return { center: [0, 20], zoom: 2, pitch: 0, bearing: 0 }
  }
  const params = scene.params
  const trackProgress = scene.startPercent + localProgress * (scene.endPercent - scene.startPercent)
  const result = interpolateAlongTrack(track.points, cumulDist, trackProgress)
  const { point, bearing } = result

  switch (scene.cameraMode) {
    case 'overview': {
      const overviewCamera = computeOverviewCamera(track)
      return {
        center: overviewCamera.center,
        zoom: Math.min(overviewCamera.zoom, params.zoom),
        pitch: params.pitch,
        bearing: normBearing(elapsedSec * params.rotationSpeed + params.bearingOffset),
      }
    }
    case 'flyover':
    case 'ground':
    case 'closeup':
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
    case 'birdeye': {
      // Look-ahead: interpolate a point ~5% further along the track for bearing
      const lookAheadProgress = Math.min(1, trackProgress + 0.05)
      const ahead = interpolateAlongTrack(track.points, cumulDist, lookAheadProgress)
      const lookBearing =
        ahead.point.lng === point.lng && ahead.point.lat === point.lat
          ? ahead.bearing
          : computeBearing(point, ahead.point)
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

function computeDefaultFollowCamera(track: Track, cumulDist: number[], progress: number): CameraState {
  const result = interpolateAlongTrack(track.points, cumulDist, progress)
  return {
    center: [result.point.lng, result.point.lat],
    zoom: 14,
    pitch: 45,
    bearing: result.bearing,
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
  preNormalized?: boolean,
): CameraState {
  const normalizedScenes = preNormalized ? scenes : normalizeScenes(scenes)

  if (normalizedScenes.length === 0) {
    return computeDefaultFollowCamera(track, cumulDist, globalProgress)
  }

  // Find which scene contains globalProgress
  let sceneIdx = -1
  for (let i = 0; i < normalizedScenes.length; i++) {
    if (globalProgress >= normalizedScenes[i].startPercent && globalProgress <= normalizedScenes[i].endPercent) {
      sceneIdx = i
      break
    }
  }

  // If in a gap between scenes, interpolate between the surrounding scenes
  if (sceneIdx === -1) {
    // Find the closest previous and next scenes
    let prevIdx = -1
    let nextIdx = -1
    for (let i = 0; i < normalizedScenes.length; i++) {
      if (normalizedScenes[i].endPercent <= globalProgress) prevIdx = i
      if (normalizedScenes[i].startPercent > globalProgress && nextIdx === -1) nextIdx = i
    }

    if (prevIdx >= 0 && nextIdx >= 0) {
      // Between-scenes gap: use elapsedSec=0 for both boundary cameras so
      // rotation-dependent modes (orbit, ground) produce a stable lerp start
      // and end point instead of a moving target that causes bearing wobble.
      const prevScene = normalizedScenes[prevIdx]
      const nextScene = normalizedScenes[nextIdx]
      const gapStart = prevScene.endPercent
      const gapEnd = nextScene.startPercent
      const gapT = gapEnd > gapStart ? (globalProgress - gapStart) / (gapEnd - gapStart) : 0.5
      const prevCamera = computeCameraForScene(track, cumulDist, prevScene, 1.0, 0)
      const nextCamera = computeCameraForScene(track, cumulDist, nextScene, 0.0, 0)
      return lerpCamera(prevCamera, nextCamera, Math.max(0, Math.min(1, gapT)))
    } else if (prevIdx === -1 && nextIdx >= 0) {
      // Before first scene: interpolate from a stable overview camera (no rotation)
      // to avoid bearing jitter when lerping toward the first scene
      const nextScene = normalizedScenes[nextIdx]
      const gapT = nextScene.startPercent > 0 ? globalProgress / nextScene.startPercent : 1
      const overviewCamera = computeOverviewCamera(track)
      const nextCamera = computeCameraForScene(track, cumulDist, nextScene, 0.0, 0)
      return lerpCamera(overviewCamera, nextCamera, Math.max(0, Math.min(1, gapT)))
    } else if (prevIdx >= 0) {
      // After-last-scene gap: interpolate from the last scene's end state
      // to the default follow camera over the remaining gap duration to
      // avoid an instant bearing snap. Use elapsedSec=0 for the previous
      // scene's camera so rotation-dependent modes produce a stable lerp
      // start point instead of a moving one that causes bearing wobble.
      const prevScene = normalizedScenes[prevIdx]
      const prevCamera = computeCameraForScene(track, cumulDist, prevScene, 1.0, 0)
      const followCamera = computeDefaultFollowCamera(track, cumulDist, globalProgress)
      const gapLength = 1.0 - prevScene.endPercent
      const gapT = gapLength > 0 ? Math.max(0, Math.min(1, (globalProgress - prevScene.endPercent) / gapLength)) : 1
      return lerpCamera(prevCamera, followCamera, gapT)
    } else if (nextIdx >= 0) {
      sceneIdx = nextIdx
    } else {
      sceneIdx = 0
    }
  }

  const scene = normalizedScenes[sceneIdx]
  const sceneDuration = scene.endPercent - scene.startPercent
  const localProgress = sceneDuration > 0
    ? Math.max(0, Math.min(1, (globalProgress - scene.startPercent) / sceneDuration))
    : 0

  const mainCamera = computeCameraForScene(track, cumulDist, scene, localProgress, elapsedSec)

  // Transition blending at scene boundaries
  const effectiveHalfTrans = Math.min(transitionDuration / 2, sceneDuration / 2)

  if (sceneIdx > 0 && sceneDuration > 0 && localProgress < effectiveHalfTrans / sceneDuration) {
    const prevScene = normalizedScenes[sceneIdx - 1]
    // Use elapsedSec=0 for the previous scene's end-state camera so
    // rotation-dependent modes (orbit, overview) produce a stable lerp
    // start point instead of a moving target that causes bearing wobble.
    const prevCamera = computeCameraForScene(track, cumulDist, prevScene, 1.0, 0)
    const blendT = (localProgress * sceneDuration) / effectiveHalfTrans
    return lerpCamera(prevCamera, mainCamera, Math.max(0, Math.min(1, blendT)))
  }

  if (sceneIdx < normalizedScenes.length - 1 && sceneDuration > 0 && localProgress > 1 - effectiveHalfTrans / sceneDuration) {
    const nextScene = normalizedScenes[sceneIdx + 1]
    // Use elapsedSec=0 for the next scene's start-state camera so
    // rotation-dependent modes produce a stable lerp end point.
    const nextCamera = computeCameraForScene(track, cumulDist, nextScene, 0.0, 0)
    const blendT = ((1 - localProgress) * sceneDuration) / effectiveHalfTrans
    return lerpCamera(mainCamera, nextCamera, 1 - Math.max(0, Math.min(1, blendT)))
  }

  return mainCamera
}
