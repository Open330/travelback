'use client'

import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import maplibregl from 'maplibre-gl'
import type { Track, TrackPoint, MapStyleKey, Scene } from '@/types'
import { MAP_STYLES } from '@/types'
import { interpolateAlongTrack, shortestLngDelta } from '@/lib/interpolate'
import { computeCameraForProgress, computeSegmentLocalBearing, normalizeScenes, lerpCamera, linear } from '@/lib/camera'
import type { CameraState } from '@/lib/camera'
import { useLocale } from '@/lib/i18n'
import {
  buildTrackGeometry,
  buildTrailChunkFeatureCollection,
  buildTrailChunks,
  buildTrailFrameGeometry,
  precomputeWrappedSegments,
  type TrailChunk,
} from '@/lib/map-geometry'
import { mutateMapAndWaitForRender } from '@/lib/map-render'

interface MapViewProps {
  track: Track | null
  progress: number
  mapStyleKey: MapStyleKey
  followCamera: boolean
  suspendAutoCamera?: boolean
  seekNonce?: number
  scenes?: Scene[]
  duration?: number
  transitionDuration?: number
  cumulativeDistances?: number[]
  allowInteractionWithoutTrack?: boolean
  isExporting?: boolean
  onMapInstanceChange?: () => void
}

export interface MapViewHandle {
  getMap: () => maplibregl.Map | null
  getCanvas: () => HTMLCanvasElement | null
  applyCameraState: (state: CameraState) => void
  renderFrameAndWait: (state: CameraState, progress: number, signal?: AbortSignal) => Promise<void>
  clearTrackArtifacts: () => void
  resize: (width: number, height: number) => void
  resetSize: () => void
  waitForIdle: (signal?: AbortSignal) => Promise<boolean>
}

const ROUTE_COLOR = '#06b6d4'
const TRAIL_COLOR = '#f97316'
const MARKER_COLOR = '#ef4444'
const LOOK_AHEAD_DISTANCE_METERS = 600
const CAMERA_SMOOTHING = 0.1
const BEARING_SMOOTHING = 0.04
const SCENE_CAMERA_SMOOTHING = 0.7
const SEEK_SNAP_DISTANCE_METERS = 2500
const SEEK_SNAP_BEARING_DEGREES = 120
const WAIT_FOR_IDLE_TIMEOUT_MS = 5000
const MIN_CAMERA_MOVE_METERS = 0.01
const MIN_CAMERA_BEARING_DELTA = 0.01
const MIN_CAMERA_ZOOM_DELTA = 0.01
const MIN_CAMERA_PITCH_DELTA = 0.1
const REFERENCE_GRID_SOURCE = 'reference-grid'
const REFERENCE_GRID_MINOR_LAYER = 'reference-grid-minor'
const REFERENCE_GRID_MAJOR_LAYER = 'reference-grid-major'
const POSITION_MARKER_SOURCE = 'current-position'
const POSITION_MARKER_LAYER = 'current-position-layer'
const TRAIL_SOURCE = 'trail'
const TRAIL_LAYER = 'trail-line'
const TRAIL_HEAD_SOURCE = 'trail-head'
const TRAIL_HEAD_LAYER = 'trail-head-line'

function completedTrailFilter(chunkIndex: number): maplibregl.FilterSpecification {
  return ['<=', ['get', 'chunkIndex'], chunkIndex]
}

const GRID_PAINT_BY_STYLE: Record<MapStyleKey, { minor: string; major: string }> = {
  voyager: { minor: 'rgba(120, 130, 120, 0.22)', major: 'rgba(120, 130, 120, 0.38)' },
  positron: { minor: 'rgba(140, 140, 140, 0.2)', major: 'rgba(120, 120, 120, 0.34)' },
  dark: { minor: 'rgba(148, 163, 184, 0.26)', major: 'rgba(148, 163, 184, 0.46)' },
  liberty: { minor: 'rgba(139, 116, 93, 0.2)', major: 'rgba(139, 116, 93, 0.34)' },
  bright: { minor: 'rgba(173, 150, 120, 0.22)', major: 'rgba(173, 150, 120, 0.38)' },
}

function angleDelta(from: number, to: number): number {
  return Math.abs(((to - from + 540) % 360) - 180)
}

function centerDistanceMeters(a: [number, number], b: [number, number]): number {
  const avgLatRad = ((a[1] + b[1]) / 2) * (Math.PI / 180)
  const dLngMeters = shortestLngDelta(a[0], b[0]) * 111320 * Math.cos(avgLatRad)
  const dLatMeters = (b[1] - a[1]) * 110540
  return Math.hypot(dLngMeters, dLatMeters)
}

function smoothCameraState(previous: CameraState, target: CameraState, factor: number, bearingFactor?: number): CameraState {
  return lerpCamera(previous, target, factor, linear, bearingFactor)
}

function buildFitBounds(points: TrackPoint[]): maplibregl.LngLatBounds {
  const bounds = new maplibregl.LngLatBounds()
  if (points.length === 0) return bounds

  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  for (const point of points) {
    minLng = Math.min(minLng, point.lng)
    maxLng = Math.max(maxLng, point.lng)
    minLat = Math.min(minLat, point.lat)
    maxLat = Math.max(maxLat, point.lat)
  }
  const crossesAntimeridian = maxLng - minLng > 180

  for (const point of points) {
    const lng = crossesAntimeridian && point.lng < 0 ? point.lng + 360 : point.lng
    bounds.extend([lng, point.lat])
  }

  // Guard: degenerate bounds (single point or all coincident points) cause
  // fitBounds to zoom to maximum level. Expand by a small margin so the
  // map shows a reasonable view instead. When bounds are in shifted
  // coordinate space (antimeridian crossing), extend in that same space
  // so padding does not wrap across the 180/-180 boundary (C15-F08).
  const DEGENERATE_PADDING = 0.1
  if (
    Math.abs(bounds.getSouthWest().lng - bounds.getNorthEast().lng) < 1e-10
    && Math.abs(bounds.getSouthWest().lat - bounds.getNorthEast().lat) < 1e-10
  ) {
    const sw = bounds.getSouthWest()
    bounds.extend([sw.lng - DEGENERATE_PADDING, sw.lat - DEGENERATE_PADDING])
    bounds.extend([sw.lng + DEGENERATE_PADDING, sw.lat + DEGENERATE_PADDING])
  }

  return bounds
}

function removeTrackArtifacts(map: maplibregl.Map) {
  if (map.getLayer(POSITION_MARKER_LAYER)) map.removeLayer(POSITION_MARKER_LAYER)
  if (map.getLayer(TRAIL_HEAD_LAYER)) map.removeLayer(TRAIL_HEAD_LAYER)
  if (map.getLayer(TRAIL_LAYER)) map.removeLayer(TRAIL_LAYER)
  if (map.getLayer('route-line')) map.removeLayer('route-line')
  if (map.getSource(POSITION_MARKER_SOURCE)) map.removeSource(POSITION_MARKER_SOURCE)
  if (map.getSource(TRAIL_HEAD_SOURCE)) map.removeSource(TRAIL_HEAD_SOURCE)
  if (map.getSource(TRAIL_SOURCE)) map.removeSource(TRAIL_SOURCE)
  if (map.getSource('route')) map.removeSource('route')
}

function ownsTrackStyle(map: maplibregl.Map) {
  return Boolean(
    map.getSource('route')
    && map.getSource(TRAIL_SOURCE)
    && map.getSource(TRAIL_HEAD_SOURCE)
    && map.getSource(POSITION_MARKER_SOURCE)
    && map.getLayer('route-line')
    && map.getLayer(TRAIL_LAYER)
    && map.getLayer(TRAIL_HEAD_LAYER)
    && map.getLayer(POSITION_MARKER_LAYER),
  )
}

function markerPointFeature(point: TrackPoint): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [point.lng, point.lat],
    },
  }
}

function readPositionMarkerSource(map: maplibregl.Map): [number, number] | null {
  const source = map.getSource(POSITION_MARKER_SOURCE) as maplibregl.GeoJSONSource | undefined
  if (!source) return null

  const data = source.serialize().data as GeoJSON.Feature<GeoJSON.Point> | string
  if (typeof data === 'string' || data.type !== 'Feature' || data.geometry?.type !== 'Point') {
    return null
  }

  const [lng, lat] = data.geometry.coordinates
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null
}

function readTrailHeadPosition(map: maplibregl.Map): [number, number] | null {
  const source = map.getSource(TRAIL_HEAD_SOURCE) as maplibregl.GeoJSONSource | undefined
  if (!source) return null

  const data = source.serialize().data as GeoJSON.Feature<GeoJSON.LineString> | string
  if (typeof data === 'string' || data.type !== 'Feature' || data.geometry?.type !== 'LineString') {
    return null
  }

  const coordinates = data.geometry.coordinates
  const [lng, lat] = coordinates[coordinates.length - 1] ?? []
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null
}

function chooseReferenceGridStep(span: number): number {
  if (span <= 0.02) return 0.0025
  if (span <= 0.05) return 0.005
  if (span <= 0.1) return 0.01
  if (span <= 0.5) return 0.05
  if (span <= 1.5) return 0.1
  if (span <= 5) return 0.5
  if (span <= 20) return 2
  return 10
}

function buildReferenceGridData(track?: Track | null): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []

  if (!track || track.points.length === 0) {
    for (let longitude = -150; longitude <= 150; longitude += 30) {
      features.push({
        type: 'Feature',
        properties: { major: longitude === 0 ? 1 : 0 },
        geometry: {
          type: 'LineString',
          coordinates: [
            [longitude, -80],
            [longitude, 80],
          ],
        },
      })
    }

    for (let latitude = -60; latitude <= 60; latitude += 30) {
      features.push({
        type: 'Feature',
        properties: { major: latitude === 0 ? 1 : 0 },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-180, latitude],
            [180, latitude],
          ],
        },
      })
    }

    return {
      type: 'FeatureCollection',
      features,
    }
  }

  let rawMinLng = Infinity
  let rawMaxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  for (const point of track.points) {
    rawMinLng = Math.min(rawMinLng, point.lng)
    rawMaxLng = Math.max(rawMaxLng, point.lng)
    minLat = Math.min(minLat, point.lat)
    maxLat = Math.max(maxLat, point.lat)
  }

  const crossesAntimeridian = rawMaxLng - rawMinLng > 180
  let minLng = Infinity
  let maxLng = -Infinity
  for (const point of track.points) {
    const lng = crossesAntimeridian && point.lng < 0 ? point.lng + 360 : point.lng
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
  }

  const span = Math.max(maxLng - minLng, maxLat - minLat, 0.01)
  const step = chooseReferenceGridStep(span)
  const majorEvery = 5
  const lngMargin = Math.max(span * 1.5, step * 4)
  const latMargin = Math.max(span * 1.5, step * 4)
  const expandedMinLng = Math.max(crossesAntimeridian ? 0 : -180, minLng - lngMargin)
  const expandedMaxLng = Math.min(crossesAntimeridian ? 360 : 180, maxLng + lngMargin)
  const expandedMinLat = Math.max(-85, minLat - latMargin)
  const expandedMaxLat = Math.min(85, maxLat + latMargin)

  let longitudeIndex = 0
  const lngCount = Math.ceil((expandedMaxLng + step / 2 - Math.floor(expandedMinLng / step) * step) / step)
  for (let i = 0; i < lngCount; i++) {
    const longitude = Math.floor(expandedMinLng / step) * step + i * step
    features.push({
      type: 'Feature',
      properties: { major: longitudeIndex % majorEvery === 0 ? 1 : 0 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [Number(longitude.toFixed(6)), expandedMinLat],
          [Number(longitude.toFixed(6)), expandedMaxLat],
        ],
      },
    })
    longitudeIndex += 1
  }

  let latitudeIndex = 0
  const latCount = Math.ceil((expandedMaxLat + step / 2 - Math.floor(expandedMinLat / step) * step) / step)
  for (let i = 0; i < latCount; i++) {
    const latitude = Math.floor(expandedMinLat / step) * step + i * step
    features.push({
      type: 'Feature',
      properties: { major: latitudeIndex % majorEvery === 0 ? 1 : 0 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [expandedMinLng, Number(latitude.toFixed(6))],
          [expandedMaxLng, Number(latitude.toFixed(6))],
        ],
      },
    })
    latitudeIndex += 1
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

function addReferenceGridLayers(map: maplibregl.Map, mapStyleKey: MapStyleKey, gridData: GeoJSON.FeatureCollection) {
  if (!map.isStyleLoaded()) return

  const gridPaint = GRID_PAINT_BY_STYLE[mapStyleKey]

  if (!map.getSource(REFERENCE_GRID_SOURCE)) {
    map.addSource(REFERENCE_GRID_SOURCE, {
      type: 'geojson',
      data: gridData,
    })
  } else {
    const source = map.getSource(REFERENCE_GRID_SOURCE) as maplibregl.GeoJSONSource | undefined
    source?.setData(gridData)
  }

  if (!map.getLayer(REFERENCE_GRID_MINOR_LAYER)) {
    map.addLayer({
      id: REFERENCE_GRID_MINOR_LAYER,
      type: 'line',
      source: REFERENCE_GRID_SOURCE,
      filter: ['!=', ['get', 'major'], 1],
      layout: { 'line-cap': 'round' },
      paint: {
        'line-color': gridPaint.minor,
        'line-width': 1.1,
      },
    })
  } else {
    map.setPaintProperty(REFERENCE_GRID_MINOR_LAYER, 'line-color', gridPaint.minor)
  }

  if (!map.getLayer(REFERENCE_GRID_MAJOR_LAYER)) {
    map.addLayer({
      id: REFERENCE_GRID_MAJOR_LAYER,
      type: 'line',
      source: REFERENCE_GRID_SOURCE,
      filter: ['==', ['get', 'major'], 1],
      layout: { 'line-cap': 'round' },
      paint: {
        'line-color': gridPaint.major,
        'line-width': 1.8,
      },
    })
  } else {
    map.setPaintProperty(REFERENCE_GRID_MAJOR_LAYER, 'line-color', gridPaint.major)
  }
}

type TravelbackDebugWindow = Window & {
  __travelbackDebug?: {
    getCamera: () => CameraState | null
    getMapState: () => {
      hasRouteSource: boolean
      hasTrailSource: boolean
      hasRouteLayer: boolean
      hasTrailLayer: boolean
      hasMarker: boolean
      hasExportMarkerLayer: boolean
      hasReferenceGridLayer: boolean
    } | null
    getPoseState: () => {
      htmlMarkerPosition: [number, number] | null
      geoJsonMarkerPosition: [number, number] | null
      trailHeadPosition: [number, number] | null
      completedTrailChunkIndex: number
      requestedStyleRevision: number
      readyStyleRevision: number
    } | null
  }
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  {
    track,
    progress,
    mapStyleKey,
    followCamera,
    suspendAutoCamera = false,
    seekNonce = 0,
    scenes,
    duration = 30,
    transitionDuration = 0.03,
    cumulativeDistances: cumulativeDistancesProp,
    allowInteractionWithoutTrack = false,
    isExporting = false,
    onMapInstanceChange,
  },
  ref,
) {
  const { t } = useLocale()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerEl = useRef<HTMLDivElement | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const cumulDistRef = useRef<number[]>([])
  const trailChunksRef = useRef<TrailChunk[]>([])
  const trackRef = useRef<Track | null>(track)
  const progressRef = useRef(progress)
  const styleKeyRef = useRef<MapStyleKey>(mapStyleKey)
  const originalSizeRef = useRef<{ width: number; height: number } | null>(null)
  const lastCameraStateRef = useRef<CameraState | null>(null)
  const lastSeekNonceRef = useRef(seekNonce)
  const lastCompletedTrailChunkIndexRef = useRef(-1)
  const scenesRef = useRef(scenes)
  const normalizedScenesRef = useRef<Scene[]>([])
  const durationRef = useRef(duration)
  const transitionDurationRef = useRef(transitionDuration)
  const followCameraRef = useRef(followCamera)
  const suspendAutoCameraRef = useRef(suspendAutoCamera)
  const seekNonceRef = useRef(seekNonce)
  const requestedStyleRevisionRef = useRef(0)
  const loadedStyleRevisionRef = useRef(0)
  const readyStyleRevisionRef = useRef(0)
  const fitTrackOnReadyRef = useRef<Track | null>(null)
  const preparedTrackRef = useRef<Track | null>(null)
  const retryCameraStateRef = useRef<CameraState | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapRetryNonce, setMapRetryNonce] = useState(0)
  const [readyStyleRevision, setReadyStyleRevision] = useState(0)

  // Cache reference grid data keyed on track reference — avoids recomputing
  // grid coordinates on every style change when the track hasn't changed.
  const referenceGridData = useMemo(() => buildReferenceGridData(track), [track])
  const referenceGridDataRef = useRef(referenceGridData)

  useEffect(() => {
    scenesRef.current = scenes
    normalizedScenesRef.current = normalizeScenes(scenes ?? [])
    lastCameraStateRef.current = null
  }, [scenes])
  useEffect(() => {
    durationRef.current = duration
    transitionDurationRef.current = transitionDuration
    followCameraRef.current = followCamera
    suspendAutoCameraRef.current = suspendAutoCamera
    seekNonceRef.current = seekNonce
  }, [duration, followCamera, seekNonce, suspendAutoCamera, transitionDuration])

  useEffect(() => {
    referenceGridDataRef.current = referenceGridData
  }, [referenceGridData])

  useEffect(() => {
    trackRef.current = track
  }, [track])
  useEffect(() => {
    progressRef.current = progress
  }, [progress])
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (!track && !mapError && !allowInteractionWithoutTrack) {
      container.setAttribute('inert', '')
      container.setAttribute('aria-hidden', 'true')
      return
    }

    container.removeAttribute('inert')
    container.removeAttribute('aria-hidden')
  }, [allowInteractionWithoutTrack, mapError, track])

  const updateTrailSources = useCallback((
    map: maplibregl.Map,
    segmentIndex: number,
    point: TrackPoint,
  ) => {
    const frame = buildTrailFrameGeometry(trailChunksRef.current, segmentIndex, point)
    if (frame.completedChunkIndex !== lastCompletedTrailChunkIndexRef.current) {
      if (map.getLayer(TRAIL_LAYER)) {
        map.setFilter(TRAIL_LAYER, completedTrailFilter(frame.completedChunkIndex))
        lastCompletedTrailChunkIndexRef.current = frame.completedChunkIndex
      } else {
        lastCompletedTrailChunkIndexRef.current = -1
      }
    }

    const activeHeadSource = map.getSource(TRAIL_HEAD_SOURCE) as maplibregl.GeoJSONSource | undefined
    activeHeadSource?.setData({
      type: 'Feature',
      properties: {},
      geometry: frame.activeGeometry,
    })
  }, [])


  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    getCanvas: () => mapRef.current?.getCanvas() ?? null,
    applyCameraState: (state: CameraState) => {
      const map = mapRef.current
      if (!map) return
      map.jumpTo({
        center: state.center as [number, number],
        zoom: state.zoom,
        pitch: state.pitch,
        bearing: state.bearing,
      })
    },
    renderFrameAndWait: (state: CameraState, progress: number, signal?: AbortSignal) => {
      const map = mapRef.current
      if (!map) {
        return Promise.reject(new DOMException('Map not available for frame render', 'AbortError'))
      }

      return mutateMapAndWaitForRender(map, () => {
        // During export the React progress effect is gated by isExporting, so
        // all source and camera mutations for this frame happen atomically here.
        const track = trackRef.current
        const cumulDist = cumulDistRef.current
        if (track && cumulDist.length === track.points.length && cumulDist.length > 0) {
          const { point, segmentIndex } = interpolateAlongTrack(track.points, cumulDist, progress, track.segmentStartIndices)

          markerRef.current?.setLngLat([point.lng, point.lat])
          const markerSource = map.getSource(POSITION_MARKER_SOURCE) as maplibregl.GeoJSONSource | undefined
          markerSource?.setData(markerPointFeature(point))
          updateTrailSources(map, segmentIndex, point)
        }

        map.jumpTo({
          center: state.center as [number, number],
          zoom: state.zoom,
          pitch: state.pitch,
          bearing: state.bearing,
        })
      }, { signal })
    },
    clearTrackArtifacts: () => {
      const map = mapRef.current
      if (!map) return
      removeTrackArtifacts(map)
      markerRef.current?.remove()
      markerRef.current = null
      lastCameraStateRef.current = null
      cumulDistRef.current = []
      trailChunksRef.current = []
      lastCompletedTrailChunkIndexRef.current = -1
      retryCameraStateRef.current = null
    },
    resize: (width: number, height: number) => {
      const map = mapRef.current
      const container = containerRef.current
      if (!map || !container) return
      if (!originalSizeRef.current) {
        originalSizeRef.current = { width: container.clientWidth, height: container.clientHeight }
      }
      container.style.width = `${width}px`
      container.style.height = `${height}px`
      map.resize()
    },
    resetSize: () => {
      const container = containerRef.current
      // Clear container styles first — this always succeeds and is the
      // critical step to prevent a permanently resized map.
      if (container) {
        container.style.width = ''
        container.style.height = ''
      }
      originalSizeRef.current = null
      // map.resize() can throw if the map was destroyed during export.
      // The container is already restored above, so a resize failure is
      // non-critical — the map will be functional on next interaction.
      try {
        mapRef.current?.resize()
      } catch {
        // Map may have been destroyed — container is already restored
      }
    },
    waitForIdle: (signal?: AbortSignal) => {
      return new Promise<boolean>((resolve, reject) => {
        const map = mapRef.current
        if (!map) { resolve(true); return }

        let settled = false
        let timeoutId: ReturnType<typeof setTimeout> | null = null

        const onAbort = () => {
          finishAbort()
        }

        const onIdle = () => {
          finish(true)
        }

        const finish = (didIdle: boolean) => {
          if (settled) return
          settled = true
          if (timeoutId != null) {
            clearTimeout(timeoutId)
          }
          map.off('idle', onIdle)
          signal?.removeEventListener('abort', onAbort)
          resolve(didIdle)
        }

        const finishAbort = () => {
          if (settled) return
          settled = true
          if (timeoutId != null) {
            clearTimeout(timeoutId)
          }
          map.off('idle', onIdle)
          signal?.removeEventListener('abort', onAbort)
          reject(new DOMException('Export cancelled', 'AbortError'))
        }

        timeoutId = setTimeout(() => finish(false), WAIT_FOR_IDLE_TIMEOUT_MS)

        if (signal?.aborted) {
          finishAbort()
          return
        }

        signal?.addEventListener('abort', onAbort, { once: true })

        if (!map.isMoving() && map.areTilesLoaded()) {
          finish(true)
          return
        }

        map.once('idle', onIdle)
      })
    },
  }))
  const addTrackLayers = useCallback((map: maplibregl.Map, track: Track) => {
    const routeGeometry = buildTrackGeometry(track.points, track.segmentStartIndices)
    const trailChunkCollection = buildTrailChunkFeatureCollection(trailChunksRef.current)
    const emptyLineGeometry: GeoJSON.LineString = { type: 'LineString', coordinates: [] }
    const cumulDist = cumulDistRef.current
    const currentResult = cumulDist.length === track.points.length && cumulDist.length > 0
      ? interpolateAlongTrack(track.points, cumulDist, progressRef.current, track.segmentStartIndices)
      : null
    const currentPoint = currentResult?.point ?? track.points[0]

    // Full route line
    if (map.getSource('route')) {
      (map.getSource('route') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: routeGeometry,
      })
    } else {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: routeGeometry,
        },
      })
    }
    if (!map.getLayer('route-line')) {
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ROUTE_COLOR,
          'line-width': 5,
          'line-opacity': 0.25,
        },
      })
    }

    // Trail (traveled portion)
    if (map.getSource(TRAIL_SOURCE)) {
      (map.getSource(TRAIL_SOURCE) as maplibregl.GeoJSONSource).setData(trailChunkCollection)
    } else {
      map.addSource(TRAIL_SOURCE, {
        type: 'geojson',
        data: trailChunkCollection,
      })
    }
    if (!map.getLayer(TRAIL_LAYER)) {
      map.addLayer({
        id: TRAIL_LAYER,
        type: 'line',
        source: TRAIL_SOURCE,
        filter: completedTrailFilter(-1),
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': TRAIL_COLOR,
          'line-width': 6,
          'line-opacity': 1,
        },
      })
    }
    if (map.getLayer(TRAIL_LAYER)) {
      map.setFilter(TRAIL_LAYER, completedTrailFilter(-1))
    }

    // Immutable completed chunks are published once per track/style load and
    // revealed by filter. Only the bounded current chunk changes each frame.
    if (map.getSource(TRAIL_HEAD_SOURCE)) {
      (map.getSource(TRAIL_HEAD_SOURCE) as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: emptyLineGeometry,
      })
    } else {
      map.addSource(TRAIL_HEAD_SOURCE, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: emptyLineGeometry,
        },
      })
    }
    if (!map.getLayer(TRAIL_HEAD_LAYER)) {
      map.addLayer({
        id: TRAIL_HEAD_LAYER,
        type: 'line',
        source: TRAIL_HEAD_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': TRAIL_COLOR,
          'line-width': 6,
          'line-opacity': 1,
        },
      })
    }

    if (map.getSource(POSITION_MARKER_SOURCE)) {
      (map.getSource(POSITION_MARKER_SOURCE) as maplibregl.GeoJSONSource).setData(markerPointFeature(currentPoint))
    } else {
      map.addSource(POSITION_MARKER_SOURCE, {
        type: 'geojson',
        data: markerPointFeature(currentPoint),
      })
    }
    if (!map.getLayer(POSITION_MARKER_LAYER)) {
      map.addLayer({
        id: POSITION_MARKER_LAYER,
        type: 'circle',
        source: POSITION_MARKER_SOURCE,
        paint: {
          'circle-radius': 7,
          'circle-color': MARKER_COLOR,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.95,
        },
      })
    }

    lastCompletedTrailChunkIndexRef.current = -1
    if (currentResult) {
      updateTrailSources(map, currentResult.segmentIndex, currentResult.point)
    }
  }, [updateTrailSources])

  const ensureMarker = useCallback((map: maplibregl.Map, startPoint: Track['points'][number]) => {
    if (!markerEl.current) {
      markerEl.current = document.createElement('div')
      const wrapper = document.createElement('div')
      Object.assign(wrapper.style, { position: 'relative', width: '20px', height: '20px' })
      const pulse = document.createElement('div')
      pulse.className = 'marker-pulse'
      Object.assign(pulse.style, { position: 'absolute', inset: '0', borderRadius: '50%', background: MARKER_COLOR, opacity: '0.3' })
      const dot = document.createElement('div')
      Object.assign(dot.style, { position: 'absolute', inset: '4px', borderRadius: '50%', background: MARKER_COLOR, border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' })
      wrapper.appendChild(pulse)
      wrapper.appendChild(dot)
      markerEl.current.appendChild(wrapper)
    }

    if (markerRef.current) {
      return
    }

    markerRef.current = new maplibregl.Marker({ element: markerEl.current })
      .setLngLat([startPoint.lng, startPoint.lat])
      .addTo(map)
  }, [])

  const isCurrentStyleRevision = useCallback((map: maplibregl.Map, styleRevision: number) => {
    return mapRef.current === map && requestedStyleRevisionRef.current === styleRevision
  }, [])

  const computeCurrentTargetCamera = useCallback((
    activeTrack: Track,
    result: ReturnType<typeof interpolateAlongTrack>,
  ): CameraState => {
    if (scenesRef.current && scenesRef.current.length > 0) {
      const elapsedSec = progressRef.current * durationRef.current
      return computeCameraForProgress(
        activeTrack,
        cumulDistRef.current,
        normalizedScenesRef.current,
        progressRef.current,
        elapsedSec,
        transitionDurationRef.current,
        true,
      )
    }

    return {
      center: [result.point.lng, result.point.lat],
      bearing: computeSegmentLocalBearing(
        activeTrack,
        cumulDistRef.current,
        result,
        LOOK_AHEAD_DISTANCE_METERS,
      ),
      pitch: 45,
      zoom: 13,
    }
  }, [])

  const hydrateCurrentStyle = useCallback((
    map: maplibregl.Map,
    styleRevision: number,
  ) => {
    if (
      !isCurrentStyleRevision(map, styleRevision)
      || loadedStyleRevisionRef.current !== styleRevision
      || !map.isStyleLoaded()
    ) {
      return false
    }

    const activeTrack = trackRef.current
    addReferenceGridLayers(map, styleKeyRef.current, referenceGridDataRef.current)
    if (activeTrack) {
      const cumulDist = cumulDistRef.current
      if (cumulDist.length === 0 || cumulDist.length !== activeTrack.points.length) {
        return false
      }

      addTrackLayers(map, activeTrack)
      if (!ownsTrackStyle(map)) {
        return false
      }

      const result = interpolateAlongTrack(
        activeTrack.points,
        cumulDist,
        progressRef.current,
        activeTrack.segmentStartIndices,
      )
      ensureMarker(map, result.point)
      markerRef.current?.setLngLat([result.point.lng, result.point.lat])
      const markerSource = map.getSource(POSITION_MARKER_SOURCE) as maplibregl.GeoJSONSource
      markerSource.setData(markerPointFeature(result.point))
      updateTrailSources(map, result.segmentIndex, result.point)

      if (followCameraRef.current && !suspendAutoCameraRef.current) {
        const targetCamera = computeCurrentTargetCamera(activeTrack, result)
        if (map.isMoving()) map.stop()
        map.jumpTo({
          center: targetCamera.center as [number, number],
          zoom: targetCamera.zoom,
          pitch: targetCamera.pitch,
          bearing: targetCamera.bearing,
        })
        lastCameraStateRef.current = targetCamera
        lastSeekNonceRef.current = seekNonceRef.current
      } else if (
        !followCameraRef.current
        && !suspendAutoCameraRef.current
        && retryCameraStateRef.current
      ) {
        const retryCameraState = retryCameraStateRef.current
        if (map.isMoving()) map.stop()
        map.jumpTo({
          center: retryCameraState.center as [number, number],
          zoom: retryCameraState.zoom,
          pitch: retryCameraState.pitch,
          bearing: retryCameraState.bearing,
        })
      } else if (fitTrackOnReadyRef.current === activeTrack) {
        map.fitBounds(buildFitBounds(activeTrack.points), { padding: 80, duration: 1000 })
      }

      if (fitTrackOnReadyRef.current === activeTrack) {
        fitTrackOnReadyRef.current = null
      }
    }

    retryCameraStateRef.current = null

    readyStyleRevisionRef.current = styleRevision
    setReadyStyleRevision(styleRevision)
    setMapError(null)
    return true
  }, [addTrackLayers, computeCurrentTargetCamera, ensureMarker, isCurrentStyleRevision, updateTrailSources])

  // Initialize a map generation and attach its style-ready listener before any
  // track effect can race the first local style load.
  useEffect(() => {
    if (!containerRef.current) return

    try {
      const initialStyleKey = styleKeyRef.current
      requestedStyleRevisionRef.current += 1
      const styleRevision = requestedStyleRevisionRef.current
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLES[initialStyleKey].url,
        center: [0, 20],
        zoom: 2,
        // preserveDrawingBuffer:true is required so that captureStream()/drawImage()
        // can read back the WebGL canvas during video export.  The trade-off is a
        // slight performance cost on every frame (the GPU must finish painting before
        // the buffer is preserved), but MapLibre's rendering workload is well within
        // budget on modern devices so the impact is negligible.
        canvasContextAttributes: { preserveDrawingBuffer: true },
      })

      mapRef.current = map
      styleKeyRef.current = initialStyleKey

      const onInitialStyleLoad = () => {
        if (!isCurrentStyleRevision(map, styleRevision)) {
          map.off('style.load', onInitialStyleLoad)
          return
        }
        loadedStyleRevisionRef.current = styleRevision
        if (hydrateCurrentStyle(map, styleRevision)) {
          map.off('style.load', onInitialStyleLoad)
        }
      }
      map.on('style.load', onInitialStyleLoad)

      map.addControl(new maplibregl.NavigationControl(), 'top-left')
      const onMapControlKeyDown = (event: KeyboardEvent) => {
        if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return
        if (!(event.target instanceof HTMLElement)) return
        if (!event.target.matches('summary.maplibregl-ctrl-attrib-button')) return

        // MapLibre's compact attribution summary does not synthesize its click
        // activation from keyboard input consistently. Preserve its own toggle
        // implementation while making the focused control keyboard operable.
        event.preventDefault()
        event.target.click()
      }
      map.getContainer().addEventListener('keydown', onMapControlKeyDown)

      onMapInstanceChange?.()

      const canExposeDebugCamera = process.env.NODE_ENV === 'development'
      if (canExposeDebugCamera) {
        const debugWindow = window as TravelbackDebugWindow
        debugWindow.__travelbackDebug = {
          getCamera: () => {
            const currentMap = mapRef.current
            if (!currentMap) return null
            const center = currentMap.getCenter()
            return {
              center: [center.lng, center.lat],
              zoom: currentMap.getZoom(),
              pitch: currentMap.getPitch(),
              bearing: currentMap.getBearing(),
            }
          },
          getMapState: () => {
            const currentMap = mapRef.current
            if (!currentMap) return null
            return {
              hasRouteSource: Boolean(currentMap.getSource('route')),
              hasTrailSource: Boolean(currentMap.getSource(TRAIL_SOURCE)),
              hasRouteLayer: Boolean(currentMap.getLayer('route-line')),
              hasTrailLayer: Boolean(currentMap.getLayer(TRAIL_LAYER)),
              hasMarker: Boolean(markerRef.current),
              hasExportMarkerLayer: Boolean(currentMap.getLayer(POSITION_MARKER_LAYER)),
              hasReferenceGridLayer: Boolean(currentMap.getLayer(REFERENCE_GRID_MINOR_LAYER) && currentMap.getLayer(REFERENCE_GRID_MAJOR_LAYER)),
            }
          },
          getPoseState: () => {
            const currentMap = mapRef.current
            if (!currentMap) return null
            const markerPosition = markerRef.current?.getLngLat()
            return {
              htmlMarkerPosition: markerPosition ? [markerPosition.lng, markerPosition.lat] : null,
              geoJsonMarkerPosition: readPositionMarkerSource(currentMap),
              trailHeadPosition: readTrailHeadPosition(currentMap),
              completedTrailChunkIndex: lastCompletedTrailChunkIndexRef.current,
              requestedStyleRevision: requestedStyleRevisionRef.current,
              readyStyleRevision: readyStyleRevisionRef.current,
            }
          },
        }
      }

      const onMapError = (e: { error?: Error | string }) => {
        if (mapRef.current !== map) return
        const message = e.error instanceof Error ? e.error.message : typeof e.error === 'string' ? e.error : 'Map failed to load'
        console.error('[Travelback] Map error:', message)
        setMapError(message)
      }
      map.on('error', onMapError)

      return () => {
        markerRef.current?.remove()
        markerRef.current = null
        if (markerEl.current) {
          markerEl.current.remove()
          markerEl.current = null
        }
        map.off('style.load', onInitialStyleLoad)
        map.getContainer().removeEventListener('keydown', onMapControlKeyDown)
        map.off('error', onMapError)
        if (mapRef.current === map) {
          mapRef.current = null
        }
        map.remove()
        if (canExposeDebugCamera) {
          const cleanupWindow = window as TravelbackDebugWindow
          delete cleanupWindow.__travelbackDebug
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize WebGL map'
      console.error('Failed to initialize map:', message)
      queueMicrotask(() => setMapError(message))
    }
  }, [hydrateCurrentStyle, isCurrentStyleRevision, mapRetryNonce, onMapInstanceChange])

  // Change map style. Each request owns a revision so a superseded callback
  // cannot attach route state to the current map/style.
  useEffect(() => {
    const map = mapRef.current
    if (!map || styleKeyRef.current === mapStyleKey) return

    styleKeyRef.current = mapStyleKey
    requestedStyleRevisionRef.current += 1
    const styleRevision = requestedStyleRevisionRef.current

    const removeReadyListeners = () => {
      map.off('style.load', onStyleLoad)
    }
    const onStyleLoad = () => {
      if (!isCurrentStyleRevision(map, styleRevision)) {
        removeReadyListeners()
        return
      }
      loadedStyleRevisionRef.current = styleRevision
      if (hydrateCurrentStyle(map, styleRevision)) {
        removeReadyListeners()
      }
    }

    map.on('style.load', onStyleLoad)
    map.setStyle(MAP_STYLES[mapStyleKey].url)

    return removeReadyListeners
  }, [hydrateCurrentStyle, isCurrentStyleRevision, mapRetryNonce, mapStyleKey])

  // Load track onto map
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const styleRevision = requestedStyleRevisionRef.current

    if (!track) {
      removeTrackArtifacts(map)
      markerRef.current?.remove()
      markerRef.current = null
      lastCameraStateRef.current = null
      cumulDistRef.current = []
      trailChunksRef.current = []
      lastCompletedTrailChunkIndexRef.current = -1
      fitTrackOnReadyRef.current = null
      preparedTrackRef.current = null
      retryCameraStateRef.current = null
    } else {
      const isNewTrack = preparedTrackRef.current !== track
      cumulDistRef.current = cumulativeDistancesProp ?? []
      trailChunksRef.current = buildTrailChunks(precomputeWrappedSegments(track.points, track.segmentStartIndices))
      lastCompletedTrailChunkIndexRef.current = -1
      if (isNewTrack) {
        fitTrackOnReadyRef.current = track
        retryCameraStateRef.current = null
      }
      preparedTrackRef.current = track
    }

    if (isCurrentStyleRevision(map, styleRevision) && map.isStyleLoaded()) {
      loadedStyleRevisionRef.current = styleRevision
      hydrateCurrentStyle(map, styleRevision)
    }
  }, [
    cumulativeDistancesProp,
    hydrateCurrentStyle,
    isCurrentStyleRevision,
    mapRetryNonce,
    track,
  ])

  useEffect(() => {
    if (!followCamera || suspendAutoCamera) {
      lastCameraStateRef.current = null
    }
  }, [followCamera, suspendAutoCamera, track])

  // Update animation state
  useEffect(() => {
    // During export, all visual updates (camera, trail, marker) are handled
    // imperatively by renderFrameAndWait to avoid React re-render overhead.
    // Skip this React-driven effect entirely during export.
    if (isExporting) return

    const map = mapRef.current
    if (!map || !track || cumulDistRef.current.length === 0 || cumulDistRef.current.length !== track.points.length) return
    // A slow or failed replacement request can leave the outgoing style fully
    // usable. Continue animating that owned style until a newer style is
    // hydrated instead of freezing solely because a request is pending.
    if (!ownsTrackStyle(map)) return

    ensureMarker(map, track.points[0])

    const result = interpolateAlongTrack(track.points, cumulDistRef.current, progress, track.segmentStartIndices)
    const { point, segmentIndex } = result

    // Update marker position
    markerRef.current?.setLngLat([point.lng, point.lat])
    const markerSource = map.getSource(POSITION_MARKER_SOURCE) as maplibregl.GeoJSONSource | undefined
    markerSource?.setData(markerPointFeature(point))

    updateTrailSources(map, segmentIndex, point)

    // Camera follow - use scene-based camera if scenes exist, otherwise basic follow
    if (followCamera && !suspendAutoCamera) {
      const targetCamera = computeCurrentTargetCamera(track, result)

      const previousCameraState = lastCameraStateRef.current
      const explicitSeek = seekNonce !== lastSeekNonceRef.current
      const snapForLargeCenterJump = previousCameraState
        ? centerDistanceMeters(previousCameraState.center, targetCamera.center) > SEEK_SNAP_DISTANCE_METERS
        : false
      const snapForLargeBearingJump = previousCameraState
        ? angleDelta(previousCameraState.bearing, targetCamera.bearing) > SEEK_SNAP_BEARING_DEGREES
        : false

      const hasSceneCamera = Boolean(scenesRef.current && scenesRef.current.length > 0)
      const canSmoothCamera = Boolean(
        previousCameraState
        && !explicitSeek
        && !snapForLargeCenterJump
        && !snapForLargeBearingJump,
      )
      const smoothingFactor = hasSceneCamera ? SCENE_CAMERA_SMOOTHING : CAMERA_SMOOTHING
      const bearingSmoothingFactor = hasSceneCamera ? SCENE_CAMERA_SMOOTHING : BEARING_SMOOTHING
      const cameraState = canSmoothCamera && previousCameraState
        ? smoothCameraState(previousCameraState, targetCamera, smoothingFactor, bearingSmoothingFactor)
        : targetCamera

      const shouldApplyCamera = !previousCameraState
        || centerDistanceMeters(previousCameraState.center, cameraState.center) > MIN_CAMERA_MOVE_METERS
        || angleDelta(previousCameraState.bearing, cameraState.bearing) > MIN_CAMERA_BEARING_DELTA
        || Math.abs(previousCameraState.zoom - cameraState.zoom) > MIN_CAMERA_ZOOM_DELTA
        || Math.abs(previousCameraState.pitch - cameraState.pitch) > MIN_CAMERA_PITCH_DELTA

      if (shouldApplyCamera) {
        if ((explicitSeek || !previousCameraState || snapForLargeCenterJump || snapForLargeBearingJump) && map.isMoving()) {
          map.stop()
        }
        map.jumpTo({
          center: cameraState.center as [number, number],
          zoom: cameraState.zoom,
          pitch: cameraState.pitch,
          bearing: cameraState.bearing,
        })
        lastCameraStateRef.current = cameraState
      }

      lastSeekNonceRef.current = seekNonce
    } else {
      lastCameraStateRef.current = null
      lastSeekNonceRef.current = seekNonce
    }
  }, [progress, track, followCamera, suspendAutoCamera, seekNonce, cumulativeDistancesProp, isExporting, mapRetryNonce, readyStyleRevision, computeCurrentTargetCamera, ensureMarker, updateTrailSources])

  return (
    <div
      ref={containerRef}
      data-testid="map-container"
      className={`absolute inset-0${!track ? ' hide-map-controls' : ' map-has-track-controls'}`}
      aria-hidden={!track && !mapError && !allowInteractionWithoutTrack}
      aria-label={!track && !mapError && !allowInteractionWithoutTrack ? t('app.mapWaiting') : undefined}
    >
      {mapError && (
        <div className="pointer-events-none absolute left-4 right-4 top-4 z-30 flex justify-center">
          <div data-testid="map-error" role="alert" className="gc pointer-events-auto w-full max-w-lg text-sm p-4 text-center shadow-lg" style={{ color: 'var(--t3)' }}>
            <p>{t('app.mapLoadFailed')}</p>
            <details className="mt-2 text-xs" style={{ color: 'var(--t4)' }}>
              <summary className="cursor-pointer" style={{ color: 'var(--t5, var(--t4))' }}>{t('app.showTechnicalDetails')}</summary>
              <pre className="mt-1 text-left whitespace-pre-wrap break-all opacity-70">{mapError}</pre>
            </details>
            <button type="button" onClick={() => window.location.reload()} className="gi mt-4 min-h-11 px-4 py-2 text-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]" style={{ color: 'var(--t1)' }}>
              {t('error.reloadPage')}
            </button>
            <button
              type="button"
              onClick={() => {
                const activeTrack = trackRef.current
                if (activeTrack && !retryCameraStateRef.current) {
                  const currentMap = mapRef.current
                  if (currentMap) {
                    const center = currentMap.getCenter()
                    retryCameraStateRef.current = {
                      center: [center.lng, center.lat],
                      zoom: currentMap.getZoom(),
                      pitch: currentMap.getPitch(),
                      bearing: currentMap.getBearing(),
                    }
                  } else {
                    fitTrackOnReadyRef.current = activeTrack
                  }
                }
                setMapError(null)
                setMapRetryNonce((nonce) => nonce + 1)
              }}
              className="vitro-btn-primary mt-2 min-h-11 px-4 py-2 text-sm cursor-pointer"
            >
              {t('app.retryMap')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

export default MapView
