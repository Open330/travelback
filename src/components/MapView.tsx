'use client'

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import maplibregl from 'maplibre-gl'
import type { Track, MapStyleKey, Scene } from '@/types'
import { interpolateAlongTrack, computeCumulativeDistances, computeBearing } from '@/lib/interpolate'
import { computeCameraForProgress } from '@/lib/camera'
import type { CameraState } from '@/lib/camera'

interface MapViewProps {
  track: Track | null
  progress: number
  mapStyleKey: MapStyleKey
  followCamera: boolean
  scenes?: Scene[]
}

export interface MapViewHandle {
  getMap: () => maplibregl.Map | null
  getCanvas: () => HTMLCanvasElement | null
  applyCameraState: (state: CameraState) => void
  resize: (width: number, height: number) => void
  resetSize: () => void
  waitForIdle: () => Promise<void>
}

const ROUTE_COLOR = '#06b6d4'
const TRAIL_COLOR = '#f97316'
const MARKER_COLOR = '#ef4444'

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { track, progress, mapStyleKey, followCamera, scenes },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerEl = useRef<HTMLDivElement | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const cumulDistRef = useRef<number[]>([])
  const styleKeyRef = useRef<MapStyleKey>(mapStyleKey)
  const originalSizeRef = useRef<{ width: number; height: number } | null>(null)

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
    waitForIdle: () => {
      return new Promise<void>(resolve => {
        const map = mapRef.current
        if (!map) { resolve(); return }
        if (!map.isMoving() && map.areTilesLoaded()) {
          resolve()
        } else {
          map.once('idle', () => resolve())
        }
      })
    },
  }))

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://basemaps.cartocdn.com/gl/${mapStyleKey === 'dark' ? 'dark-matter' : mapStyleKey === 'positron' ? 'positron' : 'voyager'}-gl-style/style.json`,
      center: [0, 20],
      zoom: 2,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    mapRef.current = map
    styleKeyRef.current = mapStyleKey

    return () => {
      map.remove()
      mapRef.current = null
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Change map style
  useEffect(() => {
    const map = mapRef.current
    if (!map || styleKeyRef.current === mapStyleKey) return
    styleKeyRef.current = mapStyleKey

    const styleUrl = `https://basemaps.cartocdn.com/gl/${mapStyleKey === 'dark' ? 'dark-matter' : mapStyleKey === 'positron' ? 'positron' : 'voyager'}-gl-style/style.json`
    map.setStyle(styleUrl)

    // Re-add sources/layers after style loads
    if (track) {
      map.once('style.load', () => addTrackLayers(map, track))
    }
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
          'line-width': 3,
          'line-opacity': 0.4,
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
          'line-width': 4,
          'line-opacity': 0.9,
        },
      })
    }
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

      // Create marker
      if (!markerEl.current) {
        markerEl.current = document.createElement('div')
        markerEl.current.innerHTML = `
          <div style="position:relative;width:20px;height:20px;">
            <div style="position:absolute;inset:0;border-radius:50%;background:${MARKER_COLOR};opacity:0.3;" class="marker-pulse"></div>
            <div style="position:absolute;inset:4px;border-radius:50%;background:${MARKER_COLOR};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
          </div>
        `
      }

      if (markerRef.current) {
        markerRef.current.remove()
      }
      markerRef.current = new maplibregl.Marker({ element: markerEl.current })
        .setLngLat([track.points[0].lng, track.points[0].lat])
        .addTo(map)
    }

    if (map.isStyleLoaded()) {
      onStyleLoad()
    } else {
      map.once('style.load', onStyleLoad)
    }
  }, [track, addTrackLayers])

  // Update animation state
  useEffect(() => {
    const map = mapRef.current
    if (!map || !track || cumulDistRef.current.length === 0) return

    const result = interpolateAlongTrack(track.points, cumulDistRef.current, progress)
    const { point, bearing, segmentIndex } = result

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
    if (followCamera && progress > 0) {
      if (scenes && scenes.length > 0) {
        // Use the scene-based camera system
        const elapsedSec = progress * 30 // approximate; real duration is set elsewhere
        const cameraState = computeCameraForProgress(
          track, cumulDistRef.current, scenes, progress, elapsedSec,
        )
        map.jumpTo({
          center: cameraState.center as [number, number],
          zoom: cameraState.zoom,
          pitch: cameraState.pitch,
          bearing: cameraState.bearing,
        })
      } else {
        const nextIdx = Math.min(segmentIndex + 2, track.points.length - 1)
        const lookAheadBearing = computeBearing(point, track.points[nextIdx])
        map.jumpTo({
          center: [point.lng, point.lat],
          bearing: lookAheadBearing,
          pitch: 45,
          zoom: 14,
        })
      }
    }
  }, [progress, track, followCamera, scenes])

  return (
    <div ref={containerRef} className="absolute inset-0" />
  )
})

export default MapView
