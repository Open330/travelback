'use client'

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import maplibregl from 'maplibre-gl'
import type { Track, TrackPoint, MapStyleKey, Scene } from '@/types'
import { MAP_STYLES } from '@/types'
import { interpolateAlongTrack, computeCumulativeDistances, computeBearing } from '@/lib/interpolate'
import { computeCameraForProgress, normalizeScenes } from '@/lib/camera'
import type { CameraState } from '@/lib/camera'
import { useLocale } from '@/lib/i18n'

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
}

export interface MapViewHandle {
  getMap: () => maplibregl.Map | null
  getCanvas: () => HTMLCanvasElement | null
  applyCameraState: (state: CameraState) => void
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
const SCENE_CAMERA_SMOOTHING = 0.34
const SEEK_SNAP_DISTANCE_METERS = 2500
const SEEK_SNAP_BEARING_DEGREES = 120
const WAIT_FOR_IDLE_TIMEOUT_MS = 5000
const MIN_CAMERA_MOVE_METERS = 0.5
const MIN_CAMERA_BEARING_DELTA = 0.75
const MIN_CAMERA_ZOOM_DELTA = 0.01
const MIN_CAMERA_PITCH_DELTA = 0.1
const REFERENCE_GRID_SOURCE = 'reference-grid'
const REFERENCE_GRID_MINOR_LAYER = 'reference-grid-minor'
const REFERENCE_GRID_MAJOR_LAYER = 'reference-grid-major'

const GRID_PAINT_BY_STYLE: Record<MapStyleKey, { minor: string; major: string }> = {
  voyager: { minor: 'rgba(120, 130, 120, 0.22)', major: 'rgba(120, 130, 120, 0.38)' },
  positron: { minor: 'rgba(140, 140, 140, 0.2)', major: 'rgba(120, 120, 120, 0.34)' },
  dark: { minor: 'rgba(148, 163, 184, 0.26)', major: 'rgba(148, 163, 184, 0.46)' },
  liberty: { minor: 'rgba(139, 116, 93, 0.2)', major: 'rgba(139, 116, 93, 0.34)' },
  bright: { minor: 'rgba(173, 150, 120, 0.22)', major: 'rgba(173, 150, 120, 0.38)' },
}

function shortestLongitudeDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180
}

function smoothAngle(from: number, to: number, factor: number): number {
  const diff = ((to - from + 540) % 360) - 180
  return from + diff * factor
}

function angleDelta(from: number, to: number): number {
  return Math.abs(((to - from + 540) % 360) - 180)
}

function centerDistanceMeters(a: [number, number], b: [number, number]): number {
  const avgLatRad = ((a[1] + b[1]) / 2) * (Math.PI / 180)
  const dLngMeters = shortestLongitudeDelta(a[0], b[0]) * 111320 * Math.cos(avgLatRad)
  const dLatMeters = (b[1] - a[1]) * 110540
  return Math.hypot(dLngMeters, dLatMeters)
}

function smoothCameraState(previous: CameraState, target: CameraState, factor: number, bearingFactor?: number): CameraState {
  const lngResult = ((previous.center[0] + shortestLongitudeDelta(previous.center[0], target.center[0]) * factor + 180) % 360 + 360) % 360 - 180
  return {
    center: [
      lngResult,
      previous.center[1] + (target.center[1] - previous.center[1]) * factor,
    ],
    zoom: previous.zoom + (target.zoom - previous.zoom) * factor,
    pitch: previous.pitch + (target.pitch - previous.pitch) * factor,
    bearing: smoothAngle(previous.bearing, target.bearing, bearingFactor ?? factor),
  }
}

function normalizeSegmentStarts(pointCount: number, segmentStartIndices: number[] = []): number[] {
  return [...new Set(
    segmentStartIndices
      .filter((index) => Number.isInteger(index) && index > 0 && index < pointCount)
      .sort((a, b) => a - b)
  )]
}

function buildSegmentRanges(pointCount: number, segmentStartIndices: number[] = []): Array<{ start: number; end: number }> {
  const starts = [0, ...normalizeSegmentStarts(pointCount, segmentStartIndices)]
  return starts.map((start, index) => ({
    start,
    end: (starts[index + 1] ?? pointCount) - 1,
  }))
}

function buildTrackGeometry(
  points: Track['points'],
  segmentStartIndices: number[] = [],
  uptoIndex?: number,
  interpolatedPoint?: TrackPoint,
): GeoJSON.LineString | GeoJSON.MultiLineString {
  const wrapLngNear = (referenceLng: number, nextLng: number) => {
    let adjusted = nextLng
    while (adjusted - referenceLng > 180) adjusted -= 360
    while (adjusted - referenceLng < -180) adjusted += 360
    return adjusted
  }

  const buildWrappedCoordinates = (segmentPoints: TrackPoint[]) => {
    const coordinates: [number, number][] = []
    for (const point of segmentPoints) {
      const previous = coordinates[coordinates.length - 1]
      const lng = previous ? wrapLngNear(previous[0], point.lng) : point.lng
      coordinates.push([lng, point.lat])
    }
    return coordinates
  }

  const ranges = buildSegmentRanges(points.length, segmentStartIndices)
  const segments: [number, number][][] = []

  for (const range of ranges) {
    if (uptoIndex != null && range.start > uptoIndex) break

    const basePoints = points.slice(
      range.start,
      uptoIndex != null ? Math.min(range.end, uptoIndex) + 1 : range.end + 1,
    )
    const segmentPoints = buildWrappedCoordinates(basePoints)

    if (uptoIndex != null && range.start <= uptoIndex && uptoIndex <= range.end && interpolatedPoint) {
      const previous = segmentPoints[segmentPoints.length - 1]
      const lng = previous ? wrapLngNear(previous[0], interpolatedPoint.lng) : interpolatedPoint.lng
      segmentPoints.push([lng, interpolatedPoint.lat])
    }

    if (segmentPoints.length === 1) {
      segmentPoints.push([...segmentPoints[0]] as [number, number])
    }

    if (segmentPoints.length >= 2) {
      segments.push(segmentPoints)
    }
  }

  if (segments.length <= 1) {
    return {
      type: 'LineString',
      coordinates: segments[0] ?? buildWrappedCoordinates(points.slice(0, 1)),
    }
  }

  return {
    type: 'MultiLineString',
    coordinates: segments,
  }
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
  // map shows a reasonable view instead.
  const DEGENERATE_PADDING = 0.01
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
  if (map.getLayer('trail-line')) map.removeLayer('trail-line')
  if (map.getLayer('route-line')) map.removeLayer('route-line')
  if (map.getSource('trail')) map.removeSource('trail')
  if (map.getSource('route')) map.removeSource('route')
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

  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  for (const point of track.points) {
    minLng = Math.min(minLng, point.lng)
    maxLng = Math.max(maxLng, point.lng)
    minLat = Math.min(minLat, point.lat)
    maxLat = Math.max(maxLat, point.lat)
  }

  const span = Math.max(maxLng - minLng, maxLat - minLat, 0.01)
  const step = chooseReferenceGridStep(span)
  const majorEvery = 5
  const lngMargin = Math.max(span * 1.5, step * 4)
  const latMargin = Math.max(span * 1.5, step * 4)
  const expandedMinLng = Math.max(-180, minLng - lngMargin)
  const expandedMaxLng = Math.min(180, maxLng + lngMargin)
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

function addReferenceGridLayers(map: maplibregl.Map, mapStyleKey: MapStyleKey, track?: Track | null) {
  if (!map.isStyleLoaded()) return

  const gridPaint = GRID_PAINT_BY_STYLE[mapStyleKey]
  const gridData = buildReferenceGridData(track)

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
      hasReferenceGridLayer: boolean
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
  },
  ref,
) {
  const { t } = useLocale()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerEl = useRef<HTMLDivElement | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const cumulDistRef = useRef<number[]>([])
  const trackRef = useRef<Track | null>(track)
  const styleKeyRef = useRef<MapStyleKey>(mapStyleKey)
  const originalSizeRef = useRef<{ width: number; height: number } | null>(null)
  const lastCameraStateRef = useRef<CameraState | null>(null)
  const lastSeekNonceRef = useRef(seekNonce)
  const scenesRef = useRef(scenes)
  const normalizedScenesRef = useRef<Scene[]>([])
  const durationRef = useRef(duration)
  const transitionDurationRef = useRef(transitionDuration)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    scenesRef.current = scenes
    normalizedScenesRef.current = normalizeScenes(scenes ?? [])
  }, [scenes])
  useEffect(() => {
    durationRef.current = duration
    transitionDurationRef.current = transitionDuration
  }, [duration, transitionDuration])

  useEffect(() => {
    trackRef.current = track
  }, [track])
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (!track && !mapError) {
      container.setAttribute('inert', '')
      container.setAttribute('aria-hidden', 'true')
      return
    }

    container.removeAttribute('inert')
    container.removeAttribute('aria-hidden')
  }, [mapError, track])


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
    clearTrackArtifacts: () => {
      const map = mapRef.current
      if (!map) return
      removeTrackArtifacts(map)
      markerRef.current?.remove()
      markerRef.current = null
      lastCameraStateRef.current = null
      cumulDistRef.current = []
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
      const map = mapRef.current
      const container = containerRef.current
      if (!map || !container) return
      container.style.width = ''
      container.style.height = ''
      originalSizeRef.current = null
      map.resize()
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
  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLES[mapStyleKey].url,
        center: [0, 20],
        zoom: 2,
        // preserveDrawingBuffer:true is required so that captureStream()/drawImage()
        // can read back the WebGL canvas during video export.  The trade-off is a
        // slight performance cost on every frame (the GPU must finish painting before
        // the buffer is preserved), but MapLibre's rendering workload is well within
        // budget on modern devices so the impact is negligible.
        canvasContextAttributes: { preserveDrawingBuffer: true },
      })

      map.addControl(new maplibregl.NavigationControl(), 'top-left')

      mapRef.current = map
      styleKeyRef.current = mapStyleKey

      const debugParams = new URLSearchParams(window.location.search)
      let debugStorageEnabled = false
      try {
        debugStorageEnabled = window.localStorage.getItem('travelback-debug') === '1'
      } catch {
        debugStorageEnabled = false
      }
      const canExposeDebugCamera =
        process.env.NODE_ENV === 'development'
        || debugParams.get('__travelbackDebug') === '1'
        || debugStorageEnabled
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
              hasTrailSource: Boolean(currentMap.getSource('trail')),
              hasRouteLayer: Boolean(currentMap.getLayer('route-line')),
              hasTrailLayer: Boolean(currentMap.getLayer('trail-line')),
              hasMarker: Boolean(markerRef.current),
              hasReferenceGridLayer: Boolean(currentMap.getLayer(REFERENCE_GRID_MINOR_LAYER) && currentMap.getLayer(REFERENCE_GRID_MAJOR_LAYER)),
            }
          },
        }
      }

      const onGlobalStyleLoad = () => {
        const activeTrack = trackRef.current
        addReferenceGridLayers(map, styleKeyRef.current, activeTrack)
        if (!activeTrack) return
        addTrackLayers(map, activeTrack)
      }
      map.on('style.load', onGlobalStyleLoad)

      return () => {
        markerRef.current?.remove()
        markerRef.current = null
        if (markerEl.current) {
          markerEl.current.remove()
          markerEl.current = null
        }
        map.off('style.load', onGlobalStyleLoad)
        map.remove()
        mapRef.current = null
        lastCameraStateRef.current = null
        if (canExposeDebugCamera) {
          const cleanupWindow = window as TravelbackDebugWindow
          delete cleanupWindow.__travelbackDebug
        }
      }
    } catch (err) {
      console.error('Failed to initialize map:', err instanceof Error ? err.message : 'Unknown error')
      setMapError(err instanceof Error ? err.message : 'Failed to initialize WebGL map')
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Change map style
  useEffect(() => {
    const map = mapRef.current
    if (!map || styleKeyRef.current === mapStyleKey) return
    styleKeyRef.current = mapStyleKey

    map.setStyle(MAP_STYLES[mapStyleKey].url)

    // Re-add sources/layers after style loads
    let styleHandler: (() => void) | null = null
    styleHandler = () => {
      const currentTrack = trackRef.current
      addReferenceGridLayers(map, mapStyleKey, currentTrack)
      if (currentTrack) {
        addTrackLayers(map, currentTrack)
      }
    }
    map.once('style.load', styleHandler)
    return () => {
      if (styleHandler) map.off('style.load', styleHandler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyleKey, track])

  const addTrackLayers = useCallback((map: maplibregl.Map, track: Track) => {
    const routeGeometry = buildTrackGeometry(track.points, track.segmentStartIndices)
    const initialTrailGeometry = buildTrackGeometry(track.points, track.segmentStartIndices, 0, track.points[0])

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
    if (map.getSource('trail')) {
      (map.getSource('trail') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: initialTrailGeometry,
      })
    } else {
      map.addSource('trail', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: initialTrailGeometry,
        },
      })
      map.addLayer({
        id: 'trail-line',
        type: 'line',
        source: 'trail',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': TRAIL_COLOR,
          'line-width': 6,
          'line-opacity': 1,
        },
      })
    }
  }, [])

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

  // Load track onto map
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!track) {
      addReferenceGridLayers(map, styleKeyRef.current, null)
      removeTrackArtifacts(map)
      markerRef.current?.remove()
      markerRef.current = null
      lastCameraStateRef.current = null
      cumulDistRef.current = []
      return
    }

    cumulDistRef.current = cumulativeDistancesProp?.length
      ? cumulativeDistancesProp
      : computeCumulativeDistances(track.points, track.segmentStartIndices)

    const attachTrackToReadyStyle = () => {
      if (!map.isStyleLoaded()) {
        return false
      }

      addReferenceGridLayers(map, styleKeyRef.current, track)
      addTrackLayers(map, track)

      // Fit map to track bounds
      const bounds = buildFitBounds(track.points)
      map.fitBounds(bounds, { padding: 80, duration: 1000 })
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      ensureMarker(map, track.points[0])
      return true
    }

    const onStyleReady = () => {
      if (!attachTrackToReadyStyle()) {
        return
      }

      map.off('style.load', onStyleReady)
      map.off('styledata', onStyleReady)
      map.off('idle', onStyleReady)
    }

    if (!attachTrackToReadyStyle()) {
      map.on('style.load', onStyleReady)
      map.on('styledata', onStyleReady)
      map.on('idle', onStyleReady)
    }

    return () => {
      map.off('style.load', onStyleReady)
      map.off('styledata', onStyleReady)
      map.off('idle', onStyleReady)
    }
  }, [track, addTrackLayers, ensureMarker, cumulativeDistancesProp])

  useEffect(() => {
    if (!followCamera || suspendAutoCamera) {
      lastCameraStateRef.current = null
    }
  }, [followCamera, suspendAutoCamera, track])

  // Update animation state
  useEffect(() => {
    const map = mapRef.current
    if (!map || !track || cumulDistRef.current.length === 0) return

    if (map.isStyleLoaded() && (!map.getLayer('route-line') || !map.getLayer('trail-line'))) {
      addTrackLayers(map, track)
    }

    ensureMarker(map, track.points[0])

    const result = interpolateAlongTrack(track.points, cumulDistRef.current, progress)
    const { point, segmentIndex } = result

    // Update marker position
    markerRef.current?.setLngLat([point.lng, point.lat])

    // Update trail
    const trailSource = map.getSource('trail') as maplibregl.GeoJSONSource | undefined
    trailSource?.setData({
      type: 'Feature',
      properties: {},
      geometry: buildTrackGeometry(track.points, track.segmentStartIndices, segmentIndex, point),
    })

    // Camera follow - use scene-based camera if scenes exist, otherwise basic follow
    if (followCamera && !suspendAutoCamera && progress > 0) {
      let targetCamera: CameraState

      if (scenesRef.current && scenesRef.current.length > 0) {
        const elapsedSec = progress * durationRef.current
        targetCamera = computeCameraForProgress(
          track, cumulDistRef.current, normalizedScenesRef.current, progress, elapsedSec, transitionDurationRef.current, true,
        )
      } else {
        const totalDistance = cumulDistRef.current[cumulDistRef.current.length - 1] ?? 0
        const lookAheadDistance = Math.min(totalDistance, result.distanceTraveled + LOOK_AHEAD_DISTANCE_METERS)
        let lookAheadIdx = Math.min(segmentIndex + 1, track.points.length - 1)
        while (lookAheadIdx < track.points.length - 1 && cumulDistRef.current[lookAheadIdx] < lookAheadDistance) {
          lookAheadIdx += 1
        }

        const lookAheadPoint = track.points[lookAheadIdx]
        const fallbackPoint = track.points[Math.min(segmentIndex + 1, track.points.length - 1)]
        const lookAheadIsDistinct = lookAheadPoint.lng !== point.lng || lookAheadPoint.lat !== point.lat
        const fallbackIsDistinct = fallbackPoint.lng !== point.lng || fallbackPoint.lat !== point.lat
        const lookAheadBearing =
          lookAheadIsDistinct
            ? computeBearing(point, lookAheadPoint)
            : fallbackIsDistinct
              ? computeBearing(point, fallbackPoint)
              : result.bearing

        targetCamera = {
          center: [point.lng, point.lat],
          bearing: lookAheadBearing,
          pitch: 45,
          zoom: 13,
        }
      }

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
      }

      lastCameraStateRef.current = cameraState
      lastSeekNonceRef.current = seekNonce
    } else {
      lastCameraStateRef.current = null
      lastSeekNonceRef.current = seekNonce
    }
  }, [progress, track, followCamera, suspendAutoCamera, seekNonce, addTrackLayers, ensureMarker])

  return (
    <div
      ref={containerRef}
      data-testid="map-container"
      className={`absolute inset-0${!track ? ' hide-map-controls' : ' map-has-track-controls'}`}
      aria-hidden={!track && !mapError}
    >
      {mapError && (
        <div data-testid="map-error" role="alert" className="flex flex-col items-center justify-center h-full text-sm p-4 text-center" style={{ background: 'var(--bg)', color: 'var(--t3)' }}>
          <p>{t('app.mapLoadFailed')}</p>
          <details className="mt-2 text-xs" style={{ color: 'var(--t4)' }}>
            <summary className="cursor-pointer" style={{ color: 'var(--t5, var(--t4))' }}>{t('app.showTechnicalDetails')}</summary>
            <pre className="mt-1 text-left whitespace-pre-wrap break-all opacity-70">{mapError}</pre>
          </details>
          <button onClick={() => window.location.reload()} className="gi mt-4 px-4 py-2 text-sm cursor-pointer" style={{ color: 'var(--t1)' }}>
            {t('error.reloadPage')}
          </button>
        </div>
      )}
    </div>
  )
})

export default MapView
