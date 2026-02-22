'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { Check } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import type { Track, TrackPoint } from '@/types'
import type { MapViewHandle } from '@/components/MapView'
import { totalDistance, formatDistance } from '@/lib/interpolate'
import { useLocale } from '@/lib/i18n'

interface JourneyCreatorProps {
  isActive: boolean
  onComplete: (track: Track) => void
  onCancel: () => void
  mapRef: React.RefObject<MapViewHandle | null>
}

const SOURCE_POINTS = 'journey-points'
const SOURCE_LINE = 'journey-line'
const LAYER_LINE = 'journey-line'
const LAYER_POINTS = 'journey-points'
const LAYER_LABELS = 'journey-points-labels'

function buildPointsGeoJSON(waypoints: TrackPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: waypoints.map((wp, i) => ({
      type: 'Feature',
      properties: { index: i, label: String(i + 1) },
      geometry: { type: 'Point', coordinates: [wp.lng, wp.lat] },
    })),
  }
}

function buildLineGeoJSON(waypoints: TrackPoint[]): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: waypoints.map((wp) => [wp.lng, wp.lat]),
    },
  }
}

export default function JourneyCreator({ isActive, onComplete, onCancel, mapRef }: JourneyCreatorProps) {
  const { t } = useLocale()
  // Use refs for waypoints to avoid stale closure issues in map event handlers
  const waypointsRef = useRef<TrackPoint[]>([])
  // State drives UI re-renders
  const [pointCount, setPointCount] = useState(0)
  const [distanceMeters, setDistanceMeters] = useState(0)

  // Track whether layers have been added to the map
  const layersAddedRef = useRef(false)
  // Track dragging state
  const draggingIndexRef = useRef<number | null>(null)
  // Store cleanup functions
  const cleanupRef = useRef<(() => void) | null>(null)

  const syncUI = useCallback(() => {
    const pts = waypointsRef.current
    setPointCount(pts.length)
    setDistanceMeters(pts.length >= 2 ? totalDistance(pts) : 0)
  }, [])

  const updateMapData = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map || !layersAddedRef.current) return

    const pointsSrc = map.getSource(SOURCE_POINTS) as maplibregl.GeoJSONSource | undefined
    const lineSrc = map.getSource(SOURCE_LINE) as maplibregl.GeoJSONSource | undefined

    if (pointsSrc) pointsSrc.setData(buildPointsGeoJSON(waypointsRef.current))
    if (lineSrc) lineSrc.setData(buildLineGeoJSON(waypointsRef.current))
  }, [mapRef])

  const addLayers = useCallback((map: maplibregl.Map) => {
    if (layersAddedRef.current) return

    // Line source + layer
    if (!map.getSource(SOURCE_LINE)) {
      map.addSource(SOURCE_LINE, {
        type: 'geojson',
        data: buildLineGeoJSON([]),
      })
    }
    if (!map.getLayer(LAYER_LINE)) {
      map.addLayer({
        id: LAYER_LINE,
        type: 'line',
        source: SOURCE_LINE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#f97316',
          'line-width': 3,
          'line-opacity': 0.9,
        },
      })
    }

    // Points source + circle layer
    if (!map.getSource(SOURCE_POINTS)) {
      map.addSource(SOURCE_POINTS, {
        type: 'geojson',
        data: buildPointsGeoJSON([]),
      })
    }
    if (!map.getLayer(LAYER_POINTS)) {
      map.addLayer({
        id: LAYER_POINTS,
        type: 'circle',
        source: SOURCE_POINTS,
        paint: {
          'circle-radius': 12,
          'circle-color': '#f97316',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
    }

    // Labels layer
    if (!map.getLayer(LAYER_LABELS)) {
      map.addLayer({
        id: LAYER_LABELS,
        type: 'symbol',
        source: SOURCE_POINTS,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      })
    }

    layersAddedRef.current = true
  }, [])

  const removeLayers = useCallback((map: maplibregl.Map) => {
    if (!layersAddedRef.current) return
    for (const layerId of [LAYER_LABELS, LAYER_POINTS, LAYER_LINE]) {
      if (map.getLayer(layerId)) map.removeLayer(layerId)
    }
    for (const srcId of [SOURCE_POINTS, SOURCE_LINE]) {
      if (map.getSource(srcId)) map.removeSource(srcId)
    }
    layersAddedRef.current = false
  }, [])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    if (!isActive) {
      // Clean up when deactivated
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      removeLayers(map)
      waypointsRef.current = []
      setPointCount(0)
      setDistanceMeters(0)
      return
    }

    // Set up layers and event handlers
    const setupListeners = () => {
      addLayers(map)

      // --- Click to add waypoint ---
      const onClick = (e: maplibregl.MapMouseEvent) => {
        // Ignore clicks on existing waypoints (handled separately)
        const features = map.queryRenderedFeatures(e.point, { layers: [LAYER_POINTS] })
        if (features.length > 0) return

        const { lng, lat } = e.lngLat
        waypointsRef.current = [...waypointsRef.current, { lng, lat }]
        updateMapData()
        syncUI()
      }

      // --- Click on waypoint to delete ---
      const onPointClick = (e: maplibregl.MapLayerMouseEvent) => {
        e.preventDefault()
        if (draggingIndexRef.current !== null) return
        const feature = e.features?.[0]
        if (feature == null) return
        const idx = feature.properties?.index as number
        const pts = [...waypointsRef.current]
        pts.splice(idx, 1)
        waypointsRef.current = pts
        updateMapData()
        syncUI()
      }

      // --- Drag waypoints ---
      const onMouseDownPoint = (e: maplibregl.MapLayerMouseEvent) => {
        e.preventDefault()
        const feature = e.features?.[0]
        if (feature == null) return
        draggingIndexRef.current = feature.properties?.index as number

        map.getCanvas().style.cursor = 'grabbing'
        map.dragPan.disable()

        const onMouseMove = (ev: maplibregl.MapMouseEvent) => {
          if (draggingIndexRef.current === null) return
          const { lng, lat } = ev.lngLat
          const pts = [...waypointsRef.current]
          pts[draggingIndexRef.current] = { ...pts[draggingIndexRef.current], lng, lat }
          waypointsRef.current = pts
          updateMapData()
          syncUI()
        }

        const onMouseUp = () => {
          draggingIndexRef.current = null
          map.getCanvas().style.cursor = ''
          map.dragPan.enable()
          map.off('mousemove', onMouseMove)
          map.off('mouseup', onMouseUp)
        }

        map.on('mousemove', onMouseMove)
        map.on('mouseup', onMouseUp)
      }

      const onMouseEnterPoint = () => {
        map.getCanvas().style.cursor = 'pointer'
      }

      const onMouseLeavePoint = () => {
        map.getCanvas().style.cursor = ''
      }

      map.on('click', onClick)
      map.on('click', LAYER_POINTS, onPointClick)
      map.on('mousedown', LAYER_POINTS, onMouseDownPoint)
      map.on('mouseenter', LAYER_POINTS, onMouseEnterPoint)
      map.on('mouseleave', LAYER_POINTS, onMouseLeavePoint)

      cleanupRef.current = () => {
        map.off('click', onClick)
        map.off('click', LAYER_POINTS, onPointClick)
        map.off('mousedown', LAYER_POINTS, onMouseDownPoint)
        map.off('mouseenter', LAYER_POINTS, onMouseEnterPoint)
        map.off('mouseleave', LAYER_POINTS, onMouseLeavePoint)
        map.getCanvas().style.cursor = ''
        map.dragPan.enable()
      }
    }

    if (map.isStyleLoaded()) {
      setupListeners()
    } else {
      map.once('style.load', setupListeners)
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      removeLayers(map)
      waypointsRef.current = []
      setPointCount(0)
      setDistanceMeters(0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  const handleUndo = useCallback(() => {
    if (waypointsRef.current.length === 0) return
    waypointsRef.current = waypointsRef.current.slice(0, -1)
    updateMapData()
    syncUI()
  }, [updateMapData, syncUI])

  const handleClear = useCallback(() => {
    waypointsRef.current = []
    updateMapData()
    syncUI()
  }, [updateMapData, syncUI])

  const handleDone = useCallback(() => {
    if (waypointsRef.current.length < 2) return
    const track: Track = {
      name: t('journey.defaultName'),
      points: waypointsRef.current as TrackPoint[],
    }
    onComplete(track)
  }, [onComplete])

  if (!isActive) return null

  return (
    <div className="absolute top-4 left-4 z-10 w-72 max-w-[calc(100vw-2rem)] gs overflow-hidden"
      style={{ borderRadius: 'var(--r-glass)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--div)' }}>
        <span className="font-semibold text-sm" style={{ color: 'var(--t1)' }}>
          {t('journey.title')}
        </span>
        <button
          onClick={onCancel}
          className="text-xs transition-colors" style={{ color: 'var(--t3)' }}
        >
          {t('journey.cancel')}
        </button>
      </div>

      {/* Hint */}
      <div className="px-4 py-2">
        <p className="text-xs" style={{ color: 'var(--t3)' }}>
          {t('journey.hint')}
        </p>
      </div>

      {/* Stats */}
      <div className="px-4 py-2 text-xs font-medium" style={{ color: 'var(--t2)' }}>
        {pointCount === 0
          ? t('journey.noPoints')
          : pointCount === 1
          ? t('journey.onePoint')
          : `${pointCount} ${t('timeline.points')} · ${formatDistance(distanceMeters)}`}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--div)' }}>
        <button
          onClick={handleUndo}
          disabled={pointCount === 0}
          className="gi px-3 py-1.5 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'var(--t1)' }}
        >
          {t('journey.undo')}
        </button>
        <button
          onClick={handleClear}
          disabled={pointCount === 0}
          className="gi px-3 py-1.5 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'var(--t1)' }}
        >
          {t('journey.clear')}
        </button>
        <button
          onClick={handleDone}
          disabled={pointCount < 2}
          className="ml-auto px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ background: '#f97316' }}
        >
          {t('journey.done')}
          <Check size={14} strokeWidth={2.5} className="inline -mt-px ml-1" />
        </button>
      </div>
    </div>
  )
}
