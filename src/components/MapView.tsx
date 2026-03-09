'use client'

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import maplibregl from 'maplibre-gl'
import type { Track, MapStyleKey, Scene } from '@/types'
import { MAP_STYLES } from '@/types'
import { interpolateAlongTrack, computeCumulativeDistances, computeBearing } from '@/lib/interpolate'
import { computeCameraForProgress } from '@/lib/camera'
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
}

export interface MapViewHandle {
  getMap: () => maplibregl.Map | null
  getCanvas: () => HTMLCanvasElement | null
  applyCameraState: (state: CameraState) => void
  resize: (width: number, height: number) => void
  resetSize: () => void
  waitForIdle: (signal?: AbortSignal) => Promise<void>
}

const ROUTE_COLOR = '#06b6d4'
const TRAIL_COLOR = '#f97316'
const MARKER_COLOR = '#ef4444'
const LOOK_AHEAD_DISTANCE_METERS = 120
const CAMERA_SMOOTHING = 0.2
const SCENE_CAMERA_SMOOTHING = 0.34
const SEEK_SNAP_DISTANCE_METERS = 2500
const SEEK_SNAP_BEARING_DEGREES = 120
const WAIT_FOR_IDLE_TIMEOUT_MS = 5000
const MIN_CAMERA_MOVE_METERS = 0.5
const MIN_CAMERA_BEARING_DELTA = 0.75
const MIN_CAMERA_ZOOM_DELTA = 0.01
const MIN_CAMERA_PITCH_DELTA = 0.1

function smoothAngle(from: number, to: number, factor: number): number {
  const diff = ((to - from + 540) % 360) - 180
  return from + diff * factor
}

function angleDelta(from: number, to: number): number {
  return Math.abs(((to - from + 540) % 360) - 180)
}

function centerDistanceMeters(a: [number, number], b: [number, number]): number {
  const avgLatRad = ((a[1] + b[1]) / 2) * (Math.PI / 180)
  const dLngMeters = (b[0] - a[0]) * 111320 * Math.cos(avgLatRad)
  const dLatMeters = (b[1] - a[1]) * 110540
  return Math.hypot(dLngMeters, dLatMeters)
}

function smoothCameraState(previous: CameraState, target: CameraState, factor: number): CameraState {
  return {
    center: [
      previous.center[0] + (target.center[0] - previous.center[0]) * factor,
      previous.center[1] + (target.center[1] - previous.center[1]) * factor,
    ],
    zoom: previous.zoom + (target.zoom - previous.zoom) * factor,
    pitch: previous.pitch + (target.pitch - previous.pitch) * factor,
    bearing: smoothAngle(previous.bearing, target.bearing, factor),
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

  useEffect(() => {
    trackRef.current = track
  }, [track])

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
      return new Promise<void>(resolve => {
        const map = mapRef.current
        if (!map) { resolve(); return }

        let settled = false
        let timeoutId: ReturnType<typeof setTimeout> | null = null

        const onAbort = () => {
          finish()
        }

        const onIdle = () => {
          finish()
        }

        const finish = () => {
          if (settled) return
          settled = true
          if (timeoutId != null) {
            clearTimeout(timeoutId)
          }
          map.off('idle', onIdle)
          signal?.removeEventListener('abort', onAbort)
          resolve()
        }

        timeoutId = setTimeout(finish, WAIT_FOR_IDLE_TIMEOUT_MS)

        if (signal?.aborted) {
          finish()
          return
        }

        signal?.addEventListener('abort', onAbort, { once: true })

        if (!map.isMoving() && map.areTilesLoaded()) {
          finish()
          return
        }

        map.once('idle', onIdle)
      })
    },
  }))

  const [mapError, setMapError] = useState<string | null>(null)

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLES[mapStyleKey].url,
        center: [0, 20],
        zoom: 2,
        canvasContextAttributes: { preserveDrawingBuffer: true },
      })

      map.addControl(new maplibregl.NavigationControl(), 'top-left')

      mapRef.current = map
      styleKeyRef.current = mapStyleKey

      const canExposeDebugCamera = navigator.webdriver
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
            }
          },
        }
      }

      const onGlobalStyleLoad = () => {
        const activeTrack = trackRef.current
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
      console.error('Failed to initialize map:', err)
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
    if (track) {
      styleHandler = () => addTrackLayers(map, track)
      map.once('style.load', styleHandler)
    }
    return () => {
      if (styleHandler) map.off('style.load', styleHandler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyleKey, track])

  const addTrackLayers = useCallback((map: maplibregl.Map, t: Track) => {
    const coords = t.points.map((p) => [p.lng, p.lat] as [number, number])

    // Full route line
    if (map.getSource('route')) {
      (map.getSource('route') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      })
    } else {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
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
          'line-opacity': 0.75,
        },
      })
    }

    // Trail (traveled portion)
    if (map.getSource('trail')) {
      (map.getSource('trail') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords.slice(0, 1) },
      })
    } else {
      map.addSource('trail', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords.slice(0, 1) },
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
    if (!map || !track) return

    cumulDistRef.current = computeCumulativeDistances(track.points)

    const onStyleLoad = () => {
      addTrackLayers(map, track)

      // Fit map to track bounds
      const bounds = new maplibregl.LngLatBounds()
      for (const p of track.points) {
        bounds.extend([p.lng, p.lat])
      }
      map.fitBounds(bounds, { padding: 80, duration: 1000 })
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      ensureMarker(map, track.points[0])
    }

    if (map.isStyleLoaded()) {
      onStyleLoad()
    } else {
      map.once('style.load', onStyleLoad)
    }
    return () => {
      // Clean up pending style.load listener if component re-renders before it fires
      map.off('style.load', onStyleLoad)
    }
  }, [track, addTrackLayers, ensureMarker])

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
    const trailCoords = track.points
      .slice(0, segmentIndex + 1)
      .map((p) => [p.lng, p.lat] as [number, number])
    trailCoords.push([point.lng, point.lat])

    const trailSource = map.getSource('trail') as maplibregl.GeoJSONSource | undefined
    trailSource?.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: trailCoords },
    })

    // Camera follow - use scene-based camera if scenes exist, otherwise basic follow
    if (followCamera && !suspendAutoCamera && progress > 0) {
      let targetCamera: CameraState

      if (scenes && scenes.length > 0) {
        const elapsedSec = progress * duration
        targetCamera = computeCameraForProgress(
          track, cumulDistRef.current, scenes, progress, elapsedSec, transitionDuration,
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
          bearing: smoothAngle(result.bearing, lookAheadBearing, 0.35),
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

      const hasSceneCamera = Boolean(scenes && scenes.length > 0)
      const canSmoothCamera = Boolean(
        previousCameraState
        && !explicitSeek
        && !snapForLargeCenterJump
        && !snapForLargeBearingJump,
      )
      const smoothingFactor = hasSceneCamera ? SCENE_CAMERA_SMOOTHING : CAMERA_SMOOTHING
      const cameraState = canSmoothCamera && previousCameraState
        ? smoothCameraState(previousCameraState, targetCamera, smoothingFactor)
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
  }, [progress, track, followCamera, suspendAutoCamera, seekNonce, scenes, duration, transitionDuration, addTrackLayers, ensureMarker])

  return (
    <div ref={containerRef} data-testid="map-container" className={`absolute inset-0${!track ? ' hide-map-controls' : ' map-has-track-controls'}`}>
      {mapError && (
        <div data-testid="map-error" className="flex items-center justify-center h-full text-sm p-4 text-center" style={{ background: 'var(--bg)', color: 'var(--t3)' }}>
          <p>{t('app.mapLoadFailed').replace('{error}', mapError)}</p>
        </div>
      )}
    </div>
  )
})

export default MapView
