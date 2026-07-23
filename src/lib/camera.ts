import type { Track, Scene } from '@/types'
import { DEFAULT_CAMERA_PARAMS } from '@/types'
import {
  interpolateAlongTrack,
  computeBearing,
  normalizeLng,
  shortestLngDelta,
  type InterpolationResult,
} from './interpolate'
import { computeTrackDisplayBounds, type TrackDisplayBounds } from './map-geometry'

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

/** Hermite smoothstep interpolation: 3t^2 - 2t^3 */
export const smoothstep = (t: number) => t * t * (3 - 2 * t)

/** Fraction of track length used for look-ahead bearing in bird's eye mode */
export const LOOK_AHEAD_FRACTION = 0.05
export const MIN_SCENE_SPAN = 0.01
const DEFAULT_FOLLOW_LOOK_AHEAD_METERS = 600

export interface TrackSegmentBounds {
  start: number
  end: number
}

/** Resolve the inclusive segment containing a point index. Track producers
 * keep segmentStartIndices sorted and unique; binary search keeps this helper
 * cheap even for visit-heavy Google histories. */
export function findTrackSegmentBounds(track: Track, pointIndex: number): TrackSegmentBounds {
  const lastIndex = Math.max(0, track.points.length - 1)
  const index = Math.max(0, Math.min(lastIndex, Math.trunc(pointIndex)))
  const starts = track.segmentStartIndices ?? []
  let low = 0
  let high = starts.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (starts[middle] <= index) low = middle + 1
    else high = middle
  }

  return {
    start: low > 0 ? starts[low - 1] : 0,
    end: low < starts.length ? starts[low] - 1 : lastIndex,
  }
}

/** Compute a forward-looking bearing without allowing a disconnected segment
 * to influence the current camera. */
export function computeSegmentLocalBearing(
  track: Track,
  cumulativeDistances: number[],
  current: InterpolationResult,
  lookAheadDistance: number,
): number {
  if (track.points.length === 0 || !(current.totalDist > 0)) return 0
  const bounds = findTrackSegmentBounds(track, current.segmentIndex)
  const endPoint = track.points[bounds.end] ?? current.point
  const endDistance = cumulativeDistances[bounds.end] ?? current.distanceTraveled
  const targetDistance = Math.min(
    endDistance,
    current.distanceTraveled + Math.max(0, lookAheadDistance),
  )

  let aheadPoint = endPoint
  if (current.totalDist > 0 && targetDistance < endDistance) {
    const ahead = interpolateAlongTrack(
      track.points,
      cumulativeDistances,
      targetDistance / current.totalDist,
      track.segmentStartIndices,
    )
    if (ahead.segmentIndex <= bounds.end) aheadPoint = ahead.point
  }

  if (aheadPoint.lng !== current.point.lng || aheadPoint.lat !== current.point.lat) {
    return computeBearing(current.point, aheadPoint)
  }

  // Interpolation already resolves duplicate endpoint bearings with indexed
  // segment-local distance lookups. Reuse it instead of rescanning the route.
  return current.bearing
}

export type RestoreDeletedSceneResult =
  | { restored: true; scenes: Scene[] }
  | { restored: false; reason: 'duplicate' | 'conflict'; scenes: Scene[] }

export function restoreDeletedScene(
  scenes: Scene[],
  deletedScene: Scene,
  originalIndex: number,
): RestoreDeletedSceneResult {
  if (scenes.some((scene) => scene.id === deletedScene.id)) {
    return { restored: false, reason: 'duplicate', scenes }
  }

  const occupied = scenes
    .map((scene) => ({
      start: clampUnit(scene.startPercent, 0),
      end: clampUnit(scene.endPercent, 1),
    }))
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start || a.end - b.end)

  const merged: Array<{ start: number; end: number }> = []
  for (const range of occupied) {
    const previous = merged.at(-1)
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end)
    } else {
      merged.push({ ...range })
    }
  }

  const gaps: Array<{ start: number; end: number }> = []
  let cursor = 0
  for (const range of merged) {
    if (range.start > cursor) gaps.push({ start: cursor, end: range.start })
    cursor = Math.max(cursor, range.end)
  }
  if (cursor < 1) gaps.push({ start: cursor, end: 1 })

  const originalStart = clampUnit(deletedScene.startPercent, 0)
  const originalEnd = clampUnit(deletedScene.endPercent, 1)
  const candidates = gaps
    .map((gap) => {
      const start = Math.max(gap.start, originalStart)
      const end = Math.min(gap.end, originalEnd)
      const insertionIndex = scenes.filter((scene) => scene.endPercent <= start).length
      return { start, end, insertionIndex }
    })
    .filter((gap) => gap.end - gap.start + Number.EPSILON >= MIN_SCENE_SPAN)
    .sort((a, b) => {
      const widthDifference = (b.end - b.start) - (a.end - a.start)
      if (Math.abs(widthDifference) > Number.EPSILON) return widthDifference
      return Math.abs(a.insertionIndex - originalIndex) - Math.abs(b.insertionIndex - originalIndex)
    })

  const available = candidates[0]
  if (!available) {
    return { restored: false, reason: 'conflict', scenes }
  }

  const restoredScene = {
    ...deletedScene,
    startPercent: available.start,
    endPercent: available.end,
  }
  const nextScenes = [...scenes, restoredScene].sort((a, b) => (
    a.startPercent - b.startPercent
    || a.endPercent - b.endPercent
    || a.id.localeCompare(b.id)
  ))
  return { restored: true, scenes: nextScenes }
}

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

function trackCenterFromBounds(bounds: TrackDisplayBounds): [number, number] {
  return [
    normalizeLng((bounds.west + bounds.east) / 2),
    (bounds.south + bounds.north) / 2,
  ]
}

function overviewZoomFromBounds(bounds: TrackDisplayBounds): number {
  const dLng = bounds.east - bounds.west
  const dLat = bounds.north - bounds.south
  const maxSpan = Math.max(dLng, dLat)
  if (maxSpan === 0) return 14
  const z = Math.log2(360 / maxSpan) - 0.5
  return Math.max(1, Math.min(18, z))
}

const overviewCameraCache = new WeakMap<Track, CameraState>()

function computeOverviewCamera(track: Track): CameraState {
  const cached = overviewCameraCache.get(track)
  if (cached) return cached
  const bounds = computeTrackDisplayBounds(track.points, track.segmentStartIndices)
  const camera: CameraState = bounds
    ? {
        center: trackCenterFromBounds(bounds),
        zoom: overviewZoomFromBounds(bounds),
        pitch: 0,
        bearing: 0,
      }
    : { center: [0, 20], zoom: 2, pitch: 0, bearing: 0 }
  overviewCameraCache.set(track, camera)
  return camera
}

/** Linear interpolation identity — used when smoothstep is not desired */
export const linear = (t: number) => t

/**
 * Smoothly interpolate between two camera states with configurable easing.
 * Uses shortest-path longitude interpolation for antimeridian-crossing routes.
 *
 * @param easingFn - Easing function applied to the interpolation factor (default: smoothstep).
 *   Pass `linear` for frame-to-frame smoothing where smoothstep would cause jerky motion.
 * @param bearingFactor - Optional separate factor for bearing interpolation. When provided,
 *   bearing is interpolated at this raw factor (no easing applied), allowing slower bearing
 *   smoothing than position/zoom/pitch. Used by the playback camera follow path.
 */
export function lerpCamera(
  a: CameraState,
  b: CameraState,
  t: number,
  easingFn: (t: number) => number = smoothstep,
  bearingFactor?: number,
): CameraState {
  const s = easingFn(t)
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
    bearing: lerpAngle(a.bearing, b.bearing, bearingFactor ?? s),
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
  const result = interpolateAlongTrack(track.points, cumulDist, trackProgress, track.segmentStartIndices)
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
      const lookBearing = computeSegmentLocalBearing(
        track,
        cumulDist,
        result,
        result.totalDist * LOOK_AHEAD_FRACTION,
      )
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

export function computeDefaultFollowCamera(
  track: Track,
  cumulDist: number[],
  result: InterpolationResult,
): CameraState {
  return {
    center: [result.point.lng, result.point.lat],
    zoom: 13,
    pitch: 45,
    bearing: computeSegmentLocalBearing(
      track,
      cumulDist,
      result,
      DEFAULT_FOLLOW_LOOK_AHEAD_METERS,
    ),
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
    const result = interpolateAlongTrack(
      track.points,
      cumulDist,
      globalProgress,
      track.segmentStartIndices,
    )
    return computeDefaultFollowCamera(track, cumulDist, result)
  }

  // Give each pair-owned interval one resolver before ordinary scene lookup.
  // This prevents both neighboring scenes from replaying the same transition.
  const hasTransition = Number.isFinite(transitionDuration) && transitionDuration > 0
  for (let i = 0; i < normalizedScenes.length - 1; i++) {
    const previousScene = normalizedScenes[i]
    const nextScene = normalizedScenes[i + 1]
    const previousDuration = previousScene.endPercent - previousScene.startPercent
    const nextDuration = nextScene.endPercent - nextScene.startPercent
    const boundary = previousScene.endPercent
    const nextStart = nextScene.startPercent

    if (nextStart > boundary) {
      if (globalProgress < boundary || globalProgress > nextStart) continue

      // A real gap owns its complete interval. Stable elapsed-zero endpoint
      // cameras keep rotation modes from turning the interpolation targets.
      const gapT = (globalProgress - boundary) / (nextStart - boundary)
      const previousCamera = computeCameraForScene(track, cumulDist, previousScene, 1, 0)
      const nextCamera = computeCameraForScene(track, cumulDist, nextScene, 0, 0)
      return lerpCamera(previousCamera, nextCamera, clampUnit(gapT, 0))
    }

    if (!hasTransition || nextStart !== boundary) continue

    const halfWidth = Math.min(
      transitionDuration / 2,
      previousDuration / 2,
      nextDuration / 2,
    )
    if (!(halfWidth > 0)) continue

    const windowStart = boundary - halfWidth
    const windowEnd = boundary + halfWidth
    if (globalProgress < windowStart || globalProgress >= windowEnd) continue

    // Extrapolated local progress maps both moving-mode centers back to the
    // current global progress. Taper only rotation time toward zero at the
    // shared boundary, then restore it at the far edge, so the boundary has
    // stable anchors without freezing or snapping at either window edge.
    const previousLocalProgress = (globalProgress - previousScene.startPercent) / previousDuration
    const nextLocalProgress = (globalProgress - nextScene.startPercent) / nextDuration
    const previousElapsed = elapsedSec * clampUnit((boundary - globalProgress) / halfWidth, 0)
    const nextElapsed = elapsedSec * clampUnit((globalProgress - boundary) / halfWidth, 0)
    const previousCamera = computeCameraForScene(
      track,
      cumulDist,
      previousScene,
      previousLocalProgress,
      previousElapsed,
    )
    const nextCamera = computeCameraForScene(
      track,
      cumulDist,
      nextScene,
      nextLocalProgress,
      nextElapsed,
    )
    const blendT = (globalProgress - windowStart) / (windowEnd - windowStart)
    return lerpCamera(previousCamera, nextCamera, clampUnit(blendT, 0))
  }

  // Ordinary scenes use right-biased, half-open ownership. Only the final
  // scene owns its end so a zero-duration transition hard-cuts to the scene
  // on the right at a shared boundary.
  let sceneIdx = -1
  for (let i = 0; i < normalizedScenes.length; i++) {
    const scene = normalizedScenes[i]
    const ownsFinalEndpoint = i === normalizedScenes.length - 1 && globalProgress <= scene.endPercent
    if (globalProgress >= scene.startPercent && (globalProgress < scene.endPercent || ownsFinalEndpoint)) {
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
      // Defensive fallback for malformed or non-finite progress. Valid
      // normalized interior gaps were already resolved by their pair owner.
      const prevScene = normalizedScenes[prevIdx]
      const nextScene = normalizedScenes[nextIdx]
      const gapStart = prevScene.endPercent
      const gapEnd = nextScene.startPercent
      // If globalProgress is before the gap start (can happen when normalization
      // produces overlapping ranges that were then adjusted), treat as within the
      // previous scene rather than interpolating with a negative gapT.
      if (globalProgress < gapStart) {
        return computeCameraForScene(track, cumulDist, prevScene, 1.0, 0)
      }
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
      const result = interpolateAlongTrack(
        track.points,
        cumulDist,
        globalProgress,
        track.segmentStartIndices,
      )
      const followCamera = computeDefaultFollowCamera(track, cumulDist, result)
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
  return mainCamera
}
